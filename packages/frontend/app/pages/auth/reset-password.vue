<script setup lang="ts">
definePageMeta({
  middleware: ['guest'],
});
</script>

<template>
  <div class="page">
    <AuthResetPasswordForm />
  </div>
</template>

<style scoped>
.page {
  display: grid;
  place-items: start center;
  gap: 1rem;
  padding: 1rem;
}
</style>
