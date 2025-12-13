import type { DateTime } from 'luxon'
import type { NotifiableTargets } from '@facteurjs/adonisjs/types'

import { BaseModel, column } from '@adonisjs/lucid/orm'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

// export function withNotifiable<Model extends LucidModel>() {
//   return function <Model extends NormalizeConstructor<typeof BaseModel>>(superclass: Model) {
//     class UserWithNotifiable extends superclass {
//       async notify<T extends Notification<Model>>(notification: T) {
//         return 'ok'
//       }
//     }
//     return UserWithNotifiable
//   }
// }

// const Notifiable = withNotifiable<User>()

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true }) declare id: number
  @column() declare fullName: string | null
  @column() declare email: string
  @column({ serializeAs: null }) declare password: string
  @column() declare discordWebHookUrl: string | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime

  notificationTargets(): NotifiableTargets {
    return {
      discord: { default: true, marketing: true },
      database: { notifiableId: this.id.toString() },
      slack: { default: true },
      transmit: { channel: `users/${this.id}` },
      mail: { email: this.email },
      twilio: { to: process.env.TWILIO_TO_DEBUG || '' },
      fcm: { token: process.env.FCM_DEBUG_TOKEN || '' },
      webpush: { subscription: JSON.parse(process.env.WEBPUSH_DEBUG_SUBSCRIPTION || '{}') },
    }
  }
}
