<template>
  <div class="page">
    <!-- TEACHER / STAFF : effectifs par classe + distribution des notes -->
    <template v-if="isTeacher">
      <Card>
        <template #title>Effectifs par classe</template>
        <template #content>
          <ChartClassesChart :initial-class-id="initialClassId" />
        </template>
      </Card>
      <Card>
        <template #title>Distribution des notes</template>
        <template #content>
          <ChartGradesChart :initial-class-id="initialClassId" />
        </template>
      </Card>
      <Card>
        <template #title>Mes élèves</template>
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
        <template #title>Effectifs par classe</template>
        <template #content>
          <ChartClassesChart :initial-class-id="initialClassId" />
        </template>
      </Card>
      <Card>
        <template #title>Distribution globale des notes</template>
        <template #content>
          <ChartGradesChart :initial-class-id="initialClassId" />
        </template>
      </Card>
      <Card>
        <template #title>Absences récentes (7 jours)</template>
        <template #content>
          <AdminAbsencesWidget />
        </template>
      </Card>
      <Card class="admin-full-width">
        <template #title>
          <span>Aperçu des élèves</span>
          <NuxtLink to="/admin/students" class="card-link">Voir tout →</NuxtLink>
        </template>
        <template #content>
          <AdminClassStudentTable :initial-class-id="initialClassId" />
        </template>
      </Card>
    </template>

    <!-- USER (élève) : mes classes + évolution personnelle + distribution personnelle -->
    <template v-else-if="isStudent">
      <Card>
        <template #title>Mes classes</template>
        <template #content>
          <StudentClassList />
        </template>
      </Card>
      <Card>
        <template #title>Évolution de mes notes</template>
        <template #content>
          <ChartGradesTrendChart />
        </template>
      </Card>
      <Card>
        <template #title>Répartition de mes notes</template>
        <template #content>
          <ChartGradesChart />
        </template>
      </Card>
    </template>

    <!-- Fallback : session chargée mais rôle inconnu -->
    <template v-else>
      <Card>
        <template #title>Tableau de bord</template>
        <template #content>
          <p class="dashboard-hint">Connexion en cours…</p>
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

.card-link {
  float: right;
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--p-primary-color, #6366f1);
  text-decoration: none;
}

.card-link:hover {
  text-decoration: underline;
}

.dashboard-hint {
  margin: 0;
  font-size: 0.95rem;
  color: var(--p-text-muted-color, #64748b);
}
</style>
