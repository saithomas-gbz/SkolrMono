<template>
  <div class="page">
    <Card>
      <template #content>
        <Message v-if="!canAccess" severity="warn" :closable="false">
          {{ $t('homework.restricted') }}
        </Message>

        <template v-else>
          <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

          <div v-else-if="pending" class="loading">
            <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
            <span>{{ $t('homework.loading') }}</span>
          </div>

          <HomeworkBoard v-else :buckets="buckets" />
        </template>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import HomeworkBoard from '~/components/homework/HomeworkBoard.vue';
import { bucketHomework, type HomeworkItem } from '~/utils/homeworkBuckets';
import { normalizeApiError } from '~/composables/useClass';

definePageMeta({ middleware: ['auth', 'student'] });

const { t } = useI18n();
const { hasRole, userId } = useAuth();
const { fetchClassesByStudentId } = useClass();
const { fetchAssignments } = useAssignment();
const { fetchGradesByUserId } = useGrade();

const canAccess = computed(() => hasRole('USER'));

usePageHeader().setPageHeader({ title: t('homework.title') });

const pending = ref(true);
const fetchError = ref<string | null>(null);
const items = ref<HomeworkItem[]>([]);
const buckets = computed(() => bucketHomework(items.value));

async function load() {
  if (!userId.value) return;
  pending.value = true;
  fetchError.value = null;
  try {
    const classes = await fetchClassesByStudentId(userId.value);
    const assignmentLists = await Promise.all(
      classes.map((cls) => fetchAssignments({ classId: cls.id, status: 'PUBLISHED' })),
    );
    const assignments = assignmentLists.flat();
    const grades = await fetchGradesByUserId(userId.value);
    const gradeByAssignmentId = new Map(grades.map((g) => [g.assignmentId, g]));

    items.value = assignments.map((assignment) => {
      const grade = gradeByAssignmentId.get(assignment.id);
      const done = grade?.status === 'GRADED' || grade?.status === 'ABSENT' || grade?.status === 'EXEMPT';
      return {
        assignmentId: assignment.id,
        subject: assignment.course?.name ?? '',
        title: assignment.title,
        dueAt: assignment.dueAt ? new Date(assignment.dueAt) : null,
        done,
      };
    });
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}

onMounted(() => {
  if (canAccess.value) {
    void load();
  } else {
    pending.value = false;
  }
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page :deep(.p-card-body) {
  display: flex;
  flex-direction: column;
}

.page :deep(.p-card-content) {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 6rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}
</style>
