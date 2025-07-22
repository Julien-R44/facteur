import User from '#models/user'
import { Notification } from '@facteurjs/core/types'

export class LikedPostNotification extends Notification<User, any> {
  asEmailMessage() {
    return { subject: 'Post Liked', body: `Your post was liked !` }
  }

  asDiscordMessage() {
    return {
      content: 'Your post was liked!',
      embeds: [
        {
          title: 'Post Liked',
          description: 'Your post was liked by someone.',
          color: 0x00ff00,
        },
      ],
    }
  }
}

export class LikedPostWorkflow extends Workflow {
  async run(user: User) {
    await this.digest({
      key: 'liked_post',
      strategy: 'regular',
      wait: '5 minutes',
    })

    await facteur.sendNotification({
      message: new LikedPostNotification(),
      notifiable: user,
      via: { email: { default: true } },
    })
  }
}
