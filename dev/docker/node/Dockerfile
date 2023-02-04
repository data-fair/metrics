FROM node:18.14-alpine3.17

RUN apk add curl

RUN curl https://github.com/jsontypedef/json-typedef-codegen/releases/download/v0.4.1/x86_64-unknown-linux-musl.zip -L -o /tmp/jtd-codegen.zip && \
    unzip /tmp/jtd-codegen.zip && \
    mv jtd-codegen /usr/local/bin/

WORKDIR /app