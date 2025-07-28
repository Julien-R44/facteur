import type { FacteurClient } from '@facteurjs/client'
import { useFacteur } from './index.js'
import { useMutation, mutationOptions, useQueryClient } from '@tanstack/react-query'

interface UseMarkAsSeenOptions {
  notificationId: string
}

export const markAsSeenMutationOptions = (client: FacteurClient) =>
  mutationOptions({
    mutationFn: async (options: UseMarkAsSeenOptions) => {
      return await client.notifications.markAsSeen(options)
    },
  })

export function useMarkAsSeen() {
  const client = useFacteur()
  const queryClient = useQueryClient()

  return useMutation({
    ...markAsSeenMutationOptions(client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facteur'] })
    },
  })
}
