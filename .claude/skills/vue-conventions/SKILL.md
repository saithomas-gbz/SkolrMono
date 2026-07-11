---
name: vue-conventions
description: Vue 3 / Nuxt Composition API conventions for packages/frontend (SkolrMono) — reactivity rules not already covered by packages/frontend/CLAUDE.md (i18n, PrimeVue, CSS layout). Consult BEFORE writing or reviewing any `.vue` Single File Component: when adding/editing a `<script setup>` block, when a component reads `props.*`, when deciding between a `computed`, a `watch`, or a plain function, or when reviewing a PR that touches `packages/frontend/**/*.vue`. Triggers on "Vue component", "computed", "props", "reactivity", "composable", "script setup".
---

# Vue.js conventions (SkolrMono / packages/frontend)

This complements `packages/frontend/CLAUDE.md` (i18n, PrimeVue/PrimeIcons, CSS layout), which is loaded automatically. This skill covers **reactivity and Composition API** conventions that are not already documented there.

## 1. Never read a prop directly in logic — go through a `computed`

`props` is a reactive object, but reaching into it (`props.foo`) from inside functions, `.map()`/`.filter()` callbacks, or deep inside a large `computed` mixes "prop access" with "derived logic" and scatters `props.` references across the file. Wrap every prop the component actually uses in its own top-level `computed`, and read that instead.

```vue
<!-- Bad — props read directly inside the derivation logic -->
<script setup lang="ts">
const props = defineProps<{ sessions: Session[]; canEdit?: boolean }>();

const events = computed(() => props.sessions.map(toEvent));
const dateClick = props.canEdit ? handleClick : undefined;
</script>

<!-- Good — one computed per prop, logic reads the computed -->
<script setup lang="ts">
const props = defineProps<{ sessions: Session[]; canEdit?: boolean }>();

const sessions = computed(() => props.sessions);
const canEdit   = computed(() => props.canEdit);

const events = computed(() => sessions.value.map(toEvent));
const dateClick = computed(() => (canEdit.value ? handleClick : undefined));
</script>
```

Why: a single, named computed per prop gives one place to see every prop the component depends on, keeps derivation functions free of `props.`, and avoids the classic pitfall of destructuring `props` (`const { sessions } = props`) which silently drops reactivity — `computed(() => props.x)` is the safe equivalent of `toRef(props, 'x')` when the value needs light transformation.

Exception: template bindings (`v-if="props.foo"` etc.) don't need this — Vue templates auto-unwrap `props` reactively. This rule is about `<script setup>` logic (functions, `.map`, computed bodies, event handlers).

## 2. Prefer `computed` over ad hoc functions or `watch` for derived state

If a value can be derived synchronously from other reactive state, it must be a `computed`, not a method called from the template or a `watch` that writes to a `ref`.

```vue
<!-- Bad -->
const total = ref(0);
watch(items, (v) => { total.value = v.reduce((a, i) => a + i.price, 0); });

<!-- Good -->
const total = computed(() => items.value.reduce((a, i) => a + i.price, 0));
```

Reserve `watch`/`watchEffect` for real side effects (API calls, DOM/3rd-party lib imperative APIs, logging) — see `WeeklyCalendar.vue`'s `calendarOptions` computed feeding the imperative FullCalendar API, which is the boundary where Composition API hands off to a non-reactive library.

## 3. Split large computeds into smaller named ones

A `computed` that mixes multiple concerns (color lookup + name lookup + flag calculation + object shape, all in one `.map()`) is harder to review and to unit test in isolation than several small, named computeds composed together. When a computed body grows past a simple expression or a single transform, extract the sub-pieces into their own `computed`s and compose them.

## 4. `defineProps` / `defineEmits` are always typed

Use the type-only generic form (`defineProps<{ ... }>()`, `defineEmits<{ (e: '...'): void }>()`), never the runtime object form (`defineProps({ foo: String })`), so prop/emit typos are caught at compile time.

## 5. Composables are named `useX` and return refs/computeds, not raw values

Any reusable piece of reactive logic extracted out of a component belongs in `app/composables/useX.ts` and must return `ref`/`computed` (or an object of them), never a plain value that would lose reactivity once destructured by the caller.
