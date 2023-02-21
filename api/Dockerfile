###
# build server in first step of a multi-stage build
FROM node:18.14-alpine3.17 AS build

WORKDIR /app

COPY api/package*.json .
RUN npm ci

COPY api/src src
COPY types /types
RUN ls -l
# check lint rules here to enforce them
COPY api/.eslint* .
COPY api/tsconfig.json .
RUN npm run lint

# we use ncc to produce a lightweight single file dist
RUN npm run build

# cleanup /webapp/node_modules so it can be copied by next stage
# the only dependencies marked as production level are those
# that are treated as externals by ncc in "npm run build"
RUN npm prune --production && \
    rm -rf node_modules/.cache

###
# actual service image
FROM node:18.14-alpine3.17
MAINTAINER "contact@koumoul.com"

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY api/config config

EXPOSE 8080

ENV NODE_ENV production
USER node

CMD ["dumb-init", "node", "--max-http-header-size", "64000", "dist/index.js"]