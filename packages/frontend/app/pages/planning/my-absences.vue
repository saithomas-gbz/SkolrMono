<template>
  <div class="page">
    <Card>
      <template #title>{{ $t('planning.justifications.my_absences_title') }}</template>
      <template #content>
        <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

        <div v-else-if="pending" class="loading">
          <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
          <span>{{ $t('common.loading') }}</span>
        </div>

        <template v-else>
          <div class="toolbar">
            <Button
              :label="$t('planning.justifications.deposit_button')"
              icon="pi pi-upload"
              :disabled="selectedAbsences.length === 0"
              @click="uploadDialogVisible = true"
            />
          </div>

          <DataTable
            v-model:selection="selectedAbsences"
            :value="unjustifiedAbsences"
            data-key="id"
            class="table"
          >
            <Column selection-mode="multiple" header-style="width: 3rem" />
            <Column field="sessionDate" :header="$t('planning.absences.session')" sortable />
          </DataTable>
          <p v-if="unjustifiedAbsences.length === 0" class="empty">
            {{ $t('planning.justifications.no_unjustified_absences') }}
          </p>

          <h3 class="section-title">{{ $t('planning.justifications.my_requests_title') }}</h3>
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
          <p v-if="justifications.length === 0" class="empty">
            {{ $t('planning.justifications.no_requests') }}
          </p>
        </template>
      </template>
    </Card>

    <PlanningJustificationUploadDialog
      v-model:visible="uploadDialogVisible"
      :absence-ids="selectedAbsences.map((a) => a.id)"
      @saved="onJustificationSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import type { Absence, AbsenceJustification } from '~/composables/usePlanning';

definePageMeta({ middleware: ['auth'] });

const { userId } = useAuth();
const { fetchAbsences, fetchAbsenceJustifications, downloadJustificationDocument } = usePlanning();

const absences = ref<Absence[]>([]);
const justifications = ref<AbsenceJustification[]>([]);
const selectedAbsences = ref<Absence[]>([]);
const uploadDialogVisible = ref(false);
const pending = ref(true);
const fetchError = ref<string | null>(null);

const unjustifiedAbsences = computed(() =>
  absences.value
    .filter((a) => !a.justified)
    .map((a) => ({ ...a, sessionDate: formatDatetime(a.createdAt) })),
);

async function load() {
  pending.value = true;
  fetchError.value = null;
  try {
    const [absencesResult, justificationsResult] = await Promise.all([
      fetchAbsences({ userId: userId.value ?? undefined }),
      fetchAbsenceJustifications({ studentId: userId.value ?? undefined }),
    ]);
    absences.value = absencesResult;
    justifications.value = justificationsResult;
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}

onMounted(load);

async function onJustificationSaved() {
  selectedAbsences.value = [];
  await load();
}

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

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
}

.section-title {
  margin: 1.5rem 0 0.75rem;
  font-size: 1.1rem;
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
