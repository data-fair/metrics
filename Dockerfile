FROM node:16.20-alpine
MAINTAINER "contact@koumoul.com"

ENV NODE_ENV production

RUN apk add --no-cache curl

# Installing dependencies in webapp directory
WORKDIR /webapp
ADD LICENSE .
ADD package.json .
ADD package-lock.json .
RUN npm install --production
ADD nodemon.json .

# Adding UI files
ADD public public
ADD nuxt.config.js .
ADD config config
RUN npm run build

# Adding server files
ADD server server
ADD README.md VERSION.json* .

# Default port of our webapps
EXPOSE 8080

# Check the HTTP server is started as health indicator
HEALTHCHECK --start-period=4m --interval=10s --timeout=3s CMD curl -f http://localhost:8080/ || exit 1

CMD ["node", "--max-http-header-size", "64000", "server"]
