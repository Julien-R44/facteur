import type { DataTag, QueryFunction, QueryKey, UseQueryOptions } from '@tanstack/react-query'

export * from '@facteurjs/client/types'

export type QueryOptions<Data, Key extends QueryKey> = Omit<
  UseQueryOptions<Data, Error, Data, Key>,
  'queryFn'
> & {
  queryFn?: QueryFunction<Data, Key>
  queryKey: DataTag<Key, Data, Error>
}
