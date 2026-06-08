<template>
  <Dialog
    v-model:visible="visible"
    :header="course ? 'Modifier le programme' : 'Nouveau programme'"
    modal
    :style="{ width: '34rem' }"
    @hide="resetForm"
  >
    <div class="form">
      <div class="field">
        <label for="cd-name">Nom</label>
        <InputText id="cd-name" v-model="form.name" class="w-full" placeholder="Ex: Algèbre linéaire" />
      </div>

      <div class="field">
        <label for="cd-description">Description</label>
        <Textarea
          id="cd-description"
          v-model="form.description"
          class="w-full"
          rows="3"
          placeholder="Description du programme"
          auto-resize
        />
      </div>

      <div class="field">
        <label for="cd-subject">Matière</label>
        <Select
          id="cd-subject"
          v-model="form.subjectId"
          :options="subjectOptions"
          option-label="label"
          option-value="value"
          placeholder="Aucune matière"
          show-clear
          class="w-full"
        />
      </div>

      <div class="field">
        <label for="cd-related">Programmes liés</label>
        <MultiSelect
          id="cd-related"
          v-model="form.relatedCourseIds"
          :options="otherCourseOptions"
          option-label="label"
          option-value="value"
          placeholder="Sélectionner des programmes"
          display="chip"
          class="w-full"
        />
      </div>

      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    </div>

    <template #footer>
      <Button label="Annuler" severity="secondary" text @click="visible = false" />
      <Button
        :label="course ? 'Enregistrer' : 'Créer'"
        :loading="pending"
        :disabled="!isFormValid"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import type { SubjectEntity } from '~/composables/useSubject';
import type { CourseEntity } from '~/composables/useCourse';

const props = defineProps<{
  course?: CourseEntity | null;
  subjects: SubjectEntity[];
  allCourses: CourseEntity[];
  defaultSubjectId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'saved'): void;
}>();

const visible = defineModel<boolean>('visible', { default: false });

const { createCourse, updateCourse, addRelatedCourse, removeRelatedCourse } = useCourse();

const defaultForm = () => ({
  name: '',
  description: '',
  subjectId: (props.defaultSubjectId ?? null) as string | null,
  relatedCourseIds: [] as string[],
});

const form = reactive(defaultForm());
const pending = ref(false);
const error = ref<string | null>(null);

const isFormValid = computed(() => form.name.trim() && form.description.trim());

const subjectOptions = computed(() =>
  props.subjects.map((s) => ({ label: s.name, value: s.id })),
);

const otherCourseOptions = computed(() =>
  props.allCourses
    .filter((c) => c.id !== props.course?.id)
    .map((c) => ({ label: c.name, value: c.id })),
);

watch(
  () => props.course,
  (c) => {
    if (c) {
      form.name = c.name;
      form.description = c.description;
      form.subjectId = c.subjectId;
      form.relatedCourseIds = c.relatedCourses.map((r) => r.id);
    }
  },
  { immediate: true },
);

function resetForm() {
  Object.assign(form, defaultForm());
  error.value = null;
}

async function submit() {
  error.value = null;
  pending.value = true;
  try {
    let savedCourse: CourseEntity;

    if (props.course) {
      savedCourse = await updateCourse(props.course.id, {
        name: form.name,
        description: form.description,
        subjectId: form.subjectId ?? undefined,
      });

      // Sync related courses: add new ones, remove removed ones
      const prev = new Set(props.course.relatedCourses.map((r) => r.id));
      const next = new Set(form.relatedCourseIds);
      const toAdd = form.relatedCourseIds.filter((id) => !prev.has(id));
      const toRemove = [...prev].filter((id) => !next.has(id));

      await Promise.all([
        ...toAdd.map((id) => addRelatedCourse(savedCourse.id, id)),
        ...toRemove.map((id) => removeRelatedCourse(savedCourse.id, id)),
      ]);
    } else {
      savedCourse = await createCourse({
        name: form.name,
        description: form.description,
        subjectId: form.subjectId ?? undefined,
      });

      if (form.relatedCourseIds.length > 0) {
        await Promise.all(form.relatedCourseIds.map((id) => addRelatedCourse(savedCourse.id, id)));
      }
    }

    visible.value = false;
    emit('saved');
  } catch (e) {
    error.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 0.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field label {
  font-size: 0.875rem;
  font-weight: 600;
}

.w-full {
  width: 100%;
}
</style>
