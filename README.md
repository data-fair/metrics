# <img alt="Data FAIR logo" src="https://cdn.jsdelivr.net/gh/data-fair/data-fair@master/public/assets/logo.svg" width="40"> @data-fair/metrics

*A service to help monitoring the data-fair stack.*

## Development environment

Install dependencies and launch service dependencies with docker-compose:

    npm i
    docker-compose up -d

Run the 2 development servers with these commands in separate shells:

    npm run dev-server
    npm run dev-client

When both servers are ready, go to [http://localhost:5608](http://localhost:5608) and chose an account in `test/resources/users.json` to login with its email.
