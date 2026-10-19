/**
 * Scope-restricted sessions: the test non-human identity exchanges an assertion for a session
 * limited to some scopes (cookie and bearer), cf test-it/utils/nhi.ts.
 */
import { describe, it, before, after } from 'node:test'
import { strict as assert } from 'node:assert'
import { decodeJwt, decodeProtectedHeader } from 'jose'
import { startApiServer, stopApiServer } from './utils/index.ts'
import { nhiSession } from './utils/nhi.ts'

describe('scope-restricted sessions', () => {
  before(startApiServer)
  after(stopApiServer)

  it('the token exchange issues a scoped session', async () => {
    const { accessToken } = await nhiSession('metrics:read')
    assert.equal(decodeJwt(accessToken).scope, 'metrics:read')
    assert.ok(decodeProtectedHeader(accessToken).kid?.startsWith('scoped-'))
  })

  it('metrics refuses a scoped session', async () => {
    const { cookieAx } = await nhiSession('metrics:read')
    await assert.rejects(cookieAx.get('/metrics/api/daily-api-metrics'), (err: any) => {
      assert.equal(err.status, 403)
      assert.match(err.data, /does not accept scope-restricted sessions/)
      return true
    })
  })

  it('an unscoped session of the identity is accepted', async () => {
    const { cookieAx } = await nhiSession()
    assert.equal((await cookieAx.get('/metrics/api/daily-api-metrics')).status, 200)
  })
})
