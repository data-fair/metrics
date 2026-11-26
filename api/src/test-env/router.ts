// unauthenticated and destructive: only mounted in development, by a dynamic import in app.ts

import { Router } from 'express'
import mongo from '#mongo'

const router = Router()
export default router

// Prefixed test sub-spaces: a test suite owns the accounts whose ids start with its own prefix (test_<suite>_)
// and what they own here, cleaned without touching the other suites nor the unprefixed accounts
const testPrefixRegexp = /^test_[a-z0-9]+(?:_[a-z0-9]+)*_$/

// DELETE /?prefix=test_<suite>_: the daily metrics (the only collection metrics writes) of the accounts whose ids
// start with the prefix
router.delete('', async (req, res) => {
  const prefix = req.query.prefix
  if (typeof prefix !== 'string' || !testPrefixRegexp.test(prefix)) {
    res.status(400).send('invalid test prefix')
    return
  }
  // the prefix only holds [a-z0-9_], safe in a regexp
  await mongo.dailyApiMetrics.deleteMany({ 'owner.id': new RegExp('^' + prefix) })
  res.status(204).send()
})
