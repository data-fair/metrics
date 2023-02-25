use std::error::Error;
use serde::{Deserialize};
use url::Url;
use jwtk::jwk::RemoteJwksVerifier;
use crate::daily_api_metric::{DailyApiMetric, Resource, ShortAccount, Processing};
use crate::session_state::User;
use crate::socket::RawLine;

#[derive(Deserialize)]
struct Operation {
    id: String,
    class: String,
    track: Option<String>
}

pub async fn parse_raw_line(raw_line: &RawLine, date_iso: String, token_verifier: &RemoteJwksVerifier) -> Result<Option<DailyApiMetric>, Box<dyn Error>> {
    let day = date_iso.chars().take(10).collect::<String>();
    
    let owner = serde_json::from_str::<ShortAccount>(&raw_line.o)?;
    
    let mut referer_domain = raw_line.r.to_string();
    if referer_domain == "http-req-exporter" {
        return Result::Ok(Option::<DailyApiMetric>::None);
    }
    
    let mut referer_app = Option::<String>::None;
    if let Ok(referer_url) = Url::parse(&raw_line.r) {
        // referer given in query params is used to track original referer in the case of embedded pages
        // data-fair automatically adds this param to embed views and apps
        let mut query = referer_url.query_pairs();
        if let Some(referer_param) = query.find(|(param,_)| param == "referer") {
            referer_domain = referer_param.1.to_string()
        } else {
            if let Some(domain) = referer_url.domain() {
                referer_domain = domain.to_string()
            }
        }

        if let Some(path_parts) = referer_url.path_segments() {
            let path_parts_vec = path_parts.collect::<Vec<&str>>();
            if path_parts_vec.get(0).unwrap_or(&"") == &"data-fair" && path_parts_vec.get(1).unwrap_or(&"") == &"app" {                
                if let Some(app) = path_parts_vec.get(2) {
                    referer_app = Option::<String>::Some(app.to_string());
                }   
            }
        }
    }
  
    let resource = serde_json::from_str::<Resource>(&raw_line.rs)?;
    
    let processing = match serde_json::from_str::<Processing>(&raw_line.p) {
        Ok(processing) => Option::<Processing>::Some(processing),
        Err(..) => Option::<Processing>::None
    };
    
    let operation = serde_json::from_str::<Operation>(&raw_line.op)?;
    if let Some(operation_track) = operation.track {
        let status_class = match raw_line.s {
            0..=199 => "info",
            200..=299 => "ok",
            300..=399 => "redirect",
            400..=499 => "clientError",
            _ => "serverError"
        };
    
        let mut user_class = "anonymous";
        if let Some(token) = token_verifier.verify::<User>(&raw_line.i).await.ok() {
            let user = &token.claims().extra;
            if owner.type_ == "user" && owner.id == user.id {
                user_class = "owner";
            } else if owner.type_ == "organization" && owner.id == raw_line.io {
                user_class = "owner";
            } else {
                user_class = "external";
            }
        } else if let Some(processing) = &processing {
            if let Ok(processing_account) = serde_json::from_str::<ShortAccount>(&raw_line.o) {
                if owner.type_ == "user" && processing_account.type_ == "user" && owner.id == processing_account.id {
                    user_class = "ownerProcessing";
                } else {
                    user_class = "externalProcessing";
                }
            }
        };
        let api_key_parts = raw_line.ak.split(':').collect::<Vec<&str>>();
        if api_key_parts.len() >= 3 {
            if api_key_parts[0] == "u" {
                if owner.type_ == "user" && api_key_parts[1] == owner.id {
                    user_class = "ownerAPIKey"
                } else {
                    user_class = "externalAPIKey"
                }
            }
            if api_key_parts[0] == "o" {
                if owner.type_ == "organization" && api_key_parts[1] == owner.id {
                    user_class = "ownerAPIKey"
                } else {
                    user_class = "externalAPIKey"
                }
            }
        }
        
    
        let daily_api_metric = DailyApiMetric {
            owner: owner,
            bytes: raw_line.b,
            day: day,
            duration: raw_line.t,
            nbRequests: 1,
            operationTrack: operation_track,
            refererApp: referer_app,
            refererDomain: referer_domain,
            resource: resource,
            statusClass: status_class.to_string(),
            userClass: user_class.to_string(),
            processing: processing
        };
        return Result::Ok(Option::<DailyApiMetric>::Some(daily_api_metric))
    } else {
        return Result::Ok(Option::<DailyApiMetric>::None);
    }
}
