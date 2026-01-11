/**
 * Split an array into chunks of a given size
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) throw new Error('Chunk size must be greater than 0')
  if (size === Infinity) return [array]

  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size))

  return chunks
}

/**
 * Collect items from an async iterable into an array
 */
export async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = []
  for await (const item of iterable) items.push(item)
  return items
}

/**
 * Check if a value is an async iterable
 */
export function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return value !== null && typeof value === 'object' && Symbol.asyncIterator in value
}
