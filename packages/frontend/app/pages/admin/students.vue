<template>
  <div class="page">
    <Card>
      <template #title>Élèves de l'établissement</template>
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
  flex: 1 1 100%;
}
</style>
