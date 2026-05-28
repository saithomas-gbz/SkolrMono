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
    </template>

    <!-- ADMIN : vue globale (effectifs + toutes les notes) -->
    <template v-else-if="isAdmin">
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

.dashboard-hint {
  margin: 0;
  font-size: 0.95rem;
  color: var(--p-text-muted-color, #64748b);
}
</style>
