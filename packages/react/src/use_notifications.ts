import type { NotificationFilter, NotificationsList } from '@facteurjs/client/types'

import { queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query'

import type { QueryOptions } from './types.ts'

import { useFacteur, type TypedFacteurClient, type DatabaseContent } from './index.tsx'

interface UseNotificationsOptions extends NotificationFilter {}

export const listNotificationsQueryOptions = (
  options: UseNotificationsOptions,
  client: TypedFacteurClient,
): QueryOptions<NotificationsList<DatabaseContent>, (string | UseNotificationsOptions)[]> =>
  queryOptions({
    queryKey: ['facteur', 'notifications', 'list', client.notifiableId, options],
    queryFn: () => client.notifications.list(options),
  })

export function useNotifications(options: UseNotificationsOptions = {}) {
  const client = useFacteur()
  return useQuery(listNotificationsQueryOptions(options, client))
}

export function useInfiniteNotifications(options: Omit<UseNotificationsOptions, 'page'> = {}) {
  const client = useFacteur()

  return useInfiniteQuery({
    initialPageParam: 1,
    queryKey: ['facteur', 'notifications', 'infinite', client.notifiableId, options],
    queryFn: ({ pageParam }) => client.notifications.list({ ...options, page: pageParam }),
    getNextPageParam: (lastPage, _, lastPageParam) => {
      if (lastPage.length < (options.limit || 10)) return undefined
      return lastPageParam + 1
    },
  })
}
