# Contribution guidelines

## Prerequisites

Your IDE should ideally be [Visual Studio Code](https://code.visualstudio.com/) with the [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) and [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extensions.

The cornerstone of the dev environment is [Docker](https://docs.docker.com/engine/install/).

Everything else can be done inside docker if you do not want to install too much stuff locally. But for the best DX it is better to install [Node.js v18+](https://nodejs.org/) (probably through [nvm](https://github.com/nvm-sh/nvm)) and [Rust](https://www.rust-lang.org/tools/install).

## Install service dependencies

Pull images at first and then once in a while:

```bash
ddocker compose pull
```

Then run the containers:

```bash
npm run dev-deps
```

## Work on @data-fair/metrics:ui

The UI is a [nuxt](https://nuxt.com/) project.

Install/update the dependencies:

```
cd ui
npm i
```

Run a development server (access it here http://localhost:6218/metrics/):

```
npm run dev-ui
```

## Work on @data-fair/metrics:api

The API is a small [https://expressjs.com](Express) server.

Install/update the dependencies:

```bash
cd api
npm i
```

Run a development server (access it here http://localhost:6218/metrics/api/):

```
npm run dev-api
```

## Working on types

Some types are managed using [JSON Schemas](https://json-schema.org/), [JSON Typedef](https://jsontypedef.com/) and related tools.

Update the types based on schemas:

```
docker compose run --rm jtd jtd-codegen api/src/types/config/config.jtd.json --typescript-out api/src/types/config
npx --package @koumoul/schema-jtd@0.1.1 schema2td api/src/types/config/config.schema.json api/src/types/config/config.jtd.json
```

## Building docker images

Build images:

```
docker compose --profile build build
```

Run built images (access the UI here http://localhost:6218/metrics/):

```
docker compose --profile build build run
```