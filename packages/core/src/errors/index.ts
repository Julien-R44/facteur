import { DuplicateNotificationException } from './duplicate_notification_exception.js'
import { createError } from '@poppinss/exception'

/**
 * Thrown when the notification targets for a channel cannot be determined
 * before sending the notification.
 */
export const E_UNAVAILABLE_TARGETS = createError<[channelName: string]>(
  `Not able to determine targets for channel "%s". Provide targets or implement 'notificationTargets()' method.`,
  'E_UNAVAILABLE_TARGETS',
  500,
)

/**
 * Thrown when the queue adapter is not set before using jobs specific features.
 */
export const E_QUEUE_NOT_SET = createError(
  `Queue adapter is not set. Set it via "setQueueAdapter" method before using jobs specific features.`,
  'E_QUEUE_NOT_SET',
  500,
)

export const errors = {
  E_DUPLICATE_NOTIFICATION: DuplicateNotificationException,
  E_UNAVAILABLE_TARGETS,
  E_QUEUE_NOT_SET,
}
