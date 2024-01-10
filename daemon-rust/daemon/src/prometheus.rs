// cf https://github.com/tikv/rust-prometheus/blob/master/examples/example_hyper.rs

use hyper::{
    header::CONTENT_TYPE,
    service::{make_service_fn, service_fn},
    Body, Request, Response, Server,
};
use prometheus::{CounterVec, Encoder, HistogramVec, TextEncoder};
use std::error::Error;
use tokio::sync::broadcast::Receiver;

use lazy_static::lazy_static;
use prometheus::{register_counter_vec, register_histogram_vec};

lazy_static! {
    pub static ref DF_INTERNAL_ERROR: CounterVec = register_counter_vec!(
        "df_internal_error",
        "Errors in some worker process, socket handler, etc.",
        &["errorCode"]
    )
    .unwrap();
    pub static ref DF_METRICS_REQUESTS: HistogramVec = register_histogram_vec!(
        "df_metrics_requests",
        "Number and duration in seconds of HTTP requests",
        &["cacheStatus", "operationId", "statusClass", "host"],
        vec![0.05, 0.5, 2.0, 10.0, 60.0]
    )
    .unwrap();
    pub static ref DF_METRICS_REQUESTS_BYTES: CounterVec = register_counter_vec!(
        "df_metrics_requests_bytes",
        "Total descending kilo-bytes of HTTP requests",
        &["cacheStatus", "operationId", "statusClass", "host"]
    )
    .unwrap();
    pub static ref DF_METRICS_BULKS: HistogramVec = register_histogram_vec!(
        "df_metrics_bulks",
        "Number and size of mongodb bulk requests",
        &[],
        vec![10.0, 100.0, 1000.0]
    )
    .unwrap();
}

async fn serve_req(_req: Request<Body>) -> Result<Response<Body>, hyper::Error> {
    let encoder = TextEncoder::new();
    let metric_families = prometheus::gather();
    let mut buffer = vec![];
    encoder.encode(&metric_families, &mut buffer).unwrap();

    let response = Response::builder()
        .status(200)
        .header(CONTENT_TYPE, encoder.format_type())
        .body(Body::from(buffer))
        .unwrap();

    Ok(response)
}

pub async fn metrics_server(mut shutdown_receiver: Receiver<bool>) -> Result<(), Box<dyn Error>> {
    let addr = ([127, 0, 0, 1], 9090).into();
    println!("prometheus registry listening on http://{}/metrics", addr);

    let server = Server::bind(&addr).serve(make_service_fn(|_| async {
        Ok::<_, hyper::Error>(service_fn(serve_req))
    }));

    let graceful = server.with_graceful_shutdown(async {
        shutdown_receiver.recv().await.ok();
    });

    graceful.await?;
    println!("shutdown prometheus server");

    Ok(())
}
