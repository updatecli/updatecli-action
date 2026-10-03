import js from '@eslint/js'
import globals from 'globals'
import unicorn from 'eslint-plugin-unicorn'
import prettierRecommended from 'eslint-plugin-prettier/recommended'

export default [
  {
    ignores: ['dist/', 'lib/', 'coverage/'],
  },
  js.configs.recommended,
  unicorn.configs.recommended,
  prettierRecommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['tests/**'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
]
