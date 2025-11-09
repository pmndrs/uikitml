// @ts-check
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import prettier from 'eslint-plugin-prettier'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import importPlugin from 'eslint-plugin-import'
import reactThree from '@react-three/eslint-plugin'
import prettierConfig from 'eslint-config-prettier'

export default [
  // Prettier config to disable conflicting rules
  prettierConfig,

  {
    files: ['**/*.{js,jsx,ts,tsx}'],

    plugins: {
      '@typescript-eslint': tseslint,
      react: react,
      'react-hooks': reactHooks,
      import: importPlugin,
      prettier: prettier,
      '@react-three': reactThree,
    },

    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        // Node globals
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        global: 'readonly',
        // ES6+ globals
        Promise: 'readonly',
        Symbol: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    settings: {
      react: {
        version: 'detect',
      },
    },

    rules: {
      // Import rules from original .eslintrc
      'import/no-unresolved': 'off',
      'import/named': 'off',
      'import/namespace': 'off',
      'import/no-named-as-default-member': 'off',
      'import/extensions': 'off', // Turn off for TypeScript projects

      // Prettier integration
      'prettier/prettier': 'warn',

      // React hooks rules (recommended)
      ...reactHooks.configs.recommended.rules,
    },
  },

  // Ignore patterns
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/out/**', '**/build/**', '**/.vscode/**', '**/*.min.js'],
  },
]
