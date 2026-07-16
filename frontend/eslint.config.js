import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // React 19 no longer requires the React identifier in JSX files.
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^React$',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Context modules intentionally export both a provider and its hook.
      'react-refresh/only-export-components': 'off',
      // Data-loading effects are valid synchronization points in this app.
      'react-hooks/set-state-in-effect': 'off',
      // Keep manually reviewed dependency arrays until React Compiler is enabled.
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
])
