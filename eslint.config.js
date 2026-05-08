import { defineConfig } from 'eslint/config';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import tseslint from 'typescript-eslint';
import { tsBaseConfigs } from './eslint.base.mjs';

export default defineConfig(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'packages/*/dist/**',
      'packages/*/node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/coverage/**',
    ],
  },
  ...tsBaseConfigs,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['packages/frontend/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      // Nuxt auto-imports + script setup; TypeScript checks identifiers.
      'no-undef': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/html-self-closing': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
);
