use crate::prometheus::metrics_server;
use mongo_request::MongoRequest;
use queue::run_queue;
use socket::listen_socket;
use std::cell::{Cell, RefCell};
use std::error::Error;
use tokio::signal;
use tokio::sync::broadcast::{self, Sender};

// daily_api_metric.rs model is generated using:
// npx --package=@koumoul/schema-jtd@0.5.0 schema2td --add types/node_modules/@data-fair/lib/src/types/session-state/schema.json -- types/daily-api-metric/schema.json tmp/daily-api-metric.jtd.json
// dc run jtd jtd-codegen tmp/daily-api-metric.jtd.json --rust-out tmp/
// mv tmp/mod.rs daemon/src/daily_api_metric.rs

// session_state.rs model is generated using:
// npx --package=@koumoul/schema-jtd@0.5.0 schema2td types/node_modules/@data-fair/lib/src/types/session-state/schema.json tmp/session-state.jtd.json
// dc run jtd jtd-codegen tmp/session-state.jtd.json --rust-out tmp/
// mv tmp/mod.rs daemon/src/session_state.rs

mod daily_api_metric;
mod mongo_request;
mod parse;
mod prometheus;
mod queue;
mod session_state;
mod socket;

// example on how to run parallel loops:
// https://stackoverflow.com/a/71766211/10132434

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let (shutdown_sender, mut _shutdown_receiver) = broadcast::channel::<bool>(16);
    // TODO: manage graceful shutdown
    let halt = Cell::new(false);
    let bulk_cell: RefCell<Vec<MongoRequest>> = RefCell::new(vec![]);
    let res = tokio::try_join!(
        run_queue(&halt, &bulk_cell),
        listen_socket(shutdown_sender.subscribe(), &bulk_cell),
        metrics_server(shutdown_sender.subscribe()),
        wait_shutdown(shutdown_sender, &halt)
    );
    match res {
        Ok(..) => {
            println!("done");
            Ok(())
        }
        Err(err) => {
            return Err(err);
        }
    }
}

async fn wait_shutdown(
    shutdown_sender: Sender<bool>,
    halt: &Cell<bool>,
) -> Result<(), Box<dyn Error>> {
    match signal::ctrl_c().await {
        Ok(()) => {
            println!("received shutdown signal");
        }
        Err(err) => {
            eprintln!("Unable to listen for shutdown signal: {}", err);
            // we also shut down in case of error
        }
    }
    shutdown_sender.send(true).unwrap();
    halt.set(true);
    Ok(())
}
