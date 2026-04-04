<script setup lang="ts">
import { navigateTo, onMounted, useAuth, useRoute } from '#imports';

const route = useRoute();
const auth = useAuth();

onMounted(async () => {
  const raw = route.query.token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  if (token) {
    await auth.setToken(token);
    await navigateTo('/');
  }
});
</script>

<template>
  <div>Loading...</div>
</template>
