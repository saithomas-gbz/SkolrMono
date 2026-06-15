<template>
  <div class="messages-layout">
    <div class="conversations-panel">
      <div class="panel-header">
        <h2 class="panel-title">{{ $t('messages.title') }}</h2>
      </div>

      <div v-if="loading && conversations.length === 0" class="empty-state">
        <i class="pi pi-spin pi-spinner" />
      </div>
      <div v-else-if="conversations.length === 0" class="empty-state">
        <p>{{ $t('messages.empty_conversations') }}</p>
      </div>
      <ul v-else class="conversation-list">
        <li
          v-for="conv in conversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: selectedConversationId === conv.id }"
          @click="selectConversation(conv.id)"
        >
          <div class="conv-name">{{ conv.name ?? $t('messages.default_conversation_name') }}</div>
          <div v-if="conv.messages[0]" class="conv-preview">{{ conv.messages[0].content }}</div>
        </li>
      </ul>
    </div>

    <div class="chat-panel">
      <template v-if="selectedConversationId">
        <div v-if="loading" class="empty-state">
          <i class="pi pi-spin pi-spinner" />
        </div>
        <div v-else-if="currentMessages.length === 0" class="empty-state">
          <p>{{ $t('messages.empty_messages') }}</p>
        </div>
        <ScrollPanel v-else class="messages-scroll">
          <div class="messages-list">
            <div
              v-for="msg in currentMessages"
              :key="msg.id"
              class="message-bubble"
              :class="{ own: msg.senderId === userId }"
            >
              <span class="message-content">{{ msg.content }}</span>
            </div>
          </div>
        </ScrollPanel>

        <div class="message-input-row">
          <InputText
            v-model="newMessage"
            class="message-input"
            :placeholder="$t('messages.placeholder')"
            @keyup.enter="handleSend"
          />
          <Button
            icon="pi pi-send"
            :label="$t('messages.send')"
            :loading="sending"
            :disabled="!newMessage.trim()"
            @click="handleSend"
          />
        </div>
      </template>
      <div v-else class="empty-state">
        <p>{{ $t('messages.select_conversation') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ScrollPanel from 'primevue/scrollpanel';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

definePageMeta({ middleware: 'auth' });

const { userId } = useAuth();
const { conversations, currentMessages, loading, sending, fetchConversations, fetchMessages, sendMessage } =
  useMessages();

const selectedConversationId = ref<string | null>(null);
const newMessage = ref('');

onMounted(async () => {
  if (userId.value) {
    await fetchConversations(userId.value);
  }
});

async function selectConversation(id: string) {
  selectedConversationId.value = id;
  await fetchMessages(id);
}

async function handleSend() {
  if (!selectedConversationId.value || !newMessage.value.trim()) return;
  await sendMessage(selectedConversationId.value, newMessage.value.trim());
  newMessage.value = '';
}
</script>

<style scoped>
.messages-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 0;
  height: calc(100vh - 4rem);
  border: 1px solid var(--p-surface-border, #e2e8f0);
  border-radius: 0.5rem;
  overflow: hidden;
}

.conversations-panel {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--p-surface-border, #e2e8f0);
  overflow: hidden;
}

.panel-header {
  padding: 1rem;
  border-bottom: 1px solid var(--p-surface-border, #e2e8f0);
}

.panel-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.conversation-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.conversation-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid var(--p-surface-border, #e2e8f0);
}

.conversation-item:hover,
.conversation-item.active {
  background: var(--p-surface-hover, #f1f5f9);
}

.conv-name {
  font-weight: 500;
  font-size: 0.875rem;
}

.conv-preview {
  font-size: 0.75rem;
  color: var(--p-text-muted-color, #94a3b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.25rem;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-scroll {
  flex: 1;
  padding: 1rem;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
}

.message-bubble {
  max-width: 70%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  background: var(--p-surface-ground, #f8fafc);
  align-self: flex-start;
}

.message-bubble.own {
  align-self: flex-end;
  background: var(--p-primary-color, #3b82f6);
  color: white;
}

.message-input-row {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--p-surface-border, #e2e8f0);
}

.message-input {
  flex: 1;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--p-text-muted-color, #94a3b8);
  padding: 2rem;
}
</style>
