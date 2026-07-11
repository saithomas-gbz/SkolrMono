<template>
  <nav class="nav-rail">
    <NuxtLink to="/" class="brand">
      <span class="brand-name">skolr<span class="brand-dot">.</span></span>
    </NuxtLink>

    <div class="nav-links">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="nav-item"
        :class="{ 'nav-item-active': isActive(link.to) }"
      >
        <i class="nav-icon pi" :class="link.icon" />
        <span class="nav-label">{{ link.label }}</span>
      </NuxtLink>

      <template v-if="adminLinks.length">
        <div class="nav-section-label">{{ $t('nav.administration') }}</div>
        <NuxtLink
          v-for="link in adminLinks"
          :key="link.to"
          :to="link.to"
          class="nav-item"
          :class="{ 'nav-item-active': isActive(link.to) }"
        >
          <i class="nav-icon pi" :class="link.icon" />
          <span class="nav-label">{{ link.label }}</span>
        </NuxtLink>
      </template>
    </div>

    <div v-if="bottomLink" class="nav-bottom">
      <NuxtLink
        :to="bottomLink.to"
        class="nav-item"
        :class="{ 'nav-item-active': isActive(bottomLink.to) }"
      >
        <i class="nav-icon pi" :class="bottomLink.icon" />
        <span class="nav-label">{{ bottomLink.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
export type ShellNavLink = {
  label: string;
  to: string;
  icon: string;
};

withDefaults(
  defineProps<{
    links: ShellNavLink[];
    adminLinks?: ShellNavLink[];
    bottomLink?: ShellNavLink;
  }>(),
  { adminLinks: () => [], bottomLink: undefined },
);

// NuxtLink's built-in active-class detection doesn't reliably fire here
// (routes are matched through @nuxtjs/i18n's route resolution), so the
// active nav item is computed directly from the current route path.
const route = useRoute();
function isActive(to: string) {
  return route.path === to;
}
</script>

<style scoped>
.nav-rail {
  width: 212px;
  flex: none;
  display: flex;
  flex-direction: column;
  background: var(--skolr-color-surface);
  border-right: 2px solid var(--skolr-color-divider);
  height: 100%;
  overflow-y: auto;
  transition: width 0.15s;
}

.brand {
  display: block;
  padding: var(--skolr-space-4) var(--skolr-space-4);
  text-decoration: none;
}

.brand-name {
  font-family: var(--skolr-font-family);
  font-weight: 800;
  font-size: 19px;
  letter-spacing: -0.02em;
  color: var(--skolr-color-text);
}

.brand-dot {
  color: var(--skolr-color-accent);
}

.nav-links {
  display: flex;
  flex-direction: column;
  padding: var(--skolr-space-2) 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--skolr-color-text);
  text-decoration: none;
  border-left: 3px solid transparent;
  cursor: pointer;
}

.nav-item:hover {
  background: var(--skolr-color-surface-hover);
}

.nav-item-active {
  background: var(--skolr-color-accent-100);
  border-left-color: var(--skolr-color-accent);
  color: var(--skolr-color-accent-800);
}

.nav-icon {
  font-size: 16px;
  width: 18px;
  text-align: center;
  flex: none;
}

.nav-section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--skolr-color-text-muted);
  padding: var(--skolr-space-4) var(--skolr-space-4) var(--skolr-space-1);
}

.nav-bottom {
  margin-top: auto;
  padding: var(--skolr-space-2) 0;
}

/* Icon-only rail — mirrors the sketch's @container (max-width: 900px). */
@media (max-width: 900px) {
  .nav-rail {
    width: 64px;
  }

  .nav-label,
  .nav-section-label,
  .brand-name {
    display: none;
  }

  .brand {
    display: flex;
    justify-content: center;
  }
}

/* Below this width AppShell switches to BottomTabBar for navigation. */
@media (max-width: 560px) {
  .nav-rail {
    display: none;
  }
}
</style>
