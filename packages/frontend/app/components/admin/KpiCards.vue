<template>
  <div class="kpi-cards">
    <div v-if="pending" class="kpi-loading">
      <ProgressSpinner style="width: 1.5rem; height: 1.5rem" stroke-width="4" />
      <span>{{ $t('admin.kpi.loading') }}</span>
    </div>

    <template v-else>
      <KpiCard :value="kpis.students ?? '—'" :label="$t('admin.kpi.students')" />
      <KpiCard :value="kpis.classes ?? '—'" :label="$t('admin.kpi.classes')" />
      <KpiCard :value="kpis.courses ?? '—'" :label="$t('admin.kpi.subjects')" />
      <KpiCard :value="kpis.absences ?? '—'" :label="$t('admin.kpi.absences')" />
    </template>
  </div>
</template>

<script setup lang="ts">
import KpiCard from '~/components/ui/KpiCard.vue';

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

.kpi-cards :deep(.kpi-card) {
  flex: 1 1 min(100%, 10rem);
}

.kpi-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 0;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}
</style>
