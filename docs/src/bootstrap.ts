import type { Collection } from '@dimerapp/content'

import { readFile } from 'node:fs/promises'
/*
|--------------------------------------------------------------------------
| Bootstrap
|--------------------------------------------------------------------------
|
| The bootstrap file configures everything needed to render markdown with
| extreme control over the rendering pipeline
|
*/
import edge from 'edge.js'
import uiKit from 'edge-uikit'
import { edgeIconify, addCollection, addIcon } from 'edge-iconify'
import collect from 'collect.js'
import { icons as tablerIcons } from '@iconify-json/tabler'
import { dimer, RenderingPipeline } from '@dimerapp/edge'
import { docsHook, docsTheme } from '@dimerapp/docs-theme'
import { Renderer } from '@dimerapp/content'

import grammars from '../vscode_grammars/main.js'

type CollectionEntry = Exclude<ReturnType<Collection['findByPermalink']>, undefined>

addCollection(tablerIcons)

// Official AdonisJS logomark from https://adonisjs.com/brand (monochrome variant).
addIcon('brand:adonisjs', {
  width: 33,
  height: 33,
  body: '<path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M0 16.3331C0 29.506 3.16017 32.6662 16.3331 32.6662C29.506 32.6662 32.6662 29.506 32.6662 16.3331C32.6662 3.16017 29.506 0 16.3331 0C3.16017 0 0 3.16017 0 16.3331ZM6.58646 19.7261L11.7093 8.08338C12.5742 6.12075 14.2374 5.05627 16.3331 5.05627C18.4288 5.05627 20.092 6.12075 20.9569 8.08338L26.0797 19.7261C26.3126 20.2916 26.5122 21.0235 26.5122 21.6555C26.5122 24.5495 24.483 26.5787 21.589 26.5787C20.6032 26.5787 19.8203 26.3271 19.0278 26.0725C18.2158 25.8116 17.3937 25.5475 16.3331 25.5475C15.2847 25.5475 14.4426 25.814 13.6145 26.076C12.8136 26.3294 12.0258 26.5787 11.0772 26.5787C8.18318 26.5787 6.15402 24.5495 6.15402 21.6555C6.15402 21.0235 6.35361 20.2916 6.58646 19.7261ZM16.3331 10.1125L11.2768 21.5557C12.7737 20.8571 14.5035 20.5245 16.3331 20.5245C18.0961 20.5245 19.8924 20.8571 21.3228 21.5557L16.3331 10.1125Z"/>',
})

// Official Hono logo from https://hono.dev/images/logo.svg, adapted to monochrome.
addIcon('brand:hono', {
  width: 76,
  height: 98,
  body: '<path fill="currentColor" opacity="0.5" d="m11 25 7 9s9-18 22-34c17 20 36 48 36 64 0 20-19 34-37 34C17 98 0 81 0 61c0-6 3-24 11-36Z"/><path fill="currentColor" d="M39 21c47 51 14 66 0 66-11 0-51-11 0-66Z"/>',
})

edge.use(dimer)
edge.use(docsTheme)
edge.use(uiKit)
edge.use(edgeIconify)

/**
 * Globally loads the config file
 */
edge.global('getConfig', async () =>
  JSON.parse(await readFile(new URL('../content/config.json', import.meta.url), 'utf-8')),
)

/**
 * Globally loads the sponsors file
 */
edge.global('getSponsors', async () =>
  JSON.parse(await readFile(new URL('../content/sponsors.json', import.meta.url), 'utf-8')),
)

/**
 * Globally loads the providers file
 */
edge.global('getProviders', async () =>
  JSON.parse(await readFile(new URL('../content/providers.json', import.meta.url), 'utf-8')),
)

/**
 * Returns sections for a collection
 */
edge.global('getSections', function (collection: Collection, entry: CollectionEntry) {
  const entries = collection.all()

  return collect(entries)
    .groupBy<any, string>('meta.category')
    .map((items, key) => {
      return {
        title: key,
        isActive: entry.meta.category === key,
        items: items
          .filter((item: CollectionEntry & { draft?: boolean }) => {
            return !item.meta.draft
          })
          .map((item: CollectionEntry) => {
            return {
              href: item.permalink,
              title: item.title,
              icon: item.meta.icon,
              isActive: item.permalink === entry.permalink,
            }
          })
          .all(),
      }
    })
    .all()
})

/**
 * Configuring rendering pipeline
 */
const pipeline = new RenderingPipeline()
pipeline.use(docsHook).use((node) => {
  if (node.tagName === 'img') {
    return pipeline.component('elements/img', { node })
  }
})

// 'css-variables' | 'dark-plus' | 'dracula-soft' | 'dracula' | 'github-dark-dimmed' | 'github-dark' | 'github-light' | 'hc_light' | 'light-plus' | 'material-theme-darker' | 'material-theme-lighter' | 'material-theme-ocean' | 'material-theme-palenight' | 'material-theme' | 'min-dark' | 'min-light' | 'monokai' | 'nord' | 'one-dark-pro' | 'poimandres' | 'rose-pine-dawn' | 'rose-pine-moon' | 'rose-pine' | 'slack-dark' | 'slack-ochin' | 'solarized-dark' | 'solarized-light' | 'vitesse-dark' | 'vitesse-light';

/**
 * Configuring renderer
 */
export const renderer = new Renderer(edge, pipeline)
  .codeBlocksTheme('material-theme-palenight')
  .useTemplate('docs')

/**
 * Adding grammars
 */
grammars.forEach((grammar) => renderer.registerLanguage(grammar))
