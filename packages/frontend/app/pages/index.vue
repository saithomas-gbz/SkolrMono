<template>
  <div class="page">
    <Card>
      <template #title>Bienvenue</template>
      <template #content>
        <p>Structure de base Nuxt + layout PrimeVue.</p>
      </template>
      <template #footer>
        <div class="footer-row">
          <Button label="Action" />
          <p v-if="!isLoggedIn" class="guest-auth">
            <NuxtLink class="link" to="/auth/login">Connexion</NuxtLink>
            <span class="sep">·</span>
            <NuxtLink class="link" to="/auth/register">Inscription</NuxtLink>
          </p>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
const { isLoggedIn } = useAuth();
</script>

<style scoped>
.page {
  display: grid;
  gap: 1rem;
}

.footer-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.guest-auth {
  margin: 0;
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

.sep {
  margin: 0 0.35rem;
  opacity: 0.6;
}
</style>
