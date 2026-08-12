import { defineTheme } from '@astryxdesign/core/theme';
import { stoneTheme } from '@astryxdesign/theme-stone/built';

/**
 * Single committed surface: light cream page, warm charcoal text.
 * Contrast verified — primary on page 14.9:1, secondary on page 6.7:1.
 */
export const cheatsheetTheme = defineTheme({
  name: 'cheatsheet',
  extends: stoneTheme,
  tokens: {
    '--color-background-body': '#FAF6EF',
    '--color-background-surface': '#FDFBF6',
    '--color-background-card': '#FFFFFF',
    '--color-text-primary': '#23211D',
    '--color-text-secondary': '#5C574A',
    '--color-border': '#E4DED2',
  },
});
