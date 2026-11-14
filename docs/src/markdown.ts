import { basename } from 'node:path'
import { readdirSync } from 'node:fs'

import type { ShikiTransformer } from 'shiki'
import { defineHastPlugin, defineMdastPlugin } from 'satteri'

import { iconSvg } from './icons.ts'
import { channelGroups } from './channels.ts'

/**
 * Reads `title="..."` from the code fence meta, such as ```sh title="npm".
 */
export const codeTitleTransformer: ShikiTransformer = {
  name: 'facteur:code-title',
  pre(node) {
    const title = /title="([^"]+)"/.exec(this.options.meta?.__raw ?? '')?.[1]
    if (title) node.properties['data-title'] = title
    node.properties['data-lang'] = this.options.lang
  },
}

const docSlugs = new Set(
  readdirSync(new URL('./content/docs/', import.meta.url), { recursive: true, encoding: 'utf-8' })
    .filter((file) => file.endsWith('.md'))
    .map((file) => basename(file, '.md')),
)

/**
 * Docs are served flat under `/docs/<file name>`. Rewrites relative
 * links such as `./channels/slack.md#targets` to `/docs/slack#targets`
 * and fails the build on links to missing pages.
 */
export const docLinksPlugin = defineMdastPlugin({
  name: 'facteur:doc-links',
  link(node, ctx) {
    const match = /^(?:\.{1,2}\/)?(?:[\w-]+\/)*([\w-]+)\.md(#.*)?$/.exec(node.url)
    if (!match) return

    const [, slug, hash = ''] = match
    if (!docSlugs.has(slug)) {
      throw new Error(`Broken docs link "${node.url}" in ${ctx.fileURL?.pathname}`)
    }

    ctx.setField(node, 'url', `/docs/${slug}${hash}`)
  },
})

/**
 * Uses the first paragraph as the page description when the
 * frontmatter does not define one.
 */
export const descriptionPlugin = defineMdastPlugin({
  name: 'facteur:description',
  after(root, ctx) {
    const frontmatter = (ctx.data.astro as { frontmatter?: Record<string, unknown> } | undefined)
      ?.frontmatter
    if (!frontmatter || frontmatter.description) return

    const paragraph = root.children.find((node) => node.type === 'paragraph')
    if (!paragraph) return

    const text = ctx.textContent(paragraph).replace(/\s+/g, ' ').trim()
    frontmatter.description = text.length > 180 ? `${text.slice(0, 177).trimEnd()}...` : text
  },
})

const languageLabels: Record<string, string> = {
  ts: 'TypeScript',
  typescript: 'TypeScript',
  tsx: 'TSX',
  sh: 'Terminal',
  bash: 'Terminal',
  sql: 'SQL',
  http: 'HTTP',
  json: 'JSON',
  text: 'Text',
  plaintext: 'Text',
}

/**
 * Wraps highlighted blocks in a frame with a header (title or language)
 * and a copy button wired by the base layout script.
 */
export const codeFramesPlugin = defineHastPlugin({
  name: 'facteur:code-frames',
  element: {
    filter: ['pre'],
    visit(node) {
      const properties = node.properties as Record<string, unknown>
      if (!String(properties.className ?? properties.class ?? '').includes('astro-code')) return

      const title = String(properties['data-title'] ?? properties.dataTitle ?? '')
      const lang = String(properties['data-lang'] ?? properties.dataLang ?? '')

      return {
        type: 'element',
        tagName: 'div',
        properties: title
          ? { className: ['code-frame'], dataTitle: title }
          : { className: ['code-frame'] },
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: { className: ['code-frame-header'] },
            children: [
              {
                type: 'element',
                tagName: 'span',
                properties: { className: ['code-frame-title'] },
                children: [{ type: 'text', value: title || languageLabels[lang] || lang }],
              },
              {
                type: 'element',
                tagName: 'button',
                properties: { type: 'button', className: ['copy-button'], ariaLabel: 'Copy code' },
                children: [{ type: 'text', value: 'Copy' }],
              },
            ],
          },
          node,
        ],
      }
    },
  },
})

/**
 * Replaces the raw `<div data-channel-grid></div>` line in a page with the grid of
 * channels, each linking to its page.
 */
export const channelGridPlugin = defineHastPlugin({
  name: 'facteur:channel-grid',
  raw(node) {
    if (node.value.trim() !== '<div data-channel-grid></div>') return

    const cards = channelGroups.flatMap((group) =>
      group.channels.map(
        (channel) => `
            <a class="channel-grid-card" href="/docs/${channel.slug}"${channel.badge ? ' data-soon' : ''}>
              <span class="channel-grid-icon">${iconSvg(channel.icon, 20)}</span>
              <span class="channel-grid-text">
                <span class="channel-grid-head">
                  <span class="channel-grid-name">${channel.title}</span>
                  ${channel.badge ? `<span class="channel-grid-badge">${channel.badge}</span>` : ''}
                  <span class="channel-grid-category">${group.title}</span>
                </span>
                <span class="channel-grid-description">${channel.description}</span>
              </span>
            </a>`,
      ),
    )

    return { type: 'raw', value: `<div class="channel-grid">${cards.join('')}</div>` }
  },
})
