module.exports = {
  port: 6200,
  udpPort: 51432,
  publicUrl: 'http://localhost:6200',
  httpLogs: {
    maxBulkSize: 10,
    maxBulkDelay: 10000
  },
  directoryUrl: 'http://localhost:6200/simple-directory',
  proxyNuxt: true,
  syslogSecret: 'secretdev1'
}
