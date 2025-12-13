/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />

import '../css/app.css'
// import './fcm'
import './webpush'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createInertiaApp } from '@inertiajs/react'
import { FacteurProvider } from '@facteurjs/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'

import { subscription } from './transmit'

const appName = import.meta.env.VITE_APP_NAME || 'AdonisJS'

export const queryClient = new QueryClient()

subscription.onMessage(() => {
  queryClient.invalidateQueries()
})

createInertiaApp({
  progress: { color: '#5468FF' },

  title: (title) => `${title} - ${appName}`,

  resolve: (name) => {
    return resolvePageComponent(`../pages/${name}.tsx`, import.meta.glob('../pages/**/*.tsx'))
  },

  setup({ el, App, props }) {
    createRoot(el).render(
      <QueryClientProvider client={queryClient}>
        <FacteurProvider apiUrl="http://localhost:3333" notifiableId={1}>
          <App {...props} />
        </FacteurProvider>
      </QueryClientProvider>,
    )
  },
})
