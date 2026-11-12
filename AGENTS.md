# metrics

Contribution guide, dev environment and tests: [CONTRIBUTING.md](CONTRIBUTING.md).

## Dev environment

The user starts the zellij session (`npm run dev-zellij`), an agent never starts or kills it, and operates it
through `df-dev` (package `@data-fair/lib-dev`, always `npx --no`):

| Need | Command |
|---|---|
| What runs, what is broken | `npx --no df-dev status` |
| A process's output | `npx --no df-dev logs <pane> -n 100` (`api`, `ui`, `daemon`) |
| Restart one process | `npx --no df-dev restart <pane>` |
| New images of the containers | `npx --no df-dev pull` |

- Read the logs before restarting: nodemon and vite already reload on file changes.
- "not ready" from `restart`: report it with the logs, never retry in a loop.
- Never `docker compose restart`, `kill`, `zellij action`, nor `npm ci` / `npm install` while the env runs
  (the watchers restart on half-installed modules).
- The ports of this checkout are in `.env` (`dev/dev.json` "ports"), the dev page is
  `http://$DEV_HOST:$NGINX_PORT/metrics/dev`.
- The tests start their own API on `DEV_API_PORT`: they need the `api` pane stopped.

## Logging

Server code logs through `import log from '@data-fair/lib-node/log.js'` (the "Logging" section of the
`@data-fair/lib-node` README); eslint `no-console` applies to the api and daemon code. `code` is a static string,
ids go in their own fields, the error in `err`; `error` is for internal failures only.
