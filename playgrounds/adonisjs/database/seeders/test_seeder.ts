import User from '#models/user'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    await User.createMany([
      {
        fullName: 'John Doe',
        email: 'julien@ripouteau.com',
        password: 'password',
      },
    ])
  }
}
