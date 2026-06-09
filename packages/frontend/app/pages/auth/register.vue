<script setup lang="ts">
definePageMeta({
  middleware: ['guest'],
});
</script>

<template>
  <div class="page">
    <AuthRegisterForm />

    <p class="sub">
      {{ $t('auth.register.already_registered') }}
      <NuxtLink to="/auth/login" class="link">{{ $t('auth.register.sign_in') }}</NuxtLink>
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
  color: var(--p-text-muted-color, #64748b);
}

.link {
  color: var(--p-primary-color, #6366f1);
  font-weight: 600;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}
</style>
