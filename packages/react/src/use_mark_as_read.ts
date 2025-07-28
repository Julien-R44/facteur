import type { FacteurClient } from '@facteurjs/client'
import { useFacteur } from './index.js'
import { useMutation, mutationOptions, useQueryClient } from '@tanstack/react-query'

interface UseMarkAsReadOptions {
  notificationId: string
}

export const markAsReadMutationOptions = (client: FacteurClient) =>
  mutationOptions({
    mutationFn: async (options: UseMarkAsReadOptions) => {
      return await client.notifications.markAsRead(options)
    },
  })

export function useMarkAsRead() {
  const client = useFacteur()
  const queryClient = useQueryClient()

  return useMutation({
    ...markAsReadMutationOptions(client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facteur'] })
    },
  })
}
