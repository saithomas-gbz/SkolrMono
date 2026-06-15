export type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export function useNotifications() {
  const api = useApi();
  const notifications = ref<Notification[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);

  async function fetchNotifications() {
    try {
      const response = await api<{ data: Notification[] }>('/notification/notifications');
      notifications.value = response.data;
    } catch (error) {
      console.error('[useNotifications] fetchNotifications error', error);
    }
  }

  async function fetchUnreadCount() {
    try {
      const response = await api<{ count: number }>('/notification/notifications/unread-count');
      unreadCount.value = response.count;
    } catch (error) {
      console.error('[useNotifications] fetchUnreadCount error', error);
    }
  }

  async function markAsRead(id: string) {
    try {
      await api(`/notification/notifications/${id}/read`, { method: 'PATCH' });
      const notif = notifications.value.find((n) => n.id === id);
      if (notif) {
        notif.read = true;
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
    } catch (error) {
      console.error('[useNotifications] markAsRead error', error);
    }
  }

  async function markAllAsRead() {
    try {
      loading.value = true;
      await api('/notification/notifications/read-all', { method: 'PATCH' });
      notifications.value.forEach((n) => (n.read = true));
      unreadCount.value = 0;
    } catch (error) {
      console.error('[useNotifications] markAllAsRead error', error);
    } finally {
      loading.value = false;
    }
  }

  return { notifications, unreadCount, loading, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead };
}
