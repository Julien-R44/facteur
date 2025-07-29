import type { NotificationFilter } from '@facteurjs/client'
import { useFacteur, type TypedFacteurClient } from './index.js'
import { queryOptions, useQuery } from '@tanstack/react-query'

interface UseNotificationsOptions extends NotificationFilter {}

export const listNotificationsQueryOptions = (
  options: UseNotificationsOptions,
  client: TypedFacteurClient,
) =>
  queryOptions({
    queryKey: ['facteur', 'notifications', client.notifiableId, options],
    queryFn: async () => {
      return await client?.notifications.list(options)
    },
  })

export function useNotifications(options: UseNotificationsOptions = {}) {
  const client = useFacteur()
  return useQuery(listNotificationsQueryOptions(options, client))
}
