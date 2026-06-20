<template>
  <div class="page">
    <Card>
      <template #title>{{ $t('parent.absences_title') }}</template>
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
            <div class="toolbar">
              <Button
                :label="$t('planning.justifications.deposit_button')"
                icon="pi pi-upload"
                :disabled="selectedAbsences.length === 0"
                @click="uploadDialogVisible = true"
              />
            </div>

            <DataTable v-model:selection="selectedAbsences" :value="rows" data-key="id" class="table">
              <Column selection-mode="multiple" header-style="width: 3rem" :selectable="(data: Row) => !data.justified" />
              <Column field="sessionDate" :header="$t('planning.absences.session')" sortable />
              <Column field="justified" :header="$t('planning.absences.justified')">
                <template #body="{ data }">
                  <Tag :value="data.justified ? $t('common.yes') : $t('common.no')" :severity="data.justified ? 'success' : 'warn'" />
                </template>
              </Column>
            </DataTable>
            <p v-if="rows.length === 0" class="empty">{{ $t('planning.absences.no_absences') }}</p>
          </template>
        </template>
      </template>
    </Card>

    <PlanningJustificationUploadDialog
      v-model:visible="uploadDialogVisible"
      :absence-ids="selectedAbsences.map((a) => a.id)"
      :student-id="activeChildId ?? undefined"
      @saved="onJustificationSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import type { Absence } from '~/composables/usePlanning';

definePageMeta({ middleware: ['auth'] });

type Row = Absence & { sessionDate: string };

const { fetchAbsences } = usePlanning();
const { activeChildId } = useParentChild();

const absences = ref<Absence[]>([]);
const selectedAbsences = ref<Row[]>([]);
const uploadDialogVisible = ref(false);
const pending = ref(true);
const fetchError = ref<string | null>(null);

const rows = computed<Row[]>(() =>
  absences.value.map((a) => ({ ...a, sessionDate: formatDatetime(a.createdAt) })),
);

async function load() {
  if (!activeChildId.value) return;
  pending.value = true;
  fetchError.value = null;
  try {
    absences.value = await fetchAbsences({ userId: activeChildId.value });
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}

watch(activeChildId, load, { immediate: true });

async function onJustificationSaved() {
  selectedAbsences.value = [];
  await load();
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

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
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
