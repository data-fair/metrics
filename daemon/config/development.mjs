import dotenv from 'dotenv'

// the ports drawn in .env for this checkout (dev/dev.json "ports"), exported by `df-dev zellij`;
// read here too for a process started outside the session, from the repo root or a workspace
dotenv.config({ path: ['.env', '../.env'], quiet: true })

if (!process.env.MONGO_PORT) throw new Error('missing MONGO_PORT env variable, run "npx --no df-dev setup" to create the .env file')

export default {
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
