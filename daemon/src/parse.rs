use std::error::Error;
use serde::{Deserialize};
use url::Url;
use jwtk::jwk::RemoteJwksVerifier;
use crate::daily_api_metric::{DailyApiMetric, Resource, StatusClass, Account, AccountType, Processing, UserClass};
use crate::session_state::User;
use crate::socket::RawLine;

#[derive(Deserialize)]
struct Operation {
    id: String,
    class: String,
    track: String
}
pub async fn parse_raw_line(raw_line: &RawLine, date_iso: String, token_verifier: RemoteJwksVerifier) -> Result<DailyApiMetric, Box<dyn Error>> {
    let day = date_iso.chars().take(10).collect::<String>();
    
    let owner = serde_json::from_str::<Account>(&raw_line.o)?;
    
    let mut referer_domain = raw_line.r.to_string();
    //let mut referer_app = Option::<Box<String>>::None;
    if let Ok(referer_url) = Url::parse(&raw_line.r) {
        // referer given in query params is used to track original referer in the case of embedded pages
        // data-fair automatically adds this param to embed views and apps
        let mut query = referer_url.query_pairs();
        if let Some(referer_param) = query.find(|(param,_)| param == "referer") {
            referer_domain = referer_param.1.to_string()
        }
    }
    /*let referer_domain = match Url::parse(&raw_line.r) {
        Ok(referer_url) => {
            // referer given in query params is used to track original referer in the case of embedded pages
            // data-fair automatically adds this param to embed views and apps
            let query = referer_url.query_pairs();
            let referer_param = query.find(|(param,_)| param == "referer")
            match referer_param {
                None => {
                    let domain = referer_url.domain();
                    match domain {
                        None => raw_line.r,
                        Some(domain) => domain.to_string(),
                    }
                },
                Some(referer_param) => referer_param.1.to_string()
            }
        },
        Err(err) => {
            // it's ok if extracting domain from url fails
            // sometimes we will referer directly with a domain name
            raw_line.r
        }
    };*/
  
    let resource = serde_json::from_str::<Resource>(&raw_line.rs)?;
    
    let processing = match serde_json::from_str::<Processing>(&raw_line.p) {
        Ok(processing) => Option::<Box<Processing>>::Some(Box::<Processing>::new(processing)),
        Err(..) => Option::<Box<Processing>>::None
    };
    
    let operation = serde_json::from_str::<Operation>(&raw_line.op)?;

    let status_class = match raw_line.s {
        0..=199 => StatusClass::Info,
        200..=299 => StatusClass::Ok,
        300..=399 => StatusClass::Redirect,
        400..=499 => StatusClass::ClientError,
        _ => StatusClass::ServerError
    };

    let mut user_class = UserClass::Anonymous;
    if let Some(token) = token_verifier.verify::<User>(&raw_line.i).await.ok() {
        let user = token.claims().extra;
        if matches!(owner.type_, AccountType::User) && owner.id == user.id {
            user_class = UserClass::Owner
        } else if matches!(owner.type_, AccountType::Organization) && owner.id == raw_line.io {
            user_class = UserClass::Owner
        } else {
            user_class = UserClass::External
        }
    } else if let Some(processing) = processing {
        if let Ok(processing_account) = serde_json::from_str::<Account>(&raw_line.o) {
            if matches!(owner.type_, AccountType::User) && matches!(processing_account.type_, AccountType::User) && owner.id == processing_account.id {
                user_class = UserClass::OwnerProcessing
            } else {
                user_class = UserClass::ExternalProcessing
            }
        }
    };
    let api_key_parts = raw_line.ak.split(':').collect::<Vec<&str>>();
    if api_key_parts.len() >= 3 {
        if api_key_parts[0] == "u" {
            if matches!(owner.type_, AccountType::User) && api_key_parts[1] == owner.id {
                user_class = UserClass::OwnerApikey
            } else {
                user_class = UserClass::ExternalApikey
            }
        }
        if api_key_parts[0] == "o" {
            if matches!(owner.type_, AccountType::Organization) && api_key_parts[1] == owner.id {
                user_class = UserClass::OwnerApikey
            } else {
                user_class = UserClass::ExternalApikey
            }
        }
    }
    

    let daily_api_metric = DailyApiMetric {
        owner: owner,
        bytes: raw_line.b,
        day: day,
        duration: raw_line.t,
        nbRequests: 1,
        operationTrack: operation.track,
        refererApp: Option::<Box<String>>::None,
        refererDomain: referer_domain,
        resource: resource,
        statusClass: status_class,
        userClass: user_class,
        processing: processing
    };
    Result::Ok(daily_api_metric)
}
