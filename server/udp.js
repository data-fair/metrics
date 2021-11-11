const config = require('config')
const dgram = require('dgram')
const { promisify } = require('util')
const eventToPromise = require('event-to-promise')

// Run app and return it in a promise
let server
exports.run = async () => {
  server = dgram.createSocket('udp4')
  server.on('message', (msg) => {
    const body = JSON.parse(msg.toString().replace(/.* nginx: /, ''))
    if (body.referer) {
      body.refererDomain = new URL(body.referer).hostname
      delete body.referer
    }
    if (body.status && !body.status.class) {
      if (body.status.code < 200) body.status.class = 'info'
      else if (body.status.code < 300) body.status.class = 'ok'
      else if (body.status.code < 400) body.status.class = 'redirect'
      else if (body.status.code < 500) body.status.class = 'clientError'
      else body.status.class = 'serverError'
    }
    console.log('UDP message', body)
  })
  server.bind(config.udpPort)
  await eventToPromise(server, 'listening')
}

exports.stop = async () => {
  if (server) {
    server.close = promisify(server.close)
    await server.close()
  }
}
