##########################
FROM node:22.9.0-alpine3.19 AS base

WORKDIR /app
ENV NODE_ENV=production

##########################
FROM base AS package-strip

RUN apk add --no-cache jq moreutils
ADD package.json package-lock.json ./
# remove version from manifest for better caching when building a release
RUN jq '.version="build"' package.json | sponge package.json
RUN jq '.version="build"' package-lock.json | sponge package-lock.json

##########################
FROM base AS installer

RUN apk add --no-cache python3 make g++ git jq moreutils
RUN npm i -g clean-modules@3.0.4
COPY --from=package-strip /app/package.json package.json
COPY --from=package-strip /app/package-lock.json package-lock.json
ADD ui/package.json ui/package.json
ADD api/package.json api/package.json
ADD daemon/package.json daemon/package.json
RUN npm ci --include=dev --omit=optional --omit=peer --no-audit --no-fund

##########################
FROM installer AS types

ADD api api
RUN npm run build-types

##########################
FROM installer AS ui

RUN npm i --no-save @rollup/rollup-linux-x64-musl
COPY --from=types /app/api/config api/config
COPY --from=types /app/api/src/config.ts api/src/config.ts
ADD /ui ui
RUN npm -w ui run build

##########################
FROM installer AS daemon-installer

# remove other workspaces and reinstall, otherwise we can get rig have some peer dependencies from other workspaces
RUN jq '.workspaces=["daemon"]' package.json | sponge package.json
RUN npm i --prefer-offline --omit=optional --omit=dev --omit=peer --no-audit --no-fund && \
    npx clean-modules --yes
RUN mkdir -p /app/daemon/node_modules

##########################
FROM base AS daemon

COPY --from=daemon-installer /app/node_modules node_modules
COPY --from=daemon-installer /app/daemon/node_modules daemon/node_modules
ADD /daemon daemon
ADD package.json README.md LICENSE BUILD.json* ./
EXPOSE 9090
USER node
CMD ["node", "--experimental-strip-types", "daemon/index.ts"]

##########################
FROM installer AS api-installer

# remove other workspaces and reinstall, otherwise we can get rig have some peer dependencies from other workspaces
RUN jq '.workspaces=["api"]' package.json | sponge package.json
RUN npm i --prefer-offline --omit=optional --omit=dev --omit=peer --no-audit --no-fund && \
    npx clean-modules --yes
RUN mkdir -p /app/api/node_modules

##########################
FROM base AS api

COPY --from=api-installer /app/node_modules node_modules
COPY --from=api-installer /app/api/node_modules api/node_modules
COPY --from=types /app/api api
COPY --from=ui /app/ui/dist ui/dist
ADD package.json README.md LICENSE BUILD.json* ./
# artificially create a dependency to "daemon" target for better caching in github ci
COPY --from=daemon /app/package.json package.json
EXPOSE 8080
EXPOSE 9090
USER node
CMD ["node", "--max-http-header-size", "64000", "--experimental-strip-types", "api/index.ts"]
