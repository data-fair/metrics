import { ofetch } from 'ofetch'
import { $sitePath } from '~/context'

export type OwnerRef = { type: 'user' | 'organization', id: string }

// the value of the owner filter of the aggregation route, also used as key of the labels
export const ownerKey = (owner: OwnerRef) => `${owner.type}:${owner.id}`

/**
 * The metrics only store the keys of the owners, their names are read from simple-directory.
 * A super admin in admin mode can list every account. An account that can not be resolved
 * (deleted since, or a listing refused) is left out and displayed by its id.
 */
export const fetchOwnerNames = async (owners: OwnerRef[]) => {
  const names: Record<string, string> = {}
  await Promise.all((['organization', 'user'] as const).map(async (type) => {
    const ids = [...new Set(owners.filter(o => o.type === type).map(o => o.id))]
    if (!ids.length) return
    try {
      const res = await ofetch(`${$sitePath}/simple-directory/api/${type}s`, { query: { ids: ids.join(','), size: ids.length } })
      for (const account of res.results) names[ownerKey({ type, id: account.id })] = account.name
    } catch {
      // keep the ids as labels
    }
  }))
  return names
}
