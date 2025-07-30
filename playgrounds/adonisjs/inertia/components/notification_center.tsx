import { useState } from 'react'
import type { Notification } from '@facteurjs/client'
import { Bell, BellRing, Check, Settings, X, Eye } from 'lucide-react'
import NotificationSettings from './notification_settings'
import { useMarkAllAsRead, useMarkAsRead, useNotifications } from '@facteurjs/react'

interface NotificationCenterProps {
  userId: string
  tenantId?: string
}

export default function NotificationCenter({ userId, tenantId }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  const markAsReadMutation = useMarkAsRead()
  const { data: notifications = [], isLoading } = useNotifications({
    tenantId,
    limit: 50,
    status: filter === 'all' ? undefined : filter,
  })

  const markAllAsReadMutation = useMarkAllAsRead()

  const unreadCount = notifications?.filter(
    (n) => n.status === 'unread' || n.status === 'unseen',
  ).length

  const formatNotificationContent = (notification: Notification) => {
    if (typeof notification.content === 'string') {
      return notification.content
    }

    if (notification.content.title && notification.content.body) {
      return { title: notification.content.title, body: notification.content.body }
    }

    return {
      title: notification.type.replace(/_/g, ' '),
      body: JSON.stringify(notification.content),
    }
  }

  const getNotificationIcon = (notification: Notification) => {
    if (notification.status === 'read') return <Check className="w-4 h-4 text-green-500" />
    if (notification.status === 'seen') return <Eye className="w-4 h-4 text-blue-500" />
    return <BellRing className="w-4 h-4 text-orange-500" />
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'read':
        return 'bg-green-50 border-green-200'
      case 'seen':
        return 'bg-blue-50 border-blue-200'
      case 'unread':
      case 'unseen':
      default:
        return 'bg-orange-50 border-orange-200'
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors duration-200"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[600px] flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {(['all', 'unread', 'read'] as const).map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${
                    filter === filterOption
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {filterOption}
                </button>
              ))}
            </div>
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={() => markAllAsReadMutation.mutate({ tenantId })}
                  disabled={markAllAsReadMutation.isPending}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  <Check className="w-3 h-3" />
                  Mark all read
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-2" />
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No notifications found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification: Notification) => {
                  const content = formatNotificationContent(notification)
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${getStatusColor(notification.status)}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {typeof content === 'object' && content.title ? (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                                    {content.title}
                                  </h4>
                                  <p className="text-sm text-gray-600 leading-relaxed">
                                    {content.body}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-900">
                                  {typeof content === 'string' ? content : JSON.stringify(content)}
                                </p>
                              )}
                            </div>

                            <div className="flex gap-1 ml-2">
                              {notification.status !== 'read' && (
                                <button
                                  onClick={() =>
                                    markAsReadMutation.mutate({
                                      notificationId: notification.id as string,
                                    })
                                  }
                                  className="text-green-600 hover:text-green-800 p-1 rounded"
                                  title="Mark as read"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                              {notification.status !== 'seen' && (
                                <button
                                  onClick={() =>
                                    markAsReadMutation.mutate({
                                      notificationId: notification.id as string,
                                    })
                                  }
                                  className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                  title="Mark as seen"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex gap-1">
                              {notification.tags?.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <time className="text-xs text-gray-500">
                              {new Date(notification.createdAt!).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setShowSettings(true)}
              className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center gap-1"
            >
              <Settings className="w-4 h-4" />
              Notification Settings
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <NotificationSettings
              userId={userId}
              tenantId={tenantId}
              onClose={() => setShowSettings(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
