import type { MarkAsOptions } from '@facteurjs/client/types'

import { useMutation, mutationOptions, useQueryClient } from '@tanstack/react-query'

import { useFacteur, type TypedFacteurClient } from './index.tsx'

export const markNotificationMutationOptions = (client: TypedFacteurClient) =>
  mutationOptions({
    mutationFn: async (options: MarkAsOptions) => {
      return await client.notifications.markAs(options)
    },
  })

export function useMarkNotification() {
  const client = useFacteur()
  const queryClient = useQueryClient()

  return useMutation({
    ...markNotificationMutationOptions(client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facteur', 'notifications'] })
    },
  })
}
