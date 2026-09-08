<script setup lang="ts">
/**
 * Acceptation d'une invitation.
 *
 * La page était protégée par le middleware `guest`, qui redirige toute session
 * active vers l'accueil. Conséquence : un invité qui ouvrait son lien sur un
 * poste où quelqu'un était déjà connecté — le poste d'un collègue, une session
 * de démonstration — n'atteignait jamais le formulaire et n'avait aucun moyen de
 * comprendre pourquoi.
 *
 * Le lien porte son propre jeton d'invitation : il s'adresse à une personne
 * précise, indépendamment de qui est connecté. On purge donc la session en
 * cours au lieu de rediriger, et le nouvel arrivant peut créer son compte.
 */
definePageMeta({ middleware: [] });

const { isLoggedIn, clearSession } = useAuth();

if (isLoggedIn.value) {
  // Purge locale uniquement : révoquer le jeton de rafraîchissement côté serveur
  // (`logout()`) déconnecterait le titulaire du poste de ses autres onglets, ce
  // qu'ouvrir un lien d'invitation ne devrait pas provoquer.
  clearSession();
}
</script>

<template>
  <div class="page">
    <AuthAcceptInvitationForm />
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
