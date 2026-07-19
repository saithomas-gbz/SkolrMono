<template>
  <div
    ref="bellRef"
    class="notification-bell"
  >
    <OverlayBadge
      :value="badgeValue ?? undefined"
      severity="danger"
    >
      <Button
        text
        rounded
        icon="pi pi-bell"
        :aria-label="$t('notifications.aria_label', { count: unreadCount })"
        @click="toggle"
      />
    </OverlayBadge>

    <div v-if="open" class="dropdown">
      <div class="dropdown-header">
        <span class="dropdown-title">{{ $t('notifications.title') }}</span>
        <Button
          v-if="unreadCount > 0"
          text
          size="small"
          :disabled="loading"
          :label="$t('notifications.mark_all_read')"
          @click="markAllAsRead"
        />
      </div>

      <div v-if="notifications.length === 0" class="empty">
        <i class="pi pi-inbox" />
        <span>{{ $t('notifications.empty') }}</span>
      </div>

      <ul v-else class="notif-list">
        <li
          v-for="notif in notifications"
          :key="notif.id"
          class="notif-item"
          :class="{ unread: !notif.read }"
          role="button"
          tabindex="0"
          @click="handleClick(notif)"
          @keydown.enter="handleClick(notif)"
          @keydown.space.prevent="handleClick(notif)"
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
import type { Notification } from "~/composables/useNotifications";

const { isLoggedIn } = useAuth();
const {
  notifications,
  unreadCount,
  loading,
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
} = useNotifications();

const open = ref(false);
const bellRef = ref<HTMLElement | null>(null);

const badgeValue = computed<string | null>(() => {
  if (unreadCount.value <= 0) return null;
  return unreadCount.value > 99 ? "99+" : String(unreadCount.value);
});

function toggle() {
  open.value = !open.value;
  if (open.value) fetchNotifications();
}

async function handleClick(notif: Notification) {
  if (!notif.read) await markAsRead(notif.id);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
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
  document.addEventListener("click", onClickOutside);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
  document.removeEventListener("click", onClickOutside);
});
</script>

<style scoped>
.notification-bell {
  position: relative;
}

.dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 320px;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200, var(--skolr-color-border));
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
  border-bottom: 1px solid var(--p-surface-200, var(--skolr-color-border));
}

.dropdown-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
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
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid var(--p-surface-100, var(--skolr-color-border));
  transition: background 0.15s;
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-item:hover {
  background: var(--p-surface-50, var(--skolr-color-surface-hover));
}

.notif-item.unread {
  background: var(--p-primary-50, var(--skolr-color-brand-green));
}

.notif-item.unread:hover {
  background: var(--p-primary-100, var(--skolr-color-brand-green));
}

.notif-title {
  font-weight: 600;
  font-size: 0.85rem;
}

.notif-body {
  font-size: 0.8rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.notif-date {
  font-size: 0.7rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}
</style>
