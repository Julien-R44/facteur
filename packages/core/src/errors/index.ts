import { QueueNotSetException } from './queue_not_set.js'
import { DuplicateNotificationException } from './duplicate_notification_exception.js'

export const errors = {
  E_QUEUE_NOT_SET: QueueNotSetException,
  E_DUPLICATE_NOTIFICATION: DuplicateNotificationException,
}
