import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { NotifiableTargets, Notification } from '@facteurjs/core/types'
import { InvoicePaidNotification } from '../notifications/invoice_paid_notification.js'
import { NormalizeConstructor } from '@adonisjs/core/types/helpers'
import { LucidModel } from '@adonisjs/lucid/types/model'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

// interface UserWithNotifiableClass<Model extends NormalizeConstructor<typeof BaseModel>> {
//   notify<T extends Notification<Model>>(notification: T): Promise<any>
// }

export function withNotifiable<Model extends LucidModel>() {
  return function <Model extends NormalizeConstructor<typeof BaseModel>>(superclass: Model) {
    class UserWithNotifiable extends superclass {
      async notify<T extends Notification<Model>>(notification: T) {
        return 'ok'
      }
    }
    return UserWithNotifiable
  }
}

const Notifiable = withNotifiable<User>()

export default class User extends compose(BaseModel, AuthFinder, Notifiable) {
  @column({ isPrimary: true }) declare id: number
  @column() declare fullName: string | null
  @column() declare email: string
  @column({ serializeAs: null }) declare password: string

  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime | null

  // async notify<T extends Notification<any>>(notification: T) {
  //   facteur.send({ notification: new InvoicePaidNotification(), notifiable })
  // }

  notificationTargets(): NotifiableTargets {
    return {
      discord: { default: true },
    }
  }
}
