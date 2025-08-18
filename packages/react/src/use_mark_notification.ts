import type { MarkAsOptions } from '@facteurjs/client/types'
import { useFacteur, type TypedFacteurClient } from './index.js'
import { useMutation, mutationOptions, useQueryClient } from '@tanstack/react-query'

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
      queryClient.invalidateQueries({ queryKey: ['facteur'] })
    },
  })
}
