import { defineConfig } from 'astro/config'
import { satteri } from '@astrojs/markdown-satteri'

import {
  channelGridPlugin,
  codeFramesPlugin,
  codeTitleTransformer,
  descriptionPlugin,
  docLinksPlugin,
} from './src/markdown.ts'
import { codeTheme } from './src/code-theme.ts'

export default defineConfig({
  site: 'https://facteur.julr.dev',
  trailingSlash: 'never',
  devToolbar: { enabled: false },
  build: { format: 'file' },
  markdown: {
    shikiConfig: {
      theme: codeTheme,
      transformers: [codeTitleTransformer],
    },
    processor: satteri({
      mdastPlugins: [docLinksPlugin, descriptionPlugin],
      hastPlugins: [codeFramesPlugin, channelGridPlugin],
    }),
  },
})
