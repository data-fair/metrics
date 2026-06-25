import type { User as UserRef } from './types.ts'

// data-fair api keys are self-describing: the clear key is the base64url encoding of
// "<type>:<ownerId>[:<department>]:<random>" where <type> is 'u' (user) or 'o' (organization).
// cf data-fair api/src/settings/service.ts (commit "include owner inside api key for reverse proxy metrics").
// This lets us attribute api-key calls (which carry no id_token cookie) to their owner account.
// Opaque/random keys (legacy or superadmin keys) do not match this shape and yield null.
export const getUserFromApiKey = (apiKey: string): UserRef | null => {
  if (!apiKey) return null
  const parts = Buffer.from(apiKey, 'base64url').toString().split(':')
  if (parts.length < 3) return null
  const [type, ownerId] = parts
  if (!ownerId) return null
  if (type === 'u') return { id: ownerId }
  if (type === 'o') return { id: parts[parts.length - 1], organization: { id: ownerId } }
  return null
}
