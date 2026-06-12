<template>
  <div class="teacher-class-student-table">
    <Message v-if="fetchError" severity="error" :closable="false" class="table-message">
      {{ fetchError }}
    </Message>

    <div v-else-if="pending" class="table-loading">
      <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
      <span>{{ $t('teacher.class_student_table.loading_classes') }}</span>
    </div>

    <div v-else-if="!userId" class="table-empty">
      <p>{{ $t('teacher.class_student_table.invalid_session') }}</p>
    </div>

    <div v-else-if="classes.length === 0" class="table-empty">
      <p>{{ $t('teacher.class_student_table.no_class') }}</p>
      <p class="table-empty-hint">{{ $t('teacher.class_student_table.contact_admin') }}</p>
    </div>

    <template v-else>
      <div class="table-toolbar">
        <label for="teacher-class-select" class="toolbar-label">{{ $t('common.class') }}</label>
        <Select
          id="teacher-class-select"
          v-model="selectedClassId"
          :options="classOptions"
          option-label="label"
          option-value="value"
          :placeholder="$t('common.choose_class')"
        />
      </div>

      <Message v-if="studentsError" severity="error" :closable="false" class="table-message">
        {{ studentsError }}
      </Message>

      <div v-else-if="studentsPending" class="table-loading">
        <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
        <span>{{ $t('teacher.class_student_table.loading_students') }}</span>
      </div>

      <div v-else-if="rows.length === 0" class="table-empty">
        <p>{{ $t('teacher.class_student_table.no_students') }}</p>
      </div>

      <DataTable
        v-else
        :value="rows"
        data-key="studentId"
        responsive-layout="scroll"
        class="students-table"
        sort-field="name"
        :sort-order="1"
        removable-sort
      >
        <Column field="name" :header="$t('common.name')" sortable />
        <Column field="email" :header="$t('common.email')" sortable />
        <Column field="joinedAt" :header="$t('teacher.class_student_table.joined_on')" sortable>
          <template #body="{ data }">
            {{ formatDate(data.joinedAt) }}
          </template>
        </Column>
        <Column :header="$t('common.actions')">
          <template #body="{ data }">
            <div class="action-buttons">
              <Button
                :label="$t('teacher.class_student_table.manage_grades')"
                icon="pi pi-pencil"
                size="small"
                outlined
                @click="openGradeDialog(data)"
              />
              <NuxtLink
                v-if="selectedClassId"
                :to="`/grades/classes/${selectedClassId}`"
                class="p-button p-button-sm p-button-text"
              >
                {{ $t('teacher.class_student_table.gradebook') }}
              </NuxtLink>
            </div>
          </template>
        </Column>
      </DataTable>
    </template>

    <TablesTeacherGradeDialog
      v-model:visible="dialogVisible"
      :student="activeStudent"
      :students="rows"
      :class-id="selectedClassId"
    />
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError, type SkolrClass, type ClassesApiResponse } from '~/composables/useClass';
import type { UserProfile } from '~/composables/useUser';

type StudentRow = {
  studentId: string;
  name: string;
  email: string;
  joinedAt: string | null;
};

const api = useApi();
const { userId } = useAuth();
const { fetchUsersByIds } = useUser();

const classesUrl = computed(() =>
  userId.value ? `/class/classes/teacher/${userId.value}` : null,
);

const {
  data: classesResponse,
  pending,
  error: classesError,
} = await useFetch<ClassesApiResponse>(() => classesUrl.value, {
  $fetch: api,
  watch: [classesUrl],
  immediate: true,
  default: () => ({ data: [] as SkolrClass[], message: '' }),
});

const classes = computed(() => classesResponse.value?.data ?? []);

const fetchError = computed(() =>
  classesError.value ? normalizeApiError(classesError.value) : null,
);

const classOptions = computed(() =>
  classes.value.map((cls) => ({ label: cls.name, value: cls.id })),
);

const selectedClassId = ref<string | null>(null);

watch(
  classes,
  (list) => {
    const stillExists = list.some((cls) => cls.id === selectedClassId.value);
    if (!stillExists) {
      selectedClassId.value = list[0]?.id ?? null;
    }
  },
  { immediate: true },
);

const selectedClass = computed(
  () => classes.value.find((cls) => cls.id === selectedClassId.value) ?? null,
);

const rows = ref<StudentRow[]>([]);
const studentsPending = ref(false);
const studentsError = ref<string | null>(null);

async function loadStudents(cls: SkolrClass | null) {
  studentsError.value = null;
  const enrollments = cls?.students ?? [];
  if (enrollments.length === 0) {
    rows.value = [];
    return;
  }

  studentsPending.value = true;
  try {
    const profiles = await fetchUsersByIds(enrollments.map((s) => s.studentId));
    const byId = new Map<string, UserProfile>(profiles.map((p) => [p.id, p]));
    rows.value = enrollments.map((enrollment) => {
      const profile = byId.get(enrollment.studentId);
      return {
        studentId: enrollment.studentId,
        name: profile?.name ?? '—',
        email: profile?.email ?? '—',
        joinedAt: enrollment.joinedAt ?? null,
      };
    });
  } catch (error) {
    studentsError.value = normalizeApiError(error);
    rows.value = [];
  } finally {
    studentsPending.value = false;
  }
}

watch(
  selectedClass,
  (cls) => {
    void loadStudents(cls);
  },
  { immediate: true },
);

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR');
}

const dialogVisible = ref(false);
const activeStudent = ref<StudentRow | null>(null);

function openGradeDialog(row: StudentRow) {
  activeStudent.value = row;
  dialogVisible.value = true;
}
</script>

<style scoped>
.teacher-class-student-table {
  display: grid;
  gap: 0.75rem;
}

.table-message {
  margin: 0;
}

.table-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.toolbar-label {
  font-weight: 600;
  font-size: 0.9rem;
}

.table-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 6rem;
  color: var(--p-text-muted-color, #64748b);
}

.table-empty {
  padding: 0.5rem 0;
  min-height: 6rem;
  color: var(--p-text-muted-color, #64748b);
}

.table-empty p {
  margin: 0 0 0.4rem;
}

.table-empty-hint {
  font-size: 0.9rem;
}

.students-table {
  font-size: 0.9rem;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
