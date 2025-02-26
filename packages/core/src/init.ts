import type { Provider } from './types.js'

export function defineProvider<Name, Options, Message, Response, Targets>(
  name: Name,
  factory: (options: Options) => Provider<Options, Message, Response, Targets>,
) {
  return (options: Options) => ({
    name,
    provider: factory(options),
  })
}
