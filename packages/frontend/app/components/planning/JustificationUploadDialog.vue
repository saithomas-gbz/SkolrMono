<template>
  <Dialog
    v-model:visible="visible"
    :header="$t('planning.justifications.upload_dialog.title')"
    modal
    :style="{ width: '32rem' }"
    @hide="reset"
  >
    <div class="justification-form">
      <p class="absence-count">
        {{ $t('planning.justifications.upload_dialog.selected_count', { count: absenceIds.length }) }}
      </p>

      <div class="field">
        <label for="just-reason">{{ $t('planning.justifications.upload_dialog.reason') }}</label>
        <Textarea id="just-reason" v-model="reason" class="w-full" rows="3" auto-resize />
      </div>

      <div class="field">
        <label>{{ $t('planning.justifications.upload_dialog.documents') }}</label>
        <FileUpload
          mode="advanced"
          multiple
          custom-upload
          :auto="false"
          :show-upload-button="false"
          :show-cancel-button="false"
          accept="application/pdf,image/jpeg,image/png"
          :max-file-size="5 * 1024 * 1024"
          :choose-label="$t('planning.justifications.upload_dialog.choose_files')"
          @select="onFilesChanged"
          @remove="onFilesChanged"
          @clear="files = []"
        >
          <template #empty>
            <span>{{ $t('planning.justifications.upload_dialog.drop_hint') }}</span>
          </template>
        </FileUpload>
      </div>

      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    </div>

    <template #footer>
      <Button :label="$t('common.cancel')" severity="secondary" text @click="visible = false" />
      <Button :label="$t('planning.justifications.upload_dialog.send')" :loading="pending" :disabled="!isValid" @click="submit" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';

const props = defineProps<{ absenceIds: string[]; studentId?: string }>();
const emit = defineEmits<{ (e: 'saved'): void }>();
const visible = defineModel<boolean>('visible', { default: false });

const { createAbsenceJustification, submitAbsenceJustification } = usePlanning();

const reason = ref('');
const files = ref<File[]>([]);
const pending = ref(false);
const error = ref<string | null>(null);

const isValid = computed(() => reason.value.trim().length > 0 && props.absenceIds.length > 0);

function onFilesChanged(event: { files: File[] }) {
  files.value = event.files;
}

function reset() {
  reason.value = '';
  files.value = [];
  error.value = null;
}

async function submit() {
  error.value = null;
  pending.value = true;
  try {
    const justification = await createAbsenceJustification(
      reason.value.trim(),
      props.absenceIds,
      files.value,
      props.studentId,
    );
    await submitAbsenceJustification(justification.id);
    visible.value = false;
    emit('saved');
  } catch (e) {
    error.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}
</script>

<style scoped>
.justification-form {
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

.absence-count {
  margin: 0;
  font-size: 0.875rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.w-full {
  width: 100%;
}
</style>
