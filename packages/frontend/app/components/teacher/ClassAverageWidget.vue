<template>
  <div class="class-average-widget">
    <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

    <div v-else-if="pending" class="widget-loading">
      <ProgressSpinner style="width: 1.5rem; height: 1.5rem" stroke-width="4" />
      <span>{{ $t('common.loading') }}</span>
    </div>

    <div v-else-if="classAverages.length === 0" class="widget-empty">
      <p>{{ $t('teacher.dashboard.no_classes') }}</p>
    </div>

    <ul v-else class="class-average-list">
      <li v-for="entry in classAverages" :key="entry.classId" class="class-average-item">
        <NuxtLink :to="`/statistics?classId=${entry.classId}`" class="class-average-link">
          <span class="class-name">{{ entry.className }}</span>
          <span class="class-average-value">
            {{ entry.average !== null ? `${roundScore(entry.average)}/20` : $t('grades.my_grades.no_average') }}
          </span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';

const { fetchClassesByTeacherId } = useClass();
const { fetchClassStats } = useGrade();
const { userId } = useAuth();

const pending = ref(true);
const fetchError = ref<string | null>(null);
const classAverages = ref<{ classId: string; className: string; average: number | null }[]>([]);

onMounted(async () => {
  if (!userId.value) {
    pending.value = false;
    return;
  }

  try {
    const classes = await fetchClassesByTeacherId(userId.value);
    const results = await Promise.allSettled(
      classes.map(async (c) => {
        const classStats = await fetchClassStats(c.id);
        return { classId: c.id, className: c.name, average: classStats.average };
      }),
    );
    classAverages.value = results
      .filter((r): r is PromiseFulfilledResult<{ classId: string; className: string; average: number | null }> => r.status === 'fulfilled')
      .map((r) => r.value);

    if (classAverages.value.length === 0 && classes.length > 0) {
      const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      fetchError.value = normalizeApiError(firstError?.reason);
    }
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
});

function roundScore(value: number): string {
  return String(Math.round(value * 10) / 10);
}
</script>

<style scoped>
.class-average-widget {
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

.class-average-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.class-average-item {
  border-bottom: 1px solid var(--p-surface-100, var(--skolr-color-border));
}

.class-average-item:last-child {
  border-bottom: none;
}

.class-average-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.4rem 0;
  font-size: 0.9rem;
  text-decoration: none;
  color: inherit;
}

.class-average-link:hover .class-name {
  text-decoration: underline;
}

.class-name {
  color: var(--p-text-color, inherit);
}

.class-average-value {
  font-weight: 600;
  color: var(--p-primary-color, var(--skolr-color-brand-green));
}
</style>
