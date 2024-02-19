##########################
# install root dev deps and build
FROM node:20.11.1-alpine3.19 AS builder

WORKDIR /app/

ADD /package.json .
ADD /package-lock.json .
RUN npm ci --workspaces=false --no-audit --no-fund --omit=optional

ADD shared shared
ADD api api
RUN npm run build-types-api

##########################
# install api prod deps
FROM node:20.11.1-alpine3.19 AS installer

RUN npm i -g clean-modules@3.0.4

WORKDIR /app/

ADD /package.json .
ADD /package-lock.json .
ADD /api/package.json api/
RUN npm pkg set scripts.prepare="echo 'skip prepare'"
RUN npm ci -w api --no-audit --no-fund --omit=optional --omit=dev &&\
    clean-modules --yes

# check that we don't have deps in local node_modules (sign of deps that couldn't be deduped)
RUN test ! -d proxy/node_modules

##########################
# copy deps and build and assemble actual dist
FROM node:20.11.1-alpine3.19

ENV NODE_ENV production

WORKDIR /app/

COPY --from=builder /app/shared /app/shared
COPY --from=builder /app/api /app/api
COPY --from=installer /app/node_modules /app/node_modules

ADD README.md .
ADD package.json .

WORKDIR /app/api

EXPOSE 8080

USER node

CMD ["node", "--max-http-header-size", "64000", "index.js"]
