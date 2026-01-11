import type { Channel } from './types/channel.ts'

export { errors } from './errors/index.ts'
export { createFacteur, Facteur } from './facteur.ts'
export * from './errors/index.ts'

/**
 * Define a new provider
 */
export function defineProvider<Name, Options, Message, Response, Targets>(
  name: Name,
  factory: (options: Options) => Channel<Options, Message, Response, Targets>,
) {
  return (options: Options) => ({ name, provider: factory(options) })
}
