import { ofetch } from 'ofetch'
import { $sitePath } from '~/context'

export type OwnerRef = { type: 'user' | 'organization', id: string }

// the value of the owner filter of the aggregation route, also used as key of the labels
export const ownerKey = (owner: OwnerRef) => `${owner.type}:${owner.id}`

export const parseOwnerKey = (key: string): OwnerRef => {
  const [type, id] = key.split(':')
  return { type: type as OwnerRef['type'], id }
}

// the ids go in the query string, a bounded number per request keeps the url short
const chunkSize = 100

/**
 * The metrics only store the keys of the owners, their names are read from simple-directory.
 * A super admin in admin mode can list every account. An account that can not be resolved
 * (deleted since, or a listing refused) gets its id as name, so it is not requested again.
 */
export const fetchOwnerNames = async (owners: OwnerRef[]) => {
  const names: Record<string, string> = {}
  const requests: Promise<void>[] = []
  for (const type of ['organization', 'user'] as const) {
    const ids = [...new Set(owners.filter(o => o.type === type).map(o => o.id))]
    for (const id of ids) names[ownerKey({ type, id })] = id
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize)
      requests.push((async () => {
        try {
          const res = await ofetch(`${$sitePath}/simple-directory/api/${type}s`, { query: { ids: chunk.join(','), size: chunk.length } })
          for (const account of res.results) names[ownerKey({ type, id: account.id })] = account.name
        } catch (err) {
          console.warn('failed to fetch the names of some accounts', err)
        }
      })())
    }
  }
  await Promise.all(requests)
  return names
}
