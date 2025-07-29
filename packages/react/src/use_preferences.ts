import { useFacteur, type TypedFacteurClient } from './index.js'
import { queryOptions, useQuery } from '@tanstack/react-query'

interface UsePreferencesOptions {
  tenantId?: string
}

export const listPreferencesQueryOptions = (
  options: UsePreferencesOptions = {},
  client: TypedFacteurClient,
) =>
  queryOptions({
    queryKey: ['facteur', 'preferences', client.notifiableId, options.tenantId],
    queryFn: async () => {
      return await client.preferences.list(options)
    },
  })

export function usePreferences(options: UsePreferencesOptions = {}) {
  const client = useFacteur()
  return useQuery(listPreferencesQueryOptions(options, client))
}
