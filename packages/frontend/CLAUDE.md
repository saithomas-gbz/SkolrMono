Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## Frontend

Use Vite.

## Internationalisation (i18n)

Never hardcode visible text in templates or scripts. Always use translation keys via `$t()` (in templates) or `t()` (in `<script setup>`).

```vue
<!-- Bad -->
<p>Bonjour</p>
<Button label="Enregistrer" />

<!-- Good -->
<p>{{ $t('common.hello') }}</p>
<Button :label="$t('common.save')" />
```

Add every new key to the locale files under `locales/` (e.g. `fr.json`, `en.json`). Keys must be namespaced by feature: `notifications.markAllRead`, `assignment.dueDate`, etc.

## UI components — PrimeVue & PrimeIcons

Use PrimeVue components for all interactive UI (buttons, inputs, dialogs, badges, menus, tables, …). Do not hand-roll equivalents.

```vue
<script setup>
import Button from 'primevue/button'
import Badge  from 'primevue/badge'
</script>

<template>
  <Button icon="pi pi-check" :label="$t('common.save')" />
  <i class="pi pi-bell" />
</template>
```

- Always use `pi pi-*` icon classes from PrimeIcons; never inline SVG or custom icon fonts.
- Prefer PrimeVue severity props (`severity="danger"`, `severity="warn"`, …) over custom colour classes.

## CSS layout

Use CSS Grid or Flexbox for layout. Avoid fixed pixel offsets and `float`.

```css
/* Flexbox — single axis */
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Grid — two-dimensional */
.dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}
```

- Use `gap` instead of margin hacks between flex/grid children.
- Use relative units (`rem`, `%`, `fr`) rather than fixed `px` for spacing and sizing so the layout adapts to different screen sizes.
- Reserve `position: absolute/fixed` for overlays and tooltips only.
