use serde::{Deserialize};
use std::error::Error;
use tokio::net::UnixDatagram;
use tokio::fs::{remove_file, metadata};
use std::cell::{Cell, RefCell};
use std::str;
use regex::Regex;
use chrono::prelude::*;
use jwtk::jwk::RemoteJwksVerifier;
use crate::daily_api_metric::{DailyApiMetric};
use crate::parse::parse_raw_line;

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

pub async fn listen_socket(halt: &Cell<bool>, bulk_ref: &RefCell<Vec<DailyApiMetric>>) -> Result<(), Box<dyn Error>> {
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
        println!("socket is readable");
        // 4096 should be a reasonable max size ?
        let mut buf = vec![0; 4096];
        let size = socket.recv(&mut buf).await?;
        let message_bytes = &buf[..size];
        
        let message_str = str::from_utf8(&message_bytes).unwrap();
        println!("received message: {}", message_str);
        
        let captured = line_regexp.captures(message_str).unwrap();
        let date = &captured[1];
        let json = &captured[2];
        println!("captured date {} and JSON {}", date, json);

        let date_with_year = format!("{}{}", "2023", date);
        let date_iso = NaiveDateTime::parse_from_str(date_with_year.as_str(), "%Y %b %d %T").unwrap().and_local_timezone(Utc).unwrap().to_rfc3339();
        println!("full date {}", date_iso);

        match serde_json::from_str::<RawLine>(json) {
            Ok(raw_line) => {
                match parse_raw_line(raw_line, date_iso, token_verifier).await {
                    Ok(daily_api_metric) => {
                        bulk_ref.borrow_mut().push(daily_api_metric)
                    },
                    Err(e) => {
                        // TODO: prometheus error increment
                        println!("Error transforming raw line to daily api metric \"{}\" {}", e, message_str)
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