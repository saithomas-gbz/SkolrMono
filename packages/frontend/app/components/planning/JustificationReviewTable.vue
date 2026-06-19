<template>
  <div class="review-table">
    <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

    <div v-else-if="pending" class="loading">
      <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
      <span>{{ $t('common.loading') }}</span>
    </div>

    <div v-else-if="justifications.length === 0" class="empty">
      <p>{{ $t('planning.justifications.review.no_pending') }}</p>
    </div>

    <DataTable v-else :value="justifications" data-key="id" class="table">
      <Column field="studentId" :header="$t('planning.justifications.review.student_id')" />
      <Column field="createdAt" :header="$t('planning.justifications.created_at')" sortable>
        <template #body="{ data }">{{ formatDatetime(data.createdAt) }}</template>
      </Column>
      <Column field="reason" :header="$t('planning.justifications.upload_dialog.reason')" />
      <Column :header="$t('planning.justifications.documents')">
        <template #body="{ data }">{{ data.documents.length }}</template>
      </Column>
      <Column :header="$t('common.actions')">
        <template #body="{ data }">
          <Button
            :label="$t('planning.justifications.review.review_button')"
            icon="pi pi-search"
            size="small"
            @click="openReview(data)"
          />
        </template>
      </Column>
    </DataTable>

    <PlanningJustificationReviewDialog
      v-model:visible="reviewDialogVisible"
      :justification="selectedJustification"
      @saved="load"
    />
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import type { AbsenceJustification } from '~/composables/usePlanning';

const { fetchAbsenceJustifications } = usePlanning();

const justifications = ref<AbsenceJustification[]>([]);
const pending = ref(true);
const fetchError = ref<string | null>(null);
const reviewDialogVisible = ref(false);
const selectedJustification = ref<AbsenceJustification | null>(null);

async function load() {
  pending.value = true;
  fetchError.value = null;
  try {
    justifications.value = await fetchAbsenceJustifications({ status: 'PENDING' });
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}

onMounted(load);

function openReview(justification: AbsenceJustification) {
  selectedJustification.value = justification;
  reviewDialogVisible.value = true;
}

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
</script>

<style scoped>
.review-table {
  display: grid;
  gap: 0.75rem;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 6rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.empty {
  min-height: 6rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.empty p {
  margin: 0;
}

.table {
  font-size: 0.9rem;
}
</style>
