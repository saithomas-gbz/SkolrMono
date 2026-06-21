import { normalizeApiError } from '~/composables/useClass';
import { useAuthTokenCookie } from '~/composables/authSession';

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  sentAt: string;
};

export type ConversationParticipant = {
  id: string;
  conversationId: string;
  userId: string;
  joinedAt: string;
};

export type Conversation = {
  id: string;
  name?: string | null;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  messages: Message[];
};

type RealtimeEvent =
  | { type: 'message'; data: Message }
  | { type: 'presence'; userId: string; online: boolean };

const FALLBACK_CONVERSATIONS_INTERVAL_MS = 20_000;
const FALLBACK_MESSAGES_INTERVAL_MS = 5_000;
const RECONNECT_DELAY_MS = 5_000;

export function useMessages() {
  const api = useApi();
  const config = useRuntimeConfig();
  const authTokenCookie = useAuthTokenCookie();

  const conversations = ref<Conversation[]>([]);
  const currentMessages = ref<Message[]>([]);
  const loading = ref(false);
  const sending = ref(false);
  const error = ref<string | null>(null);
  /** userId -> en ligne / hors ligne. Initialisée par fetchPresence, tenue à jour par la WS. */
  const presence = ref(new Map<string, boolean>());
  const realtimeConnected = ref(false);

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let conversationsPoll: ReturnType<typeof setInterval> | null = null;
  let messagesPoll: ReturnType<typeof setInterval> | null = null;
  let activeUserId: string | null = null;
  let getActiveConversationId: (() => string | null) | null = null;

  async function fetchConversations(userId: string, opts: { silent?: boolean } = {}) {
    try {
      if (!opts.silent) {
        error.value = null;
        loading.value = true;
      }
      const response = await api<{ data: Conversation[] }>(`/message/conversations/user/${userId}`);
      conversations.value = response.data;
    } catch (e) {
      if (!opts.silent) error.value = normalizeApiError(e);
    } finally {
      if (!opts.silent) loading.value = false;
    }
  }

  async function fetchMessages(conversationId: string, opts: { silent?: boolean } = {}) {
    try {
      if (!opts.silent) {
        error.value = null;
        loading.value = true;
      }
      const response = await api<{ data: Message[] }>(`/message/conversations/${conversationId}/messages`);
      currentMessages.value = response.data;
    } catch (e) {
      if (!opts.silent) error.value = normalizeApiError(e);
    } finally {
      if (!opts.silent) loading.value = false;
    }
  }

  async function sendMessage(conversationId: string, content: string) {
    try {
      error.value = null;
      sending.value = true;
      const response = await api<{ data: Message }>(`/message/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { content },
      });
      currentMessages.value.push(response.data);
    } catch (e) {
      error.value = normalizeApiError(e);
    } finally {
      sending.value = false;
    }
  }

  async function createConversation(participantIds: string[], name?: string) {
    const response = await api<{ data: Conversation }>('/message/conversations', {
      method: 'POST',
      body: { name, participantIds },
    });
    conversations.value.unshift(response.data);
    return response.data;
  }

  async function fetchPresence(userIds: string[]) {
    const uniqueIds = Array.from(new Set(userIds.filter((id) => id.trim().length > 0)));
    if (uniqueIds.length === 0) return;
    try {
      const response = await api<{ data: { userId: string; online: boolean }[] }>('/message/presence', {
        query: { userIds: uniqueIds },
      });
      for (const entry of response.data) {
        presence.value.set(entry.userId, entry.online);
      }
    } catch {
      // La présence est un confort d'affichage : un échec ne doit pas bloquer la messagerie.
    }
  }

  function startFallbackPolling() {
    if (conversationsPoll || messagesPoll) return;
    conversationsPoll = setInterval(() => {
      if (activeUserId) fetchConversations(activeUserId, { silent: true });
    }, FALLBACK_CONVERSATIONS_INTERVAL_MS);
    messagesPoll = setInterval(() => {
      const conversationId = getActiveConversationId?.();
      if (conversationId) fetchMessages(conversationId, { silent: true });
    }, FALLBACK_MESSAGES_INTERVAL_MS);
  }

  function stopFallbackPolling() {
    if (conversationsPoll) clearInterval(conversationsPoll);
    if (messagesPoll) clearInterval(messagesPoll);
    conversationsPoll = null;
    messagesPoll = null;
  }

  function handleRealtimeEvent(event: RealtimeEvent) {
    if (event.type === 'presence') {
      presence.value.set(event.userId, event.online);
      return;
    }

    if (event.data.conversationId === getActiveConversationId?.()) {
      currentMessages.value.push(event.data);
    }

    const conversation = conversations.value.find((c) => c.id === event.data.conversationId);
    if (conversation) {
      conversation.messages = [event.data];
      conversation.updatedAt = event.data.sentAt;
    }
  }

  function scheduleReconnect() {
    if (realtimeConnected.value) {
      realtimeConnected.value = false;
      startFallbackPolling();
    }
    if (reconnectTimer || !activeUserId) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (activeUserId && getActiveConversationId) connectRealtime(activeUserId, getActiveConversationId);
    }, RECONNECT_DELAY_MS);
  }

  function connectRealtime(userId: string, conversationIdGetter: () => string | null) {
    activeUserId = userId;
    getActiveConversationId = conversationIdGetter;

    const token = authTokenCookie.value?.trim();
    if (!token) {
      startFallbackPolling();
      return;
    }

    const wsBaseUrl = String(config.public.gatewayWsBaseUrl).replace(/\/$/, '');
    socket = new WebSocket(`${wsBaseUrl}/message/ws?token=${encodeURIComponent(token)}`);

    socket.addEventListener('open', () => {
      realtimeConnected.value = true;
      stopFallbackPolling();
    });
    socket.addEventListener('message', (event) => {
      try {
        handleRealtimeEvent(JSON.parse(event.data as string) as RealtimeEvent);
      } catch {
        // Payload WS malformé : on l'ignore plutôt que de casser la connexion.
      }
    });
    socket.addEventListener('close', scheduleReconnect);
    socket.addEventListener('error', scheduleReconnect);
  }

  function disconnectRealtime() {
    activeUserId = null;
    getActiveConversationId = null;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    stopFallbackPolling();
    if (socket) {
      socket.removeEventListener('close', scheduleReconnect);
      socket.removeEventListener('error', scheduleReconnect);
      socket.close();
      socket = null;
    }
    realtimeConnected.value = false;
  }

  return {
    conversations,
    currentMessages,
    loading,
    sending,
    error,
    presence,
    realtimeConnected,
    fetchConversations,
    fetchMessages,
    sendMessage,
    createConversation,
    fetchPresence,
    connectRealtime,
    disconnectRealtime,
  };
}
