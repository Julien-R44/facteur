import { useState } from 'react'
import { Head } from '@inertiajs/react'
import NotificationCenter from '../components/NotificationCenter'
import TestNotification from '~/components/TestNotification'
import TenancySelector from '../components/TenancySelector'

interface Organization {
  id: string
  name: string
  color: string
}

const defaultOrganization: Organization = {
  id: 'acme-corp',
  name: 'Acme Corporation',
  color: 'bg-blue-500',
}

export default function Home() {
  const [currentTenant, setCurrentTenant] = useState<Organization>(defaultOrganization)

  return (
    <>
      <Head title="Facteur Notification System" />

      <div className="min-h-screen relative bg-gray-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-6">
                <h1 className="text-2xl font-bold text-gray-900">Facteur</h1>
                <TenancySelector currentTenant={currentTenant} onTenantChange={setCurrentTenant} />
              </div>

              <div className="flex items-center gap-4">
                <NotificationCenter userId="1" tenantId={currentTenant.id} />
              </div>
            </div>
          </div>
        </header>

        <main className="py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Facteur</h2>
                <p className="text-lg text-gray-600 mb-4">
                  A flexible notification system for NodeJS
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <span>Currently viewing notifications for:</span>
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                    <div className={`w-2 h-2 rounded-full ${currentTenant.color}`} />
                    <span className="font-medium">{currentTenant.name}</span>
                  </div>
                </div>
              </div>
            </div>

            <TestNotification tenantId={currentTenant.id} />
          </div>
        </main>
      </div>
    </>
  )
}
