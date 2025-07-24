import { Head } from '@inertiajs/react'
import NotificationCenter from '../components/NotificationCenter'
import TestNotification from '~/components/TestNotification'

export default function Home() {
  return (
    <>
      <Head title="Facteur Notification System" />

      <div className="min-h-screen relative bg-gray-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Facteur</h1>
                <p className="text-gray-600"></p>
              </div>

              <div className="flex items-center gap-4">
                <NotificationCenter userId="1" />
              </div>
            </div>
          </div>
        </header>

        <main className="py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Facteur</h2>
                <p className="text-lg text-gray-600 mb-8">
                  A flexible notification system for NodeJS
                </p>
              </div>
            </div>

            <TestNotification />
          </div>
        </main>
      </div>
    </>
  )
}
