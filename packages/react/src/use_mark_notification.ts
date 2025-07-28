import type { MarkAsOptions, FacteurClient } from '@facteurjs/client'
import { useFacteur } from './index.js'
import { useMutation, mutationOptions, useQueryClient } from '@tanstack/react-query'

export const markNotificationMutationOptions = (client: FacteurClient) =>
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
