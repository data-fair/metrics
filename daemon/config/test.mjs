if (!process.env.MONGO_PORT) throw new Error('missing MONGO_PORT env variable, run "npx --no df-dev setup" to create the .env file')

export default {
  socketPath: './dev/data/metrics.log.sock',
  mongo: {
    url: `mongodb://localhost:${process.env.MONGO_PORT}/metrics-test`
  },
  observer: {
    active: false
  },
  maxDelayMS: 100
}
