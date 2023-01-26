import express from 'express'
const app = express()

app.get('/', function (req, res) {
  res.send('Hello World')
})

app.listen(6219)
console.log('listening on localhost:6219')
