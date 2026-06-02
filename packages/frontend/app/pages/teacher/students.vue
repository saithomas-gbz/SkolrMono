<template>
  <div class="page">
    <Card>
      <template #title>Mes élèves</template>
      <template #content>
        <TablesTeacherClassStudentTable v-if="isTeacher" />
        <Message v-else severity="warn" :closable="false">
          Cette page est réservée aux enseignants.
        </Message>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
});

const { hasRole } = useAuth();
const isTeacher = computed(() => hasRole('TEACHER', 'STAFF'));
</script>

<style scoped>
.page {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.page :deep(.p-card) {
  flex: 1 1 100%;
}
</style>
