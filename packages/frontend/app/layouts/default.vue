<template>
  <div v-if="isLoggedIn" class="app-shell">
    <Menubar :model="items" class="app-topbar">
      <template #start>
        <div class="brand">
          <Button
            class="menu-button"
            :label="$t('nav.menu')"
            severity="secondary"
            text
            @click="isSidebarOpen = true"
          />
          <span class="brand-name">Skolr</span>
        </div>
      </template>
      <template #end>
        <NotificationBell />
      </template>
    </Menubar>

    <Sidebar v-model:visible="isSidebarOpen" :header="$t('nav.navigation')" position="left">
      <nav class="sidebar-nav">
        <NuxtLink class="sidebar-link" to="/" @click="isSidebarOpen = false">{{ $t('nav.home') }}</NuxtLink>
        <NuxtLink class="sidebar-link" to="/dashboard" @click="isSidebarOpen = false">
          {{ $t('nav.dashboard') }}
        </NuxtLink>
        <NuxtLink
          v-if="isTeacher"
          class="sidebar-link"
          to="/teacher/students"
          @click="isSidebarOpen = false"
        >
          {{ $t('nav.my_students') }}
        </NuxtLink>
        <NuxtLink
          v-if="isAdmin"
          class="sidebar-link"
          to="/admin/students"
          @click="isSidebarOpen = false"
        >
          {{ $t('nav.school_students') }}
        </NuxtLink>
        <NuxtLink class="sidebar-link" to="/planning" @click="isSidebarOpen = false">
          {{ $t('nav.schedule') }}
        </NuxtLink>
        <NuxtLink
          v-if="isTeacher || isAdmin"
          class="sidebar-link"
          to="/planning/absences"
          @click="isSidebarOpen = false"
        >
          {{ $t('nav.absences') }}
        </NuxtLink>
        <NuxtLink
          v-if="isTeacher"
          class="sidebar-link"
          to="/grades/assignments/new"
          @click="isSidebarOpen = false"
        >
          {{ $t('nav.gradebook') }}
        </NuxtLink>
        <template v-if="isAdmin">
          <div class="sidebar-section">{{ $t('nav.administration') }}</div>
          <NuxtLink class="sidebar-link" to="/admin/subjects" @click="isSidebarOpen = false">
            {{ $t('nav.subjects') }}
          </NuxtLink>
        </template>
        <button type="button" class="sidebar-link sidebar-link-button" @click="signOut">
          {{ $t('nav.logout') }}
        </button>
      </nav>
    </Sidebar>

    <main class="app-content">
      <slot />
    </main>
  </div>
  <div v-else class="guest-root">
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem';

const { t } = useI18n();
const isSidebarOpen = ref(false);
const { isLoggedIn, clearSession, hasRole } = useAuth();

const isTeacher = computed(() => hasRole('TEACHER', 'STAFF'));
const isAdmin = computed(() => hasRole('ADMIN'));

const items = computed<MenuItem[]>(() => {
  const menu: MenuItem[] = [
    {
      label: t('nav.home'),
      command: () => navigateTo('/'),
    },
    {
      label: t('nav.dashboard'),
      command: () => navigateTo('/dashboard'),
    },
  ];

  if (isTeacher.value) {
    menu.push({
      label: t('nav.my_students'),
      command: () => navigateTo('/teacher/students'),
    });
  }

  if (isAdmin.value) {
    menu.push({
      label: t('nav.school_students'),
      command: () => navigateTo('/admin/students'),
    });
  }

  menu.push({ label: t('nav.schedule'), command: () => navigateTo('/planning') });

  if (isTeacher.value || isAdmin.value) {
    menu.push({ label: t('nav.absences'), command: () => navigateTo('/planning/absences') });
  }

  if (isAdmin.value) {
    menu.push({ label: t('nav.subjects'), command: () => navigateTo('/admin/subjects') });
  }

  return menu;
});

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
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand-name {
  font-weight: 700;
  letter-spacing: 0.2px;
}

.menu-button {
  padding-left: 0.25rem;
  padding-right: 0.25rem;
}

.app-content {
  width: min(1100px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.5rem 0;
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
  background: rgba(0, 0, 0, 0.04);
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
  color: var(--p-text-muted-color, #94a3b8);
  padding: 0.75rem 0.75rem 0.25rem;
}

.guest-root {
  min-height: 100dvh;
}
</style>
