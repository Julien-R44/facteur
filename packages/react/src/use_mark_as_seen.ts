import { useMutation, mutationOptions, useQueryClient } from '@tanstack/react-query'

import { useFacteur, type TypedFacteurClient } from './index.js'

interface UseMarkAsSeenOptions {
  notificationId: string
}

export const markAsSeenMutationOptions = (client: TypedFacteurClient) =>
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
      queryClient.invalidateQueries({ queryKey: ['facteur', 'notifications'] })
    },
  })
}
