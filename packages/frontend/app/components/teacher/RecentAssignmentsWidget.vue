<template>
  <div class="assignments-widget">
    <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

    <div v-else-if="pending" class="widget-loading">
      <ProgressSpinner style="width: 1.5rem; height: 1.5rem" stroke-width="4" />
      <span>{{ $t('common.loading') }}</span>
    </div>

    <div v-else-if="assignments.length === 0" class="widget-empty">
      <p>{{ $t('teacher.dashboard.no_recent_assignments') }}</p>
    </div>

    <ul v-else class="assignment-list">
      <li v-for="assignment in assignments" :key="assignment.id" class="assignment-item">
        <div class="assignment-info">
          <span class="assignment-title">{{ assignment.title }}</span>
          <Tag
            :value="$t('teacher.dashboard.grades_entered', { graded: assignment.gradedCount, total: assignment.totalCount })"
            :severity="assignment.gradedCount >= assignment.totalCount && assignment.totalCount > 0 ? 'success' : 'warn'"
          />
        </div>
        <NuxtLink :to="`/grades/assignments/${assignment.id}`" class="widget-link">
          {{ $t('teacher.dashboard.enter_grades') }}
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const { fetchAssignments, normalizeApiError } = useAssignment();
const { userId } = useAuth();

const pending = ref(true);
const fetchError = ref<string | null>(null);
const assignments = ref<Awaited<ReturnType<typeof fetchAssignments>>>([]);

onMounted(async () => {
  if (!userId.value) {
    pending.value = false;
    return;
  }

  try {
    const all = await fetchAssignments({ teacherId: userId.value });
    assignments.value = all.slice(0, 5);
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
});
</script>

<style scoped>
.assignments-widget {
  display: grid;
  gap: 0.75rem;
}

.widget-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 4rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.widget-empty {
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
  padding: 0.5rem 0;
}

.widget-empty p {
  margin: 0;
}

.assignment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.assignment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--p-surface-100, var(--skolr-color-border));
  font-size: 0.9rem;
}

.assignment-item:last-child {
  border-bottom: none;
}

.assignment-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.assignment-title {
  color: var(--p-text-color, inherit);
}

.widget-link {
  font-size: 0.9rem;
  color: var(--p-primary-color, var(--skolr-color-brand-green));
  text-decoration: none;
  white-space: nowrap;
}

.widget-link:hover {
  text-decoration: underline;
}
</style>
