<template>
  <Dialog
    v-model:visible="visible"
    :header="subject ? 'Modifier la matière' : 'Nouvelle matière'"
    modal
    :style="{ width: '30rem' }"
    @hide="resetForm"
  >
    <div class="form">
      <div class="field">
        <label for="sd-name">Nom</label>
        <InputText id="sd-name" v-model="form.name" class="w-full" placeholder="Ex: Mathématiques" />
      </div>

      <div class="field">
        <label for="sd-description">Description</label>
        <Textarea
          id="sd-description"
          v-model="form.description"
          class="w-full"
          rows="3"
          placeholder="Description de la matière"
          auto-resize
        />
      </div>

      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    </div>

    <template #footer>
      <Button label="Annuler" severity="secondary" text @click="visible = false" />
      <Button
        :label="subject ? 'Enregistrer' : 'Créer'"
        :loading="pending"
        :disabled="!isFormValid"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import type { SubjectEntity } from '~/composables/useSubject';

const props = defineProps<{
  subject?: SubjectEntity | null;
}>();

const emit = defineEmits<{
  (e: 'saved'): void;
}>();

const visible = defineModel<boolean>('visible', { default: false });

const { createSubject, updateSubject } = useSubject();

const defaultForm = () => ({ name: '', description: '' });
const form = reactive(defaultForm());
const pending = ref(false);
const error = ref<string | null>(null);

const isFormValid = computed(() => form.name.trim() && form.description.trim());

watch(
  () => props.subject,
  (s) => {
    if (s) {
      form.name = s.name;
      form.description = s.description;
    }
  },
  { immediate: true },
);

function resetForm() {
  Object.assign(form, defaultForm());
  error.value = null;
}

async function submit() {
  error.value = null;
  pending.value = true;
  try {
    if (props.subject) {
      await updateSubject(props.subject.id, { name: form.name, description: form.description });
    } else {
      await createSubject({ name: form.name, description: form.description });
    }
    visible.value = false;
    emit('saved');
  } catch (e) {
    error.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 0.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field label {
  font-size: 0.875rem;
  font-weight: 600;
}

.w-full {
  width: 100%;
}
</style>
