import dotenv from 'dotenv'

// .env fills the variables the environment does not set already (dotenv never overrides them), from the repo root
// or a workspace; the production names (SOCKET_PATH, MONGO_URL, MONGO_OPTIONS, OBSERVER_ACTIVE) override this file
// (custom-environment-variables.mjs)
dotenv.config({ path: ['.env', '../.env'], quiet: true })

if (!process.env.MONGO_PORT) throw new Error('missing MONGO_PORT env variable, run "npm run dev-deps" to create the .env file')

export default {
  // relative to daemon/, where npm run dev:daemon starts it; nginx's container mounts dev/data at /data
  socketPath: '../dev/data/metrics.log.sock',
  mongo: {
    url: `mongodb://localhost:${process.env.MONGO_PORT}/metrics-development`
  },
  observer: {
    active: false
  },
  // the tests wait for the metrics of their requests (production: 10 s)
  maxDelayMS: 1000
}
