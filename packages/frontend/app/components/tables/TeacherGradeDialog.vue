<template>
  <Dialog
    :visible="visible"
    modal
    :header="dialogHeader"
    :style="{ width: '42rem' }"
    :breakpoints="{ '640px': '95vw' }"
    @update:visible="(value) => emit('update:visible', value)"
  >
    <div v-if="student" class="grade-dialog">
      <p class="dialog-subtitle">{{ student.email }}</p>

      <!-- Notes existantes -->
      <section class="dialog-section">
        <h4 class="section-title">Notes existantes</h4>

        <Message v-if="gradesError" severity="error" :closable="false">{{ gradesError }}</Message>

        <div v-else-if="gradesPending" class="dialog-loading">
          <ProgressSpinner style="width: 1.5rem; height: 1.5rem" stroke-width="4" />
          <span>Chargement des notes…</span>
        </div>

        <p v-else-if="grades.length === 0" class="dialog-empty">
          Aucune note pour cet élève dans cette classe.
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
              <Button label="Enregistrer" size="small" :loading="saving" @click="submitEdit(grade.id)" />
              <Button label="Annuler" size="small" text severity="secondary" @click="cancelEdit" />
            </template>

            <template v-else>
              <span class="grade-value">{{ grade.value }}/20</span>
              <Button
                icon="pi pi-pencil"
                size="small"
                text
                aria-label="Modifier la note"
                @click="startEdit(grade)"
              />
              <template v-if="confirmingId === grade.id">
                <span class="confirm-text">Supprimer&nbsp;?</span>
                <Button label="Oui" size="small" severity="danger" :loading="deleting" @click="submitDelete(grade.id)" />
                <Button label="Non" size="small" text severity="secondary" @click="confirmingId = null" />
              </template>
              <Button
                v-else
                icon="pi pi-trash"
                size="small"
                text
                severity="danger"
                aria-label="Supprimer la note"
                @click="confirmingId = grade.id"
              />
            </template>
          </li>
        </ul>
      </section>

      <!-- Ajouter une note -->
      <section class="dialog-section">
        <h4 class="section-title">Ajouter une note</h4>

        <Message v-if="createError" severity="error" :closable="false">{{ createError }}</Message>

        <div class="create-form">
          <Select
            v-model="newCourseId"
            :options="courseOptions"
            option-label="label"
            option-value="value"
            placeholder="Choisir un cours"
            class="create-course"
          />
          <InputNumber
            v-model="newValue"
            :min="0"
            :max="20"
            placeholder="Note /20"
            show-buttons
            class="grade-input"
          />
          <Button
            label="Ajouter"
            icon="pi pi-plus"
            :loading="creating"
            :disabled="!canCreate"
            @click="submitCreate"
          />
        </div>
      </section>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { useGrade, type GradeEntity, type GradeCourse } from '~/composables/useGrade';
import { normalizeApiError } from '~/composables/useClass';

type DialogStudent = {
  studentId: string;
  name: string;
  email: string;
};

const props = defineProps<{
  visible: boolean;
  student: DialogStudent | null;
  classId: string | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  saved: [];
}>();

const { fetchGradesByUserId, fetchCourses, createGrade, updateGrade, deleteGrade } = useGrade();

const grades = ref<GradeEntity[]>([]);
const courses = ref<GradeCourse[]>([]);
const gradesPending = ref(false);
const gradesError = ref<string | null>(null);

const dialogHeader = computed(() =>
  props.student ? `Notes — ${props.student.name}` : 'Notes',
);

const courseOptions = computed(() =>
  courses.value.map((course) => ({ label: course.name, value: course.id })),
);

function courseName(courseId: string) {
  return courses.value.find((course) => course.id === courseId)?.name ?? courseId;
}

async function loadGrades() {
  gradesError.value = null;
  if (!props.student || !props.classId) {
    grades.value = [];
    return;
  }
  gradesPending.value = true;
  try {
    const all = await fetchGradesByUserId(props.student.studentId);
    grades.value = all.filter((grade) => grade.classId === props.classId);
  } catch (error) {
    gradesError.value = normalizeApiError(error);
    grades.value = [];
  } finally {
    gradesPending.value = false;
  }
}

async function loadCourses() {
  try {
    courses.value = await fetchCourses();
  } catch {
    courses.value = [];
  }
}

watch(
  () => [props.visible, props.student?.studentId, props.classId],
  () => {
    if (!props.visible) {
      return;
    }
    resetForms();
    void loadGrades();
    if (courses.value.length === 0) {
      void loadCourses();
    }
  },
  { immediate: true },
);

// --- Création ---
const newCourseId = ref<string | null>(null);
const newValue = ref<number | null>(null);
const creating = ref(false);
const createError = ref<string | null>(null);

const canCreate = computed(
  () =>
    Boolean(newCourseId.value) &&
    newValue.value !== null &&
    newValue.value >= 0 &&
    newValue.value <= 20 &&
    Boolean(props.student) &&
    Boolean(props.classId),
);

async function submitCreate() {
  createError.value = null;
  if (
    !canCreate.value ||
    !props.student ||
    !props.classId ||
    newCourseId.value === null ||
    newValue.value === null
  ) {
    return;
  }
  creating.value = true;
  try {
    await createGrade({
      userId: props.student.studentId,
      classId: props.classId,
      courseId: newCourseId.value,
      value: newValue.value,
    });
    newCourseId.value = null;
    newValue.value = null;
    await loadGrades();
    emit('saved');
  } catch (error) {
    createError.value = normalizeApiError(error);
  } finally {
    creating.value = false;
  }
}

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
  newCourseId.value = null;
  newValue.value = null;
  createError.value = null;
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
  color: var(--p-text-muted-color, #64748b);
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

.dialog-loading {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--p-text-muted-color, #64748b);
}

.dialog-empty {
  margin: 0;
  color: var(--p-text-muted-color, #64748b);
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
  border: 1px solid var(--p-surface-200, #e2e8f0);
  background: var(--p-surface-50, #f8fafc);
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
  color: var(--p-text-muted-color, #64748b);
}

.create-form {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.create-course {
  flex: 1 1 14rem;
}

.grade-input {
  width: 9rem;
}
</style>
