<template>
  <div class="page">
    <Card>
      <template #title>{{ $t('planning.absences.title') }}</template>
      <template #content>
        <TabView>
          <TabPanel :header="$t('planning.absences.students_tab')">
            <PlanningAttendanceRoster />
          </TabPanel>
          <TabPanel :header="$t('planning.absences.teachers_tab')">
            <PlanningAbsenceTable :filters="{ role: 'TEACHER' }" />
          </TabPanel>
          <TabPanel :header="$t('planning.justifications.review.tab')">
            <PlanningJustificationReviewTable />
          </TabPanel>
        </TabView>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'teacher'] });

const { t } = useI18n();

// Titre par défaut ; PlanningAttendanceRoster le précise ("Classe — Cours,
// Salle") une fois une séance chargée dans l'onglet Élèves.
usePageHeader().setPageHeader({ title: t('planning.absences.title') });
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
