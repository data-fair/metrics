import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { Router } from 'express'
import { session } from '@data-fair/lib-express/index.js'

const router = Router()
export default router

// All routes in the router are only for the super admins of the service
router.use(async (req, res, next) => {
  await session.reqAdminMode(req)
  next()
})

let info: Record<string, string> = { version: process.env.NODE_ENV ?? 'development' }
if (process.env.NODE_ENV === 'production') {
  // written by CI, an image built outside CI must start without it
  try {
    info = JSON.parse(await readFile(resolve(import.meta.dirname, '../../BUILD.json'), 'utf8'))
  } catch {
    info = { version: 'unknown (built without CI)' }
  }
}
router.get('/info', (req, res) => {
  res.send(info)
})
