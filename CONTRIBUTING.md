# Contribution guidelines

## Prerequisites

  - A Javascript/Typescript IDE with [Vue.js](https://vuejs.org/)  and [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) support.
  - A recent [Docker](https://docs.docker.com/engine/install/) installation.
  - [Node.js v20+](https://nodejs.org/)

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
docker build --progress=plain --target=api -t data-fair/metrics/api:dev .
docker build --progress=plain --target=daemon -t data-fair/metrics/daemon:dev .
```
