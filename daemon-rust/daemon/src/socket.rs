use crate::mongo_request::{create_request, MongoRequest};
use crate::parse::parse_raw_line;
use crate::prometheus::DF_INTERNAL_ERROR;
use crate::test_hooks::TEST_HOOKS;
use chrono::prelude::*;
use jwtk::jwk::RemoteJwksVerifier;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::env;
use std::error::Error;
use std::fs;
use std::str;
use std::time::Duration;
use tokio::fs::{metadata, remove_file};
use tokio::net::UnixDatagram;
use tokio::sync::broadcast::Receiver;

// cf the log format in nginx.conf
// log_format operation escape=json '{"h":"$host","r":"$http_referer","t":$request_time,"b":$bytes_sent,"s":"$status","o":"$upstream_http_x_owner","i":"$cookie_id_token","io":"$cookie_id_token_org","ak":"$http_x_apikey","a":"$http_x_account","p":"$http_x_processing","c":"$upstream_cache_status","rs":"$upstream_http_x_resource","op":"$upstream_http_x_operation"}';
#[derive(Serialize, Deserialize, Debug)]
pub struct RawLine {
    pub h: String,
    pub r: String,
    pub t: f64,
    pub b: i32,
    pub s: i32,
    pub o: String,
    pub i: String,
    pub io: String,
    pub ak: String,
    pub a: String,
    pub p: String,
    pub c: String,
    pub rs: String,
    pub op: String,
}

pub async fn listen_socket(
    mut shutdown_receiver: Receiver<bool>,
    bulk_ref: &RefCell<Vec<MongoRequest>>,
) -> Result<(), Box<dyn Error>> {
    let token_verifier = RemoteJwksVerifier::new(
        "http://localhost:5600/jwks".into(),
        None,
        Duration::from_secs(600),
    );

    // matches the shape of the expected syslog line ("<PRI>Mmm dd hh:mm:ss df: JSON")
    let line_regexp = Regex::new("<[0-9]+>(.{15}) df: (.*)").unwrap();

    // socket binding documented here https://docs.rs/tokio/latest/tokio/net/struct.UnixDatagram.html

    let socket_path = env::var("SOCKET_PATH").unwrap_or("../dev/data/metrics.log.sock".to_string());
    let socket_exists = metadata(socket_path.clone()).await.is_ok();
    if socket_exists {
        println!("remove existing socket");
        remove_file(socket_path.clone()).await?;
    }
    println!("create socket {}", socket_path);
    let socket = UnixDatagram::bind(&socket_path)?;
    let mut perms = fs::metadata(socket_path.clone())?.permissions();
    perms.set_readonly(false);
    fs::set_permissions(socket_path.clone(), perms)?;
    println!("socket was created");
    loop {
        tokio::select! {
            _ = socket.readable() => (),
            _ = shutdown_receiver.recv() => {
                break;
            }
        };

        if *TEST_HOOKS {
            println!("test/socket-waiting");
        }
        // 4096 should be a reasonable max size ?
        let mut buf = vec![0; 4096];
        let size = tokio::select! {
            size = socket.recv(&mut buf) => size,
            _ = shutdown_receiver.recv() => {
                break;
            }
        }?;
        // let size = socket.recv(&mut buf).await?;
        let message_bytes = &buf[..size];

        let message_str = str::from_utf8(&message_bytes)?;
        // println!("received message: {}", message_str);

        let captured = line_regexp
            .captures(message_str)
            .ok_or("line does not match regexp")?;
        let date = &captured[1];
        let json = &captured[2];
        // println!("captured date {} and JSON {}", date, json);

        let date_with_year = format!("{}{}", "2023", date);
        let date_iso = NaiveDateTime::parse_from_str(date_with_year.as_str(), "%Y %b %d %T")?
            .and_local_timezone(Utc)
            .unwrap()
            .to_rfc3339();
        // println!("full date {}", date_iso);

        match serde_json::from_str::<RawLine>(json) {
            Ok(raw_line) => {
                if *TEST_HOOKS {
                    println!("test/raw-line/{}", serde_json::to_string(&raw_line)?);
                }
                match parse_raw_line(&raw_line, date_iso, &token_verifier).await {
                    Ok(daily_api_metric_option) => {
                        match daily_api_metric_option {
                            Some(metric) => {
                                let mut bulk = bulk_ref.borrow_mut();
                                let request = create_request(metric);
                                let existing_request =
                                    bulk.iter_mut().find(|r| r.key == request.key);
                                if let Some(existing_request) = existing_request {
                                    let nb_requests =
                                        existing_request.inc.get_i32("nbRequests").unwrap_or(0);
                                    existing_request.inc.insert("nbRequests", nb_requests + 1);
                                    let bytes = existing_request.inc.get_i32("bytes").unwrap_or(0);
                                    let new_bytes = request.inc.get_i32("bytes").unwrap_or(0);
                                    existing_request.inc.insert("bytes", bytes + new_bytes);
                                    let duration =
                                        existing_request.inc.get_i32("duration").unwrap_or(0);
                                    let new_duration = request.inc.get_i32("duration").unwrap_or(0);
                                    existing_request
                                        .inc
                                        .insert("duration", duration + new_duration);
                                } else {
                                    bulk.push(request);
                                }
                            }
                            _ => {
                                // nothing to do, probably missing operationTrack
                            }
                        }
                    }
                    Err(e) => {
                        match e {
                            _ => {
                                DF_INTERNAL_ERROR
                                    .with_label_values(&["parse-raw-line"])
                                    .inc();
                                println!("(parse-raw-line) Error transforming raw line to metric \"{}\" {}", e, message_str)
                            }
                        }
                    }
                }
            }
            Err(e) => {
                DF_INTERNAL_ERROR
                    .with_label_values(&["parse-log-json"])
                    .inc();
                println!(
                    "(parse-log-json) Error parsing line from JSON \"{}\" {}",
                    e, message_str
                )
            }
        }
    }

    println!("remove socket beore closing");
    remove_file(socket_path.clone()).await?;

    println!("shutdown socket listener");
    Ok(())
}
