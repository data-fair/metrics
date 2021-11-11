const express = require('express')
const asyncWrap = require('../../utils/async-wrap')
const router = module.exports = express.Router()

router.get('', asyncWrap(async (req, res, next) => {
  console.log('BIM')
  res.send([])
}))
