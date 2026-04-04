<template>
  <div class="flex align-items-center justify-content-center mb-4">
    <div class="flex-grow-1 skolr-auth-or-divider__line" />
    <div class="px-3 text-600">
      <slot />
    </div>
    <div class="flex-grow-1 skolr-auth-or-divider__line" />
  </div>
</template>

<style scoped>
.skolr-auth-or-divider__line {
  height: 1px;
  background: var(--surface-border);
}
</style>
