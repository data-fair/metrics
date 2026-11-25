# Contribution guidelines

## Prerequisites

- A Javascript/Typescript IDE with [Vue.js](https://vuejs.org/) and [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) support.
- A recent [Docker](https://docs.docker.com/engine/install/) installation.
- [Node.js v24+](https://nodejs.org/)

## Quick start

```sh
npm ci
npm run dev
```

Docker is required: nginx, simple-directory, data-fair, elasticsearch and mongo run in containers; the api, the ui
and the daemon run in the terminal (Ctrl+C stops them, their logs are in `dev/logs/`). The app is available at
<http://localhost:6150/metrics/dev>.

Then, in another terminal:

```sh
npm test
```

Pull images at first and then once in a while:

```sh
docker compose pull
```

## Run the development servers

The default ports (6150-6158) are in `dev/default.env`, copied to `.env` the first time: `.env` overrides
`dev/default.env` and is never overwritten. `npm run dev-deps` only starts the containers (extra arguments go to
docker compose); `npm run dev` accepts the same arguments.

Each dev process has its own npm script and reads its settings from environment variables (every key of
`dev/default.env`): `npm run dev-setup` (idempotent builds, no container), then `npm run dev:api`,
`npm run dev:ui` and `npm run dev:daemon`, each in its own terminal with the variables of `.env` exported. The
production names (`PORT`, `PRIVATE_DIRECTORY_URL`, `MONGO_URL`, `SOCKET_PATH`...) override the development
configs. `DEV_LOG_DIR` (default `dev/logs`) and `DEV_LOG_PREFIX` set where `npm run dev` writes the logs of the
processes.

nginx sends the access logs of the requests to data-fair to the daemon through a unix socket, as the production
ingress does: `dev/data/metrics.log.sock`, mounted at `/data` in the nginx container. The daemon creates it (with
`umask 0`, nginx runs as another user in its container); nginx drops the lines while it is missing. Listen on it
to debug: `umask 0 && nc -vkluU dev/data/metrics.log.sock`.

The fixed ports mean one environment per machine: stop the containers of one checkout
(`npm run stop-dev-deps`) before starting another.

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

The tests run with [Playwright](https://playwright.dev/), in `tests/features/<feature>/<name>.<unit|api|e2e>.spec.ts`:

- `unit`: pure functions (the daemon's parsing of a log line, the scopes, the agent surface), no server;
- `api`: the api and the daemon of the running dev environment, through nginx;
- `e2e`: the UI in chromium (`npx playwright install chromium` once), logged in by `tests/fixtures/login.ts`.

The dev environment is the test environment: the api and e2e tests write their fixtures in the development database,
in the prefixed test sub-space `test_metrics_`. Their accounts live in simple-directory's mongo storage
(`tests/support/sd-fixtures.ts`): the state setup cleans and seeds them through simple-directory's test API, under a
lock that refuses a second api/e2e run (`tests/support/stateful-lock.ts`). `clean()` and the state setup call
`DELETE /metrics/api/test-env?prefix=test_metrics_`, which removes only the daily metrics of the accounts of that
prefix (400 without a valid `test_<suite>_` prefix): other sub-spaces sharing the database are left alone. Every
test account uses the password `passwd`; `test_metrics_superadmin@test.com` is the simple-directory admin. The
repository ships no dev data: to play around manually, seed accounts of your own through the same test API
(`POST /api/test-env/seed` of simple-directory), under another prefix than `test_metrics_`. The pre-push hook (`dev/pre-push.sh`) runs the type check, the unit
tests, the `@smoke` set and the api/e2e spec files the push changes; the CI the whole `npm run quality`.

```sh
npm run test            # everything
npm run test-unit       # no dev env needed
npm run test-api
npm run test-e2e
npx playwright test tests/features/aggregation   # one feature
```

On a failure, `npx playwright show-trace test-results/<test>/trace.zip` shows the trace, with the last lines of the
api and daemon logs attached.

The scope tests (`tests/features/scopes/scopes.api.spec.ts`) get scope-restricted sessions from the test non-human identity `test_metrics_orga1_scope_nhi` (`tests/support/sd-fixtures.ts`) with `nhiSession(scope)` (`tests/support/nhi.ts`). They need a simple-directory image with the scoped token exchange (`SD_IMAGE` overrides the image of `docker-compose.yml`). The bearer token tests also need a simple-directory issuing access token audiences, and the export tests a scope-aware data-fair (`DF_IMAGE`): they are skipped without them. Add these variables to the git-ignored `.env` file, docker compose reads it:

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
