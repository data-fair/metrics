##########################
# install root dev deps and build
FROM node:20.11.1-alpine3.19 AS builder

RUN npm i -g clean-modules@3.0.4

WORKDIR /app/
ADD /package.json .
ADD /package-lock.json .
ADD /ui/package.json ui/

RUN npm -w ui --include-workspace-root ci --no-audit --no-fund
ADD /ui/ ui/
ADD /shared shared
RUN npm -w ui run build

##########################
# copy built app and assemble actual dist
FROM node:20.11.1-alpine3.19

ENV NODE_ENV production
ENV PORT 8080

WORKDIR /app/

COPY --from=builder /app/ui/.output /app/ui/.output

ADD README.md .
ADD package.json .

WORKDIR /app/ui

EXPOSE 8080

USER node

CMD ["node", "--max-http-header-size", "64000", ".output/server/index.mjs"]

