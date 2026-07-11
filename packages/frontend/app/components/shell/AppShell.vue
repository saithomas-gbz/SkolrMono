<template>
  <div class="app-shell">
    <NavRail :links="links" :admin-links="adminLinks" :bottom-link="bottomLink" />

    <div class="app-shell-main">
      <TopBar />
      <slot name="banner" />
      <main class="app-shell-content">
        <slot />
      </main>
    </div>

    <BottomTabBar class="app-shell-bottom-tabs" :links="bottomTabLinks" />
  </div>
</template>

<script setup lang="ts">
import NavRail, { type ShellNavLink } from './NavRail.vue';
import TopBar from './TopBar.vue';
import BottomTabBar from './BottomTabBar.vue';

const props = withDefaults(
  defineProps<{
    links: ShellNavLink[];
    adminLinks?: ShellNavLink[];
    bottomLink?: ShellNavLink;
  }>(),
  { adminLinks: () => [], bottomLink: undefined },
);

const links = computed(() => props.links);

// Bottom tab bar only has room for a handful of icons — take the first 4
// primary destinations, matching the sketch's mobile nav.
const bottomTabLinks = computed(() => links.value.slice(0, 4));
</script>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: auto 1fr;
  min-height: 100dvh;
}

.app-shell-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-shell-content {
  flex: 1;
  padding: 0;
}

.app-shell-bottom-tabs {
  display: none;
}

@media (max-width: 560px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .app-shell-bottom-tabs {
    display: flex;
  }

  .app-shell-content {
    padding-bottom: 76px;
  }
}
</style>
