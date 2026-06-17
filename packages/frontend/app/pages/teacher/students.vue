<template>
  <div class="page">
    <Card>
      <template #title>{{ $t('teacher.students_title') }}</template>
      <template #content>
        <TablesTeacherClassStudentTable v-if="isTeacher" :initial-class-id="initialClassId" />
        <Message v-else severity="warn" :closable="false">
          {{ $t('teacher.restricted') }}
        </Message>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
});

const route = useRoute();
const { hasRole } = useAuth();
const isTeacher = computed(() => hasRole('TEACHER', 'STAFF'));

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
