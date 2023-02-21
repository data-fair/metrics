use std::error::Error;
use std::{cell::{RefCell, Cell}, time::Duration};
use mongodm::{ToRepository, Model, CollectionConfig, Indexes, Index, IndexOption, sync_indexes};
use mongodm::mongo::{Client, options::ClientOptions, bson::doc};
use daily_api_metric::DailyApiMetric;
use crate::daily_api_metric;

pub struct DailyApiMetricCollConf;
impl CollectionConfig for DailyApiMetricCollConf {
    fn collection_name() -> &'static str {
        "daily-api-metrics"
    }
}
impl Model for DailyApiMetric {
    type CollConf = DailyApiMetricCollConf;
}

pub async fn run_queue(halt: &Cell<bool>, bulk_cell: &RefCell<Vec<DailyApiMetric>>) -> Result<(), Box<dyn Error>> {
  println!("run queue");

  let mongo_client_options = ClientOptions::parse("mongodb://localhost:27017").await.unwrap();
  let mongo_client = Client::with_options(mongo_client_options).unwrap();
  let db = mongo_client.database("metrics");
  let db_repository = db.repository::<DailyApiMetric>();

  while !halt.get() {
    tokio::time::sleep(Duration::from_secs(10)).await;
    let bulk = bulk_cell.borrow();
    println!("queue loop {}", bulk.len());
  }
  Ok(())
}