<template>
  <div class="homework-board">
    <div class="homework-column">
      <p class="column-label">{{ $t('homework.this_week') }}</p>
      <p v-if="buckets.thisWeek.length === 0" class="column-empty">{{ $t('homework.empty_column') }}</p>
      <HomeworkCard
        v-for="item in buckets.thisWeek"
        :key="item.assignmentId"
        :subject="item.subject"
        :title="item.title"
        :meta-label="item.overdue ? $t('homework.overdue') : dueLabel(item.dueAt)"
        :overdue="item.overdue"
      />
    </div>

    <div class="homework-column">
      <p class="column-label">{{ $t('homework.next_week') }}</p>
      <p v-if="buckets.nextWeek.length === 0" class="column-empty">{{ $t('homework.empty_column') }}</p>
      <HomeworkCard
        v-for="item in buckets.nextWeek"
        :key="item.assignmentId"
        :subject="item.subject"
        :title="item.title"
        :meta-label="dueLabel(item.dueAt)"
      />
    </div>

    <div class="homework-column">
      <p class="column-label">{{ $t('homework.done') }}</p>
      <p v-if="buckets.done.length === 0" class="column-empty">{{ $t('homework.empty_column') }}</p>
      <HomeworkCard
        v-for="item in buckets.done"
        :key="item.assignmentId"
        :subject="item.subject"
        :title="item.title"
        :meta-label="dueLabel(item.dueAt, true)"
        done
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import HomeworkCard from './HomeworkCard.vue';
import type { HomeworkBuckets } from '~/utils/homeworkBuckets';

defineProps<{
  buckets: HomeworkBuckets;
}>();

const { t } = useI18n();

function dueLabel(dueAt: Date | null, submitted = false): string {
  if (!dueAt) return t('homework.no_due_date');
  const label = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(
    dueAt,
  );
  return submitted ? t('homework.submitted_on', { date: label }) : t('homework.due_on', { date: label });
}
</script>

<style scoped>
.homework-board {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1px;
  background: var(--skolr-color-divider);
}

.homework-column {
  background: var(--skolr-color-bg);
  padding: var(--skolr-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--skolr-space-3);
}

.column-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--skolr-color-text-muted);
  margin: 0;
}

.column-empty {
  font-size: 13px;
  color: var(--skolr-color-text-muted);
  margin: 0;
}
</style>
