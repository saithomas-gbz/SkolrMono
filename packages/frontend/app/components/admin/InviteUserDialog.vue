<template>
  <Dialog
    v-model:visible="visible"
    :header="$t('admin.invite_dialog.title')"
    modal
    :style="{ width: '30rem' }"
    @hide="resetForm"
  >
    <div class="form">
      <div class="field">
        <label for="invite-email">{{ $t('admin.invite_dialog.email') }}</label>
        <InputText
          id="invite-email"
          v-model="form.email"
          type="email"
          class="w-full"
          fluid
          variant="outlined"
        />
      </div>

      <div class="field">
        <label for="invite-role">{{ $t('admin.invite_dialog.role') }}</label>
        <Select
          id="invite-role"
          v-model="form.role"
          :options="roleOptions"
          option-label="label"
          option-value="value"
          :placeholder="$t('admin.invite_dialog.choose_role')"
          class="w-full"
          fluid
        />
      </div>

      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    </div>

    <template #footer>
      <Button :label="$t('common.cancel')" severity="secondary" text @click="visible = false" />
      <Button
        :label="$t('admin.invite_dialog.submit')"
        :loading="pending"
        :disabled="!isFormValid"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { useInvitation, type InvitableRole } from '~/composables/useInvitation';

const emit = defineEmits<{
  (e: 'invited', email: string): void;
}>();

const { t } = useI18n();
const visible = defineModel<boolean>('visible', { default: false });

const { createInvitation, normalizeApiError } = useInvitation();

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const defaultForm = (): { email: string; role: InvitableRole | null } => ({ email: '', role: null });
const form = reactive(defaultForm());
const pending = ref(false);
const error = ref<string | null>(null);

const roleOptions = computed(() => [
  { label: t('admin.invite_dialog.role_user'), value: 'USER' as InvitableRole },
  { label: t('admin.invite_dialog.role_teacher'), value: 'TEACHER' as InvitableRole },
  { label: t('admin.invite_dialog.role_staff'), value: 'STAFF' as InvitableRole },
  { label: t('admin.invite_dialog.role_parent'), value: 'PARENT' as InvitableRole },
]);

const isFormValid = computed(() => EMAIL_FORMAT_REGEX.test(form.email.trim()) && !!form.role);

function resetForm() {
  Object.assign(form, defaultForm());
  error.value = null;
}

async function submit() {
  if (!form.role) return;
  error.value = null;
  pending.value = true;
  try {
    const email = form.email.trim();
    await createInvitation(email, form.role);
    visible.value = false;
    emit('invited', email);
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
