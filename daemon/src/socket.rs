use serde::{Deserialize};
use std::error::Error;
use tokio::net::UnixDatagram;
use tokio::fs::{remove_file, metadata};
use url::Url;
use std::cell::{Cell, RefCell};
use std::str;
use regex::Regex;
use chrono::prelude::*;
use crate::daily_api_metric::{DailyApiMetric, OperationTrack};

// cf the log format in nginx.conf
// log_format operation escape=json '{"h":"$host","r":"$http_referer","t":$request_time,"b":$bytes_sent,"s":"$status","o":"$upstream_http_x_owner","i":"$cookie_id_token","io":"$cookie_id_token_org","ak":"$http_x_apikey","a":"$http_x_account","p":"$http_x_processing","c":"$upstream_cache_status","rs":"$upstream_http_x_resource","op":"$upstream_http_x_operation"}';
#[derive(Deserialize)]
struct RawLine {
    h: String,
    r: String,
    t: f64,
    b: i32,
    s: u16,
    o: String,
    i: String,
    io: String,
    ak: String,
    a:String,
    p:String,
    c: String,
    rs: String,
    op: OperationTrack
}

pub async fn listen_socket(halt: &Cell<bool>, bulk_ref: &RefCell<Vec<DailyApiMetric>>) -> Result<(), Box<dyn Error>> {
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
                let day = date_iso.chars().take(10).collect::<String>();
                let referer_url_result = Url::parse(&raw_line.r);
                // it's ok if extracting domain from url fails
                // sometimes we will referer directly with a domain name
                let referer_domain = match referer_url_result {
                  Ok(referer_url) => {
                    let domain = referer_url.domain();
                    match domain {
                      None => raw_line.r,
                      Some(domain) => domain.to_string(),
                    }
                  },
                  Err(err) => raw_line.r,
                };
                let line = DailyApiMetric {
                  bytes: raw_line.b,
                  day: day,
                  duration: raw_line.t,
                  nbRequests: 1,
                  operationTrack: raw_line.op,
                  refererApp: (),
                  refererDomain: referer_domain,
                  resource: (),
                  statusClass: raw_line.s,
                  userClass: (),
                  processing: ()
                };

                bulk_ref.borrow_mut().push(line);
            },
            Err(e) => {
                // TODO: prometheus error increment
                println!("Error parsing line \"{}\" {}", e, message_str)
            }
        }
    }
    Ok(())
}