use crate::mongo_request::MongoRequest;
use crate::prometheus::metrics_server;
use crate::queue::run_queue;
use crate::socket::listen_socket;
use crate::test_hooks::TEST_HOOKS;
use std::cell::{Cell, RefCell};
use std::error::Error;
use tokio::signal;
use tokio::signal::unix::{signal, SignalKind};
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
mod test_hooks;

// example on how to run parallel loops:
// https://stackoverflow.com/a/71766211/10132434

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    if *TEST_HOOKS {
        println!("test/start-main")
    }
    let (shutdown_sender, mut _shutdown_receiver) = broadcast::channel::<bool>(16);
    let halt = Cell::new(false);
    // TODO: check that RefCell is the most appropriate smart pointer type in this case
    let bulk_cell: RefCell<Vec<MongoRequest>> = RefCell::new(vec![]);
    let res = tokio::try_join!(
        run_queue(&halt, &bulk_cell),
        listen_socket(shutdown_sender.subscribe(), &bulk_cell),
        metrics_server(shutdown_sender.subscribe()),
        wait_shutdown(shutdown_sender, &halt)
    );
    match res {
        Ok(..) => {
            if *TEST_HOOKS {
                println!("test/stop-main")
            }
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
    let mut sigterm = signal(SignalKind::terminate())?;
    let mut sigint = signal(SignalKind::interrupt())?;
    tokio::select! {
        _ = signal::ctrl_c() => println!("shutdown (ctr-c)"),
        _ = sigint.recv() => println!("shutdown (SIGINT)"),
        _ = sigterm.recv() => println!("shutdown (SIGTERM)"),
    };
    shutdown_sender.send(true).unwrap();
    halt.set(true);
    Ok(())
}
