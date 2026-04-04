import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

export default defineConfig(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'packages/*/dist/**',
      'packages/*/node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/coverage/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue']
      }
    }
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  },
  {
    files: ['packages/frontend/**/*.{vue,ts}'],
    rules: {
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always']
    }
  },
  {
    files: ['packages/frontend/**/*.vue'],
    rules: {
      'no-undef': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off'
    }
  },
  {
    files: ['packages/frontend/nuxt.config.ts'],
    rules: {
      'no-undef': 'off'
    }
  }
);
