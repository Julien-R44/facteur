import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface NotificationOption {
  id: string
  name: string
  description: string
  channels: {
    database: boolean
    transmit: boolean
    mail: boolean
    discord: boolean
    slack: boolean
  }
  tags: string[]
}

const availableNotifications: NotificationOption[] = [
  {
    id: 'InvoicePaidNotification',
    name: 'Invoice Paid',
    description: 'Notification sent when an invoice payment is processed',
    channels: {
      database: true,
      transmit: true,
      mail: true,
      discord: false,
      slack: false,
    },
    tags: ['Billing', 'Payment'],
  },
  {
    id: 'PostLikedNotification',
    name: 'Post Liked',
    description: "Notification sent when someone likes a user's post",
    channels: {
      database: true,
      transmit: true,
      mail: false,
      discord: true,
      slack: false,
    },
    tags: ['Social', 'Engagement'],
  },
]

export default function TestNotification() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<string>(
    availableNotifications[0].id,
  )
  const queryClient = useQueryClient()

  const selectedNotificationData = availableNotifications.find((n) => n.id === selectedNotification)

  const sendNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch('/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ identifier: notificationId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to send notification')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: () => {
      // Error handled in UI
    },
  })

  const handleSendNotification = async () => {
    setIsLoading(true)
    try {
      await sendNotificationMutation.mutateAsync(selectedNotification)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Send className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Test Notifications</h3>
          <p className="text-sm text-gray-600">
            Send a test notification to see the system in action
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Notification Selector */}
        <div>
          <label
            htmlFor="notification-select"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Select Notification Type
          </label>
          <select
            id="notification-select"
            value={selectedNotification}
            onChange={(e) => setSelectedNotification(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            {availableNotifications.map((notification) => (
              <option key={notification.id} value={notification.id}>
                {notification.name}
              </option>
            ))}
          </select>
        </div>

        {/* Notification Details */}
        {selectedNotificationData && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">{selectedNotificationData.name}</h4>
            <p className="text-sm text-gray-600 mb-4">{selectedNotificationData.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedNotificationData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Channels */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {Object.entries(selectedNotificationData.channels).map(([channel, enabled]) => (
                <div key={channel} className="flex items-center gap-2 text-xs">
                  <div
                    className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-400'}`}
                  ></div>
                  <span className="capitalize">
                    {channel === 'transmit' ? 'Real-time' : channel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleSendNotification}
          disabled={isLoading || sendNotificationMutation.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading || sendNotificationMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending notification...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send {selectedNotificationData?.name || 'Notification'}
            </>
          )}
        </button>

        {sendNotificationMutation.isSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800">
              Notification sent successfully! Check your notification center and database.
            </p>
          </div>
        )}

        {sendNotificationMutation.isError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">
              {sendNotificationMutation.error?.message ||
                'Failed to send notification. Please try again.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
