use mongodm::bson::Document;
use mongodm::bson::doc;
use crate::daily_api_metric::{DailyApiMetric};

pub struct MongoRequest {
    pub key: Document,
    pub set: Document,
    pub inc: Document
}

pub fn create_request(metric: DailyApiMetric) -> MongoRequest {
    let mut key = doc! {
      "owner.type": &metric.owner.type_,
      "owner.id": &metric.owner.id,
      "day": &metric.day,
      "resource.type": &metric.resource.type_,
      "resource.id": &metric.resource.id,
      "operationTrack": &metric.operationTrack,
      "statusClass": &metric.statusClass,
      "userClass": &metric.userClass,
      "refererDomain": &metric.refererDomain
    };
    
    let mut set = doc! {
      "owner.type": &metric.owner.type_,
      "owner.id": &metric.owner.id,
      "day": &metric.day,
      "resource.type": &metric.resource.type_,
      "resource.id": &metric.resource.id,
      "operationTrack": &metric.operationTrack,
      "statusClass": &metric.statusClass,
      "userClass": &metric.userClass,
      "refererDomain": &metric.refererDomain
    };

    if let Some(department) = metric.owner.department {
      key.insert("owner.department", &department);
      set.insert("owner.department", &department);
    }

    if let Some(referer_app) = metric.refererApp {
      key.insert("refererApp", &referer_app);
      set.insert("refererApp", &referer_app);
    }
    if let Some(processing) = metric.processing {
      key.insert("processing._id", &processing.id);
      set.insert("processing._id", &processing.id);
      set.insert("processing.title", &processing.title);
    }

    let inc = doc! {
      "nbRequests": 1,
      "bytes": metric.bytes,
      "duration": metric.duration
    };
    
    return MongoRequest {
      key: key,
      set: set,
      inc: inc
    }
}
