import type { Channel } from './types.js'

export function defineProvider<Name, Options, Message, Response, Targets>(
  name: Name,
  factory: (options: Options) => Channel<Options, Message, Response, Targets>,
) {
  return (options: Options) => ({ name, provider: factory(options) })
}
