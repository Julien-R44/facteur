/*
|--------------------------------------------------------------------------
| Collections
|--------------------------------------------------------------------------
|
| Collections represents multiple sources of documentation. For example:
| Guides can be one collection, blog can be another, and API docs can
| be another collection
|
*/

import { Collection } from '@dimerapp/content'

import { homeRenderer, renderer } from './bootstrap.js'

const pages = new Collection()
  .db(new URL('../content/pages/db.json', import.meta.url))
  .useRenderer(homeRenderer)

const docs = new Collection()
  .db(new URL('../content/docs/db.json', import.meta.url))
  .useRenderer(renderer)
  .urlPrefix('/docs')

await pages.boot()
await docs.boot()

export const collections = [pages, docs]
