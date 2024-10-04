##########################
FROM node:22.9.0-alpine3.19 AS installer

RUN apk add --no-cache python3 make g++ git
RUN npm i -g clean-modules@3.0.4

WORKDIR /app

ADD package.json .
ADD package-lock.json .
ADD ui/package.json ui/package.json
ADD api/package.json api/package.json
ADD daemon/package.json daemon/package.json
RUN npm pkg set scripts.prepare="echo 'skip prepare'"
RUN npm ci --no-audit --no-fund --include=dev --omit=optional && clean-modules --yes "!yaml/dist/doc/*.js"

##########################
FROM installer AS types

ADD api api
RUN npm run build-types

##########################
FROM installer AS ui

WORKDIR /app

RUN npm ls config
RUN npm ls @types/config
RUN npm i --no-save @rollup/rollup-linux-x64-musl

COPY --from=types /app/api/config api/config
COPY --from=types /app/api/src/config.ts api/src/config.ts
ADD /ui ui

ENV NODE_ENV=production
RUN npm -w ui run build

##########################
FROM node:22.9.0-alpine3.19 AS daemon

ENV NODE_ENV=production

WORKDIR /app

# reuse node_modules from installer and strip for api workspace in a single layer
RUN --mount=type=bind,from=installer,source=/app,target=/installer-app \
    cp -rf /installer-app/* /app && \
    rm -rf /app/api && \
    rm -rf /app/ui && \
    npm ci -w daemon --include-workspace-root --no-audit --no-fund --omit=optional --omit=dev --ignore-scripts

ADD /daemon daemon
ADD README.md LICENSE BUILD.json* ./

EXPOSE 8080

USER node

CMD ["node", "--experimental-strip-types", "daemon/index.ts"]

##########################
FROM node:22.9.0-alpine3.19 AS api

ENV NODE_ENV=production

WORKDIR /app

# reuse node_modules from installer and strip for daemon workspace in a single layer
RUN --mount=type=bind,from=installer,source=/app,target=/installer-app \
    cp -rf /installer-app/* /app && \
    rm -rf /app/daemon && \
    rm -rf /app/ui && \
    npm ci -w api --include-workspace-root --no-audit --no-fund --omit=optional --omit=dev --ignore-scripts

COPY --from=types /app/api api
COPY --from=ui /app/ui/dist ui/dist
ADD README.md LICENSE BUILD.json* ./

# artificially create a dependency to "daemon" target for better caching
COPY --from=daemon /app/package.json package.json


EXPOSE 8080

USER node

CMD ["node", "--max-http-header-size", "64000", "--experimental-strip-types", "api/index.ts"]
