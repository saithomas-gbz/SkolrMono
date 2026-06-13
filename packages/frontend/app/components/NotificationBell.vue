<template>
  <div class="notification-bell" ref="bellRef">
    <button class="bell-button" :aria-label="`Notifications (${unreadCount} non lues)`" @click="toggle">
      <span class="bell-icon">🔔</span>
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <div v-if="open" class="dropdown">
      <div class="dropdown-header">
        <span class="dropdown-title">Notifications</span>
        <button v-if="unreadCount > 0" class="mark-all-btn" :disabled="loading" @click="markAllAsRead">
          Tout marquer comme lu
        </button>
      </div>

      <div v-if="notifications.length === 0" class="empty">Aucune notification</div>

      <ul v-else class="notif-list">
        <li
          v-for="notif in notifications"
          :key="notif.id"
          class="notif-item"
          :class="{ unread: !notif.read }"
          @click="handleClick(notif)"
        >
          <div class="notif-title">{{ notif.title }}</div>
          <div class="notif-body">{{ notif.body }}</div>
          <div class="notif-date">{{ formatDate(notif.createdAt) }}</div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Notification } from '~/composables/useNotifications';

const { isLoggedIn } = useAuth();
const { notifications, unreadCount, loading, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } =
  useNotifications();

const open = ref(false);
const bellRef = ref<HTMLElement | null>(null);

function toggle() {
  open.value = !open.value;
  if (open.value) fetchNotifications();
}

async function handleClick(notif: Notification) {
  if (!notif.read) await markAsRead(notif.id);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function onClickOutside(e: MouseEvent) {
  if (bellRef.value && !bellRef.value.contains(e.target as Node)) {
    open.value = false;
  }
}

let pollInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  if (isLoggedIn.value) {
    fetchUnreadCount();
    pollInterval = setInterval(fetchUnreadCount, 30_000);
  }
  document.addEventListener('click', onClickOutside);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
  document.removeEventListener('click', onClickOutside);
});
</script>

<style scoped>
.notification-bell {
  position: relative;
}

.bell-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  position: relative;
  font-size: 1.2rem;
  line-height: 1;
}

.badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: var(--p-red-500, #ef4444);
  color: #fff;
  border-radius: 9999px;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 1.1rem;
  height: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.2rem;
  line-height: 1;
}

.dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 320px;
  background: var(--p-surface-0, #fff);
  border: 1px solid var(--p-surface-200, #e2e8f0);
  border-radius: 0.75rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-200, #e2e8f0);
}

.dropdown-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.mark-all-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--p-primary-500, #6366f1);
  padding: 0;
}

.mark-all-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty {
  padding: 1.5rem 1rem;
  text-align: center;
  color: var(--p-text-muted-color, #94a3b8);
  font-size: 0.875rem;
}

.notif-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 360px;
  overflow-y: auto;
}

.notif-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid var(--p-surface-100, #f1f5f9);
  transition: background 0.15s;
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-item:hover {
  background: var(--p-surface-50, #f8fafc);
}

.notif-item.unread {
  background: var(--p-primary-50, #eef2ff);
}

.notif-item.unread:hover {
  background: var(--p-primary-100, #e0e7ff);
}

.notif-title {
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 0.2rem;
}

.notif-body {
  font-size: 0.8rem;
  color: var(--p-text-muted-color, #64748b);
  margin-bottom: 0.25rem;
}

.notif-date {
  font-size: 0.7rem;
  color: var(--p-text-muted-color, #94a3b8);
}
</style>
