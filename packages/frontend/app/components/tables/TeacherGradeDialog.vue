<template>
  <Dialog
    :visible="visible"
    modal
    :header="dialogHeader"
    :style="{ width: '42rem' }"
    :breakpoints="{ '640px': '95vw' }"
    @update:visible="(value) => emit('update:visible', value)"
  >
    <div v-if="activeStudent" class="grade-dialog">
      <!-- Sélecteur d'élève -->
      <section class="dialog-section">
        <label for="grade-student-select" class="section-title">{{ $t('student.grade_dialog.student') }}</label>
        <Select
          id="grade-student-select"
          v-model="selectedStudentId"
          :options="studentOptions"
          option-label="label"
          option-value="value"
          :placeholder="$t('student.grade_dialog.choose_student')"
          class="student-select"
        />
        <p class="dialog-subtitle">{{ activeStudent.email }}</p>
      </section>

      <!-- Notes existantes -->
      <section class="dialog-section">
        <h4 class="section-title">{{ $t('student.grade_dialog.existing_grades') }}</h4>

        <Message v-if="gradesError" severity="error" :closable="false">{{ gradesError }}</Message>

        <div v-else-if="gradesPending" class="dialog-loading">
          <ProgressSpinner style="width: 1.5rem; height: 1.5rem" stroke-width="4" />
          <span>{{ $t('student.grade_dialog.loading_grades') }}</span>
        </div>

        <p v-else-if="grades.length === 0" class="dialog-empty">
          {{ $t('student.grade_dialog.no_grades') }}
        </p>

        <ul v-else class="grade-list">
          <li v-for="grade in grades" :key="grade.id" class="grade-item">
            <span class="grade-course">{{ courseName(grade.courseId) }}</span>

            <template v-if="editingId === grade.id">
              <InputNumber
                v-model="editValue"
                :min="0"
                :max="20"
                show-buttons
                class="grade-input"
              />
              <Button :label="$t('common.save')" size="small" :loading="saving" @click="submitEdit(grade.id)" />
              <Button :label="$t('common.cancel')" size="small" text severity="secondary" @click="cancelEdit" />
            </template>

            <template v-else>
              <span class="grade-value">{{ grade.value }}/20</span>
              <Button
                icon="pi pi-pencil"
                size="small"
                text
                :aria-label="$t('student.grade_dialog.edit_grade')"
                @click="startEdit(grade)"
              />
              <template v-if="confirmingId === grade.id">
                <span class="confirm-text">{{ $t('student.grade_dialog.confirm_delete') }}</span>
                <Button :label="$t('common.yes')" size="small" severity="danger" :loading="deleting" @click="submitDelete(grade.id)" />
                <Button :label="$t('common.no')" size="small" text severity="secondary" @click="confirmingId = null" />
              </template>
              <Button
                v-else
                icon="pi pi-trash"
                size="small"
                text
                severity="danger"
                :aria-label="$t('student.grade_dialog.delete_grade')"
                @click="confirmingId = grade.id"
              />
            </template>
          </li>
        </ul>
      </section>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { useGrade, type GradeEntity, type GradeCourse } from '~/composables/useGrade';
import { normalizeApiError, useClass } from '~/composables/useClass';

type DialogStudent = {
  studentId: string;
  name: string;
  email: string;
};

const props = defineProps<{
  visible: boolean;
  student: DialogStudent | null;
  students?: DialogStudent[];
  classId: string | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  saved: [];
}>();

const { t } = useI18n();
const { fetchGradesByUserId, updateGrade, deleteGrade } = useGrade();
const { fetchTeacherCourses } = useClass();
const { user } = useAuth();

const grades = ref<GradeEntity[]>([]);
const courses = ref<GradeCourse[]>([]);
const gradesPending = ref(false);
const gradesError = ref<string | null>(null);

const studentList = computed<DialogStudent[]>(() => {
  if (props.students && props.students.length > 0) {
    return props.students;
  }
  return props.student ? [props.student] : [];
});

const studentOptions = computed(() =>
  studentList.value.map((s) => ({ label: s.name, value: s.studentId })),
);

const selectedStudentId = ref<string | null>(null);

const activeStudent = computed<DialogStudent | null>(
  () => studentList.value.find((s) => s.studentId === selectedStudentId.value) ?? null,
);

const dialogHeader = computed(() =>
  activeStudent.value
    ? t('student.grade_dialog.header', { name: activeStudent.value.name })
    : t('student.grade_dialog.header_fallback'),
);

function courseName(courseId: string) {
  return courses.value.find((course) => course.id === courseId)?.name ?? courseId;
}

async function loadGrades() {
  gradesError.value = null;
  if (!activeStudent.value || !props.classId) {
    grades.value = [];
    return;
  }
  gradesPending.value = true;
  try {
    const all = await fetchGradesByUserId(activeStudent.value.studentId);
    grades.value = all.filter((grade) => grade.classId === props.classId);
  } catch (error) {
    gradesError.value = normalizeApiError(error);
    grades.value = [];
  } finally {
    gradesPending.value = false;
  }
}

async function loadTeacherCourses() {
  if (!props.classId || !user.value?.id) {
    courses.value = [];
    return;
  }
  try {
    courses.value = await fetchTeacherCourses(props.classId, user.value.id);
  } catch {
    courses.value = [];
  }
}

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) {
      return;
    }
    selectedStudentId.value = props.student?.studentId ?? studentList.value[0]?.studentId ?? null;
    resetForms();
    void loadTeacherCourses();
  },
  { immediate: true },
);

watch(
  () => [props.visible, selectedStudentId.value, props.classId],
  () => {
    if (props.visible) {
      void loadGrades();
    }
  },
  { immediate: true },
);

watch(
  () => [props.visible, props.classId, user.value?.id],
  () => {
    if (props.visible) {
      void loadTeacherCourses();
    }
  },
);

// --- Édition ---
const editingId = ref<string | null>(null);
const editValue = ref<number | null>(null);
const saving = ref(false);

function startEdit(grade: GradeEntity) {
  editingId.value = grade.id;
  editValue.value = grade.value;
  confirmingId.value = null;
}

function cancelEdit() {
  editingId.value = null;
  editValue.value = null;
}

async function submitEdit(id: string) {
  if (editValue.value === null || editValue.value < 0 || editValue.value > 20) {
    return;
  }
  saving.value = true;
  try {
    await updateGrade(id, { value: editValue.value });
    cancelEdit();
    await loadGrades();
    emit('saved');
  } catch (error) {
    gradesError.value = normalizeApiError(error);
  } finally {
    saving.value = false;
  }
}

// --- Suppression ---
const confirmingId = ref<string | null>(null);
const deleting = ref(false);

async function submitDelete(id: string) {
  deleting.value = true;
  try {
    await deleteGrade(id);
    confirmingId.value = null;
    await loadGrades();
    emit('saved');
  } catch (error) {
    gradesError.value = normalizeApiError(error);
  } finally {
    deleting.value = false;
  }
}

function resetForms() {
  editingId.value = null;
  editValue.value = null;
  confirmingId.value = null;
}
</script>

<style scoped>
.grade-dialog {
  display: grid;
  gap: 1.5rem;
}

.dialog-subtitle {
  margin: 0;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
  font-size: 0.9rem;
}

.dialog-section {
  display: grid;
  gap: 0.6rem;
}

.section-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.student-select {
  max-width: 22rem;
}

.dialog-loading {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.dialog-empty {
  margin: 0;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.grade-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.grade-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--p-surface-200, var(--skolr-color-border));
  background: var(--p-surface-50, var(--skolr-color-surface-hover));
}

.grade-course {
  font-weight: 600;
  flex: 1 1 8rem;
}

.grade-value {
  font-variant-numeric: tabular-nums;
}

.confirm-text {
  font-size: 0.85rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.grade-input {
  width: 9rem;
}
</style>
