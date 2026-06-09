<template>
  <div class="page">
    <Card>
      <template #title>{{ $t('teacher.students_title') }}</template>
      <template #content>
        <TablesTeacherClassStudentTable v-if="isTeacher" />
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
