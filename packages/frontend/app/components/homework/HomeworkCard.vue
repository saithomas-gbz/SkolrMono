<template>
  <Card class="homework-card" :class="{ 'homework-card-done': done }">
    <template #content>
      <Tag :value="subject" :severity="done ? 'secondary' : 'danger'" />
      <p class="homework-title">{{ title }}</p>
      <p class="homework-meta">
        <span :class="{ 'homework-meta-overdue': overdue }">{{ metaLabel }}</span>
      </p>
    </template>
  </Card>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    subject: string;
    title: string;
    metaLabel: string;
    done?: boolean;
    overdue?: boolean;
  }>(),
  { done: false, overdue: false },
);
</script>

<style scoped>
.homework-card {
  box-shadow: var(--skolr-shadow-sm);
}

.homework-card-done {
  opacity: 0.55;
}

.homework-title {
  font-family: var(--skolr-font-family);
  font-weight: 800;
  font-size: 15px;
  line-height: 1.25;
  margin: var(--skolr-space-2) 0 var(--skolr-space-1);
}

.homework-meta {
  margin: 0;
  font-size: 12px;
  color: var(--skolr-color-text-muted);
}

.homework-meta-overdue {
  color: var(--skolr-color-accent-700);
  font-weight: 700;
}
</style>
