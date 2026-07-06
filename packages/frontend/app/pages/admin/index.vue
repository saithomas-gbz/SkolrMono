<template>
  <div class="page">
    <div class="admin-full-width">
      <AdminKpiCards />
    </div>
    <Card>
      <template #title>
        <div class="card-title-row">
          <span>{{ $t('dashboard.billing_title') }}</span>
          <NuxtLink to="/admin/billing" class="card-link">{{ $t('dashboard.see_all') }}</NuxtLink>
        </div>
      </template>
      <template #content>
        <AdminBillingWidget />
      </template>
    </Card>
    <Card>
      <template #title>{{ $t('dashboard.class_enrollment') }}</template>
      <template #content>
        <ChartClassesChart />
      </template>
    </Card>
    <Card>
      <template #title>{{ $t('dashboard.global_grade_distribution') }}</template>
      <template #content>
        <ChartGradesChart :initial-class-id="initialClassId" />
      </template>
    </Card>
    <Card>
      <template #title>{{ $t('dashboard.recent_absences') }}</template>
      <template #content>
        <AdminAbsencesWidget />
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
definePageMeta({ middleware: ['auth', 'admin'] });

const route = useRoute();

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
