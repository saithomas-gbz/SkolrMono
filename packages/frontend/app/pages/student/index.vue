<template>
  <div class="page">
    <Card>
      <template #title>{{ $t('dashboard.my_classes') }}</template>
      <template #content>
        <StudentClassList />
      </template>
    </Card>
    <Card>
      <template #title>
        <div class="card-title-row">
          <span>{{ $t('dashboard.grade_progress') }}</span>
          <NuxtLink to="/grades/my-grades" class="card-link">{{ $t('dashboard.see_all') }}</NuxtLink>
        </div>
      </template>
      <template #content>
        <ChartGradesTrendChart />
      </template>
    </Card>
    <Card>
      <template #title>{{ $t('dashboard.grade_repartition') }}</template>
      <template #content>
        <ChartGradesChart />
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'student'] });
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

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.card-link {
  float: right;
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--p-primary-color, var(--skolr-color-brand-green));
  text-decoration: none;
}

.card-link:hover {
  text-decoration: underline;
}
</style>
