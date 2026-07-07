<template>
  <div class="page">
    <Card class="page-full-width">
      <template #title>{{ $t('stats.page_title') }}</template>
      <template #content>
        <Message v-if="listFetchError" severity="error" :closable="false">{{ listFetchError }}</Message>
        <div v-else-if="listPending" class="widget-loading">
          <ProgressSpinner style="width: 1.5rem; height: 1.5rem" stroke-width="4" />
          <span>{{ $t('common.loading') }}</span>
        </div>
        <div v-else-if="classOptions.length === 0" class="widget-empty">
          <p>{{ $t('stats.no_classes') }}</p>
        </div>
        <div v-else class="class-select">
          <label class="class-select-label" for="stats-class-select">{{ $t('stats.class_label') }}</label>
          <Select
            id="stats-class-select"
            v-model="selectedClassId"
            :options="classOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('stats.choose_class')"
            class="class-select-input"
          />
        </div>
      </template>
    </Card>

    <Card>
      <template #title>{{ $t('stats.course_average_title') }}</template>
      <template #content>
        <ChartCourseAverageChart :class-id="selectedClassId" />
      </template>
    </Card>

    <Card>
      <template #title>{{ $t('stats.distribution_title') }}</template>
      <template #content>
        <ChartGradesChart :initial-class-id="selectedClassId ?? undefined" />
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'stats'] });

const { selectedClassId, classOptions, listPending, listFetchError } = await useChartClassSelection();
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

.page-full-width {
  flex: 1 1 100%;
}

.widget-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.widget-empty {
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.widget-empty p {
  margin: 0;
}

.class-select {
  display: grid;
  gap: 0.35rem;
  max-width: 20rem;
}

.class-select-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.class-select-input {
  width: 100%;
}
</style>
