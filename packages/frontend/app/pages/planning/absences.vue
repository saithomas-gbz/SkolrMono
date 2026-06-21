<template>
  <div class="page">
    <Card>
      <template #title>{{ $t('planning.absences.title') }}</template>
      <template #content>
        <Message v-if="!canAccess" severity="warn" :closable="false">
          {{ $t('planning.absences.restricted') }}
        </Message>

        <template v-else>
          <TabView>
            <TabPanel :header="$t('planning.absences.students_tab')">
              <PlanningAbsenceTable :filters="{ role: 'STUDENT' }" />
            </TabPanel>
            <TabPanel :header="$t('planning.absences.teachers_tab')">
              <PlanningAbsenceTable :filters="{ role: 'TEACHER' }" />
            </TabPanel>
            <TabPanel :header="$t('planning.justifications.review.tab')">
              <PlanningJustificationReviewTable />
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
