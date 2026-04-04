<script setup lang="ts">
defineProps<{
  inputId: string;
  label: string;
  placeholder?: string;
}>();

const model = defineModel<string>({ required: true });
</script>

<template>
  <div class="mb-3">
    <label :for="inputId" class="block text-900 font-medium mb-2">{{ label }}</label>
    <Password
      :id="inputId"
      v-model="model"
      class="w-full"
      :placeholder="placeholder"
      toggle-mask
    />
  </div>
</template>
