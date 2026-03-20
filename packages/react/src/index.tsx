import { createContext, useContext } from 'react'
import { type PropsWithChildren, useMemo } from 'react'
import { type FacteurClientConfig } from '@facteurjs/client/types'
import { createFacteurClient, FacteurClient } from '@facteurjs/client'

interface FacteurProviderProps extends PropsWithChildren, Omit<FacteurClientConfig, 'apiUrl'> {
  notifiableId?: string | number
  apiUrl: string
}

/**
 * Must be extended user-land with module augmentation
 */
export interface DatabaseContent {}

export type TypedFacteurClient = FacteurClient<DatabaseContent>

export const FacteurContext = createContext<TypedFacteurClient | undefined>(undefined)
export function FacteurProvider({
  children,
  notifiableId,
  apiUrl,
  ...kyOptions
}: FacteurProviderProps) {
  const serializedKyOptions = JSON.stringify(kyOptions)
  const client = useMemo(() => {
    if (!notifiableId) return

    return createFacteurClient<DatabaseContent>({
      apiUrl,
      // Disabling retries since Tanstack Query has its own retry mechanism
      retry: 0,
      notifiableId: notifiableId.toString(),
      ...kyOptions,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifiableId, apiUrl, serializedKyOptions])

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
