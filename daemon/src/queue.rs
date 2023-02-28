use crate::daily_api_metric;
use crate::mongo_request::MongoRequest;
use crate::prometheus::DF_METRICS_BULKS;
use crate::test_hooks::TEST_HOOKS;
use daily_api_metric::DailyApiMetric;
use mongodb::options::UpdateOptions;
use mongodm::mongo::{bson::doc, options::ClientOptions, Client};
use mongodm::{BulkUpdate, CollectionConfig, Model, ToRepository};
use std::env;
use std::error::Error;
use std::{
    cell::{Cell, RefCell},
    time::Duration,
};

pub struct DailyApiMetricCollConf;
impl CollectionConfig for DailyApiMetricCollConf {
    fn collection_name() -> &'static str {
        "daily-api-metrics"
    }
}
impl Model for DailyApiMetric {
    type CollConf = DailyApiMetricCollConf;
}

pub async fn run_queue(
    halt: &Cell<bool>,
    bulk_cell: &RefCell<Vec<MongoRequest>>,
) -> Result<(), Box<dyn Error>> {
    println!("run queue");

    println!("connect to mongodb");
    let mongo_url = env::var("MONGO_URL").unwrap_or("mongodb://mongo:27017/metrics".to_string());
    let mongo_client_options = ClientOptions::parse(mongo_url).await.unwrap();
    let mongo_client = Client::with_options(mongo_client_options).unwrap();
    let db = mongo_client.default_database().unwrap();
    db.run_command(doc! {"ping": 1}, None).await?;
    println!("mongodb connection ok");
    let db_repository = db.repository::<DailyApiMetric>();

    let max_bulk_interval_str = env::var("MAX_BULK_INTERVAL").unwrap_or("60".to_string());
    let max_bulk_interval = max_bulk_interval_str.parse::<u32>().unwrap();
    let max_bulk_size_str = env::var("MAX_BULK_SIZE").unwrap_or("1000".to_string());
    let max_bulk_size = max_bulk_size_str.parse::<u32>().unwrap();
    println!(
        "init queue max_bulk_interval={}, max_bulk_size={}",
        max_bulk_interval, max_bulk_size
    );

    let mut i = 0;
    loop {
        i = i + 1;
        tokio::time::sleep(Duration::from_secs(1)).await;
        let mut bulk = bulk_cell.borrow_mut();
        if i == max_bulk_interval || bulk.len() as u32 >= max_bulk_size || halt.get() {
            i = 0;

            // cf https://docs.rs/mongodm/latest/mongodm/struct.Repository.html#method.bulk_update
            let bulk_updates = bulk
                .iter()
                .map(|mr| BulkUpdate {
                    query: mr.key.clone(),
                    update: doc! {"$set": mr.set.clone(), "$inc": mr.inc.clone()},
                    options: Some(UpdateOptions::builder().upsert(Some(true)).build()),
                })
                .collect::<Vec<BulkUpdate>>();

            // db_repository.bulk_update(&vec!(bulk_updates)).await?;
            if bulk.len() > 0 {
                DF_METRICS_BULKS
                    .with_label_values(&[])
                    .observe(bulk.len() as f64);
                if *TEST_HOOKS {
                    println!("test/bulk/{}", bulk.len());
                }
                db_repository.bulk_update(bulk_updates).await?;
                bulk.clear();
            }
            // println!("queue {}", bulk.len());
        }
        if halt.get() {
            println!("shutdown queue");
            break;
        }
    }
    Ok(())
}
