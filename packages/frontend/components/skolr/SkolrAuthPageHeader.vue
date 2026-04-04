<template>
  <div class="text-center mb-5">
    <div class="text-900 text-3xl font-medium mb-3">
      <slot name="title" />
    </div>
    <span class="text-600 font-medium line-height-3">
      <slot name="hint" />
    </span>
    <slot name="action" />
  </div>
</template>
