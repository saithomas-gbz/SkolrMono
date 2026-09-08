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
            <div class="barre">
              <Button
                :label="$t('planning.absences.teacher_dialog.open')"
                icon="pi pi-user-minus"
                size="small"
                @click="absenceProfVisible = true"
              />
            </div>
            <PlanningAbsenceTable :key="rafraichi" :filters="{ role: 'TEACHER' }" />
          </TabPanel>
          <TabPanel :header="$t('planning.justifications.review.tab')">
            <PlanningJustificationReviewTable />
          </TabPanel>
        </TabView>
      </template>
    </Card>

    <PlanningTeacherAbsenceDialog v-model:visible="absenceProfVisible" @saved="rafraichi++" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'teacher'] });

const { t } = useI18n();

const absenceProfVisible = ref(false);
// `AbsenceTable` charge ses données au montage ; changer sa clé la remonte, ce
// qui est le moyen le plus court de refléter une absence qui vient d'être créée
// sans lui ajouter une API de rafraîchissement pour ce seul appelant.
const rafraichi = ref(0);

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

.barre {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
}

.page :deep(.p-card) {
  flex: 1 1 100%;
}

.page :deep(.p-tabview-panels) {
  padding: 1rem 0 0;
}
</style>
