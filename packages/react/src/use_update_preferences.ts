import type { UpdatePreferencesOptions } from '@facteurjs/client/types'
import { useFacteur, type TypedFacteurClient } from './index.js'
import { useMutation, mutationOptions, useQueryClient } from '@tanstack/react-query'

export const updatePreferencesMutationOptions = (client: TypedFacteurClient) =>
  mutationOptions({
    mutationFn: async (options: UpdatePreferencesOptions) => {
      return await client.preferences.update(options)
    },
  })

export function useUpdatePreferences() {
  const client = useFacteur()
  const queryClient = useQueryClient()

  return useMutation({
    ...updatePreferencesMutationOptions(client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facteur'] })
    },
  })
}
