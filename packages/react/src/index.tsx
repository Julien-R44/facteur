import { createContext, useContext } from 'react'
import { type PropsWithChildren, useMemo } from 'react'
import { FacteurClient } from '@facteurjs/client'
import { createFacteurClient } from '@facteurjs/client'

interface FacteurProviderProps extends PropsWithChildren {
  notifiableId?: string | number
  apiUrl: string
}

/**
 * Must be extended user-land with module augmentation
 */
export interface DatabaseContent {}

export type TypedFacteurClient = FacteurClient<DatabaseContent>

export const FacteurContext = createContext<TypedFacteurClient | undefined>(undefined)
export function FacteurProvider({ children, notifiableId, apiUrl }: FacteurProviderProps) {
  const client = useMemo(() => {
    if (!notifiableId) return

    return createFacteurClient<DatabaseContent>({
      apiUrl,
      // Disabling retries since Tanstack Query has its own retry mechanism
      retry: 0,
      notifiableId: notifiableId.toString(),
    })
  }, [notifiableId, apiUrl])

  return <FacteurContext.Provider value={client}>{children}</FacteurContext.Provider>
}

export function useFacteur() {
  const client = useContext(FacteurContext)
  if (!client) throw new Error('useFacteur must be used within a FacteurProvider')

  return client
}

export * from './use_notifications.js'
export * from './use_mark_notification.js'
export * from './use_mark_as_read.js'
export * from './use_mark_as_seen.js'
export * from './use_mark_all_notifications.js'
export * from './use_mark_all_as_read.js'
export * from './use_mark_all_as_seen.js'
export * from './use_preferences.js'
export * from './use_update_preferences.js'
export * from '@facteurjs/client'
