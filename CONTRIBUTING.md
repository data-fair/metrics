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
