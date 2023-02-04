import express from 'express'
import config from './config'
const app = express()

app.use((req, res, next) => {
  console.log('originalUrl', req.originalUrl)
  next()
})

app.get('/v1/hello', function (req, res) {
  res.send('Hello World !')
})

app.listen(6219)
console.log(`listening on localhost:6219, exposed on ${config.publicUrl}`)
