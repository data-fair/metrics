use std::error::Error;
use std::{cell::{Cell, RefCell}};
use mongo_request::MongoRequest;
use socket::listen_socket;
use queue::run_queue;

// daily_api_metric.rs model is generated using:
// npx --package=@koumoul/schema-jtd@0.5.0 schema2td --add types/node_modules/@data-fair/lib/src/types/session-state/schema.json -- types/daily-api-metric/schema.json tmp/daily-api-metric.jtd.json
// dc run jtd jtd-codegen tmp/daily-api-metric.jtd.json --rust-out tmp/
// mv tmp/mod.rs daemon/src/daily_api_metric.rs

// session_state.rs model is generated using:
// npx --package=@koumoul/schema-jtd@0.5.0 schema2td types/node_modules/@data-fair/lib/src/types/session-state/schema.json tmp/session-state.jtd.json
// dc run jtd jtd-codegen tmp/session-state.jtd.json --rust-out tmp/
// mv tmp/mod.rs daemon/src/session_state.rs

mod queue;
mod socket;
mod daily_api_metric;
mod session_state;
mod parse;
mod mongo_request;

// example on how to run parallel loops:
// https://stackoverflow.com/a/71766211/10132434

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // TODO: manage graceful shutdown
    let halt = Cell::new(false);
    let bulk_cell: RefCell<Vec<MongoRequest>> = RefCell::new(vec![]);
    let res = tokio::try_join!(
        run_queue(&halt, &bulk_cell),
        listen_socket(&halt, &bulk_cell)
    );
    match res {
        Ok(..) => {
            println!("done");
            Ok(())
        },
        Err(err) => {
            return Err(err);
        }
    }
}

