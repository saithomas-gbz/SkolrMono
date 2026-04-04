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
    <InputText
      :id="inputId"
      v-model="model"
      type="text"
      class="w-full"
      :placeholder="placeholder"
    />
  </div>
</template>
