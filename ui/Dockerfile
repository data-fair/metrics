###
# build nuxt application in first step of a multi-stage build
FROM node:18.14-alpine3.17 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# check lint rules here to enforce them
RUN npm run lint

RUN npm run build

###
# actual service image
FROM node:18.14-alpine3.17
MAINTAINER "contact@koumoul.com"

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY --from=build /app/.output /app/.output
RUN ls -a

EXPOSE 8080

ENV NODE_ENV production
ENV HOST 0.0.0.0
ENV PORT 8080
USER node

CMD ["dumb-init", "node", "--max-http-header-size", "64000", ".output/server/index.mjs"]