FROM node:18.13.0-alpine3.17

RUN apk add curl
RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm

WORKDIR /app