import type { NotificationFilter } from '@facteurjs/client/types'
import { useFacteur, type TypedFacteurClient } from './index.js'
import { queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query'

interface UseNotificationsOptions extends NotificationFilter {}

export const listNotificationsQueryOptions = (
  options: UseNotificationsOptions,
  client: TypedFacteurClient,
) =>
  queryOptions({
    queryKey: ['facteur', 'notifications', client.notifiableId, options],
    queryFn: () => client.notifications.list(options),
  })

export function useNotifications(options: UseNotificationsOptions = {}) {
  const client = useFacteur()
  return useQuery(listNotificationsQueryOptions(options, client))
}

export function useInfiniteNotifications(options: Omit<UseNotificationsOptions, 'page'> = {}) {
  const client = useFacteur()

  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: ['facteur', 'notifications', client.notifiableId, options],
    queryFn: ({ pageParam = 0 }) => client.notifications.list({ ...options, page: pageParam }),
    getNextPageParam: (lastPage, _, lastPageParam) => {
      if (lastPage.length < (options.limit || 10)) return undefined
      return lastPageParam + 1
    },
  })
}
