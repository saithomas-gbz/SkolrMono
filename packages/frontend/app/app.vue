<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// @nuxtjs/i18n ne pose <html lang> que si experimental.strictSeo est activé
// (non souhaité ici : ça embarque aussi du comportement canonical/hreflang
// inutile pour une app mono-langue derrière auth). RGAA 8.3 exige la langue
// de la page — on la fixe donc directement.
useHead({ htmlAttrs: { lang: 'fr' } });
</script>
