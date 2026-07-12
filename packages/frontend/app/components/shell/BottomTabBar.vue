<template>
  <nav class="bottom-tab-bar">
    <NuxtLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="tab-icon"
      active-class="tab-icon-active"
      :aria-label="link.label"
    >
      <i class="pi" :class="link.icon" />
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import type { ShellNavLink } from './NavRail.vue';

defineProps<{
  links: ShellNavLink[];
}>();
</script>

<style scoped>
.bottom-tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--skolr-color-surface);
  border-top: 2px solid var(--skolr-color-divider);
  z-index: 30;
}

.tab-icon {
  padding: var(--skolr-space-2);
  color: var(--skolr-color-text);
  font-size: 20px;
  display: flex;
}

.tab-icon-active {
  color: var(--skolr-color-accent);
}
</style>
