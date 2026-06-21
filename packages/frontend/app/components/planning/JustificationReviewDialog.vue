<template>
  <Dialog
    v-model:visible="visible"
    :header="$t('planning.justifications.review.title')"
    modal
    :style="{ width: '32rem' }"
    @hide="reset"
  >
    <div v-if="justification" class="review-form">
      <div class="field-readonly">
        <span class="field-label">{{ $t('planning.justifications.review.student_id') }}</span>
        <span>{{ justification.studentId }}</span>
      </div>

      <div class="field-readonly">
        <span class="field-label">{{ $t('planning.justifications.upload_dialog.reason') }}</span>
        <span>{{ justification.reason }}</span>
      </div>

      <div class="field-readonly">
        <span class="field-label">{{ $t('planning.justifications.documents') }}</span>
        <div class="documents">
          <Button
            v-for="doc in justification.documents"
            :key="doc.id"
            :label="doc.fileName"
            icon="pi pi-file"
            size="small"
            text
            @click="downloadJustificationDocument(justification!.id, doc.id, doc.fileName)"
          />
          <span v-if="justification.documents.length === 0">—</span>
        </div>
      </div>

      <div class="field">
        <label for="review-comment">{{ $t('planning.justifications.review.comment') }}</label>
        <Textarea id="review-comment" v-model="comment" class="w-full" rows="2" auto-resize />
      </div>

      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    </div>

    <template #footer>
      <Button :label="$t('common.cancel')" severity="secondary" text @click="visible = false" />
      <Button
        :label="$t('planning.justifications.review.reject')"
        severity="danger"
        outlined
        :loading="pending"
        @click="review('reject')"
      />
      <Button
        :label="$t('planning.justifications.review.approve')"
        severity="success"
        :loading="pending"
        @click="review('approve')"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import type { AbsenceJustification } from '~/composables/usePlanning';

const props = defineProps<{ justification: AbsenceJustification | null }>();
const emit = defineEmits<{ (e: 'saved'): void }>();
const visible = defineModel<boolean>('visible', { default: false });

const { t } = useI18n();
const { reviewAbsenceJustification, downloadJustificationDocument } = usePlanning();

const comment = ref('');
const pending = ref(false);
const error = ref<string | null>(null);

function reset() {
  comment.value = '';
  error.value = null;
}

async function review(action: 'approve' | 'reject') {
  if (!props.justification) return;
  if (action === 'reject' && comment.value.trim().length === 0) {
    error.value = t('planning.justifications.review.comment_required');
    return;
  }
  error.value = null;
  pending.value = true;
  try {
    await reviewAbsenceJustification(props.justification.id, action, comment.value.trim() || undefined);
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
.review-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 0.25rem;
}

.field,
.field-readonly {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field label,
.field-label {
  font-size: 0.875rem;
  font-weight: 600;
}

.documents {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.w-full {
  width: 100%;
}
</style>
