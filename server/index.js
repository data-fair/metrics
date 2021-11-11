
const config = require('config')
const udp = require('./udp')
const http = require('./http')

http.run().then(app => {
  console.log('HTTP server listening on http://localhost:%s', config.port)
}, err => {
  console.error('failure starting HTTP server', err)
  process.exit(-1)
})

udp.run().then(app => {
  console.log('UDP server listening on localhost:%s', config.udpPort)
}, err => {
  console.error('failure starting UDP server', err)
  process.exit(-1)
})

process.on('SIGTERM', function onSigterm () {
  console.info('Received SIGTERM signal, shutdown gracefully...')
  Promise.all([udp.stop(), http.stop()]).then(() => {
    console.log('shutting down now')
    process.exit()
  }, err => {
    console.error('Failure while stopping UDP server', err)
    process.exit(-1)
  })
})
