<template>
  <div class="page">
    <Card>
      <template #title>
        <div class="card-title-row">
          <span>{{ $t('dashboard.gradebook_title') }}</span>
          <NuxtLink to="/grades/assignments/new" class="card-link">{{ $t('dashboard.new_assignment') }}</NuxtLink>
        </div>
      </template>
      <template #content>
        <p class="dashboard-hint">{{ $t('dashboard.gradebook_hint') }}</p>
      </template>
    </Card>
    <Card>
      <template #title>{{ $t('teacher.dashboard.today_sessions_title') }}</template>
      <template #content>
        <TeacherTodaySessionsWidget />
      </template>
    </Card>
    <Card>
      <template #title>{{ $t('teacher.dashboard.unjustified_absences_title') }}</template>
      <template #content>
        <TeacherUnjustifiedAbsencesWidget />
      </template>
    </Card>
    <Card>
      <template #title>{{ $t('teacher.dashboard.recent_assignments_title') }}</template>
      <template #content>
        <TeacherRecentAssignmentsWidget />
      </template>
    </Card>
    <Card>
      <template #title>{{ $t('teacher.dashboard.class_average_title') }}</template>
      <template #content>
        <TeacherClassAverageWidget />
      </template>
    </Card>
    <Card>
      <template #title>{{ $t('dashboard.class_enrollment') }}</template>
      <template #content>
        <ChartClassesChart />
      </template>
    </Card>
    <Card>
      <template #title>{{ $t('dashboard.grade_distribution') }}</template>
      <template #content>
        <ChartGradesChart :initial-class-id="initialClassId" />
      </template>
    </Card>
    <Card>
      <template #title>{{ $t('dashboard.my_students') }}</template>
      <template #content>
        <TablesTeacherClassStudentTable />
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'teacher'] });

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

.dashboard-hint {
  margin: 0;
  font-size: 0.95rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}
</style>
