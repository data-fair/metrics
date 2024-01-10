# Contribution guidelines

## Prerequisites

Your IDE should ideally be [Visual Studio Code](https://code.visualstudio.com/) with the [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) and [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extensions.

The cornerstone of the dev environment is [Docker](https://docs.docker.com/engine/install/).

Everything else can be done inside docker if you do not want to install too much stuff locally. But for the best DX it is better to install [Node.js v18+](https://nodejs.org/) (probably through [nvm](https://github.com/nvm-sh/nvm)) and [Rust](https://www.rust-lang.org/tools/install).

## Install dependencies

Install npm dependencies for all workspaces:
```
npm install
```

Pull images at first and then once in a while:

```bash
ddocker compose pull
```

Then run the containers:

```bash
npm run dev-deps
```

## Work on @data-fair/metrics/ui

The UI is a [nuxt](https://nuxt.com/) project.

Run a development server (access it here http://localhost:6218/metrics/):

```
npm run dev-ui
```

## Work on @data-fair/metrics/api

The API is a small [https://expressjs.com](Express) server.

Run a development server (access it here http://localhost:6218/metrics/api/):

```
npm run dev-api
```

## Work on @data-fair/metrics/daemon

The daemon is a small nodejs application that listens for nginx logs on a unix datagram socket.

Run a development process:

```
npm run dev-daemon
```

## Working on types

Update the types based on schemas:

```
npm run build-types
```

## Building docker images

Build images:

```
docker build -f api/Dockerfile -t data-fair/metrics/api:dev .
docker build -f ui/Dockerfile -t data-fair/metrics/ui:dev .
docker build -f daemon/Dockerfile -t data-fair/metrics/daemon:dev .
```

```
docker compose --profile build build
```

Run built images (access the UI here http://localhost:6218/metrics/):

```
docker compose --profile build build run
```