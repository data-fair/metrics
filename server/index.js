
const config = require('config')
const udp = require('./udp')

udp.run().then(app => {
  console.log('UDP server listening on http://localhost:%s', config.udpPort)
}, err => {
  console.error('failure starting UDP server', err)
  process.exit(-1)
})

process.on('SIGTERM', function onSigterm () {
  console.info('Received SIGTERM signal, shutdown gracefully...')
  udp.stop().then(() => {
    console.log('shutting down now')
    process.exit()
  }, err => {
    console.error('Failure while stopping service', err)
    process.exit(-1)
  })
})
