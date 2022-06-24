
const config = require('config')
const udp = require('./udp')
const http = require('./http')
const prometheus = require('./utils/prometheus')

async function main () {
  if (config.mode.includes('http')) {
    await http.run()
    console.log('HTTP server listening on http://localhost:%s', config.port)
  }
  if (config.mode.includes('udp')) {
    await udp.run()
    console.log('UDP server listening on localhost:%s', config.udpPort)
  }
  await prometheus.start()
}

main().catch(err => {
  console.error('failure starting metrics servers', err)
  process.exit(-1)
})

process.on('SIGTERM', function onSigterm () {
  console.info('Received SIGTERM signal, shutdown gracefully...')
  Promise.all([udp.stop(), http.stop(), prometheus.stop()]).then(() => {
    console.log('shutting down now')
    process.exit()
  }, err => {
    console.error('Failure while stopping UDP server', err)
    process.exit(-1)
  })
})
