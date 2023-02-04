# Contribution guidelines

## Prerequisites

Your IDE should ideally be [Visual Studio Code](https://code.visualstudio.com/) with the [Volar extension](https://marketplace.visualstudio.com/items?itemName=Vue.volar).

The cornerstone of the whole dev environment is [Docker](https://docs.docker.com/engine/install/) as everything else runs inside docker containers. You might want add an alias to the `docker compose` command, the rest of the document will abbreviate it as `dc`, also `docker compose run --rm` will be abbreviated as `dcr`.

```bash
# in ~/.bash_aliases
alias dc="docker compose"
alias dcr="docker compose run --rm"
```

## Install dependencies

```bash
dc pull
dcr ui npm install
drc api npm install
dcr log-proc cargo build
```

You can run most commands through docker. For example adding a dependency to the API looks like this:

```bash
dcr api npm install my-dependency
```

## Build types from contracts

```
dcr api jtd-codegen /app/config/config.jtd.json --typescript-out /app/types
```

## Run development servers

First run all related services (reverse proxy, database, data-fair, etc.):

```bash
dc up -d
```

Then the API development server:

```
dcr api
```

And in another shell the UI development server:

```
dcr ui
```

Then open http://localhost:6218

## Work on docker images

Build images:

```
dc build api-built
dc build ui-built
```

