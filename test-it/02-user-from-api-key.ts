import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'
import { getUserFromApiKey } from '../daemon/src/user-from-api-key.ts'

// data-fair api keys are self-describing: base64url of "<u|o>:<ownerId>[:<department>]:<random>"
// cf data-fair api/src/settings/service.ts
const apiKey = (clear: string) => Buffer.from(clear).toString('base64url')

describe('getUserFromApiKey', () => {
  it('decodes a user-owned api key to its owner id', () => {
    assert.deepEqual(getUserFromApiKey(apiKey('u:user-123:R4nd0m')), { id: 'user-123' })
  })

  it('decodes an organization-owned api key to its organization id', () => {
    const user = getUserFromApiKey(apiKey('o:org-456:R4nd0m'))
    assert.equal(user?.organization?.id, 'org-456')
  })

  it('decodes an organization api key that includes a department', () => {
    const user = getUserFromApiKey(apiKey('o:org-456:dep-1:R4nd0m'))
    assert.equal(user?.organization?.id, 'org-456')
  })

  it('returns null for a random opaque key (e.g. legacy or superadmin key)', () => {
    assert.equal(getUserFromApiKey(apiKey('a random token without structure')), null)
  })

  it('returns null for an empty key', () => {
    assert.equal(getUserFromApiKey(''), null)
  })
})
