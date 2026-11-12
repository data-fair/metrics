# Contribution guidelines

## Prerequisites

- A Javascript/Typescript IDE with [Vue.js](https://vuejs.org/) and [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) support.
- A recent [Docker](https://docs.docker.com/engine/install/) installation.
- [Node.js v24+](https://nodejs.org/)

## Install dependencies

```sh
npm ci
npx --no df-dev setup
```

`df-dev setup` (package `@data-fair/lib-dev`) writes the git-ignored `.env` of this checkout (free ports drawn for every service of `dev/dev.json`, `DEV_HOST`, `SSRF_PUBLIC_IPS`), builds the types and the UI.

## Start the development environment

Requires [zellij](https://zellij.dev/) >= 0.44.

```sh
npm run dev-zellij
```

The zellij session of this checkout starts the containers (status pane), then the UI, the API and the daemon (each pane restarts its process on file changes). The dev page is printed in the bottom line, `http://<DEV_HOST>:<NGINX_PORT>/metrics/dev`.

For agents and scripts:

| Need | Command |
|---|---|
| What runs, what is broken | `npx --no df-dev status` |
| A process's output | `npx --no df-dev logs <pane> -n 100` (`api`, `ui`, `daemon`) |
| Restart one process | `npx --no df-dev restart <pane>` |

Another branch in its own worktree, with its own ports, containers and session: `npx --no df-worktree <branch>` from this checkout, `npx --no df-worktree-delete <branch>` to remove it.

## Stop the development environment

```sh
npm run stop-dev-deps
```

## Building the Docker images

```sh
docker build --progress=plain --target=main -t data-fair/metrics:dev .
docker build --progress=plain --target=daemon -t data-fair/metrics/daemon:dev .
```

## Running the tests

The tests need the containers of the dev environment, and start their own API on `DEV_API_PORT`: stop the `api` pane first (Ctrl+C in the pane), restart it after.

Run the tests:

```sh
npm run test
```

To run a specific test, you can mark it with `it.only` or `describe.only` in the test file, then run the tests with:

```sh
npm run test-only test-it/file-name.ts
```

The scope tests (`test-it/05-scopes.ts`) get scope-restricted sessions from the test non-human identity of `dev/resources/users.json` with `nhiSession(scope)` (`test-it/utils/nhi.ts`). They need a simple-directory image with the scoped token exchange (`SD_IMAGE` overrides the image of `docker-compose.yml`). The bearer token tests also need a simple-directory issuing access token audiences, and the export tests a scope-aware data-fair (`DF_IMAGE`): they are skipped without them. Add these variables to the git-ignored `.env` file, docker compose reads it:

```
DF_IMAGE=ghcr.io/data-fair/data-fair:feat-autonomous-agents
```

The export calls data-fair at the public url of the site with lib-node's public http agent, which refuses private addresses (SSRF protection): `.env` sets `SSRF_PUBLIC_IPS` for the local stack.

## Scopes

metrics is scope-aware (`session.init(..., { scopeAware: true })`): a session whose token carries a `scope` claim (a non-human identity's token exchange today, OAuth clients later) can only be read on routes that checked a scope, otherwise it gets 403. Sessions without a `scope` claim are not affected.

- The vocabulary (the `metrics` family, declared with `defineScopes` from `@data-fair/lib-common-types/scopes.js`, which adds the global `all:read` / `all:write` / `all:admin`) and the operation table live in `api/src/scopes.ts`.
- Every new route that reads the session gets a row in `scopedOperations` and `requireOperationScope('<operationId>')` as its first handler. Without one it stays refused to scoped sessions, as `/api/admin` is on purpose.
- There is no global session middleware: routes read the session with `session.req*` or through `requireScope`, so the public routes do not depend on the caller's credentials.
- Calls to another service on behalf of the caller forward both its `cookie` and its `authorization` header, through the public url of the site (the audience of a bearer token is checked against it).
- `GET /api/api-docs.json` (`api/contract/api-docs.ts`) is the document data-fair merges into the platform document: keep it independent of the request origin, and build each operation's `security` from the table (`oauth2Alternatives`), not by hand.
