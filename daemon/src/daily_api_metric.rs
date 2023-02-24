// Code generated by jtd-codegen for Rust v0.2.1

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct DailyApiMetric {
    #[serde(rename = "bytes")]
    pub bytes: i32,

    #[serde(rename = "day")]
    pub day: String,

    #[serde(rename = "duration")]
    pub duration: f64,

    #[serde(rename = "nbRequests")]
    pub nbRequests: i32,

    #[serde(rename = "operationTrack")]
    pub operationTrack: String,

    #[serde(rename = "owner")]
    pub owner: Account,

    #[serde(rename = "refererDomain")]
    pub refererDomain: String,

    #[serde(rename = "resource")]
    pub resource: Resource,

    #[serde(rename = "statusClass")]
    pub statusClass: StatusClass,

    #[serde(rename = "userClass")]
    pub userClass: UserClass,

    #[serde(rename = "processing")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub processing: Option<Box<Processing>>,

    #[serde(rename = "refererApp")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refererApp: Option<Box<String>>,
}

#[derive(Serialize, Deserialize)]
pub enum AccountType {
    #[serde(rename = "organization")]
    Organization,

    #[serde(rename = "user")]
    User,
}

#[derive(Serialize, Deserialize)]
pub struct Account {
    #[serde(rename = "id")]
    pub id: String,

    #[serde(rename = "name")]
    pub name: String,

    #[serde(rename = "type")]
    pub type_: AccountType,

    #[serde(rename = "department")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub department: Option<Box<String>>,

    #[serde(rename = "departmentName")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub departmentName: Option<Box<String>>,
}

#[derive(Serialize, Deserialize)]
pub struct Processing {
    #[serde(rename = "id")]
    pub id: String,

    #[serde(rename = "title")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<Box<String>>,
}

#[derive(Serialize, Deserialize)]
pub struct Resource {
    #[serde(rename = "id")]
    pub id: String,

    #[serde(rename = "type")]
    pub type_: String,

    #[serde(rename = "title")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<Box<String>>,
}

#[derive(Serialize, Deserialize)]
pub enum StatusClass {
    #[serde(rename = "clientError")]
    ClientError,

    #[serde(rename = "info")]
    Info,

    #[serde(rename = "ok")]
    Ok,

    #[serde(rename = "redirect")]
    Redirect,

    #[serde(rename = "serverError")]
    ServerError,
}

#[derive(Serialize, Deserialize)]
pub enum UserClass {
    #[serde(rename = "anonymous")]
    Anonymous,

    #[serde(rename = "external")]
    External,

    #[serde(rename = "externalAPIKey")]
    ExternalApikey,

    #[serde(rename = "externalProcessing")]
    ExternalProcessing,

    #[serde(rename = "owner")]
    Owner,

    #[serde(rename = "ownerAPIKey")]
    OwnerApikey,

    #[serde(rename = "ownerProcessing")]
    OwnerProcessing,
}
