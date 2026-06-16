<template>
  <div class="messages-layout">
    <!-- Panneau gauche : liste des conversations -->
    <div class="conversations-panel">
      <div class="panel-header">
        <h2 class="panel-title">{{ $t('messages.title') }}</h2>
        <Button
          icon="pi pi-plus"
          :aria-label="$t('messages.new_conversation')"
          severity="secondary"
          text
          rounded
          @click="newConvVisible = true"
        />
      </div>

      <Message v-if="error" severity="error" :closable="false" class="panel-error">{{ error }}</Message>

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
          @click="selectConversation(conv)"
        >
          <div class="conv-name">{{ convDisplayName(conv) }}</div>
          <div v-if="conv.messages[0]" class="conv-preview">{{ conv.messages[0].content }}</div>
        </li>
      </ul>
    </div>

    <!-- Panneau droit : chat -->
    <div class="chat-panel">
      <template v-if="selectedConversation">
        <div class="chat-header">
          <span class="chat-title">{{ convDisplayName(selectedConversation) }}</span>
        </div>

        <div class="messages-area">
          <div v-if="loading" class="empty-state">
            <i class="pi pi-spin pi-spinner" />
          </div>
          <div v-else-if="currentMessages.length === 0" class="empty-state">
            <p>{{ $t('messages.empty_messages') }}</p>
          </div>
          <div v-else class="messages-list">
            <div
              v-for="msg in currentMessages"
              :key="msg.id"
              class="message-row"
              :class="{ own: msg.senderId === userId }"
            >
              <span v-if="msg.senderId !== userId" class="message-sender">
                {{ senderName(msg.senderId) }}
              </span>
              <div class="message-bubble">
                <span class="message-content">{{ msg.content }}</span>
              </div>
              <span class="message-time">{{ formatTime(msg.sentAt) }}</span>
            </div>
            <div ref="messagesEnd" />
          </div>
        </div>

        <div class="message-input-row">
          <Textarea
            v-model="newMessage"
            class="message-input"
            :placeholder="$t('messages.placeholder')"
            :auto-resize="true"
            rows="1"
            @keydown.enter.exact.prevent="handleSend"
          />
          <Button
            icon="pi pi-send"
            :loading="sending"
            :disabled="!newMessage.trim()"
            :aria-label="$t('messages.send')"
            @click="handleSend"
          />
        </div>
      </template>
      <div v-else class="empty-state">
        <p>{{ $t('messages.select_conversation') }}</p>
      </div>
    </div>

    <MessagesNewConversationDialog
      v-model:visible="newConvVisible"
      @created="onConversationCreated"
    />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import type { Conversation } from '~/composables/useMessages';
import type { UserProfile } from '~/composables/useUser';

definePageMeta({ middleware: 'auth' });

const { userId } = useAuth();
const { conversations, currentMessages, loading, sending, error, fetchConversations, fetchMessages, sendMessage } =
  useMessages();
const { fetchUsersByIds } = useUser();

const selectedConversationId = ref<string | null>(null);
const selectedConversation = computed(
  () => conversations.value.find((c) => c.id === selectedConversationId.value) ?? null,
);
const newMessage = ref('');
const newConvVisible = ref(false);
const messagesEnd = ref<HTMLElement | null>(null);
const userProfiles = ref(new Map<string, UserProfile>());

let messagesPoll: ReturnType<typeof setInterval> | null = null;
let conversationsPoll: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  if (userId.value) {
    await fetchConversations(userId.value);
    await resolveParticipants();
  }

  conversationsPoll = setInterval(async () => {
    if (!userId.value) return;
    await fetchConversations(userId.value, { silent: true });
    await resolveParticipants();
  }, 20_000);

  messagesPoll = setInterval(() => {
    if (selectedConversationId.value) {
      fetchMessages(selectedConversationId.value, { silent: true });
    }
  }, 5_000);
});

onUnmounted(() => {
  if (messagesPoll) clearInterval(messagesPoll);
  if (conversationsPoll) clearInterval(conversationsPoll);
});

async function resolveParticipants() {
  const allIds = [
    ...new Set(conversations.value.flatMap((c) => c.participants.map((p) => p.userId))),
  ].filter((id) => !userProfiles.value.has(id));
  if (allIds.length === 0) return;
  const profiles = await fetchUsersByIds(allIds);
  profiles.forEach((p) => userProfiles.value.set(p.id, p));
}

async function selectConversation(conv: Conversation) {
  selectedConversationId.value = conv.id;
  await fetchMessages(conv.id);
}

async function onConversationCreated(conv: Conversation) {
  selectedConversationId.value = conv.id;
  await resolveParticipants();
  await fetchMessages(conv.id);
}

async function handleSend() {
  if (!selectedConversationId.value || !newMessage.value.trim()) return;
  await sendMessage(selectedConversationId.value, newMessage.value.trim());
  newMessage.value = '';
}

watch(currentMessages, () => {
  nextTick(() => messagesEnd.value?.scrollIntoView({ behavior: 'smooth' }));
});

function convDisplayName(conv: Conversation): string {
  if (conv.name) return conv.name;
  const otherParticipants = conv.participants
    .filter((p) => p.userId !== userId.value)
    .map((p) => {
      const profile = userProfiles.value.get(p.userId);
      return profile?.name ?? profile?.email ?? p.userId;
    });
  return otherParticipants.join(', ') || conv.id;
}

function senderName(senderId: string): string {
  const profile = userProfiles.value.get(senderId);
  return profile?.name ?? profile?.email ?? senderId;
}

function formatTime(sentAt: string): string {
  return new Date(sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.messages-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  height: calc(100vh - 5rem);
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border, #e2e8f0);
  flex-shrink: 0;
}

.panel-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.panel-error {
  margin: 0.5rem;
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
  margin-top: 0.2rem;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border, #e2e8f0);
  font-weight: 600;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.messages-area {
  flex: 1;
  overflow-y: auto;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
}

.message-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 70%;
}

.message-row.own {
  align-self: flex-end;
  align-items: flex-end;
}

.message-sender {
  font-size: 0.7rem;
  color: var(--p-text-muted-color, #94a3b8);
  margin-bottom: 0.2rem;
  padding: 0 0.25rem;
}

.message-bubble {
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  background: var(--p-surface-ground, #f1f5f9);
  word-break: break-word;
}

.message-row.own .message-bubble {
  background: var(--p-primary-color, #3b82f6);
  color: white;
}

.message-time {
  font-size: 0.65rem;
  color: var(--p-text-muted-color, #94a3b8);
  margin-top: 0.2rem;
  padding: 0 0.25rem;
}

.message-input-row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--p-surface-border, #e2e8f0);
  flex-shrink: 0;
}

.message-input {
  flex: 1;
  resize: none;
  max-height: 8rem;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  color: var(--p-text-muted-color, #94a3b8);
  padding: 2rem;
}
</style>
