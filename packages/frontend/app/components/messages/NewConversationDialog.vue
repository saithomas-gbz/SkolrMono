<template>
  <Dialog
    v-model:visible="visible"
    :header="$t('messages.new_conversation_dialog.title')"
    modal
    :style="{ width: '32rem' }"
    @hide="resetForm"
  >
    <div class="dialog-form">
      <div class="field">
        <label for="conv-name">{{ $t('messages.new_conversation_dialog.name_label') }}</label>
        <InputText
          id="conv-name"
          v-model="form.name"
          class="w-full"
          :placeholder="$t('messages.new_conversation_dialog.name_placeholder')"
        />
      </div>

      <div class="field">
        <label for="conv-participants">{{ $t('messages.new_conversation_dialog.participants_label') }}</label>
        <MultiSelect
          id="conv-participants"
          v-model="form.selectedParticipants"
          :options="participantOptions"
          option-label="label"
          option-value="value"
          :placeholder="$t('messages.new_conversation_dialog.participants_placeholder')"
          :loading="loadingUsers"
          filter
          class="w-full"
        />
      </div>

      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    </div>

    <template #footer>
      <Button :label="$t('common.cancel')" severity="secondary" text @click="visible = false" />
      <Button
        :label="$t('common.create')"
        :loading="pending"
        :disabled="!isFormValid"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Button from 'primevue/button';
import Message from 'primevue/message';
import type { Conversation } from '~/composables/useMessages';

const emit = defineEmits<{
  (e: 'created', conversation: Conversation): void;
}>();

const visible = defineModel<boolean>('visible', { default: false });

const { createConversation } = useMessages();
const { fetchAllUsers, normalizeApiError } = useUser();
const { userId } = useAuth();

const loadingUsers = ref(false);
const participantOptions = ref<{ label: string; value: string }[]>([]);
const pending = ref(false);
const error = ref<string | null>(null);

const defaultForm = () => ({ name: '', selectedParticipants: [] as string[] });
const form = reactive(defaultForm());

const isFormValid = computed(() => form.selectedParticipants.length > 0);

onMounted(async () => {
  loadingUsers.value = true;
  try {
    const users = await fetchAllUsers();
    participantOptions.value = users
      .filter((u) => u.id !== userId.value)
      .map((u) => ({ label: u.name ?? u.email, value: u.id }));
  } catch {
    // silently degrade — options stay empty
  } finally {
    loadingUsers.value = false;
  }
});

function resetForm() {
  Object.assign(form, defaultForm());
  error.value = null;
}

async function submit() {
  error.value = null;
  pending.value = true;
  try {
    const conversation = await createConversation(
      form.selectedParticipants,
      form.name.trim() || undefined,
    );
    visible.value = false;
    emit('created', conversation);
  } catch (e) {
    error.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}
</script>

<style scoped>
.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 0.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field label {
  font-size: 0.875rem;
  font-weight: 600;
}

.w-full {
  width: 100%;
}
</style>
