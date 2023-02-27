use crate::daily_api_metric;
use crate::mongo_request::MongoRequest;
use crate::prometheus::DF_METRICS_BULKS;
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
    let mongo_url = env::var("MONGO_URL").unwrap_or("mongodb://localhost:27017".to_string());
    let mongo_client_options = ClientOptions::parse(mongo_url).await.unwrap();
    let mongo_client = Client::with_options(mongo_client_options).unwrap();
    let db = mongo_client.database("daily-api-metrics");
    db.run_command(doc! {"ping": 1}, None).await?;
    println!("mongodb connection ok");
    let db_repository = db.repository::<DailyApiMetric>();

    while !halt.get() {
        tokio::time::sleep(Duration::from_secs(10)).await;
        let mut bulk = bulk_cell.borrow_mut();

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
            println!("perform bulk {}", bulk.len());
            db_repository.bulk_update(bulk_updates).await?;
            bulk.clear();
        }
        println!("queue {}", bulk.len());
    }
    Ok(())
}
