<template>
  <div class="page">
    <Card>
      <template #title>
        <div class="card-header">
          <span>Carnet de notes</span>
          <NuxtLink
            :to="`/grades/assignments/new`"
            class="p-button p-button-sm"
          >
            + Nouveau devoir
          </NuxtLink>
        </div>
      </template>
      <template #content>
        <!-- Filtre cours -->
        <div class="toolbar">
          <label class="toolbar-label">Programme</label>
          <Select
            v-model="selectedCourseId"
            :options="courseOptions"
            option-label="label"
            option-value="value"
            placeholder="Tous les programmes"
            show-clear
            class="course-select"
            @change="load"
          />
          <Button icon="pi pi-refresh" severity="secondary" outlined size="small" :loading="pending" @click="load" />
        </div>

        <Message v-if="fetchError" severity="error" :closable="false" class="mt-2">{{ fetchError }}</Message>

        <div v-if="pending" class="loading">
          <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
          <span>Chargement du carnet…</span>
        </div>

        <div v-else-if="!gradebook" class="empty">
          <p>Aucun devoir publié pour cette classe.</p>
        </div>

        <template v-else>
          <div v-if="gradebook.assignments.length === 0" class="empty">
            <p>Aucun devoir publié{{ selectedCourseId ? ' pour ce programme' : '' }}.</p>
          </div>

          <div v-else class="matrix-wrapper">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th class="col-student">Élève</th>
                  <th
                    v-for="a in gradebook.assignments"
                    :key="a.id"
                    class="col-assignment"
                  >
                    <NuxtLink :to="`/grades/assignments/${a.id}`" class="assignment-link">
                      <span class="assignment-title">{{ a.title }}</span>
                      <span class="assignment-meta">{{ formatDate(a.assignedAt) }} · /{{ a.maxScore }}</span>
                    </NuxtLink>
                  </th>
                  <th class="col-avg">Moyenne</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="student in gradebook.students"
                  :key="student.userId"
                  class="student-row"
                >
                  <td class="col-student">{{ student.name }}</td>
                  <td
                    v-for="a in gradebook.assignments"
                    :key="a.id"
                    class="col-assignment"
                  >
                    <span
                      v-if="gradeFor(student.userId, a.id)"
                      :class="gradeClass(gradeFor(student.userId, a.id)!.status)"
                    >
                      {{ gradeDisplay(student.userId, a.id) }}
                    </span>
                    <span v-else class="grade-missing">—</span>
                  </td>
                  <td class="col-avg avg-value">
                    {{ studentAverage(student.userId) !== null ? studentAverage(student.userId) : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import {
  useAssignment,
  type GradebookData,
  type GradebookGradeRef,
  gradebookAverage,
} from '~/composables/useAssignment';
import { useClass } from '~/composables/useClass';

definePageMeta({ middleware: ['auth'] });

const route = useRoute();
const classId = computed(() => route.params.classId as string);

const { fetchGradebook, normalizeApiError } = useAssignment();
const { fetchTeacherCourses } = useClass();
const { user } = useAuth();

const pending = ref(false);
const fetchError = ref<string | null>(null);
const gradebook = ref<GradebookData | null>(null);
const selectedCourseId = ref<string | null>((route.query.courseId as string) ?? null);
const courseOptions = ref<{ label: string; value: string }[]>([]);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function gradeFor(userId: string, assignmentId: string): GradebookGradeRef | undefined {
  return gradebook.value?.grades[userId]?.[assignmentId];
}

function gradeDisplay(userId: string, assignmentId: string): string {
  const g = gradeFor(userId, assignmentId);
  if (!g) return '—';
  if (g.status === 'GRADED' && g.value !== null) return String(g.value);
  if (g.status === 'ABSENT') return 'ABS';
  if (g.status === 'EXEMPT') return 'DISP';
  return '—';
}

function gradeClass(status: string): string {
  return { GRADED: 'grade-graded', ABSENT: 'grade-absent', EXEMPT: 'grade-exempt', PENDING: 'grade-pending' }[status] ?? '';
}

function studentAverage(userId: string): number | null {
  if (!gradebook.value) return null;
  const studentGrades = gradebook.value.grades[userId] ?? {};
  return gradebookAverage(studentGrades, gradebook.value.assignments);
}

async function loadCourses() {
  if (!classId.value || !user.value?.id) return;
  try {
    const data = await fetchTeacherCourses(classId.value, user.value.id);
    courseOptions.value = data.map((c) => ({ label: c.name, value: c.id }));
  } catch {
    courseOptions.value = [];
  }
}

async function load() {
  pending.value = true;
  fetchError.value = null;
  try {
    gradebook.value = await fetchGradebook(classId.value, selectedCourseId.value ?? undefined);
  } catch (error) {
    fetchError.value = normalizeApiError(error);
  } finally {
    pending.value = false;
  }
}

watch(classId, () => {
  void loadCourses();
  void load();
}, { immediate: true });
</script>

<style scoped>
.page {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.page :deep(.p-card) {
  flex: 1 1 100%;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.toolbar-label {
  font-size: 0.9rem;
  font-weight: 600;
}

.course-select {
  min-width: 14rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--p-text-muted-color, #64748b);
  padding: 1.5rem 0;
}

.empty {
  color: var(--p-text-muted-color, #64748b);
  padding: 1rem 0;
}

.matrix-wrapper {
  overflow-x: auto;
}

.matrix-table {
  border-collapse: collapse;
  min-width: 100%;
  font-size: 0.875rem;
}

.matrix-table th,
.matrix-table td {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--p-surface-200, #e2e8f0);
  white-space: nowrap;
  text-align: center;
}

.col-student {
  text-align: left !important;
  font-weight: 600;
  min-width: 10rem;
  position: sticky;
  left: 0;
  background: var(--p-surface-0, #fff);
  z-index: 1;
}

.col-assignment {
  min-width: 8rem;
}

.col-avg {
  font-weight: 600;
  min-width: 6rem;
  background: var(--p-surface-50, #f8fafc);
}

.avg-value {
  font-variant-numeric: tabular-nums;
}

.assignment-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  text-decoration: none;
  color: inherit;
}

.assignment-link:hover .assignment-title {
  text-decoration: underline;
}

.assignment-title {
  font-weight: 600;
  font-size: 0.8rem;
  max-width: 9rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.assignment-meta {
  font-size: 0.75rem;
  color: var(--p-text-muted-color, #64748b);
}

.grade-graded {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.grade-absent {
  color: var(--p-red-500, #ef4444);
  font-weight: 600;
  font-size: 0.8rem;
}

.grade-exempt {
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.8rem;
}

.grade-pending {
  color: var(--p-text-muted-color, #64748b);
}

.grade-missing {
  color: var(--p-surface-400, #cbd5e1);
}
</style>
