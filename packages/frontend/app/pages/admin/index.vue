<template>
  <div class="page">
    <div class="kpi-row">
      <AdminKpiCards />
    </div>

    <div class="main-grid">
      <Card>
        <template #title>{{ $t('admin.dashboard.attendance_chart.title') }}</template>
        <template #content>
          <AttendanceWeekChart />
        </template>
      </Card>
      <Card>
        <template #title>{{ $t('admin.dashboard.needs_attention.title') }}</template>
        <template #content>
          <NeedsAttentionList />
        </template>
      </Card>
    </div>

    <Card>
      <template #title>{{ $t('dashboard.global_grade_distribution') }}</template>
      <template #content>
        <ChartGradesChart :initial-class-id="initialClassId" />
      </template>
    </Card>
    <Card>
      <template #title>{{ $t('dashboard.class_enrollment') }}</template>
      <template #content>
        <ChartClassesChart />
      </template>
    </Card>

    <Card class="admin-full-width">
      <template #title>
        <span>{{ $t('dashboard.student_overview') }}</span>
        <NuxtLink to="/admin/students" class="card-link">{{ $t('dashboard.see_all') }}</NuxtLink>
      </template>
      <template #content>
        <AdminClassStudentTable :initial-class-id="initialClassId" />
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import AttendanceWeekChart from '~/components/admin/AttendanceWeekChart.vue';
import NeedsAttentionList from '~/components/admin/NeedsAttentionList.vue';

definePageMeta({ middleware: ['auth', 'admin'] });

const { t } = useI18n();
const route = useRoute();

usePageHeader().setPageHeader({ title: t('dashboard.title') });

const initialClassId = computed(() => {
  const q = route.query.classId;
  return typeof q === 'string' && q.trim() ? q.trim() : undefined;
});
</script>

<style scoped>
.page {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.page :deep(.p-card) {
  flex: 1 1 min(100%, 30rem);
}

.admin-full-width {
  flex: 1 1 100%;
}

.kpi-row {
  flex: 1 1 100%;
}

.main-grid {
  flex: 1 1 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 1rem;
}

.main-grid :deep(.p-card) {
  flex: initial;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.card-link {
  float: right;
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--p-primary-color, var(--skolr-color-brand-green));
  text-decoration: none;
}

.card-link:hover {
  text-decoration: underline;
}
</style>
