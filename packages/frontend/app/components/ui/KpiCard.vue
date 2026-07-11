<template>
  <div class="kpi-card">
    <div class="kpi-value" :class="{ 'kpi-value-accent': variant === 'accent' }">{{ value }}</div>
    <div class="kpi-label">{{ label }}</div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    value: string | number;
    label: string;
    variant?: 'default' | 'accent';
  }>(),
  { variant: 'default' },
);
</script>

<style scoped>
.kpi-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 18px 20px;
  background: var(--skolr-color-bg);
  border: 1px solid var(--skolr-color-divider);
}

.kpi-value {
  font-family: var(--skolr-font-family);
  font-weight: 800;
  font-size: 30px;
  letter-spacing: -0.02em;
  color: var(--skolr-color-text);
}

.kpi-value-accent {
  color: var(--skolr-color-accent-700);
}

.kpi-label {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--skolr-color-text-muted);
}
</style>
