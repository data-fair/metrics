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
RUN npm ci --no-audit --no-fund --omit=optional && clean-modules --yes

ADD README.md LICENSE BUILD.json* ./

##########################
FROM installer AS types

ADD api api
RUN npm run build-types

##########################
FROM installer AS ui

ENV NODE_ENV=production

WORKDIR /app

COPY --from=types /app/api/config /app/api/config
COPY --from=types /app/api/src/config.ts /app/api/src/config.ts
ADD /ui ui
RUN npm -w ui run build

##########################
FROM node:22.9.0-alpine3.19 AS daemon

ENV NODE_ENV=production

WORKDIR /app

# reuse node_modules from installer and strip for production in a single layer
RUN --mount=type=bind,from=installer,source=/app,target=/installer-app \
    cp -rf /installer-app/* /app && \
    rm -rf /app/api && \
    rm -rf /app/ui && \
    npm ci -w daemon --no-audit --no-fund --omit=optional --omit=dev --ignore-scripts

ADD /daemon daemon

EXPOSE 8080

USER node

CMD ["node", "--experimental-strip-types", "daemon/index.ts"]

##########################
FROM node:22.9.0-alpine3.19 AS api

ENV NODE_ENV=production

WORKDIR /app

# reuse node_modules from installer and strip for production in a single layer
RUN --mount=type=bind,from=installer,source=/app,target=/installer-app \
    cp -rf /installer-app/* /app && \
    rm -rf /app/daemon && \
    rm -rf /app/ui && \
    npm ci -w api --no-audit --no-fund --omit=optional --omit=dev --ignore-scripts

COPY --from=types /app/api api
# COPY --from=ui /app/ui/dist /app/ui/dist

# artificially create a dependency to "daemon" target for better caching
COPY --from=daemon /app/package.json /app/package.json


EXPOSE 8080

USER node

CMD ["node", "--max-http-header-size", "64000", "--experimental-strip-types", "api/index.ts"]
