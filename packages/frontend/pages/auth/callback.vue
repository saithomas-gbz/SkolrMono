<script setup lang="ts">
import { navigateTo, onMounted, useRoute } from '#imports';
import { useAuth } from '@/composables/useAuth';

const route = useRoute();
const { setToken } = useAuth();

onMounted(async () => {
  const raw = route.query.token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  if (token) {
    setToken(token);
    await navigateTo('/');
  }
});
</script>

<template>
  <div>Loading...</div>
</template>
