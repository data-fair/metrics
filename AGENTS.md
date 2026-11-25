# metrics

Contribution guide, dev environment and tests: [CONTRIBUTING.md](CONTRIBUTING.md).

## Dev environment

Docker runs the containers (nginx, simple-directory, data-fair, elasticsearch, mongo); the api, the ui and the
daemon run as node processes. nginx sends the access logs of the data-fair requests that carry an `x-operation`
header to the daemon through a unix socket (`dev/data/metrics.log.sock`, `SOCKET_PATH`), as the production ingress
does.

- `npm run dev` — the containers (`npm run dev-deps`), then the api, the ui and the daemon in the terminal (Ctrl+C
  stops them), at `http://localhost:6150/metrics/dev`. Their logs are in `dev/logs/` (`DEV_LOG_DIR`,
  `DEV_LOG_PREFIX`).
- `npm run dev-deps` — the containers only, plus `npm run dev-setup`.
- `npm run dev-setup` — idempotent builds (types, ui), no container.
- `npm run dev:api`, `dev:ui`, `dev:daemon` — one process each, with the variables of `.env` exported.
- `npm run stop-dev-deps` — stops the containers.

Default ports (6150-6158) are in `dev/default.env`, copied to `.env` the first time: `.env` overrides it and is
never overwritten. Production names override the development configs: `PORT`, `PRIVATE_DIRECTORY_URL`,
`MONGO_URL`, `MONGO_OPTIONS`, `PROMETHEUS_ACTIVE` for the api, `SOCKET_PATH`, `MONGO_URL`, `MONGO_OPTIONS`,
`OBSERVER_ACTIVE` for the daemon.

- Read the logs before restarting: nodemon (api, daemon) and vite (ui) already reload on file changes.
- Do not start, stop or restart the dev processes or containers of the user: ask.
- Never `npm ci` / `npm install` while the env runs (the watchers restart on half-installed modules).
- The tests (`npm run test`, Playwright) run against the api, the daemon and (e2e) the ui, and empty the
  `daily-api-metrics` collection of the development database; `npm run test-unit` needs no dev env.

## Logging

Server code logs through `import log from '@data-fair/lib-node/log.js'` (the "Logging" section of the
`@data-fair/lib-node` README); eslint `no-console` applies to the api and daemon code. `code` is a static string,
ids go in their own fields, the error in `err`; `error` is for internal failures only.
