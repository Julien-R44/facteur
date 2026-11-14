import { basename } from 'node:path'

import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'
import { glob } from 'astro/loaders'

const docs = defineCollection({
  loader: glob({
    base: './src/content/docs',
    pattern: '**/*.md',
    generateId: ({ entry }) => basename(entry, '.md'),
  }),
  schema: z.object({
    description: z.string().optional(),
  }),
})

export const collections = { docs }
