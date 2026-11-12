// the tests load .env (npm run test), the API they start serves the routes nginx sends to DEV_API_PORT
if (!process.env.DEV_API_PORT) throw new Error('missing DEV_API_PORT env variable, run "npx --no df-dev setup" to create the .env file')

export default {
  port: Number(process.env.DEV_API_PORT),
  privateDirectoryUrl: `http://localhost:${process.env.SD_PORT}`,
  mongo: {
    url: `mongodb://localhost:${process.env.MONGO_PORT}/metrics-test`
  },
  observer: {
    active: false
  }
}
