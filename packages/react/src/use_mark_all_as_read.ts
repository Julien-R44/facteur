import type { FacteurClient } from '@facteurjs/client'
import { useFacteur } from './index.js'
import { useMutation, mutationOptions, useQueryClient } from '@tanstack/react-query'

interface UseMarkAllAsReadOptions {
  tenantId?: string
}

export const markAllAsReadMutationOptions = (client: FacteurClient) =>
  mutationOptions({
    mutationFn: async (options: UseMarkAllAsReadOptions = {}) => {
      return await client.notifications.markAllAsRead(options)
    },
  })

export function useMarkAllAsRead() {
  const client = useFacteur()
  const queryClient = useQueryClient()

  return useMutation({
    ...markAllAsReadMutationOptions(client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facteur'] })
    },
  })
}
