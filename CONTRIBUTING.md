# Contribution guidelines

## Prerequisites

- A Javascript/Typescript IDE with [Vue.js](https://vuejs.org/) and [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) support.
- A recent [Docker](https://docs.docker.com/engine/install/) installation.
- [Node.js v24+](https://nodejs.org/)

## Install dependencies

1. Install npm dependencies for all workspaces :

```sh
npm i
```

2. Build / Update the types based on schemas :

```sh
npm run build-types
```

## Start the development environment

```sh
npm run dev-zellij
```

*Note : This command will start a Zellij session with multiple panes, each one running a part of the project. You can also run the environment manually by running the commands below in different terminals.*

<details>
<summary>Services</summary>

- **Dev dependencies** : `npm run dev-deps`
- **UI** : `npm run dev-ui`
- **API** : `npm run dev-api`
- **Daemon** : `npm run dev-daemon`

</details>

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

First, you need to start the development dependencies:

```sh
npm run dev-deps
```

Then, you can run the tests:

```sh
npm run test
```

To run a specific test, you can mark it with `it.only` or `describe.only` in the test file, then run the tests with:

```sh
npm run test-only test-it/file-name.ts
```

The scope tests (`test-it/05-scopes.ts`) get scope-restricted sessions from the test non-human identity of `dev/resources/users.json` with `nhiSession(scope)` (`test-it/utils/nhi.ts`). They need a simple-directory image with the scoped token exchange (`SD_IMAGE` overrides the image of `docker-compose.yml`). The bearer token tests also need a simple-directory issuing access token audiences, and the export tests a scope-aware data-fair (`DF_IMAGE`): they are skipped without them.

The export calls data-fair at the public url of the site with lib-node's public http agent, which refuses private addresses (SSRF protection): the `test` and `dev` scripts set `SSRF_PUBLIC_IPS=127.0.0.1,::1` for the local stack.

## Scopes

metrics is scope-aware (`session.init(..., { scopeAware: true })`): a session whose token carries a `scope` claim (a non-human identity's token exchange today, OAuth clients later) can only be read on routes that checked a scope, otherwise it gets 403. Sessions without a `scope` claim are not affected.

- The vocabulary (the `metrics` family, declared with `defineScopes` from `@data-fair/lib-common-types/scopes.js`, which adds the global `all:read` / `all:write` / `all:admin`) and the operation table live in `api/src/scopes.ts`.
- Every new route that reads the session gets a row in `scopedOperations` and `requireOperationScope('<operationId>')` as its first handler. Without one it stays refused to scoped sessions, as `/api/admin` is on purpose.
- There is no global session middleware: routes read the session with `session.req*` or through `requireScope`, so the public routes do not depend on the caller's credentials.
- Calls to another service on behalf of the caller forward both its `cookie` and its `authorization` header, through the public url of the site (the audience of a bearer token is checked against it).
- `GET /api/api-docs.json` (`api/contract/api-docs.ts`) is the document data-fair merges into the platform document: keep it independent of the request origin, and build each operation's `security` from the table (`oauth2Alternatives`), not by hand.
