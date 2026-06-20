<template>
  <div class="page">
    <Card>
      <template #title>{{ $t('parent.justifications_title') }}</template>
      <template #content>
        <ParentChildSelector class="selector" />

        <Message v-if="!activeChildId" severity="info" :closable="false">
          {{ $t('parent.select_child_hint') }}
        </Message>

        <template v-else>
          <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

          <div v-else-if="pending" class="loading">
            <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
            <span>{{ $t('common.loading') }}</span>
          </div>

          <template v-else>
            <DataTable :value="justifications" data-key="id" class="table">
              <Column field="createdAt" :header="$t('planning.justifications.created_at')" sortable>
                <template #body="{ data }">{{ formatDatetime(data.createdAt) }}</template>
              </Column>
              <Column field="reason" :header="$t('planning.justifications.upload_dialog.reason')" />
              <Column field="status" :header="$t('planning.justifications.status')">
                <template #body="{ data }">
                  <Tag :value="$t(`planning.justifications.statuses.${data.status}`)" :severity="statusSeverity(data.status)" />
                </template>
              </Column>
              <Column :header="$t('planning.justifications.documents')">
                <template #body="{ data }">
                  <Button
                    v-for="doc in data.documents"
                    :key="doc.id"
                    :label="doc.fileName"
                    icon="pi pi-file"
                    size="small"
                    text
                    @click="downloadJustificationDocument(data.id, doc.id, doc.fileName)"
                  />
                </template>
              </Column>
              <Column field="reviewComment" :header="$t('planning.justifications.review_comment')">
                <template #body="{ data }">{{ data.reviewComment ?? '—' }}</template>
              </Column>
            </DataTable>
            <p v-if="justifications.length === 0" class="empty">{{ $t('planning.justifications.no_requests') }}</p>
          </template>
        </template>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import type { AbsenceJustification } from '~/composables/usePlanning';

definePageMeta({ middleware: ['auth'] });

const { fetchAbsenceJustifications, downloadJustificationDocument } = usePlanning();
const { activeChildId } = useParentChild();

const justifications = ref<AbsenceJustification[]>([]);
const pending = ref(true);
const fetchError = ref<string | null>(null);

async function load() {
  if (!activeChildId.value) return;
  pending.value = true;
  fetchError.value = null;
  try {
    justifications.value = await fetchAbsenceJustifications({ studentId: activeChildId.value });
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}

watch(activeChildId, load, { immediate: true });

function statusSeverity(status: AbsenceJustification['status']) {
  return { DRAFT: 'secondary', PENDING: 'warn', APPROVED: 'success', REJECTED: 'danger' }[status] as
    | 'secondary'
    | 'warn'
    | 'success'
    | 'danger';
}

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.selector {
  margin-bottom: 1rem;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 6rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.empty {
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.table {
  font-size: 0.9rem;
}
</style>
