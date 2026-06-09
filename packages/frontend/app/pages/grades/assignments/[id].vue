<template>
  <div class="page">
    <Card>
      <template #title>
        <div class="card-header">
          <span>{{ assignment?.title ?? 'Grille de notation' }}</span>
          <div class="header-actions">
            <NuxtLink
              v-if="assignment"
              :to="`/grades/classes/${assignment.classId}?courseId=${assignment.courseId}`"
              class="p-button p-button-text p-button-sm"
            >
              Voir le carnet
            </NuxtLink>
            <Button
              v-if="assignment?.status === 'PUBLISHED'"
              label="Clôturer"
              icon="pi pi-lock"
              severity="secondary"
              outlined
              size="small"
              :loading="closing"
              @click="closeAssignment"
            />
          </div>
        </div>
      </template>
      <template #subtitle>
        <span v-if="assignment">
          {{ assignment.course?.name }} · {{ assignment.class?.name }} ·
          {{ formatDate(assignment.assignedAt) }} · /{{ assignment.maxScore }}
          <Tag :value="statusLabel(assignment.status)" :severity="statusSeverity(assignment.status)" class="ml-2" />
        </span>
      </template>
      <template #content>
        <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>
        <Message v-if="saveError" severity="error" :closable="false">{{ saveError }}</Message>

        <div v-if="pending" class="loading">
          <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
          <span>Chargement…</span>
        </div>

        <template v-else-if="gridData">
          <div class="grid-toolbar">
            <span class="grade-counter">
              {{ gridData.gradedCount }} / {{ gridData.totalCount }} noté{{ gridData.totalCount > 1 ? 's' : '' }}
            </span>
            <Button
              v-if="assignment?.status !== 'CLOSED'"
              label="Enregistrer tout"
              icon="pi pi-check"
              :loading="saving"
              :disabled="!hasPendingChanges"
              @click="saveAll"
            />
          </div>

          <DataTable
            :value="rows"
            data-key="userId"
            responsive-layout="scroll"
            class="grade-table"
            sort-field="name"
            :sort-order="1"
            removable-sort
          >
            <Column field="name" header="Élève" sortable style="min-width: 12rem" />
            <Column header="Statut" style="width: 12rem">
              <template #body="{ data }">
                <Select
                  v-model="localRows[data.userId].status"
                  :options="gradeStatusOptions"
                  option-label="label"
                  option-value="value"
                  class="status-select"
                  :disabled="assignment?.status === 'CLOSED'"
                  @change="markDirty(data.userId)"
                />
              </template>
            </Column>
            <Column header="Note" style="width: 10rem">
              <template #body="{ data }">
                <InputNumber
                  v-if="localRows[data.userId].status === 'GRADED'"
                  v-model="localRows[data.userId].value"
                  :min="0"
                  :max="assignment?.maxScore ?? 20"
                  :max-fraction-digits="1"
                  class="grade-input"
                  :disabled="assignment?.status === 'CLOSED'"
                  @input="markDirty(data.userId)"
                />
                <span v-else class="grade-na">—</span>
              </template>
            </Column>
            <Column header="Commentaire" style="min-width: 14rem">
              <template #body="{ data }">
                <InputText
                  v-model="localRows[data.userId].comment"
                  placeholder="Appréciation"
                  class="comment-input"
                  :disabled="assignment?.status === 'CLOSED'"
                  @input="markDirty(data.userId)"
                />
              </template>
            </Column>
          </DataTable>
        </template>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import {
  useAssignment,
  type GradeGridData,
  type GradeStatus,
} from '~/composables/useAssignment';

definePageMeta({ middleware: ['auth'] });

const route = useRoute();
const id = computed(() => route.params.id as string);

const { fetchGradeGrid, batchUpdateGrades, updateAssignment, normalizeApiError } = useAssignment();

const pending = ref(true);
const saving = ref(false);
const closing = ref(false);
const fetchError = ref<string | null>(null);
const saveError = ref<string | null>(null);
const gridData = ref<GradeGridData | null>(null);
const assignment = computed(() => gridData.value?.assignment ?? null);

interface LocalGradeRow {
  status: GradeStatus;
  value: number | null;
  comment: string;
}

const localRows = ref<Record<string, LocalGradeRow>>({});
const dirtyUsers = ref<Set<string>>(new Set());

const hasPendingChanges = computed(() => dirtyUsers.value.size > 0);

const rows = computed(() => gridData.value?.rows ?? []);

const gradeStatusOptions = [
  { label: 'Noté', value: 'GRADED' },
  { label: 'En attente', value: 'PENDING' },
  { label: 'Absent', value: 'ABSENT' },
  { label: 'Dispensé', value: 'EXEMPT' },
];

function statusLabel(s: string) {
  return { DRAFT: 'Brouillon', PUBLISHED: 'Publié', CLOSED: 'Clôturé' }[s] ?? s;
}

function statusSeverity(s: string) {
  return { DRAFT: 'secondary', PUBLISHED: 'success', CLOSED: 'danger' }[s] ?? 'info';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function markDirty(userId: string) {
  dirtyUsers.value = new Set([...dirtyUsers.value, userId]);
}

async function load() {
  pending.value = true;
  fetchError.value = null;
  try {
    const data = await fetchGradeGrid(id.value);
    gridData.value = data;
    const map: Record<string, LocalGradeRow> = {};
    for (const row of data.rows) {
      map[row.userId] = {
        status: row.grade.status,
        value: row.grade.value,
        comment: row.grade.comment ?? '',
      };
    }
    localRows.value = map;
    dirtyUsers.value = new Set();
  } catch (error) {
    fetchError.value = normalizeApiError(error);
  } finally {
    pending.value = false;
  }
}

async function saveAll() {
  saveError.value = null;
  saving.value = true;
  try {
    const entries = [...dirtyUsers.value].map((userId) => {
      const row = localRows.value[userId]!;
      return {
        userId,
        status: row.status,
        value: row.status === 'GRADED' ? (row.value ?? undefined) : undefined,
        comment: row.comment || undefined,
      };
    });
    await batchUpdateGrades(id.value, entries);
    await load();
  } catch (error) {
    saveError.value = normalizeApiError(error);
  } finally {
    saving.value = false;
  }
}

async function closeAssignment() {
  closing.value = true;
  try {
    await updateAssignment(id.value, { status: 'CLOSED' });
    await load();
  } catch (error) {
    saveError.value = normalizeApiError(error);
  } finally {
    closing.value = false;
  }
}

watch(id, load, { immediate: true });
</script>

<style scoped>
.page {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.page :deep(.p-card) {
  flex: 1 1 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.ml-2 {
  margin-left: 0.5rem;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--p-text-muted-color, #64748b);
  padding: 1.5rem 0;
}

.grid-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.grade-counter {
  font-size: 0.9rem;
  color: var(--p-text-muted-color, #64748b);
}

.grade-table {
  width: 100%;
}

.status-select {
  width: 100%;
}

.grade-input {
  width: 7rem;
}

.comment-input {
  width: 100%;
}

.grade-na {
  color: var(--p-text-muted-color, #64748b);
  font-size: 1.1rem;
}
</style>
