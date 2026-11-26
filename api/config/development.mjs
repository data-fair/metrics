import dotenv from 'dotenv'

// .env fills the variables the environment does not set already (dotenv never overrides them), from the repo root
// or a workspace; the production names (PORT, PRIVATE_DIRECTORY_URL, MONGO_URL, MONGO_OPTIONS, PROMETHEUS_ACTIVE)
// override this file (custom-environment-variables.mjs)
dotenv.config({ path: ['.env', '../.env'], quiet: true })

if (!process.env.DEV_API_PORT) throw new Error('missing DEV_API_PORT env variable, run "npm run dev-deps" to create the .env file')

export default {
  port: Number(process.env.DEV_API_PORT),
  privateDirectoryUrl: `http://localhost:${process.env.SD_PORT}`,
  mongo: {
    url: `mongodb://localhost:${process.env.MONGO_PORT}/metrics-development`
  },
  // the observer listens on a fixed port (9090), the APIs of two checkouts would collide on it
  observer: {
    active: false
  }
}
