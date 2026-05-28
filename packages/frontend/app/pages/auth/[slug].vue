<template>
  <div class="page">
    <Card class="card">
      <template #title>Auth: {{ slug }}</template>
      <template #content>
        <p v-if="slug === 'success'">Connexion validée.</p>
        <p v-else-if="slug === 'error'">Une erreur est survenue.</p>
        <p v-else>Route de test.</p>

        <Message v-if="slug === 'success' && token" severity="success">
          Token reçu et stocké.
        </Message>
        <Message v-else-if="slug === 'success' && !token" severity="warn">
          Aucun token trouvé dans l’URL.
        </Message>
      </template>
      <template #footer>
        <Button v-if="token" label="Accéder au tableau de bord" @click="navigateTo('/dashboard')" />
        <Button v-else label="Retour" severity="secondary" @click="navigateTo('/auth/login')" />
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));

const token = computed(() => {
  const t = route.query.token;
  return typeof t === 'string' ? t : null;
});

const { setSession } = useAuth();

if (import.meta.client && slug.value === 'success' && token.value) {
  setSession(token.value);
  await navigateTo('/dashboard');
}
</script>

<style scoped>
.page {
  display: grid;
  place-items: start center;
  padding: 1rem;
}

.card {
  width: min(720px, 100%);
}
</style>
