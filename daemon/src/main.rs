use std::error::Error;
use std::{cell::{Cell, RefCell}};
use daily_api_metric::DailyApiMetric;
use socket::listen_socket;
use queue::run_queue;

// daily-api-metric model is generated using:
// npx --package=@koumoul/schema-jtd@0.3.0 schema2td types/daily-api-metric/schema.json tmp/daily-api-metric.jtd.json
// dc run jtd jtd-codegen tmp/daily-api-metric.jtd.json --rust-out tmp/
// mv tmp/mod.rs daemon/src/daily-api-metric.rs

mod queue;
mod socket;
mod daily_api_metric;

// example on how to run parallel loops:
// https://stackoverflow.com/a/71766211/10132434

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // TODO: manage graceful shutdown
    let halt = Cell::new(false);
    let bulk_cell: RefCell<Vec<DailyApiMetric>> = RefCell::new(vec![]);
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

