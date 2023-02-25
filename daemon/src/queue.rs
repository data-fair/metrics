use std::error::Error;
use std::{cell::{RefCell, Cell}, time::Duration};
use mongodm::{ToRepository, Model, CollectionConfig, BulkUpdate};
use mongodm::mongo::{Client, options::ClientOptions, bson::doc};
use mongodb::options::UpdateOptions;
use daily_api_metric::DailyApiMetric;
use crate::daily_api_metric;
use crate::mongo_request::MongoRequest;

pub struct DailyApiMetricCollConf;
impl CollectionConfig for DailyApiMetricCollConf {
    fn collection_name() -> &'static str {
        "daily-api-metrics"
    }
}
impl Model for DailyApiMetric {
    type CollConf = DailyApiMetricCollConf;
}

pub async fn run_queue(halt: &Cell<bool>, bulk_cell: &RefCell<Vec<MongoRequest>>) -> Result<(), Box<dyn Error>> {
  println!("run queue");

  println!("connect to mongodb");
  let mongo_client_options = ClientOptions::parse("mongodb://localhost:27017").await.unwrap();
  let mongo_client = Client::with_options(mongo_client_options).unwrap();
  let db = mongo_client.database("daily-api-metrics");
  db.run_command(doc! {"ping": 1}, None).await?;
  println!("mongodb connection ok");
  let db_repository = db.repository::<DailyApiMetric>();

  while !halt.get() {
    tokio::time::sleep(Duration::from_secs(10)).await;
    let mut bulk = bulk_cell.borrow_mut();

    // cf https://docs.rs/mongodm/latest/mongodm/struct.Repository.html#method.bulk_update
    let bulk_updates = bulk.iter()
      .map(|mr| BulkUpdate {
        query: mr.key.clone(), update: doc! {"$set": mr.set.clone(), "$inc": mr.inc.clone()}, options: Some(UpdateOptions::builder().upsert(Some(true)).build())
      })
      .collect::<Vec<BulkUpdate>>();
    
    // db_repository.bulk_update(&vec!(bulk_updates)).await?;
    if bulk.len() > 0 {
      println!("perform bulk {}", bulk.len());
      db_repository.bulk_update(bulk_updates).await?;
      bulk.clear();
    }
    println!("queue {}", bulk.len());
  }
  Ok(())
}