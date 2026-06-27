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
          <div class="conv-name">
            <Badge
              v-if="otherParticipants(conv).length > 0"
              class="presence-badge"
              :severity="isAnyOnline(conv) ? 'success' : 'secondary'"
              :aria-label="isAnyOnline(conv) ? $t('messages.presence_online') : $t('messages.presence_offline')"
            />
            {{ convDisplayName(conv) }}
            <Badge
              v-if="conv.unreadCount > 0"
              class="unread-badge"
              severity="danger"
              :value="unreadBadgeValue(conv.unreadCount)"
              :aria-label="$t('messages.unread_badge', { count: conv.unreadCount }, conv.unreadCount)"
            />
          </div>
          <div v-if="conv.messages[0]" class="conv-preview">{{ conv.messages[0].content }}</div>
        </li>
      </ul>
    </div>

    <!-- Panneau droit : chat -->
    <div class="chat-panel">
      <template v-if="selectedConversation">
        <div class="chat-header">
          <span class="chat-title">{{ convDisplayName(selectedConversation) }}</span>
          <div class="chat-participants">
            <span v-for="p in otherParticipants(selectedConversation)" :key="p.userId" class="chat-participant">
              <Badge
                class="presence-badge"
                :severity="isOnline(p.userId) ? 'success' : 'secondary'"
                :aria-label="presenceLabel(p.userId)"
              />
              {{ senderName(p.userId) }}
            </span>
          </div>
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
              <span class="message-time">
                {{ formatTime(msg.sentAt) }}
                <i
                  v-if="msg.senderId === userId"
                  v-tooltip.top="readReceiptTooltip(msg)"
                  class="pi read-receipt"
                  :class="allRead(msg) ? 'pi-check-circle read-receipt-read' : 'pi-check'"
                />
              </span>
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
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import type { Conversation, ConversationParticipant, Message as ChatMessage } from '~/composables/useMessages';
import type { UserProfile } from '~/composables/useUser';

definePageMeta({ middleware: 'auth' });

const { t } = useI18n();
const { userId } = useAuth();
const {
  conversations,
  currentMessages,
  loading,
  sending,
  error,
  presence,
  fetchConversations,
  fetchMessages,
  sendMessage,
  markAsRead,
  fetchPresence,
  connectRealtime,
  disconnectRealtime,
} = useMessages();
const { fetchUsersByIds } = useUser();

const selectedConversationId = ref<string | null>(null);
const selectedConversation = computed(
  () => conversations.value.find((c) => c.id === selectedConversationId.value) ?? null,
);
const newMessage = ref('');
const newConvVisible = ref(false);
const messagesEnd = ref<HTMLElement | null>(null);
const userProfiles = ref(new Map<string, UserProfile>());

onMounted(async () => {
  if (userId.value) {
    await fetchConversations(userId.value);
    await resolveParticipants();
    connectRealtime(userId.value, () => selectedConversationId.value);
  }
});

onUnmounted(() => {
  disconnectRealtime();
});

async function resolveParticipants() {
  const allIds = [
    ...new Set(conversations.value.flatMap((c) => c.participants.map((p) => p.userId))),
  ].filter((id) => !userProfiles.value.has(id));
  if (allIds.length === 0) return;
  const profiles = await fetchUsersByIds(allIds);
  profiles.forEach((p) => userProfiles.value.set(p.id, p));
  await fetchPresence(allIds);
}

function otherParticipants(conv: Conversation): ConversationParticipant[] {
  return conv.participants.filter((p) => p.userId !== userId.value);
}

function isOnline(participantId: string): boolean {
  return presence.value.get(participantId) ?? false;
}

function isAnyOnline(conv: Conversation): boolean {
  return otherParticipants(conv).some((p) => isOnline(p.userId));
}

function presenceLabel(participantId: string): string {
  return isOnline(participantId) ? t('messages.presence_online') : t('messages.presence_offline');
}

async function selectConversation(conv: Conversation) {
  selectedConversationId.value = conv.id;
  await fetchMessages(conv.id);
  await markAsRead(conv.id);
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

  const lastMessage = currentMessages.value[currentMessages.value.length - 1];
  if (lastMessage && lastMessage.senderId !== userId.value && selectedConversationId.value) {
    markAsRead(selectedConversationId.value);
  }
});

function unreadBadgeValue(count: number): string {
  return count > 99 ? '99+' : String(count);
}

function allRead(msg: ChatMessage): boolean {
  if (!selectedConversation.value) return false;
  const otherIds = otherParticipants(selectedConversation.value).map((p) => p.userId);
  return otherIds.length > 0 && otherIds.every((id) => (msg.reads ?? []).some((r) => r.userId === id));
}

function readReceiptTooltip(msg: ChatMessage): string {
  if (msg.reads.length === 0) return t('messages.read_receipt_sent');
  const names = msg.reads.map((r) => senderName(r.userId)).join(', ');
  return t('messages.read_by', { names });
}

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
  border: 1px solid var(--p-surface-border, var(--skolr-color-border));
  border-radius: 0.5rem;
  overflow: hidden;
}

.conversations-panel {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--p-surface-border, var(--skolr-color-border));
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border, var(--skolr-color-border));
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
  border-bottom: 1px solid var(--p-surface-border, var(--skolr-color-border));
}

.conversation-item:hover,
.conversation-item.active {
  background: var(--p-surface-hover, var(--skolr-color-surface-hover));
}

.conv-name {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.presence-badge {
  width: 0.5rem;
  height: 0.5rem;
  min-width: 0;
  padding: 0;
  border-radius: 50%;
}

.unread-badge {
  margin-left: auto;
}

.conv-preview {
  font-size: 0.75rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
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
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border, var(--skolr-color-border));
  font-weight: 600;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.chat-participants {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-weight: 400;
  font-size: 0.75rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.chat-participant {
  display: flex;
  align-items: center;
  gap: 0.35rem;
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
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
  margin-bottom: 0.2rem;
  padding: 0 0.25rem;
}

.message-bubble {
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  background: var(--p-surface-ground, var(--skolr-color-page-bg));
  word-break: break-word;
}

.message-row.own .message-bubble {
  background: var(--p-primary-color, var(--skolr-color-brand-green));
  color: white;
}

.message-time {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.65rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
  margin-top: 0.2rem;
  padding: 0 0.25rem;
}

.read-receipt {
  font-size: 0.7rem;
}

.read-receipt-read {
  color: var(--p-primary-color, var(--skolr-color-brand-green));
}

.message-input-row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--p-surface-border, var(--skolr-color-border));
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
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
  padding: 2rem;
}
</style>
