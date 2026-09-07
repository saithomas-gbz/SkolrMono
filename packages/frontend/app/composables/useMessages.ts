import { normalizeApiError } from '~/composables/useClass';
import { AUTH_TOKEN_COOKIE, useAuthTokenCookie } from '~/composables/authSession';

export type MessageRead = {
  id: string;
  userId: string;
  readAt: string;
};

export type MessageAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  sentAt: string;
  reads: MessageRead[];
  attachments: MessageAttachment[];
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
  unreadCount: number;
};

type RealtimeEvent =
  | { type: 'message'; data: Message }
  | { type: 'conversation'; data: Conversation }
  | { type: 'presence'; userId: string; online: boolean }
  | { type: 'read'; conversationId: string; messageIds: string[]; readerId: string; readAt: string }
  | { type: 'ping' }
  | { type: 'pong' };

const FALLBACK_CONVERSATIONS_INTERVAL_MS = 20_000;
const FALLBACK_MESSAGES_INTERVAL_MS = 5_000;
const RECONNECT_DELAY_MS = 5_000;
/**
 * Le serveur émet un `ping` toutes les 25 s (`MESSAGE_WS_HEARTBEAT_MS`). Passé
 * deux intervalles sans la moindre trame, on considère le lien mort : une
 * WebSocket coupée par un proxy, une mise en veille ou une perte de réseau
 * n'émet pas toujours `close`, et la connexion resterait « connectée » sans
 * rien recevoir, polling de secours désactivé.
 */
const REALTIME_SILENCE_TIMEOUT_MS = 60_000;
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

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
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
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
      currentMessages.value = response.data.map((m) => ({ reads: [], attachments: [], ...m }));
    } catch (e) {
      if (!opts.silent) error.value = normalizeApiError(e);
    } finally {
      if (!opts.silent) loading.value = false;
    }
  }

  async function sendMessage(conversationId: string, content: string, files: File[] = []) {
    try {
      error.value = null;
      sending.value = true;
      let response: { data: Message };
      if (files.length > 0) {
        const form = new FormData();
        form.append('content', content);
        for (const file of files) {
          form.append('file', file);
        }
        response = await api<{ data: Message }>(`/message/conversations/${conversationId}/messages`, {
          method: 'POST',
          body: form,
        });
      } else {
        response = await api<{ data: Message }>(`/message/conversations/${conversationId}/messages`, {
          method: 'POST',
          body: { content },
        });
      }
      // La diffusion WebSocket inclut l'expéditeur et arrive souvent avant la
      // réponse HTTP : sans ce contrôle, le message s'afficherait en double
      // dans l'onglet émetteur.
      if (!currentMessages.value.some((m) => m.id === response.data.id)) {
        currentMessages.value.push({ reads: [], attachments: [], ...response.data });
      }
    } catch (e) {
      error.value = normalizeApiError(e);
    } finally {
      sending.value = false;
    }
  }

  async function downloadAttachment(conversationId: string, attachmentId: string, fileName: string) {
    const blob = await api<Blob>(`/message/conversations/${conversationId}/attachments/${attachmentId}`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function markAsRead(conversationId: string) {
    const conversation = conversations.value.find((c) => c.id === conversationId);
    if (!conversation || !conversation.unreadCount) return;
    try {
      await api(`/message/conversations/${conversationId}/read`, { method: 'PATCH' });
      conversation.unreadCount = 0;
    } catch {

      // Le marquage comme lu est un confort d'affichage : un échec ne doit pas bloquer la messagerie.
    }
  }

  async function createConversation(participantIds: string[], name?: string) {
    const response = await api<{ data: Conversation }>('/message/conversations', {
      method: 'POST',
      body: { name, participantIds },
    });
    // `unreadCount` est absent de la réponse de création : sans ce défaut, le
    // badge partirait d'`undefined` et deviendrait `NaN` au premier message.
    const created = { unreadCount: 0, ...response.data };
    if (!conversations.value.some((c) => c.id === created.id)) {
      conversations.value.unshift(created);
    }
    return created;
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

  function sendRealtime(payload: unknown) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  }

  function handleRealtimeEvent(event: RealtimeEvent) {
    if (event.type === 'ping') {
      sendRealtime({ type: 'pong' });
      return;
    }

    if (event.type === 'pong') return;

    if (event.type === 'presence') {
      presence.value.set(event.userId, event.online);
      return;
    }

    if (event.type === 'read') {
      for (const message of currentMessages.value) {
        if (!event.messageIds.includes(message.id)) continue;
        if (!message.reads) message.reads = [];
        if (message.reads.some((r) => r.userId === event.readerId)) continue;
        message.reads.push({ id: `${message.id}:${event.readerId}`, userId: event.readerId, readAt: event.readAt });
      }
      return;
    }

    if (event.type === 'conversation') {
      if (!conversations.value.some((c) => c.id === event.data.id)) {
        conversations.value.unshift({ participants: [], messages: [], unreadCount: 0, ...event.data });
      }
      return;
    }

    const isActiveConversation = event.data.conversationId === getActiveConversationId?.();
    // Déduplication : l'expéditeur reçoit aussi ses propres messages (pour
    // synchroniser ses autres sessions) et a déjà inséré celui-ci localement.
    if (isActiveConversation && !currentMessages.value.some((m) => m.id === event.data.id)) {
      currentMessages.value.push({ reads: [], attachments: [], ...event.data });
    }

    const conversation = conversations.value.find((c) => c.id === event.data.conversationId);
    if (!conversation) {
      // Conversation inconnue de la liste : fil créé pendant une coupure, ou
      // auquel on vient d'être ajouté. Sans ce rattrapage, le message est
      // perdu jusqu'au prochain chargement complet de la page.
      if (activeUserId) fetchConversations(activeUserId, { silent: true });
      return;
    }

    conversation.messages = [event.data];
    conversation.updatedAt = event.data.sentAt;
    // Le badge doit suivre le temps réel : la liste n'étant plus rechargée
    // tant que la WebSocket tient, il resterait figé sinon.
    if (!isActiveConversation && event.data.senderId !== activeUserId) {
      conversation.unreadCount = (conversation.unreadCount ?? 0) + 1;
    }
  }

  /**
   * Le jeton est relu à chaque connexion plutôt que capturé une fois pour
   * toutes : après un rafraîchissement JWT, une reconnexion présentant
   * l'ancien jeton serait rejetée en 4001 et boucherait indéfiniment. La ref
   * `useCookie` du composable ne reflète pas les écritures faites ailleurs,
   * d'où la lecture directe de `document.cookie` côté navigateur.
   */
  function readAuthToken(): string | null {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_TOKEN_COOKIE}=([^;]*)`));
      const raw = match?.[1] ? decodeURIComponent(match[1]).trim() : '';
      if (raw) return raw;
    }
    return authTokenCookie.value?.trim() || null;
  }

  /**
   * L'URL de la WebSocket est dérivée du contexte plutôt que reprise telle
   * quelle : `NUXT_PUBLIC_GATEWAY_WS_BASE_URL` vaut `ws://localhost:3001` par
   * défaut, valeur qui survit souvent au déploiement alors que l'HTTP, lui,
   * passe par le proxy `/api`. Une page servie en HTTPS refuse en plus tout
   * `ws://` (contenu mixte). On aligne donc le schéma sur celui de la page, et
   * on bascule sur son origine quand la valeur configurée pointe sur la
   * boucle locale alors que l'application est servie ailleurs.
   */
  function realtimeUrl(token: string): string {
    const query = `?token=${encodeURIComponent(token)}`;
    const configured = String(config.public.gatewayWsBaseUrl ?? '').replace(/\/$/, '');

    if (typeof window === 'undefined') return `${configured}/message/ws${query}`;

    const pageScheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiPrefix = String(config.public.gatewayBaseUrl ?? '');
    const sameOrigin = () => {
      const prefix = apiPrefix.startsWith('/') ? apiPrefix.replace(/\/$/, '') : '';
      return `${pageScheme}//${window.location.host}${prefix}/message/ws${query}`;
    };

    let target: URL;
    try {
      target = new URL(configured.replace(/^ws/, 'http'));
    } catch {
      return sameOrigin();
    }

    if (LOOPBACK_HOSTS.includes(target.hostname) && !LOOPBACK_HOSTS.includes(window.location.hostname)) {
      return sameOrigin();
    }

    const scheme = pageScheme === 'wss:' || target.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${scheme}//${target.host}/message/ws${query}`;
  }

  function armSilenceWatchdog() {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      silenceTimer = null;
      // `close()` déclenche normalement `scheduleReconnect` via l'écouteur,
      // mais un socket à moitié ouvert peut n'émettre aucun événement : on
      // appelle donc explicitement la reconnexion, qui est idempotente.
      closeSocket();
      scheduleReconnect();
    }, REALTIME_SILENCE_TIMEOUT_MS);
  }

  function closeSocket() {
    if (!socket) return;
    socket.removeEventListener('close', scheduleReconnect);
    socket.removeEventListener('error', scheduleReconnect);
    socket.close();
    socket = null;
  }

  function scheduleReconnect() {
    realtimeConnected.value = false;
    // Le polling doit reprendre même si la WebSocket ne s'est jamais ouverte :
    // le démarrer uniquement après une connexion réussie laissait la
    // messagerie totalement figée dès que l'URL était injoignable.
    startFallbackPolling();
    if (reconnectTimer || !activeUserId) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (activeUserId && getActiveConversationId) connectRealtime(activeUserId, getActiveConversationId);
    }, RECONNECT_DELAY_MS);
  }

  function connectRealtime(userId: string, conversationIdGetter: () => string | null) {
    activeUserId = userId;
    getActiveConversationId = conversationIdGetter;
    closeSocket();

    const token = readAuthToken();
    if (!token) {
      startFallbackPolling();
      return;
    }

    socket = new WebSocket(realtimeUrl(token));

    socket.addEventListener('open', () => {
      realtimeConnected.value = true;
      stopFallbackPolling();
      armSilenceWatchdog();
      // La liste a pu bouger pendant la coupure (nouvelle conversation,
      // messages manqués) : la WebSocket ne rejoue pas l'historique.
      if (activeUserId) fetchConversations(activeUserId, { silent: true });
    });
    socket.addEventListener('message', (event) => {
      armSilenceWatchdog();
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
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
    stopFallbackPolling();
    closeSocket();
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
    downloadAttachment,
    markAsRead,
    createConversation,
    fetchPresence,
    connectRealtime,
    disconnectRealtime,
  };
}
