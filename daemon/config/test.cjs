module.exports = {
  socketPath: './dev/data/metrics.log.sock',
  mongo: {
    url: 'mongodb://localhost:27017/metrics-test'
  },
  observer: {
    active: false
  },
  maxDelayMS: 100
}
