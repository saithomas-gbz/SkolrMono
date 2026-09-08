<template>
  <div class="page">
    <Card>
      <template #title>{{ $t('dashboard.title') }}</template>
      <template #content>
        <p class="dashboard-hint">{{ $t('dashboard.connecting') }}</p>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
});

const { hasRole } = useAuth();

// Le rôle plateforme passe en premier : il n'appartient à aucun établissement,
// et sans cette branche il restait bloqué sur le message d'attente ci-dessus —
// un cul-de-sac définitif, pas un état transitoire (#258).
if (hasRole('PLATFORM_ADMIN')) {
  await navigateTo('/platform', { replace: true });
} else if (hasRole('ADMIN')) {
  await navigateTo('/admin', { replace: true });
} else if (hasRole('TEACHER', 'STAFF')) {
  await navigateTo('/teacher', { replace: true });
} else if (hasRole('USER')) {
  await navigateTo('/student', { replace: true });
} else if (hasRole('PARENT')) {
  await navigateTo('/parent', { replace: true });
}
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

.dashboard-hint {
  margin: 0;
  font-size: 0.95rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}
</style>
