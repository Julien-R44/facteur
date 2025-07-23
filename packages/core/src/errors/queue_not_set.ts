import { Exception } from '@poppinss/exception'

export class QueueNotSetException extends Exception {
  static override message =
    'Queue adapter not set. You must set a queue adapter in the Facteur configuration before using queue features.'
}
