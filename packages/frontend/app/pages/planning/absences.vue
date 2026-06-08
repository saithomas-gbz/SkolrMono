<template>
  <div class="page">
    <Card>
      <template #title>Gestion des absences</template>
      <template #content>
        <Message v-if="!canAccess" severity="warn" :closable="false">
          Cette page est réservée aux enseignants et administrateurs.
        </Message>

        <template v-else>
          <TabView>
            <TabPanel header="Élèves">
              <PlanningAbsenceTable :filters="{ role: 'STUDENT' }" />
            </TabPanel>
            <TabPanel header="Professeurs">
              <PlanningAbsenceTable :filters="{ role: 'TEACHER' }" />
            </TabPanel>
          </TabView>
        </template>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] });

const { hasRole } = useAuth();
const canAccess = computed(() => hasRole('TEACHER', 'STAFF', 'ADMIN'));
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page :deep(.p-card) {
  flex: 1 1 100%;
}

.page :deep(.p-tabview-panels) {
  padding: 1rem 0 0;
}
</style>
