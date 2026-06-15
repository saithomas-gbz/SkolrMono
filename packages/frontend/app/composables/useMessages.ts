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

  async function fetchConversations(userId: string) {
    try {
      loading.value = true;
      const response = await api<{ data: Conversation[] }>(`/message/conversations/user/${userId}`);
      conversations.value = response.data;
    } catch (error) {
      console.error('[useMessages] fetchConversations error', error);
    } finally {
      loading.value = false;
    }
  }

  async function fetchMessages(conversationId: string) {
    try {
      loading.value = true;
      const response = await api<{ data: Message[] }>(`/message/conversations/${conversationId}/messages`);
      currentMessages.value = response.data;
    } catch (error) {
      console.error('[useMessages] fetchMessages error', error);
    } finally {
      loading.value = false;
    }
  }

  async function sendMessage(conversationId: string, content: string) {
    try {
      sending.value = true;
      const response = await api<{ data: Message }>(`/message/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { content },
      });
      currentMessages.value.push(response.data);
    } catch (error) {
      console.error('[useMessages] sendMessage error', error);
    } finally {
      sending.value = false;
    }
  }

  async function createConversation(participantIds: string[], name?: string) {
    try {
      const response = await api<{ data: Conversation }>('/message/conversations', {
        method: 'POST',
        body: { name, participantIds },
      });
      conversations.value.unshift(response.data);
      return response.data;
    } catch (error) {
      console.error('[useMessages] createConversation error', error);
      return null;
    }
  }

  return {
    conversations,
    currentMessages,
    loading,
    sending,
    fetchConversations,
    fetchMessages,
    sendMessage,
    createConversation,
  };
}
