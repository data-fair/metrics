module.exports = {
  port: 8080,
  origin: null,
  directoryUrl: 'http://simple-directory:8080',
  mongo: {
    url: 'mongodb://mongo:27017/metrics',
    options: {}
  },
  observer: {
    active: true
  }
}
