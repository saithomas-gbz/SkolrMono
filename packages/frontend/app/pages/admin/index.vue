<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] });
await navigateTo('/dashboard', { replace: true });
</script>

<template>
  <div />
</template>
