module.exports = {
  socketPath: '',
  mongo: {
    url: 'mongodb://mongo:27017/metrics',
    options: {}
  },
  observer: {
    active: true
  },
  maxBulkSize: 1000,
  maxDelayMS: 10 * 1000
}
