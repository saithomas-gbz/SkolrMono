import { normalizeApiError } from '~/composables/useClass';

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

export function useMessages() {
  const api = useApi();
  const conversations = ref<Conversation[]>([]);
  const currentMessages = ref<Message[]>([]);
  const loading = ref(false);
  const sending = ref(false);
  const error = ref<string | null>(null);

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

  return {
    conversations,
    currentMessages,
    loading,
    sending,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
    createConversation,
  };
}
