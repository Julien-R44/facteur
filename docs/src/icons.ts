import { getIconData, iconToHTML, iconToSVG, replaceIDs } from '@iconify/utils'
import { icons as simpleIcons } from '@iconify-json/simple-icons'
import { icons as lucide } from '@iconify-json/lucide'

const sets = { lucide, 'simple-icons': simpleIcons }

/**
 * Renders `lucide:<name>` or `simple-icons:<name>` as an inline, decorative SVG string.
 */
export function iconSvg(name: string, size: number, attributes: Record<string, string> = {}) {
  const [prefix, iconName] = name.split(':')
  const set = sets[prefix as keyof typeof sets]
  const data = set && getIconData(set, iconName)
  if (!data) throw new Error(`Unknown icon "${name}"`)

  const { attributes: svgAttributes, body } = iconToSVG(data, { height: size })
  return iconToHTML(replaceIDs(body), {
    ...svgAttributes,
    'aria-hidden': 'true',
    focusable: 'false',
    ...attributes,
  })
}
