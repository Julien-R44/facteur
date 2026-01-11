import { useMutation, mutationOptions, useQueryClient } from '@tanstack/react-query'

import { useFacteur, type TypedFacteurClient } from './index.tsx'

interface UseMarkAllAsSeenOptions {
  tenantId?: string
}

export const markAllAsSeenMutationOptions = (client: TypedFacteurClient) =>
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
      queryClient.invalidateQueries({ queryKey: ['facteur', 'notifications'] })
    },
  })
}
