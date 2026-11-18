import type { LogLine } from '../../../daemon/src/types.ts'
import { test, expect } from '@playwright/test'
import { getUserFromApiKey } from '../../../daemon/src/user-from-api-key.ts'
import { parseLogLine, getRefererInfo, getUser, lineMetric } from '../../../daemon/src/operations.ts'

// data-fair api keys are self-describing: base64url of "<u|o>:<ownerId>[:<department>]:<random>"
// cf data-fair api/src/settings/service.ts
const apiKey = (clear: string) => Buffer.from(clear).toString('base64url')

// an id_token cookie as simple-directory sets it, only its payload is read
const idToken = (payload: object) => `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`

// a line of the nginx log_format "metrics" (dev/resources/nginx.conf.template)
const logLine = (fields: Partial<Record<'host' | 'referer' | 'owner' | 'idToken' | 'idTokenOrg' | 'apiKey' | 'resource' | 'operation' | 'gzipRatio', string>> & { status?: number, bytes?: number } = {}): LogLine => [
  fields.host ?? 'localhost',
  fields.referer ?? '',
  0.5,
  fields.bytes ?? 1000,
  fields.status ?? 200,
  fields.owner ?? '{"type":"user","id":"user1","name":"User 1"}',
  fields.idToken ?? '',
  fields.idTokenOrg ?? '',
  fields.apiKey ?? '',
  '',
  '',
  'MISS',
  fields.resource ?? '{"type":"datasets","id":"d1","title":"Dataset%201"}',
  fields.operation ?? '{"class":"read","id":"readLines","track":"readDataAPI"}',
  fields.gzipRatio ?? '-'
]

test.describe('getUserFromApiKey', () => {
  test('decodes a user-owned api key to its owner id', () => {
    expect(getUserFromApiKey(apiKey('u:user-123:R4nd0m'))).toEqual({ id: 'user-123' })
  })

  test('decodes an organization-owned api key to its organization id', () => {
    expect(getUserFromApiKey(apiKey('o:org-456:R4nd0m'))?.organization?.id).toBe('org-456')
  })

  test('decodes an organization api key that includes a department', () => {
    expect(getUserFromApiKey(apiKey('o:org-456:dep-1:R4nd0m'))?.organization?.id).toBe('org-456')
  })

  test('returns null for a random opaque key (e.g. legacy or superadmin key)', () => {
    expect(getUserFromApiKey(apiKey('a random token without structure'))).toBeNull()
  })

  test('returns null for an empty key', () => {
    expect(getUserFromApiKey('')).toBeNull()
  })
})

test.describe('parseLogLine', () => {
  test('reads the JSON message after the syslog tag', () => {
    const line = logLine()
    expect(parseLogLine(`<190>Nov 18 12:00:00 df: ${JSON.stringify(line)}`)).toEqual(line)
  })

  test('refuses a line without the tag', () => {
    expect(() => parseLogLine('<190>Nov 18 12:00:00 other: []')).toThrow()
  })
})

test.describe('referer', () => {
  const cases: Array<{ referer: string, expected: [string, string | undefined, string] }> = [
    { referer: 'http://localhost/data-fair/dataset/some-dataset', expected: ['localhost', undefined, 'backoffice'] },
    { referer: 'http://localhost/data-fair/embed/dataset/some-dataset', expected: ['localhost', undefined, 'embed'] },
    { referer: 'http://localhost/data-fair/app/carte/', expected: ['localhost', 'carte', 'app'] },
    { referer: 'http://localhost/mcp', expected: ['localhost', undefined, 'mcp'] },
    // the embedding site given by data-fair in the referer query param
    { referer: 'http://localhost/data-fair/embed/dataset/d1?referer=a.fr', expected: ['a.fr', undefined, 'embed'] },
    // another host is never internal traffic, whatever its path
    { referer: 'http://external-site.com/data-fair/embed/dataset/some-dataset', expected: ['external-site.com', undefined, 'other'] },
    { referer: '', expected: ['none', undefined, 'other'] },
    { referer: 'not an url', expected: ['not an url', undefined, 'other'] }
  ]
  for (const { referer, expected } of cases) {
    test(`classifies "${referer}"`, () => {
      expect(getRefererInfo(logLine({ referer }))).toEqual(expected)
    })
  }
})

test.describe('user class', () => {
  const userClass = (fields: Parameters<typeof logLine>[0]) => lineMetric(logLine(fields))?.patchKey.userClass

  test('anonymous without a session or an api key', () => {
    expect(userClass({})).toBe('anonymous')
  })

  test('owner from the session of the owner', () => {
    expect(userClass({ idToken: idToken({ id: 'user1', organizations: [] }) })).toBe('owner')
  })

  test('owner from the session of a member switched on the owner organization', () => {
    expect(userClass({
      owner: '{"type":"organization","id":"orga1","name":"Orga 1"}',
      idToken: idToken({ id: 'user2', organizations: [{ id: 'orga1' }] }),
      idTokenOrg: 'orga1'
    })).toBe('owner')
  })

  test('external from the session of another user', () => {
    expect(userClass({ idToken: idToken({ id: 'user2', organizations: [] }) })).toBe('external')
  })

  test('the api key suffix', () => {
    expect(userClass({ apiKey: apiKey('u:user1:R4nd0m') })).toBe('ownerAPIKey')
    expect(userClass({ apiKey: apiKey('u:user2:R4nd0m') })).toBe('externalAPIKey')
  })

  test('a malformed session cookie counts as anonymous', () => {
    expect(getUser(logLine({ idToken: 'not.base64-json' }))).toBeNull()
    expect(userClass({ idToken: 'not.base64-json' })).toBe('anonymous')
  })
})

test.describe('lineMetric', () => {
  test('the key and the increments of the daily metric', () => {
    const metric = lineMetric(logLine({ referer: 'http://localhost/data-fair/dataset/d1', gzipRatio: '2' }), new Date(2026, 2, 1, 12))
    expect(metric?.patchKey).toEqual({
      'owner.type': 'user',
      'owner.id': 'user1',
      day: '2026-03-01',
      'resource.type': 'datasets',
      'resource.id': 'd1',
      operationTrack: 'readDataAPI',
      statusClass: 'ok',
      userClass: 'anonymous',
      refererDomain: 'localhost',
      refererCategory: 'backoffice'
    })
    expect(metric?.bytes).toBe(2000)
    expect(metric?.duration).toBe(0.5)
    expect(metric?.set()).toMatchObject({ owner: { type: 'user', id: 'user1' }, resource: { title: 'Dataset 1' } })
  })

  test('the department of the owner is part of the key', () => {
    const metric = lineMetric(logLine({ owner: '{"type":"organization","id":"orga1","department":"dep1"}' }))
    expect(metric?.patchKey['owner.department']).toBe('dep1')
  })

  test('the status class', () => {
    expect(lineMetric(logLine({ status: 304 }))?.statusClass).toBe('redirect')
    expect(lineMetric(logLine({ status: 404 }))?.statusClass).toBe('clientError')
    expect(lineMetric(logLine({ status: 502 }))?.statusClass).toBe('serverError')
  })

  test('ignores a line without operation, owner or resource', () => {
    expect(lineMetric(logLine({ operation: '' }))).toBeNull()
    expect(lineMetric(logLine({ owner: '' }))).toBeNull()
    expect(lineMetric(logLine({ resource: '' }))).toBeNull()
  })
})
