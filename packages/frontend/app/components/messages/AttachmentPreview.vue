<template>
  <div class="attachment-preview">
    <template v-if="isImage">
      <img
        v-if="blobUrl"
        :src="blobUrl"
        :alt="$t('messages.image_preview_alt', { name: attachment.fileName })"
        class="attachment-image"
        @error="imageError = true"
      />
      <div v-else-if="imageError" class="attachment-chip">
        <i class="pi pi-image" />
        <span>{{ attachment.fileName }}</span>
        <Button
          icon="pi pi-download"
          text
          rounded
          size="small"
          :aria-label="$t('messages.download_attachment')"
          @click="$emit('download')"
        />
      </div>
      <div v-else class="attachment-loading">
        <i class="pi pi-spin pi-spinner" />
        <span>{{ attachment.fileName }}</span>
      </div>
    </template>
    <div v-else class="attachment-chip">
      <i class="pi pi-file" />
      <span>{{ attachment.fileName }}</span>
      <Button
        icon="pi pi-download"
        text
        rounded
        size="small"
        :aria-label="$t('messages.download_attachment')"
        @click="$emit('download')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import type { MessageAttachment } from '~/composables/useMessages';

const props = defineProps<{
  attachment: MessageAttachment;
  conversationId: string;
}>();

defineEmits<{
  download: [];
}>();

const isImage = computed(() => props.attachment.mimeType.startsWith('image/'));
const blobUrl = ref<string | null>(null);
const imageError = ref(false);

const api = useApi();

onMounted(async () => {
  if (!isImage.value) return;
  try {
    const blob = await api<Blob>(
      `/message/conversations/${props.conversationId}/attachments/${props.attachment.id}`,
      { responseType: 'blob' },
    );
    blobUrl.value = URL.createObjectURL(blob);
  } catch {
    imageError.value = true;
  }
});

onUnmounted(() => {
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value);
});
</script>

<style scoped>
.attachment-preview {
  max-width: 280px;
}

.attachment-image {
  max-width: 100%;
  max-height: 200px;
  border-radius: 0.5rem;
  display: block;
  object-fit: contain;
}

.attachment-chip,
.attachment-loading {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.5rem;
  border-radius: 0.4rem;
  background: var(--p-surface-overlay, rgba(0,0,0,0.06));
  font-size: 0.8rem;
  max-width: 100%;
}

.attachment-chip span,
.attachment-loading span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
</style>
