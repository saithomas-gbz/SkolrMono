<script setup lang="ts">
definePageMeta({
  middleware: ['guest'],
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
