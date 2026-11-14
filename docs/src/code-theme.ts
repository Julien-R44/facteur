import { createCssVariablesTheme } from 'shiki'

/**
 * One Shiki theme for the whole site. Token colors are CSS variables,
 * so light, dark and the always-dark landing panels share it.
 */
export const codeTheme = createCssVariablesTheme({
  name: 'facteur',
  variablePrefix: '--code-',
  fontStyle: true,
})
