import { useMutation, mutationOptions, useQueryClient } from '@tanstack/react-query'

import { useFacteur, type TypedFacteurClient } from './index.js'

interface UseMarkAllAsReadOptions {
  tenantId?: string
}

export const markAllAsReadMutationOptions = (client: TypedFacteurClient) =>
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
