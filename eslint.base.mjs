import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * ESLint presets shared across all workspaces (plain TS/JS).
 * Vue SFC parsing is layered in eslint.config.js for packages/frontend.
 */
export const tsBaseConfigs = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
