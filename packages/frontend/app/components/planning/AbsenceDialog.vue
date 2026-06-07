<template>
  <Dialog
    v-model:visible="visible"
    header="Déclarer une absence"
    modal
    :style="{ width: '28rem' }"
    @hide="reset"
  >
    <div class="absence-form">
      <div
        v-if="session"
        class="session-info"
      >
        <span class="session-info-label">Session</span>
        <span>{{ formatDatetime(session.startAt) }} – {{ formatTime(session.endAt) }}</span>
        <span v-if="session.room" class="session-room">Salle {{ session.room }}</span>
      </div>

      <div class="field">
        <label for="ab-user">Utilisateur (ID)</label>
        <InputText id="ab-user" v-model="form.userId" class="w-full" placeholder="UUID de l'élève ou du prof" />
      </div>

      <div class="field">
        <label for="ab-role">Rôle</label>
        <Select
          id="ab-role"
          v-model="form.role"
          :options="roleOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>

      <div class="field">
        <label for="ab-reason">Motif (optionnel)</label>
        <Textarea id="ab-reason" v-model="form.reason" class="w-full" rows="2" auto-resize />
      </div>

      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    </div>

    <template #footer>
      <Button label="Annuler" severity="secondary" text @click="visible = false" />
      <Button label="Enregistrer" :loading="pending" :disabled="!isValid" @click="submit" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import type { Session } from '~/composables/usePlanning';

const props = defineProps<{ session: Session | null }>();
const emit = defineEmits<{ (e: 'saved'): void }>();
const visible = defineModel<boolean>('visible', { default: false });

const { createAbsence } = usePlanning();

const roleOptions = [
  { label: 'Élève', value: 'STUDENT' },
  { label: 'Professeur', value: 'TEACHER' },
];

const form = reactive({ userId: '', role: 'STUDENT' as 'STUDENT' | 'TEACHER', reason: '' });
const pending = ref(false);
const error = ref<string | null>(null);

const isValid = computed(() => form.userId.trim().length > 0 && props.session !== null);

function reset() {
  form.userId = '';
  form.role = 'STUDENT';
  form.reason = '';
  error.value = null;
}

async function submit() {
  if (!props.session) return;
  error.value = null;
  pending.value = true;
  try {
    await createAbsence({
      sessionId: props.session.id,
      userId: form.userId.trim(),
      role: form.role,
      reason: form.reason.trim() || undefined,
    });
    visible.value = false;
    emit('saved');
  } catch (e) {
    error.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.absence-form {
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

.session-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.5rem 0.75rem;
  background: var(--p-surface-100, #f8fafc);
  border-radius: 6px;
  font-size: 0.875rem;
}

.session-info-label {
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color, #64748b);
}

.session-room {
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.8rem;
}

.w-full {
  width: 100%;
}
</style>
