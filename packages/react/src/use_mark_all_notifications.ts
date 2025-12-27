import type { MarkAllAsOptions } from '@facteurjs/client/types'

import { useMutation, mutationOptions, useQueryClient } from '@tanstack/react-query'

import { useFacteur, type TypedFacteurClient } from './index.js'

export const markAllNotificationsMutationOptions = (client: TypedFacteurClient) =>
  mutationOptions({
    mutationFn: async (options: MarkAllAsOptions) => {
      return await client.notifications.markAllAs(options)
    },
  })

export function useMarkAllNotifications() {
  const client = useFacteur()
  const queryClient = useQueryClient()

  return useMutation({
    ...markAllNotificationsMutationOptions(client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facteur', 'notifications'] })
    },
  })
}
