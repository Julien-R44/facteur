import type { FacteurClient } from '@facteurjs/client'
import { useFacteur } from './index.js'
import { useMutation, mutationOptions, useQueryClient } from '@tanstack/react-query'

interface UseMarkAllAsSeenOptions {
  tenantId?: string
}

export const markAllAsSeenMutationOptions = (client: FacteurClient) =>
  mutationOptions({
    mutationFn: async (options: UseMarkAllAsSeenOptions = {}) => {
      return await client.notifications.markAllAsSeen(options)
    },
  })

export function useMarkAllAsSeen() {
  const client = useFacteur()
  const queryClient = useQueryClient()

  return useMutation({
    ...markAllAsSeenMutationOptions(client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facteur'] })
    },
  })
}
