import { createError } from '@poppinss/exception'

import { E_DUPLICATE_NOTIFICATION } from './duplicate_notification_exception.ts'

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

/**
 * Thrown when a channel is not found in the configuration.
 */
export const E_CHANNEL_NOT_FOUND = createError<[channelName: string]>(
  `Channel "%s" is not registered. Make sure it is configured in the Facteur channels option.`,
  'E_CHANNEL_NOT_FOUND',
  500,
)

/**
 * Thrown when a `as<ChannelName>Message` method is not defined
 */
export const E_MISSING_MESSAGE_METHOD = createError<[channelName: string]>(
  `Notification is missing "as%sMessage" method. Define it to build the message content for the channel.`,
  'E_MISSING_MESSAGE_METHOD',
  500,
)

/**
 * Thrown when a send() operation fails. Could be due to one or more channels
 * failing to send the notification.
 */
export class E_SEND_NOTIFICATION_FAILED extends AggregateError {
  code = 'E_SEND_NOTIFICATION_FAILED'
  status = 500

  constructor(errors: Array<{ error: any }>) {
    const message = 'Failed to send notification due to errors in one or more channels.'

    super(errors, message)
  }
}

export const errors = {
  E_QUEUE_NOT_SET,
  E_CHANNEL_NOT_FOUND,
  E_UNAVAILABLE_TARGETS,
  E_DUPLICATE_NOTIFICATION,
  E_MISSING_MESSAGE_METHOD,
  E_SEND_NOTIFICATION_FAILED,
}
