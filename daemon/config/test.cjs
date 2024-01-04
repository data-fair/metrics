module.exports = {
  socketPath: './dev/data/metrics.log.sock',
  mongoUrl: 'mongodb://localhost:27017/metrics-test',
  prometheus: {
    active: false
  },
  maxDelayMS: 100
}
