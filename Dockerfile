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
# full deps install used for types and ui building
# also used to fill the npm cache for faster install api and daemon deps
RUN npm ci --omit=dev --omit=optional --omit=peer --no-audit --no-fund

##########################
FROM installer AS types

ADD api/types api/types
ADD api/doc api/doc
ADD api/config api/config
ADD daemon/config daemon/config
RUN npm run build-types

##########################
FROM installer AS ui

RUN npm i --no-save @rollup/rollup-linux-x64-musl
COPY --from=types /app/api/config api/config
ADD /api/src/config.ts api/src/config.ts
ADD /ui ui
RUN npm -w ui run build

##########################
FROM installer AS daemon-installer

RUN npm ci -w daemon --prefer-offline --omit=dev --omit=optional --omit=peer --no-audit --no-fund && \
    npx clean-modules --yes
RUN mkdir -p /app/daemon/node_modules
RUN du -sh .

##########################
FROM base AS daemon

COPY --from=daemon-installer /app/node_modules node_modules
ADD /daemon daemon
COPY --from=types /app/api/types api/types
COPY --from=types /app/daemon/config daemon/config
COPY --from=daemon-installer /app/daemon/node_modules daemon/node_modules
ADD package.json README.md LICENSE BUILD.json* ./
EXPOSE 9090
# USER node
WORKDIR /app/daemon
CMD ["node", "--experimental-strip-types", "index.ts"]

##########################
FROM installer AS api-installer

# remove other workspaces and reinstall, otherwise we can get rig have some peer dependencies from other workspaces
RUN npm ci -w api --prefer-offline --omit=dev --omit=optional --omit=peer --no-audit --no-fund && \
    npx clean-modules --yes "!exceljs/lib/doc/"
RUN mkdir -p /app/api/node_modules

##########################
FROM base AS main

COPY --from=api-installer /app/node_modules node_modules
ADD /api api
COPY --from=types /app/api/types api/types
COPY --from=types /app/api/doc api/doc
COPY --from=types /app/api/config api/config
COPY --from=api-installer /app/api/node_modules api/node_modules
COPY --from=ui /app/ui/dist ui/dist
ADD package.json README.md LICENSE BUILD.json* ./
# artificially create a dependency to "daemon" target for better caching in github ci
COPY --from=daemon /app/package.json package.json
EXPOSE 8080
EXPOSE 9090
USER node
WORKDIR /app/api
CMD ["node", "--max-http-header-size", "64000", "--experimental-strip-types", "index.ts"]
