import User from '#models/user'
import { Notification, ViaParameters, ViaResult } from '@facteurjs/core/types'
import { DiscordMessage } from '@facteurjs/discord'
import { SlackMessage } from '@facteurjs/slack'

export class InvoicePaidNotification extends Notification<User, any> {
  via(options: ViaParameters<User>): ViaResult {
    return ['slack', 'database'] as const
  }

  toDiscord() {
    return DiscordMessage.create().setBotUsername('Test').setBody('Invoice paid')
  }

  toSlack(): SlackMessage {
    const result = SlackMessage.create()
      .setText('Hello from Facteur!')
      .setBotUsername('Facteur Bot')
      .setBotIconEmoji(':robot_face:')
      .setChannel('#general')
      .setUnfurlLinks(true)

      // Ajouter un header block
      .addHeaderBlock('🚀 Notification importante')

      // Ajouter un section block avec du texte et des champs
      .addSectionBlock((section) =>
        section
          .setMarkdownText(
            '*Voici votre notification quotidienne*\n\nTout va bien dans votre application!'
          )
          .addMarkdownField('*Statut:*')
          .addPlainTextField('✅ Opérationnel')
          .addMarkdownField('*Dernière vérification:*')
          .addPlainTextField('Il y a 2 minutes')
          .addButtonAccessory({
            text: 'Voir détails',
            actionId: 'view_details',
            value: 'details_123',
            style: 'primary',
          })
      )

      // Ajouter un divider
      .addDividerBlock()

      // // Ajouter un context block
      .addContextBlock((context) =>
        context
          .addImage({ imageUrl: 'https://example.com/icon.png', altText: 'Icon' })
          .addMarkdownText('Envoyé par *Facteur* | <https://example.com|Documentation>')
      )

      // // Ajouter une image block
      .addImageBlock((image) =>
        image
          .setImageUrl('https://i.imgur.com/SAmBAeZ.png')
          .setAltText('Graphique de performance')
          .setTitle('Performance cette semaine')
      )

      // // Ajouter un actions block avec plusieurs boutons
      .addActionsBlock((actions) =>
        actions
          .addButton({
            text: 'Approuver',
            actionId: 'approve',
            value: 'approve_123',
            style: 'primary',
          })
          .addButton({
            text: 'Rejeter',
            actionId: 'reject',
            value: 'reject_123',
            style: 'danger',
          })
          .addStaticSelect({
            placeholder: 'Choisir une action',
            actionId: 'select_action',
            options: [
              { text: 'Option 1', value: 'opt1' },
              { text: 'Option 2', value: 'opt2' },
              { text: 'Option 3', value: 'opt3' },
            ],
          })
          .addDatePicker({
            placeholder: 'Sélectionner une date',
            actionId: 'select_date',
            initialDate: '2024-01-01',
          })
      )

    console.log(JSON.stringify(result.serialize(), null, 2))

    return result
  }
}
