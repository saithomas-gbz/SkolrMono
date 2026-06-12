<template>
  <div class="kpi-cards">
    <div v-if="pending" class="kpi-loading">
      <ProgressSpinner style="width: 1.5rem; height: 1.5rem" stroke-width="4" />
      <span>{{ $t('admin.kpi.loading') }}</span>
    </div>

    <template v-else>
      <div class="kpi-card">
        <span class="kpi-value">{{ kpis.students ?? '—' }}</span>
        <span class="kpi-label">{{ $t('admin.kpi.students') }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-value">{{ kpis.classes ?? '—' }}</span>
        <span class="kpi-label">{{ $t('admin.kpi.classes') }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-value">{{ kpis.courses ?? '—' }}</span>
        <span class="kpi-label">{{ $t('admin.kpi.subjects') }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-value">{{ kpis.absences ?? '—' }}</span>
        <span class="kpi-label">{{ $t('admin.kpi.absences') }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const pending = ref(true);
const kpis = ref<{ students: number | null; classes: number | null; courses: number | null; absences: number | null }>({
  students: null,
  classes: null,
  courses: null,
  absences: null,
});

const { fetchClassesSummary } = useClass();
const { fetchCourses } = useGrade();
const { fetchAbsences } = usePlanning();

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

onMounted(async () => {
  const [summaryResult, coursesResult, absencesResult] = await Promise.allSettled([
    fetchClassesSummary(),
    fetchCourses(),
    fetchAbsences(),
  ]);

  if (summaryResult.status === 'fulfilled') {
    kpis.value.classes = summaryResult.value.length;
    kpis.value.students = summaryResult.value.reduce((sum, c) => sum + c.studentCount, 0);
  }
  if (coursesResult.status === 'fulfilled') {
    kpis.value.courses = coursesResult.value.length;
  }
  if (absencesResult.status === 'fulfilled') {
    kpis.value.absences = absencesResult.value.filter(
      (a) => new Date(a.createdAt) >= sevenDaysAgo,
    ).length;
  }

  pending.value = false;
});
</script>

<style scoped>
.kpi-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
}

.kpi-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 0;
  color: var(--p-text-muted-color, #64748b);
}

.kpi-card {
  flex: 1 1 min(100%, 10rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 1.25rem 1rem;
  border-radius: 0.75rem;
  background: var(--p-surface-50, #f8fafc);
  border: 1px solid var(--p-surface-200, #e2e8f0);
}

.kpi-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  color: var(--p-primary-color, #6366f1);
}

.kpi-label {
  font-size: 0.8rem;
  color: var(--p-text-muted-color, #64748b);
  text-align: center;
}
</style>
