module.exports = {
  socketPath: '',
  mongoUrl: 'mongodb://mongo:27017/metrics',
  prometheus: {
    active: true,
    port: 9090
  },
  maxBulkSize: 1000,
  maxDelayMS: 10 * 1000
}
