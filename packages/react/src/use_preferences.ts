import type { Preferences } from '@facteurjs/client/types'

import { queryOptions, useQuery } from '@tanstack/react-query'

import type { QueryOptions } from './types.ts'

import { useFacteur, type TypedFacteurClient } from './index.tsx'

interface UsePreferencesOptions {
  tenantId?: string
}

export const listPreferencesQueryOptions = (
  options: UsePreferencesOptions = {},
  client: TypedFacteurClient,
): QueryOptions<Preferences, (string | undefined)[]> =>
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
