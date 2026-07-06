<template>
  <div v-if="isLoggedIn" class="app-shell">
    <Menubar class="app-topbar">
      <template #start>
        <div class="brand">
          <Button
            class="menu-button"
            :label="$t('nav.menu')"
            severity="secondary"
            text
            @click="isSidebarOpen = true"
          />
          <NuxtLink to="/" class="brand-name">skolr<span class="brand-dot">.</span></NuxtLink>
        </div>
      </template>
      <template #end>
        <div class="topbar-shortcuts">
          <Button
            v-tooltip.bottom="$t('nav.messages')"
            text
            rounded
            icon="pi pi-envelope"
            :aria-label="$t('nav.messages')"
            @click="navigateTo('/messages')"
          />
          <Button
            v-tooltip.bottom="$t('nav.schedule')"
            text
            rounded
            icon="pi pi-calendar"
            :aria-label="$t('nav.schedule')"
            @click="navigateTo('/planning')"
          />
          <Button
            v-if="isTeacher"
            v-tooltip.bottom="$t('nav.gradebook')"
            text
            rounded
            icon="pi pi-book"
            :aria-label="$t('nav.gradebook')"
            @click="navigateTo('/grades/assignments/new')"
          />
          <NotificationBell />
        </div>
      </template>
    </Menubar>

    <Sidebar v-model:visible="isSidebarOpen" :header="$t('nav.navigation')" position="left">
      <nav class="sidebar-nav">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          class="sidebar-link"
          :to="link.to"
          @click="isSidebarOpen = false"
        >
          {{ link.label }}
        </NuxtLink>

        <template v-if="adminLinks.length">
          <div class="sidebar-section">{{ $t('nav.administration') }}</div>
          <NuxtLink
            v-for="link in adminLinks"
            :key="link.to"
            class="sidebar-link"
            :to="link.to"
            @click="isSidebarOpen = false"
          >
            {{ link.label }}
          </NuxtLink>
        </template>

        <button type="button" class="sidebar-link sidebar-link-button" @click="signOut">
          {{ $t('nav.logout') }}
        </button>
      </nav>
    </Sidebar>

    <Message
      v-if="showInactiveSubscriptionBanner"
      severity="warn"
      :closable="false"
      class="subscription-banner"
    >
      {{ $t('billing.inactive_warning') }}
      <NuxtLink to="/admin/billing" class="banner-link">{{ $t('billing.manage_billing') }}</NuxtLink>
    </Message>

    <main class="app-content">
      <slot />
    </main>
    <Toast position="bottom-right" />
  </div>
  <div v-else class="guest-root">
    <slot />
  </div>
</template>

<script setup lang="ts">
type NavLink = {
  label: string;
  to: string;
};

const { t } = useI18n();
const isSidebarOpen = ref(false);
const { isLoggedIn, clearSession, hasRole } = useAuth();

const isTeacher = computed(() => hasRole('TEACHER', 'STAFF'));
const isAdmin = computed(() => hasRole('ADMIN'));
const isStudent = computed(() => hasRole('USER'));
const isParent = computed(() => hasRole('PARENT'));

const navLinks = computed<NavLink[]>(() => {
  const links: NavLink[] = [
    { label: t('nav.home'), to: '/' },
    { label: t('nav.dashboard'), to: '/dashboard' },
  ];

  if (isTeacher.value) {
    links.push({ label: t('nav.my_students'), to: '/teacher/students' });
  }

  if (isAdmin.value) {
    links.push({ label: t('nav.school_students'), to: '/admin/students' });
  }

  links.push({ label: t('nav.messages'), to: '/messages' });
  links.push({ label: t('nav.schedule'), to: '/planning' });

  if (isTeacher.value || isAdmin.value) {
    links.push({ label: t('nav.absences'), to: '/planning/absences' });
  }

  if (isStudent.value) {
    links.push({ label: t('nav.my_absences'), to: '/planning/my-absences' });
    links.push({ label: t('nav.my_grades'), to: '/grades/my-grades' });
  }

  if (isTeacher.value) {
    links.push({ label: t('nav.gradebook'), to: '/grades/assignments/new' });
  }

  if (isParent.value) {
    links.push({ label: t('nav.family_space'), to: '/parent' });
  }

  links.push({ label: t('nav.profile'), to: '/profile' });

  return links;
});

const adminLinks = computed<NavLink[]>(() =>
  isAdmin.value
    ? [
        { label: t('nav.users'), to: '/admin/users' },
        { label: t('nav.subjects'), to: '/admin/subjects' },
        { label: t('nav.billing'), to: '/admin/billing' },
        { label: t('nav.parent_links'), to: '/admin/parent-links' },
      ]
    : [],
);

const subscriptionStatus = ref<string | null>(null);

if (isAdmin.value) {
  const { fetchEstablishment } = useBilling();
  fetchEstablishment()
    .then((establishment) => {
      subscriptionStatus.value = establishment.subscription?.status ?? null;
    })
    .catch(() => {
      // Établissement non trouvé ou erreur réseau : pas de bannière, la page /admin/billing
      // affiche déjà le détail de l'erreur si besoin.
    });
}

const showInactiveSubscriptionBanner = computed(
  () =>
    isAdmin.value &&
    subscriptionStatus.value !== null &&
    subscriptionStatus.value !== 'ACTIVE' &&
    subscriptionStatus.value !== 'TRIALING',
);

async function signOut() {
  isSidebarOpen.value = false;
  clearSession();
  await navigateTo('/auth/login');
}
</script>

<style scoped>
.app-shell {
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr;
}

.app-topbar {
  border-radius: 0;
  position: sticky;
  top: 0;
  z-index: 30;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand-name {
  font-family: var(--skolr-font-family);
  font-weight: 700;
  letter-spacing: 0.2px;
  color: var(--skolr-color-brand-navy);
  text-decoration: none;
}

.brand-dot {
  color: var(--skolr-color-brand-green);
}

.menu-button {
  padding-left: 0.25rem;
  padding-right: 0.25rem;
}

.topbar-shortcuts {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.app-content {
  width: min(1100px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.5rem 0;
}

.subscription-banner {
  width: min(1100px, calc(100% - 2rem));
  margin: 1rem auto 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.banner-link {
  font-weight: 600;
  color: inherit;
  text-decoration: underline;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.sidebar-link {
  color: inherit;
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
}

.sidebar-link:hover {
  background: var(--skolr-color-surface-hover);
}

.sidebar-link-button {
  width: 100%;
  text-align: left;
  font: inherit;
  cursor: pointer;
  border: none;
  background: none;
}

.sidebar-section {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
  padding: 0.75rem 0.75rem 0.25rem;
}

.guest-root {
  min-height: 100dvh;
}
</style>
