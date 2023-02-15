import { type Request, type Response, type NextFunction } from 'express'
import { Router } from 'express'
import asyncHandler from 'express-async-handler'
import { list, agg } from './service'

export const router = Router()

router.get('', asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.account) {
    res.status(401).send()
    return
  }
  const results = await list(req.session.account)
  res.send({ count: results.length, results })
}))

router.get('/_agg', asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.account) {
    res.status(401).send()
    return
  }
  const result = agg(req.session.account, req.query)
  res.send(result)
})

/*
router.get('/_agg', asyncWrap(async (req, res, next) => {
  if (!req.user) return res.status(401).send()
  
  res.send(result)
}))
*/
