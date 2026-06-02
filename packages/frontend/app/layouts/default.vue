<template>
  <div v-if="isLoggedIn" class="app-shell">
    <Menubar :model="items" class="app-topbar">
      <template #start>
        <div class="brand">
          <Button
            class="menu-button"
            label="Menu"
            severity="secondary"
            text
            @click="isSidebarOpen = true"
          />
          <span class="brand-name">Skolr</span>
        </div>
      </template>
    </Menubar>

    <Sidebar v-model:visible="isSidebarOpen" header="Navigation" position="left">
      <nav class="sidebar-nav">
        <NuxtLink class="sidebar-link" to="/" @click="isSidebarOpen = false">Accueil</NuxtLink>
        <NuxtLink class="sidebar-link" to="/dashboard" @click="isSidebarOpen = false">
          Tableau de bord
        </NuxtLink>
        <NuxtLink
          v-if="isTeacher"
          class="sidebar-link"
          to="/teacher/students"
          @click="isSidebarOpen = false"
        >
          Mes élèves
        </NuxtLink>
        <button type="button" class="sidebar-link sidebar-link-button" @click="signOut">
          Déconnexion
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

const isSidebarOpen = ref(false);
const { isLoggedIn, clearSession, hasRole } = useAuth();

const isTeacher = computed(() => hasRole('TEACHER', 'STAFF'));

const items = computed<MenuItem[]>(() => {
  const menu: MenuItem[] = [
    {
      label: 'Accueil',
      command: () => navigateTo('/'),
    },
    {
      label: 'Tableau de bord',
      command: () => navigateTo('/dashboard'),
    },
  ];

  if (isTeacher.value) {
    menu.push({
      label: 'Mes élèves',
      command: () => navigateTo('/teacher/students'),
    });
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

.guest-root {
  min-height: 100dvh;
}
</style>
