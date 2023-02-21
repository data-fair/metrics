###
# we use cargo chef for better docker build https://github.com/LukeMathWalker/cargo-chef
FROM clux/muslrust:stable as chef
USER root
RUN cargo install cargo-chef
WORKDIR /app

###
# planning step of cargo-chef
FROM chef as planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

###
# the build step to produce our binary
FROM chef as builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --target x86_64-unknown-linux-musl --recipe-path recipe.json
COPY . .
RUN cargo build --release --target x86_64-unknown-linux-musl --bin daemon

###
# actual daemon image
FROM alpine:3.17
WORKDIR /app
RUN addgroup -S metrics-daemon && adduser -S metrics-daemon -G metrics-daemon
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/daemon /app/daemon
USER guest
CMD ["/app/daemon"]