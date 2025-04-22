import { defineProvider } from '@facteurjs/core'
import { Modal, Blocks, Elements, Bits, setIfTruthy } from 'slack-block-builder'

import type { SlackOptions } from './types.js'

export function testMessage({ menuOptions, selected }: { menuOptions: any; selected: any }) {
  return Modal({ title: 'PizzaMate', submit: 'Get Fed' })
    .blocks(
      Blocks.Section({ text: 'Hey there, colleague!' }),
      Blocks.Section({ text: "Hurray for corporate pizza! Let's get you fed and happy :pizza:" }),
      Blocks.Input({ label: 'What can we call you?' }).element(
        Elements.TextInput({ placeholder: 'Hi, my name is... (What?!) (Who?!)' }).actionId('name'),
      ),
      Blocks.Input({ label: 'Which floor are you on?' }).element(
        Elements.TextInput({ placeholder: 'HQ – Fifth Floor' }).actionId('floor'),
      ),
      Blocks.Input({ label: "What'll you have?" }).element(
        Elements.StaticSelect({ placeholder: 'Choose your favorite...' })
          .actionId('item')
          .options(menuOptions.map((item) => Bits.Option({ text: item.name, value: item.id })))
          .initialOption(
            setIfTruthy(selected, Bits.Option({ text: selected.name, value: selected.id })),
          ),
      ),
    )
    .buildToJSON()
}

export const slackProvider = defineProvider<SlackOptions, any, DiscordResponse>(
  'slack' as const,
  (options) => {
    return {
      async send({ message }) {
        console.log('Sending slack message', message, options)

        const result = await fetch(options.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: message,
        })

        return result.json() as Promise<DiscordResponse>
      },
    }
  },
)
