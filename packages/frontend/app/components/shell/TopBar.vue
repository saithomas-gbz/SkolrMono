<template>
  <header class="top-bar">
    <div class="title-block">
      <h2 class="title">{{ header.title }}</h2>
      <p v-if="header.subtitle" class="subtitle">{{ header.subtitle }}</p>
    </div>

    <!-- Pages teleport page-specific actions here, e.g.
         <Teleport to="#topbar-actions"><Button ... /></Teleport> -->
    <div id="topbar-actions" class="actions" />

    <Tag :value="roleLabel" severity="secondary" class="role-tag" />
    <NotificationBell />

    <Button
      class="avatar-trigger"
      text
      rounded
      :aria-label="$t('nav.open_user_menu', { name: user?.name || user?.email })"
      @click="toggleMenu"
    >
      <Avatar :label="initials" shape="circle" class="avatar" aria-hidden="true" />
    </Button>
    <Menu ref="menuRef" :model="menuItems" :popup="true" />
  </header>
</template>

<script setup lang="ts">
const { t } = useI18n();
const { header } = usePageHeader();
const { user, role, logout } = useAuth();

const roleLabel = computed(() => {
  const key = role.value?.toLowerCase();
  return key ? t(`nav.role_${key}`) : '';
});

const initials = computed(() => {
  const name = user.value?.name?.trim();
  if (name) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }
  return user.value?.email?.[0]?.toUpperCase() ?? '?';
});

const menuRef = ref();
const menuItems = [
  {
    label: t('nav.profile'),
    icon: 'pi pi-user',
    command: () => navigateTo('/profile'),
  },
  {
    label: t('nav.logout'),
    icon: 'pi pi-sign-out',
    command: async () => {
      await logout();
      await navigateTo('/auth/login');
    },
  },
];

function toggleMenu(event: MouseEvent) {
  menuRef.value?.toggle(event);
}
</script>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  gap: var(--skolr-space-4);
  padding: 18px 28px;
  border-bottom: 2px solid var(--skolr-color-divider);
  background: var(--skolr-color-bg);
  position: sticky;
  top: 0;
  z-index: 20;
}

.title-block {
  flex: 1;
  min-width: 0;
}

.title {
  margin: 0;
}

.subtitle {
  margin: 2px 0 0;
  font-size: 13px;
  opacity: 0.7;
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--skolr-space-2);
}

.role-tag {
  white-space: nowrap;
}

.avatar-trigger {
  padding: 0;
  cursor: pointer;
}

.avatar {
  background: var(--skolr-color-neutral-800);
  color: #fff;
  font-weight: 800;
  font-size: 12px;
}
</style>
