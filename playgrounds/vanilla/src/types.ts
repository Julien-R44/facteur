import type { Notifiable } from '@facteurjs/core/types'

export interface User extends Notifiable {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}
