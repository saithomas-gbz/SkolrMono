<template>
  <div class="page">
    <Card>
      <template #title>Nouveau devoir</template>
      <template #content>
        <Message v-if="submitError" severity="error" :closable="false" class="form-message">
          {{ submitError }}
        </Message>

        <form class="assignment-form" @submit.prevent="handleSubmit">
          <!-- Titre -->
          <div class="field">
            <label for="title" class="field-label">Intitulé *</label>
            <InputText
              id="title"
              v-model="form.title"
              placeholder="ex. Contrôle chapitre 3"
              class="field-input"
              required
            />
          </div>

          <!-- Description -->
          <div class="field">
            <label for="description" class="field-label">Description</label>
            <Textarea
              id="description"
              v-model="form.description"
              rows="2"
              placeholder="Instructions, barème détaillé…"
              class="field-input"
            />
          </div>

          <!-- Classe -->
          <div class="field">
            <label for="classId" class="field-label">Classe *</label>
            <Select
              id="classId"
              v-model="form.classId"
              :options="classOptions"
              option-label="label"
              option-value="value"
              placeholder="Choisir une classe"
              class="field-input"
              :loading="classesPending"
              @change="onClassChange"
            />
          </div>

          <!-- Cours -->
          <div class="field">
            <label for="courseId" class="field-label">Programme *</label>
            <Select
              id="courseId"
              v-model="form.courseId"
              :options="courseOptions"
              option-label="label"
              option-value="value"
              placeholder="Choisir un programme"
              class="field-input"
              :disabled="!form.classId"
              :loading="coursesPending"
            />
          </div>

          <!-- Date du devoir -->
          <div class="field">
            <label for="assignedAt" class="field-label">Date du devoir *</label>
            <DatePicker
              id="assignedAt"
              v-model="form.assignedAt"
              date-format="dd/mm/yy"
              show-icon
              class="field-input"
            />
          </div>

          <!-- Date limite (optionnel) -->
          <div class="field">
            <label for="dueAt" class="field-label">Date limite (optionnel)</label>
            <DatePicker
              id="dueAt"
              v-model="form.dueAt"
              date-format="dd/mm/yy"
              show-icon
              show-button-bar
              class="field-input"
            />
          </div>

          <!-- Barème + Coefficient -->
          <div class="field-row">
            <div class="field">
              <label for="maxScore" class="field-label">Barème</label>
              <InputNumber
                id="maxScore"
                v-model="form.maxScore"
                :min="1"
                :max="100"
                show-buttons
                class="field-input-sm"
              />
            </div>
            <div class="field">
              <label for="coefficient" class="field-label">Coefficient</label>
              <InputNumber
                id="coefficient"
                v-model="form.coefficient"
                :min="0.5"
                :max="10"
                :step="0.5"
                show-buttons
                class="field-input-sm"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <Button
              label="Enregistrer brouillon"
              icon="pi pi-save"
              severity="secondary"
              outlined
              type="button"
              :loading="saving === 'draft'"
              :disabled="!canSubmit || saving !== null"
              @click="handleSubmit('draft')"
            />
            <Button
              label="Publier"
              icon="pi pi-send"
              type="button"
              :loading="saving === 'publish'"
              :disabled="!canSubmit || saving !== null"
              @click="handleSubmit('publish')"
            />
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { useAssignment, type CreateAssignmentBody } from '~/composables/useAssignment';
import { useClass } from '~/composables/useClass';

definePageMeta({ middleware: ['auth'] });

const router = useRouter();
const { user } = useAuth();
const { createAssignment, publishAssignment, normalizeApiError } = useAssignment();
const { fetchClassesByTeacherId, fetchTeacherCourses } = useClass();

interface ClassOption { label: string; value: string }
interface CourseOption { label: string; value: string }

const classesPending = ref(false);
const coursesPending = ref(false);
const classes = ref<ClassOption[]>([]);
const courseOptions = ref<CourseOption[]>([]);
const submitError = ref<string | null>(null);
const saving = ref<'draft' | 'publish' | null>(null);

const form = reactive({
  title: '',
  description: '',
  classId: '' as string,
  courseId: '' as string,
  assignedAt: null as Date | null,
  dueAt: null as Date | null,
  maxScore: 20,
  coefficient: 1,
});

const classOptions = computed(() => classes.value);

const canSubmit = computed(
  () =>
    form.title.trim() !== '' &&
    form.classId !== '' &&
    form.courseId !== '' &&
    form.assignedAt !== null &&
    user.value?.id !== undefined,
);

async function loadClasses() {
  if (!user.value?.id) return;
  classesPending.value = true;
  try {
    const data = await fetchClassesByTeacherId(user.value.id);
    classes.value = data.map((c) => ({ label: c.name, value: c.id }));
  } catch {
    classes.value = [];
  } finally {
    classesPending.value = false;
  }
}

async function onClassChange() {
  form.courseId = '';
  courseOptions.value = [];
  if (!form.classId || !user.value?.id) return;
  coursesPending.value = true;
  try {
    const data = await fetchTeacherCourses(form.classId, user.value.id);
    courseOptions.value = data.map((c) => ({ label: c.name, value: c.id }));
  } catch {
    courseOptions.value = [];
  } finally {
    coursesPending.value = false;
  }
}

async function handleSubmit(action: 'draft' | 'publish' = 'draft') {
  if (!canSubmit.value || !user.value?.id || !form.assignedAt) return;
  submitError.value = null;
  saving.value = action;
  try {
    const body: CreateAssignmentBody = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      classId: form.classId,
      courseId: form.courseId,
      teacherId: user.value.id,
      assignedAt: form.assignedAt.toISOString(),
      dueAt: form.dueAt?.toISOString(),
      maxScore: form.maxScore,
      coefficient: form.coefficient,
    };
    const assignment = await createAssignment(body);

    if (action === 'publish') {
      await publishAssignment(assignment.id);
    }

    await router.push(`/grades/assignments/${assignment.id}`);
  } catch (error) {
    submitError.value = normalizeApiError(error);
  } finally {
    saving.value = null;
  }
}

onMounted(() => {
  void loadClasses();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.page :deep(.p-card) {
  flex: 1 1 100%;
  max-width: 48rem;
}

.form-message {
  margin-bottom: 1.5rem;
}

.assignment-form {
  display: grid;
  gap: 1.25rem;
}

.field {
  display: grid;
  gap: 0.4rem;
}

.field-label {
  font-size: 0.9rem;
  font-weight: 600;
}

.field-input {
  width: 100%;
}

.field-input-sm {
  width: 10rem;
}

.field-row {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-top: 0.5rem;
}
</style>
