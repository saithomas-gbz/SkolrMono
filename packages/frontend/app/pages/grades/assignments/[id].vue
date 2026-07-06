<template>
  <div class="page">
    <Card>
      <template #title>
        <div class="card-header">
          <span>{{ assignment?.title ?? $t('grades.assignment.default_title') }}</span>
          <div class="header-actions">
            <NuxtLink
              v-if="assignment"
              :to="`/grades/classes/${assignment.classId}?courseId=${assignment.courseId}`"
              class="p-button p-button-text p-button-sm"
            >
              {{ $t('grades.assignment.see_gradebook') }}
            </NuxtLink>
            <Button
              v-if="assignment?.status === 'PUBLISHED'"
              :label="$t('grades.assignment.close')"
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
          <span>{{ $t('common.loading') }}</span>
        </div>

        <template v-else-if="gridData">
          <div v-if="assignmentStats" class="assignment-stats">
            <div class="stat-tile">
              <span class="stat-value">{{ formatStat(assignmentStats.min) }}</span>
              <span class="stat-label">{{ $t('grades.assignment.stats_min') }}</span>
            </div>
            <div class="stat-tile">
              <span class="stat-value">{{ formatStat(assignmentStats.max) }}</span>
              <span class="stat-label">{{ $t('grades.assignment.stats_max') }}</span>
            </div>
            <div class="stat-tile">
              <span class="stat-value">{{ formatStat(assignmentStats.average) }}</span>
              <span class="stat-label">{{ $t('grades.assignment.stats_average') }}</span>
            </div>
            <div class="stat-tile">
              <span class="stat-value">{{ formatStat(assignmentStats.median) }}</span>
              <span class="stat-label">{{ $t('grades.assignment.stats_median') }}</span>
            </div>
          </div>

          <div class="grid-toolbar">
            <span class="grade-counter">{{ gradedCountLabel }}</span>
            <Button
              v-if="assignment?.status !== 'CLOSED'"
              :label="$t('grades.assignment.save_all')"
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
            <Column field="name" :header="$t('grades.assignment.student')" sortable style="min-width: 12rem" />
            <Column :header="$t('grades.assignment.status')" style="width: 12rem">
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
            <Column :header="$t('grades.assignment.grade')" style="width: 10rem">
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
            <Column :header="$t('grades.assignment.comment')" style="min-width: 14rem">
              <template #body="{ data }">
                <InputText
                  v-model="localRows[data.userId].comment"
                  :placeholder="$t('grades.assignment.comment_placeholder')"
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
import type { AssignmentStats } from '~/composables/useGrade';

definePageMeta({ middleware: ['auth'] });

const { t } = useI18n();
const route = useRoute();
const id = computed(() => route.params.id as string);

const { fetchGradeGrid, batchUpdateGrades, updateAssignment, normalizeApiError } = useAssignment();
const { fetchAssignmentStats } = useGrade();

const pending = ref(true);
const saving = ref(false);
const closing = ref(false);
const fetchError = ref<string | null>(null);
const saveError = ref<string | null>(null);
const gridData = ref<GradeGridData | null>(null);
const assignmentStats = ref<AssignmentStats | null>(null);
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

const gradeStatusOptions = computed(() => [
  { label: t('grades.assignment.graded'), value: 'GRADED' },
  { label: t('grades.assignment.pending'), value: 'PENDING' },
  { label: t('grades.assignment.absent'), value: 'ABSENT' },
  { label: t('grades.assignment.exempt'), value: 'EXEMPT' },
]);

const gradedCountLabel = computed(() => {
  if (!gridData.value) return '';
  const { gradedCount: graded, totalCount: total } = gridData.value;
  return t('grades.assignment.graded_count', { graded, total }, total);
});

function statusLabel(s: string) {
  const map: Record<string, string> = {
    DRAFT: t('grades.assignment.draft'),
    PUBLISHED: t('grades.assignment.published'),
    CLOSED: t('grades.assignment.closed'),
  };
  return map[s] ?? s;
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

    assignmentStats.value = data.gradedCount > 0 ? await fetchAssignmentStats(id.value) : null;
  } catch (error) {
    fetchError.value = normalizeApiError(error);
  } finally {
    pending.value = false;
  }
}

function formatStat(value: number | null): string {
  return value !== null ? String(Math.round(value * 10) / 10) : '—';
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
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
  padding: 1.5rem 0;
}

.assignment-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-tile {
  flex: 1 1 min(100%, 8rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background: var(--p-surface-50, var(--skolr-color-surface-hover));
  border: 1px solid var(--p-surface-200, var(--skolr-color-border));
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
  color: var(--p-primary-color, var(--skolr-color-brand-green));
}

.stat-label {
  font-size: 0.8rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
  text-align: center;
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
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
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

.grade-input :deep(.p-inputnumber-input) {
  width: 100%;
}

.comment-input {
  width: 100%;
}

.grade-na {
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
  font-size: 1.1rem;
}
</style>
