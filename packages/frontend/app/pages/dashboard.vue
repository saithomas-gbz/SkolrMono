<template>
  <div class="page">
    <!-- TEACHER / STAFF : effectifs par classe + distribution des notes -->
    <template v-if="isTeacher">
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
    </template>

    <!-- ADMIN : vue globale (KPIs + effectifs + notes + absences + élèves) -->
    <template v-else-if="isAdmin">
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
    </template>

    <!-- USER (élève) : mes classes + évolution personnelle + distribution personnelle -->
    <template v-else-if="isStudent">
      <Card>
        <template #title>{{ $t('dashboard.my_classes') }}</template>
        <template #content>
          <StudentClassList />
        </template>
      </Card>
      <Card>
        <template #title>{{ $t('dashboard.grade_progress') }}</template>
        <template #content>
          <ChartGradesTrendChart />
        </template>
      </Card>
      <Card>
        <template #title>{{ $t('dashboard.grade_repartition') }}</template>
        <template #content>
          <ChartGradesChart />
        </template>
      </Card>
    </template>

    <!-- Fallback : session chargée mais rôle inconnu -->
    <template v-else>
      <Card>
        <template #title>{{ $t('dashboard.title') }}</template>
        <template #content>
          <p class="dashboard-hint">{{ $t('dashboard.connecting') }}</p>
        </template>
      </Card>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
});

const route = useRoute();
const { hasRole } = useAuth();

const initialClassId = computed(() => {
  const q = route.query.classId;
  return typeof q === 'string' && q.trim() ? q.trim() : undefined;
});

const isTeacher = computed(() => hasRole('TEACHER', 'STAFF'));
const isAdmin = computed(() => hasRole('ADMIN'));
const isStudent = computed(() => hasRole('USER'));
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

.dashboard-hint {
  margin: 0;
  font-size: 0.95rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}
</style>
