<template>
  <Dialog
    v-model:visible="visible"
    :header="session ? $t('planning.session_dialog.edit') : $t('planning.session_dialog.new')"
    modal
    :style="{ width: '32rem' }"
    @hide="resetForm"
  >
    <div class="session-form">
      <div class="field">
        <label for="sd-class">{{ $t('common.class') }}</label>
        <Select
          id="sd-class"
          v-model="form.classId"
          :options="classOptions"
          option-label="label"
          option-value="value"
          :placeholder="$t('common.choose_class')"
          class="w-full"
        />
      </div>

      <div class="field">
        <label for="sd-course">{{ $t('planning.session_dialog.course_id') }}</label>
        <InputText id="sd-course" v-model="form.courseId" class="w-full" :placeholder="$t('planning.session_dialog.course_placeholder')" />
      </div>

      <div class="field">
        <label for="sd-teacher">{{ $t('planning.session_dialog.teacher_id') }}</label>
        <InputText id="sd-teacher" v-model="form.teacherId" class="w-full" :placeholder="$t('planning.session_dialog.teacher_placeholder')" />
      </div>

      <div class="field">
        <label for="sd-room">{{ $t('planning.session_dialog.room') }}</label>
        <InputText id="sd-room" v-model="form.room" class="w-full" :placeholder="$t('planning.session_dialog.room_placeholder')" />
      </div>

      <div class="field-row">
        <div class="field">
          <label for="sd-start">{{ $t('planning.session_dialog.start') }}</label>
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
          <label for="sd-end">{{ $t('planning.session_dialog.end') }}</label>
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
        <label for="sd-recurrence">{{ $t('planning.session_dialog.recurrence') }}</label>
        <Select
          id="sd-recurrence"
          v-model="form.recurrenceRule"
          :options="recurrenceOptions"
          option-label="label"
          option-value="value"
          :placeholder="$t('planning.session_dialog.recurrence_none')"
          class="w-full"
        />
      </div>

      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    </div>

    <template #footer>
      <Button :label="$t('common.cancel')" severity="secondary" text @click="visible = false" />
      <Button
        :label="session ? $t('common.save') : $t('common.create')"
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

const { t } = useI18n();
const { createSession, updateSession } = usePlanning();

const recurrenceOptions = computed(() => [
  { label: t('planning.session_dialog.recurrence_none'), value: '' },
  { label: t('planning.session_dialog.recurrence_weekly'), value: 'WEEKLY' },
  { label: t('planning.session_dialog.recurrence_biweekly'), value: 'BIWEEKLY' },
]);

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
