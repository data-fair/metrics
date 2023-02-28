module.exports = {
  port: 8080,
  publicUrl: null,
  directoryUrl: 'http://simple-directory:8080',
  mongoUrl: 'mongodb://mongo:27017/metrics',
  prometheus: {
    active: true,
    port: 9090
  }
}
