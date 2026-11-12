// the ports drawn in .env for this checkout (dev/dev.json "ports"), exported by `df-dev zellij`
if (!process.env.DEV_API_PORT) throw new Error('missing DEV_API_PORT env variable, run "npx --no df-dev setup" to create the .env file')

export default {
  port: Number(process.env.DEV_API_PORT),
  privateDirectoryUrl: `http://localhost:${process.env.SD_PORT}`,
  mongo: {
    url: `mongodb://localhost:${process.env.MONGO_PORT}/metrics-development`
  },
  // the observer listens on a fixed port (9090), the APIs of two worktrees would collide on it
  observer: {
    active: false
  }
}
