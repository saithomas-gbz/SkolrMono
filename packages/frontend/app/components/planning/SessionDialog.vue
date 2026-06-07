<template>
  <Dialog
    v-model:visible="visible"
    :header="session ? 'Modifier la session' : 'Nouvelle session'"
    modal
    :style="{ width: '32rem' }"
    @hide="resetForm"
  >
    <div class="session-form">
      <div class="field">
        <label for="sd-class">Classe</label>
        <Select
          id="sd-class"
          v-model="form.classId"
          :options="classOptions"
          option-label="label"
          option-value="value"
          placeholder="Choisir une classe"
          class="w-full"
        />
      </div>

      <div class="field">
        <label for="sd-course">Cours (ID)</label>
        <InputText id="sd-course" v-model="form.courseId" class="w-full" placeholder="UUID du cours" />
      </div>

      <div class="field">
        <label for="sd-teacher">Professeur (ID)</label>
        <InputText id="sd-teacher" v-model="form.teacherId" class="w-full" placeholder="UUID du professeur" />
      </div>

      <div class="field">
        <label for="sd-room">Salle</label>
        <InputText id="sd-room" v-model="form.room" class="w-full" placeholder="Ex: B204" />
      </div>

      <div class="field-row">
        <div class="field">
          <label for="sd-start">Début</label>
          <DatePicker
            id="sd-start"
            v-model="form.startAt"
            show-time
            hour-format="24"
            date-format="dd/mm/yy"
            class="w-full"
          />
        </div>
        <div class="field">
          <label for="sd-end">Fin</label>
          <DatePicker
            id="sd-end"
            v-model="form.endAt"
            show-time
            hour-format="24"
            date-format="dd/mm/yy"
            class="w-full"
          />
        </div>
      </div>

      <div class="field">
        <label for="sd-recurrence">Récurrence</label>
        <Select
          id="sd-recurrence"
          v-model="form.recurrenceRule"
          :options="recurrenceOptions"
          option-label="label"
          option-value="value"
          placeholder="Aucune"
          class="w-full"
        />
      </div>

      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    </div>

    <template #footer>
      <Button label="Annuler" severity="secondary" text @click="visible = false" />
      <Button
        :label="session ? 'Enregistrer' : 'Créer'"
        :loading="pending"
        :disabled="!isFormValid"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import type { SkolrClass } from '~/composables/useClass';
import type { Session } from '~/composables/usePlanning';

const props = defineProps<{
  session?: Session | null;
  classes: SkolrClass[];
  initialDate?: Date | null;
}>();

const emit = defineEmits<{
  (e: 'saved'): void;
}>();

const visible = defineModel<boolean>('visible', { default: false });

const { createSession, updateSession } = usePlanning();

const recurrenceOptions = [
  { label: 'Aucune', value: '' },
  { label: 'Hebdomadaire', value: 'WEEKLY' },
  { label: 'Bi-hebdomadaire', value: 'BIWEEKLY' },
];

const classOptions = computed(() =>
  props.classes.map((c) => ({ label: c.name, value: c.id })),
);

const defaultForm = () => ({
  classId: '',
  courseId: '',
  teacherId: '',
  room: '',
  startAt: props.initialDate ?? new Date(),
  endAt: props.initialDate
    ? new Date(props.initialDate.getTime() + 60 * 60 * 1000)
    : new Date(Date.now() + 60 * 60 * 1000),
  recurrenceRule: '',
});

const form = reactive(defaultForm());
const pending = ref(false);
const error = ref<string | null>(null);

const isFormValid = computed(
  () => form.classId && form.courseId && form.teacherId && form.startAt && form.endAt,
);

watch(
  () => props.session,
  (s) => {
    if (s) {
      form.classId = s.classId;
      form.courseId = s.courseId;
      form.teacherId = s.teacherId;
      form.room = s.room ?? '';
      form.startAt = new Date(s.startAt);
      form.endAt = new Date(s.endAt);
      form.recurrenceRule = s.recurrenceRule ?? '';
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
    const body = {
      classId: form.classId,
      courseId: form.courseId,
      teacherId: form.teacherId,
      room: form.room || undefined,
      startAt: (form.startAt as Date).toISOString(),
      endAt: (form.endAt as Date).toISOString(),
      recurrenceRule: form.recurrenceRule || undefined,
    };

    if (props.session) {
      await updateSession(props.session.id, body);
    } else {
      await createSession(body);
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
.session-form {
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

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.w-full {
  width: 100%;
}
</style>
