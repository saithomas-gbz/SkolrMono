<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();
const toast = useToast();

definePageMeta({
  middleware: ['guest'],
});

// Redirigé ici après invalidation de session (401/403 via `useApi`) : signaler à l'utilisateur.
// `nextTick` : le `<Toast>` du layout est monté après cette page (frère suivant dans le
// template) et ne s'abonne au bus PrimeVue qu'à son propre montage — sans ce délai, l'event
// `add` serait émis avant l'abonnement et le toast perdu.
onMounted(async () => {
  if (!route.query.expired) {
    return;
  }
  await nextTick();
  toast.add({
    severity: 'warn',
    summary: t('auth.session_expired.summary'),
    detail: t('auth.session_expired.detail'),
    life: 5000,
  });
});
</script>

<template>
  <div class="page">
    <AuthLoginForm />

    <p class="sub">
      {{ $t('auth.login.no_account') }}
      <NuxtLink to="/auth/register" class="link">{{ $t('auth.login.create_account') }}</NuxtLink>
    </p>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  place-items: start center;
  gap: 1rem;
  padding: 1rem;
}

.sub {
  margin: 0;
  text-align: center;
  font-size: 0.95rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.link {
  color: var(--p-primary-color, var(--skolr-color-brand-green));
  font-weight: 600;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}
</style>
