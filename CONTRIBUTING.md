# Contribution guidelines

## Prerequisites

Your IDE should ideally be [Visual Studio Code](https://code.visualstudio.com/) with the [Volar extension](https://marketplace.visualstudio.com/items?itemName=Vue.volar).

The cornerstone of the whole dev environment is [Docker](https://docs.docker.com/engine/install/). You might want add an alias to the `docker compose` command, the rest of the document will abbreviate it as `dc`, also `docker compose run --rm` will be abbreviated as `dcr`.

```bash
# in ~/.bash_aliases
alias dc="docker compose"
alias dcr="docker compose run --rm"
```

Everything else can be done inside docker if you do not want to install too much stuff locally. But for the best DX it is better to install [Node.js v18+](https://nodejs.org/) (probably through [nvm](https://github.com/nvm-sh/nvm)) and [Rust](https://www.rust-lang.org/tools/install).

## Install service dependencies

```bash
dc pull
dc up -d
```

## Work on @data-fair/metrics:ui

The UI is a [nuxt](https://nuxt.com/) project.

Run a development server (access it here http://localhost:6218/metrics/):

```
cd ui
npm i
npm run dev
```

## Work on @data-fair/metrics:api

The API is a small [https://expressjs.com](Express) server.

Run a development server (access it here http://localhost:6218/metrics/api/):

```
cd api
npm i
npm run dev
```

## Working on types

Some types are shared between different parts of the project. We [JSON Typedef](https://jsontypedef.com/) and related tools to do so.

```
dcr jtd jtd-codegen contract/typedefs/api-config.jtd.json --typescript-out contract/typescript/api-config/
dcr jtd jtd-codegen contract/typedefs/session-user.jtd.json --typescript-out contract/typescript/session-user/
```

## Building docker images

Build images:

```
dc build api
dc build ui
```

Run built images (access the UI here http://localhost:6218/metrics/):

```
dcr api
dcr ui
```