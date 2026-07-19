<template>
  <div class="app-shell">
    <a href="#main-content" class="skip-link">{{ $t('nav.skip_to_content') }}</a>

    <NavRail :links="links" :admin-links="adminLinks" :bottom-link="bottomLink" />

    <div class="app-shell-main">
      <TopBar />
      <slot name="banner" />
      <main id="main-content" class="app-shell-content" tabindex="-1">
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

/* Visible seulement au focus clavier — n'affecte jamais le rendu normal. */
.skip-link {
  position: fixed;
  top: -100%;
  left: var(--skolr-space-2);
  z-index: 100;
  padding: var(--skolr-space-2) var(--skolr-space-4);
  background: var(--skolr-color-bg);
  color: var(--skolr-color-text);
  outline: 2px solid var(--skolr-color-accent);
  font-weight: 600;
  text-decoration: none;
}

.skip-link:focus {
  top: var(--skolr-space-2);
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
