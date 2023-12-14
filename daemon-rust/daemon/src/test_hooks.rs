use lazy_static::lazy_static;
use std::env;

lazy_static! {
    pub static ref TEST_HOOKS: bool = match env::var("TEST_HOOKS")
        .unwrap_or("false".to_string())
        .as_str()
    {
        "1" => true,
        "true" => true,
        _ => false,
    };
}
