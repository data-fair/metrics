use serde::{Deserialize, Serialize};
use tokio::net::UnixDatagram;
use tokio::fs::{remove_file, metadata};
use std::io;
use std::str;
use regex::Regex;
use chrono::prelude::*;

#[derive(Serialize, Deserialize, Debug)]
struct RawLine {
    h: String,
}

struct Line {
    date: String,
    host: String
}

#[tokio::main]
async fn main() -> io::Result<()> {
    // let pri_regexp = Regex::new("<[0-9]+>").unwrap();
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
    loop {
        socket.readable().await?;
        println!("socket is readable");
        // 4096 should be a reasonable max size ?
        // let mut buf = Vec::with_capacity(4096);
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
        //let message_str = pri_regexp.replace(message_str, "");
        //println!("remove pri: {}", message_str);


        // DateTime::parse_from_str("2014-11-28 21:00:09 +09:00", "Mmm dd hh:mm:ss"
        match serde_json::from_str::<RawLine>(json) {
            Ok(m) => {
                println!("{:#?}", m)
            },
            Err(e) => {
                // TODO: prometheus error increment
                println!("Error parsing json \"{}\" {}", e, message_str)
            }
        }
    }
    /*let stream = UnixStream::connect(socket_path).await?;
    
    let ready = stream.ready(Interest::READABLE).await?;
    if ready.is_readable() {
        println!("socket is ready !")
    }
    Ok(())*/
}

