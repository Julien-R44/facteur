import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Settings, Save, RotateCcw, Bell, Mail, MessageSquare, Database } from 'lucide-react'

interface NotificationPreferences {
  global: {
    notifications: Array<{
      notification: { name: string; identifier: string }
      channels: Record<string, boolean>
    }>
    channels: Record<string, boolean>
  }
  tenants?: Record<string, any>
}

interface Channel {
  name: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

interface NotificationSettingsProps {
  userId: string
  tenantId?: string
  onClose?: () => void
}

const availableChannels: Channel[] = [
  {
    name: 'database',
    label: 'Database',
    icon: Database,
    description: 'Store notifications in database',
  },
  {
    name: 'mail',
    label: 'Email',
    icon: Mail,
    description: 'Send notifications via email',
  },
  {
    name: 'slack',
    label: 'Slack',
    icon: MessageSquare,
    description: 'Send notifications to Slack',
  },
  {
    name: 'discord',
    label: 'Discord',
    icon: MessageSquare,
    description: 'Send notifications to Discord',
  },
  {
    name: 'transmit',
    label: 'Real-time',
    icon: Bell,
    description: 'Send real-time notifications',
  },
]

export default function NotificationSettings({
  userId,
  tenantId,
  onClose,
}: NotificationSettingsProps) {
  const queryClient = useQueryClient()
  const [hasChanges, setHasChanges] = useState(false)

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['preferences', userId, tenantId],
    queryFn: async () => {
      const params = new URLSearchParams({ ...(tenantId && { tenantId }) })
      const response = await fetch(`/notifications/notifiable/${userId}/preferences?${params}`)
      if (!response.ok) throw new Error('Failed to fetch preferences')
      return response.json()
    },
  })

  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences | null>(null)

  // Initialize local preferences when data is loaded
  useEffect(() => {
    if (preferences) {
      console.log('Fetched preferences:', preferences)

      // Ensure preferences have the correct structure with defaults
      const normalizedPreferences: NotificationPreferences = {
        global: {
          notifications: preferences.global?.notifications || [],
          channels: preferences.global?.channels || {},
        },
        tenants: preferences.tenants || {},
      }

      setLocalPreferences(normalizedPreferences)
      setHasChanges(false)
    }
  }, [preferences])

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updatedPreferences: NotificationPreferences) => {
      const response = await fetch(`/notifications/notifiable/${userId}/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: updatedPreferences,
          ...(tenantId && { tenantId }),
        }),
      })
      if (!response.ok) throw new Error('Failed to update preferences')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences', userId] })
      setHasChanges(false)
    },
  })

  const updateGlobalChannelPreference = (channelName: string, enabled: boolean) => {
    if (!localPreferences) return

    const updated = {
      ...localPreferences,
      global: {
        ...localPreferences.global,
        channels: {
          ...localPreferences.global.channels,
          [channelName]: enabled,
        },
      },
    }

    setLocalPreferences(updated)
    setHasChanges(true)
  }

  const updateNotificationChannelPreference = (
    notificationIndex: number,
    channelName: string,
    enabled: boolean,
  ) => {
    if (!localPreferences) return

    const notifications = [...(localPreferences.global.notifications || [])]
    notifications[notificationIndex] = {
      ...notifications[notificationIndex],
      channels: {
        ...notifications[notificationIndex].channels,
        [channelName]: enabled,
      },
    }

    const updated = {
      ...localPreferences,
      global: {
        ...localPreferences.global,
        notifications,
      },
    }

    setLocalPreferences(updated)
    setHasChanges(true)
  }

  const resetToDefaults = () => {
    setLocalPreferences(preferences)
    setHasChanges(false)
  }

  const savePreferences = () => {
    if (localPreferences) {
      updatePreferencesMutation.mutate(localPreferences)
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading preferences...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!localPreferences) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Global Channel Settings */}
          <section className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Global Channel Preferences</h3>
            <p className="text-sm text-gray-600 mb-3">
              These settings apply to all notifications unless overridden by specific notification
              preferences.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {availableChannels.map((channel) => {
                const Icon = channel.icon
                const isEnabled = localPreferences.global.channels?.[channel.name] ?? true

                return (
                  <div
                    key={channel.name}
                    className={`border rounded-lg p-3 transition-colors ${
                      isEnabled ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon
                          className={`w-4 h-4 ${isEnabled ? 'text-blue-600' : 'text-gray-400'}`}
                        />
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{channel.label}</h4>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) =>
                            updateGlobalChannelPreference(channel.name, e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Per-Notification Settings */}
          {localPreferences.global.notifications &&
            localPreferences.global.notifications.length > 0 && (
              <section>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Per-Notification Preferences
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Override global settings for specific notification types.
                </p>

                <div className="space-y-4">
                  {localPreferences.global.notifications.map((notificationPref, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">
                        {notificationPref.notification.name}
                      </h4>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {availableChannels.map((channel) => {
                          const Icon = channel.icon
                          const isEnabled = notificationPref.channels?.[channel.name] ?? true

                          return (
                            <div key={channel.name} className="flex items-center gap-2">
                              <Icon
                                className={`w-4 h-4 ${isEnabled ? 'text-blue-600' : 'text-gray-400'}`}
                              />
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={(e) =>
                                    updateNotificationChannelPreference(
                                      index,
                                      channel.name,
                                      e.target.checked,
                                    )
                                  }
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                {channel.label}
                              </label>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={resetToDefaults}
            disabled={!hasChanges}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={savePreferences}
              disabled={!hasChanges || updatePreferencesMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
