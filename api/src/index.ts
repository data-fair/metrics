import { start, stop } from '~/server'

start().catch((err) => {
  console.error('failure at startup', err)
  process.exit(-1)
})

process.on('SIGTERM', () => {
  console.info('received SIGTERM signal, shutdown gracefully...')
  stop().then(
    () => process.exit(0),
    (err) => {
      console.error('error while shutting down', err)
      process.exit(1)
    })
})
