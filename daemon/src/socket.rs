use serde::{Deserialize};
use std::error::Error;
use std::time::Duration;
use tokio::net::UnixDatagram;
use tokio::fs::{remove_file, metadata};
use std::cell::{Cell, RefCell};
use std::str;
use regex::Regex;
use chrono::prelude::*;
use jwtk::jwk::RemoteJwksVerifier;
use crate::parse::parse_raw_line;
use crate::mongo_request::{create_request, MongoRequest};

// cf the log format in nginx.conf
// log_format operation escape=json '{"h":"$host","r":"$http_referer","t":$request_time,"b":$bytes_sent,"s":"$status","o":"$upstream_http_x_owner","i":"$cookie_id_token","io":"$cookie_id_token_org","ak":"$http_x_apikey","a":"$http_x_account","p":"$http_x_processing","c":"$upstream_cache_status","rs":"$upstream_http_x_resource","op":"$upstream_http_x_operation"}';
#[derive(Deserialize)]
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
    pub a:String,
    pub p:String,
    pub c: String,
    pub rs: String,
    pub op: String
}

pub async fn listen_socket(halt: &Cell<bool>, bulk_ref: &RefCell<Vec<MongoRequest>>) -> Result<(), Box<dyn Error>> {
    let token_verifier = RemoteJwksVerifier::new(
        "http://localhost:6218/jwks".into(),
        None,
        Duration::from_secs(600),
    );

    // matches the shape of the expected syslog line ("<PRI>Mmm dd hh:mm:ss df: JSON")
    let line_regexp = Regex::new("<[0-9]+>(.{15}) df: (.*)").unwrap();

    // socket binding documented here https://docs.rs/tokio/latest/tokio/net/struct.UnixDatagram.html

    let socket_path = "../dev/data/metrics.log.sock";
    let socket_exists = metadata(socket_path).await.is_ok();
    if socket_exists {
        println!("remove existing socket");
        remove_file(socket_path).await?;
    }
    println!("create socket {}", socket_path);
    let socket = UnixDatagram::bind(&socket_path)?;
    println!("socket was created");
    while !halt.get() {
        socket.readable().await?;
        // 4096 should be a reasonable max size ?
        let mut buf = vec![0; 4096];
        let size = socket.recv(&mut buf).await?;
        let message_bytes = &buf[..size];
        
        let message_str = str::from_utf8(&message_bytes).unwrap();
        // println!("received message: {}", message_str);
        
        let captured = line_regexp.captures(message_str).unwrap();
        let date = &captured[1];
        let json = &captured[2];
        // println!("captured date {} and JSON {}", date, json);

        let date_with_year = format!("{}{}", "2023", date);
        let date_iso = NaiveDateTime::parse_from_str(date_with_year.as_str(), "%Y %b %d %T").unwrap().and_local_timezone(Utc).unwrap().to_rfc3339();
        // println!("full date {}", date_iso);

        match serde_json::from_str::<RawLine>(json) {
            Ok(raw_line) => {
                match parse_raw_line(&raw_line, date_iso, &token_verifier).await {
                    Ok(daily_api_metric_option) => {
                        match daily_api_metric_option {
                            Some(metric) => {
                                let mut bulk = bulk_ref.borrow_mut();
                                let request = create_request(metric);
                                let existing_request = bulk.iter_mut().find(|r| r.key == request.key);
                                if let Some(existing_request) = existing_request {
                                    let nb_requests = existing_request.inc.get_i32("nbRequests").unwrap_or(0);
                                    existing_request.inc.insert("nbRequests", nb_requests + 1);
                                    let bytes = existing_request.inc.get_i32("bytes").unwrap_or(0);
                                    let new_bytes = request.inc.get_i32("bytes").unwrap_or(0);
                                    existing_request.inc.insert("bytes", bytes + new_bytes);
                                    let duration = existing_request.inc.get_i32("duration").unwrap_or(0);
                                    let new_duration = request.inc.get_i32("duration").unwrap_or(0);
                                    existing_request.inc.insert("duration", duration + new_duration);
                                } else {
                                    bulk.push(request);
                                }
                            }
                            _ => {
                                // nothing to do
                            }
                        }
                        
                    },
                    Err(e) => {
                        match e {
                            _ => {
                                // TODO: prometheus error increment
                                println!("Error transforming raw line to metric \"{}\" {}", e, message_str)
                            }
                        }
                        
                    }
                }
            },
            Err(e) => {
                // TODO: prometheus error increment
                println!("Error parsing line from JSON \"{}\" {}", e, message_str)
            }
        }
    }
    Ok(())
}