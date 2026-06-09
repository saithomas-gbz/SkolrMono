<template>
  <Dialog
    v-model:visible="visible"
    :header="course ? $t('admin.course_dialog.edit') : $t('admin.course_dialog.new')"
    modal
    :style="{ width: '38rem' }"
    @hide="resetForm"
  >
    <div class="form">
      <div class="field">
        <label for="cd-name">{{ $t('common.name') }}</label>
        <InputText id="cd-name" v-model="form.name" class="w-full" :placeholder="$t('admin.course_dialog.name_placeholder')" />
      </div>

      <div class="field">
        <label for="cd-description">{{ $t('common.description') }}</label>
        <Textarea
          id="cd-description"
          v-model="form.description"
          class="w-full"
          rows="3"
          :placeholder="$t('admin.course_dialog.description_placeholder')"
          auto-resize
        />
      </div>

      <div class="field">
        <label for="cd-subject">{{ $t('admin.course_dialog.subject') }}</label>
        <Select
          id="cd-subject"
          v-model="form.subjectId"
          :options="subjectOptions"
          option-label="label"
          option-value="value"
          :placeholder="$t('admin.course_dialog.no_subject')"
          show-clear
          class="w-full"
        />
      </div>

      <div class="field">
        <label for="cd-related">{{ $t('admin.course_dialog.linked_programs') }}</label>
        <MultiSelect
          id="cd-related"
          v-model="form.relatedCourseIds"
          :options="otherCourseOptions"
          option-label="label"
          option-value="value"
          :placeholder="$t('admin.course_dialog.select_programs')"
          display="chip"
          class="w-full"
        />
      </div>

      <div class="field">
        <label>{{ $t('admin.course_dialog.topics') }}</label>
        <div class="topics-list">
          <div
            v-for="topic in visibleExistingTopics"
            :key="topic.id"
            class="topic-chip"
          >
            <span>{{ topic.name }}</span>
            <button type="button" class="chip-remove" @click="markDeleteTopic(topic.id)">×</button>
          </div>
          <div
            v-for="(topic, i) in stagingTopics"
            :key="`staging-${i}`"
            class="topic-chip topic-chip--staging"
          >
            <span>{{ topic.name }}</span>
            <button type="button" class="chip-remove" @click="removeStagingTopic(i)">×</button>
          </div>
          <p v-if="visibleExistingTopics.length === 0 && stagingTopics.length === 0" class="topics-empty">
            {{ $t('admin.course_dialog.no_topics') }}
          </p>
        </div>
        <div class="topic-input-row">
          <InputText
            v-model="newTopicName"
            :placeholder="$t('admin.course_dialog.topic_placeholder')"
            class="topic-input"
            @keyup.enter="addStagingTopic"
          />
          <Button
            icon="pi pi-plus"
            severity="secondary"
            :disabled="!newTopicName.trim()"
            @click="addStagingTopic"
          />
        </div>
      </div>

      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    </div>

    <template #footer>
      <Button :label="$t('common.cancel')" severity="secondary" text @click="visible = false" />
      <Button
        :label="course ? $t('common.save') : $t('common.create')"
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
const { createTopic, deleteTopic } = useTopic();

const defaultForm = () => ({
  name: '',
  description: '',
  subjectId: (props.defaultSubjectId ?? null) as string | null,
  relatedCourseIds: [] as string[],
});

const form = reactive(defaultForm());
const pending = ref(false);
const error = ref<string | null>(null);

const newTopicName = ref('');
const stagingTopics = ref<Array<{ name: string }>>([]);
const topicsToDeleteIds = ref<Set<string>>(new Set());

const isFormValid = computed(() => form.name.trim() && form.description.trim());

const subjectOptions = computed(() =>
  props.subjects.map((s) => ({ label: s.name, value: s.id })),
);

const otherCourseOptions = computed(() =>
  props.allCourses
    .filter((c) => c.id !== props.course?.id)
    .map((c) => ({ label: c.name, value: c.id })),
);

const visibleExistingTopics = computed(() =>
  (props.course?.topics ?? []).filter((t) => !topicsToDeleteIds.value.has(t.id)),
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
    stagingTopics.value = [];
    topicsToDeleteIds.value = new Set();
    newTopicName.value = '';
  },
  { immediate: true },
);

function addStagingTopic() {
  const name = newTopicName.value.trim();
  if (!name) return;
  stagingTopics.value.push({ name });
  newTopicName.value = '';
}

function removeStagingTopic(index: number) {
  stagingTopics.value.splice(index, 1);
}

function markDeleteTopic(id: string) {
  topicsToDeleteIds.value = new Set([...topicsToDeleteIds.value, id]);
}

function resetForm() {
  Object.assign(form, defaultForm());
  error.value = null;
  stagingTopics.value = [];
  topicsToDeleteIds.value = new Set();
  newTopicName.value = '';
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

      const prev = new Set(props.course.relatedCourses.map((r) => r.id));
      const next = new Set(form.relatedCourseIds);
      const toAdd = form.relatedCourseIds.filter((id) => !prev.has(id));
      const toRemove = [...prev].filter((id) => !next.has(id));

      await Promise.all([
        ...toAdd.map((id) => addRelatedCourse(savedCourse.id, id)),
        ...toRemove.map((id) => removeRelatedCourse(savedCourse.id, id)),
        ...[...topicsToDeleteIds.value].map((id) => deleteTopic(id)),
        ...stagingTopics.value.map((t) =>
          createTopic({ name: t.name, description: '', courseId: savedCourse.id }),
        ),
      ]);
    } else {
      savedCourse = await createCourse({
        name: form.name,
        description: form.description,
        subjectId: form.subjectId ?? undefined,
      });

      await Promise.all([
        ...form.relatedCourseIds.map((id) => addRelatedCourse(savedCourse.id, id)),
        ...stagingTopics.value.map((t) =>
          createTopic({ name: t.name, description: '', courseId: savedCourse.id }),
        ),
      ]);
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

.topics-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  min-height: 2rem;
  padding: 0.375rem 0;
}

.topic-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.5rem 0.2rem 0.6rem;
  border-radius: 999px;
  background: var(--p-surface-100, #f1f5f9);
  border: 1px solid var(--p-surface-300, #cbd5e1);
  font-size: 0.8rem;
}

.topic-chip--staging {
  background: var(--p-primary-50, #eff6ff);
  border-color: var(--p-primary-200, #bfdbfe);
  color: var(--p-primary-700, #1d4ed8);
}

.chip-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  line-height: 1;
  padding: 0;
  color: inherit;
  opacity: 0.6;
}

.chip-remove:hover {
  opacity: 1;
}

.topics-empty {
  margin: 0;
  font-size: 0.8rem;
  color: var(--p-text-muted-color, #64748b);
  align-self: center;
}

.topic-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.topic-input {
  flex: 1;
}
</style>
