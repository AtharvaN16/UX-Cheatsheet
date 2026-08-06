import { defineTheme } from '@astryxdesign/core/theme';
import { stoneTheme } from '@astryxdesign/theme-stone/built';

/**
 * Single committed surface: warm gray page, cream text.
 * Contrast verified — cream on page 13.3:1, secondary on page 7.5:1.
 */
export const cheatsheetTheme = defineTheme({
  name: 'cheatsheet',
  extends: stoneTheme,
  tokens: {
    '--color-background-body': '#24231F',
    '--color-background-surface': '#2C2B26',
    '--color-background-card': '#333230',
    '--color-text-primary': '#F2EBDE',
    '--color-text-secondary': '#B8B2A6',
    '--color-border': '#3D3B35',
  },
});
