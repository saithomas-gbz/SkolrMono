<template>
  <Card class="card">
    <template #title>{{ $t('auth.forgot_password.title') }}</template>
    <template #content>
      <div v-if="success" class="form">
        <Message severity="success" :closable="false">
          {{ $t('auth.forgot_password.success') }}
        </Message>
      </div>

      <div v-else class="form auth-form-fields">
        <div class="field">
          <label for="forgot-password-email">{{ $t('auth.email') }}</label>
          <InputText
            id="forgot-password-email"
            v-model="email"
            type="email"
            autocomplete="email"
            class="full-width"
            fluid
            variant="outlined"
            :invalid="!!emailError"
          />
          <small v-if="emailError" class="p-error">{{ emailError }}</small>
        </div>

        <Message v-if="submitError" severity="error">{{ submitError }}</Message>
      </div>
    </template>
    <template #footer>
      <div v-if="!success" class="footer-actions">
        <Button :loading="submitting" :label="$t('auth.forgot_password.submit')" @click="submit" />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { AUTH_EMAIL_FORMAT_REGEX } from '~/composables/useAuth';
import { usePasswordReset } from '~/composables/usePasswordReset';

const { t } = useI18n();
const { requestPasswordReset, normalizePasswordResetError } = usePasswordReset();

const email = ref('');
const emailError = ref<string | null>(null);
const submitting = ref(false);
const submitError = ref<string | null>(null);
const success = ref(false);

function validate(): boolean {
  emailError.value = null;
  const trimmed = email.value.trim();

  if (!trimmed) {
    emailError.value = t('auth.validation.email_required');
    return false;
  }
  if (!AUTH_EMAIL_FORMAT_REGEX.test(trimmed)) {
    emailError.value = t('auth.validation.email_invalid');
    return false;
  }
  return true;
}

async function submit() {
  submitError.value = null;
  if (!validate()) {
    return;
  }

  submitting.value = true;
  try {
    await requestPasswordReset(email.value.trim());
    success.value = true;
  } catch (e) {
    submitError.value = normalizePasswordResetError(e);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.card {
  width: min(560px, 100%);
}

.form {
  display: grid;
  gap: 0.75rem;
}

.field {
  display: grid;
  gap: 0.35rem;
}

.footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}

.full-width {
  width: 100%;
}
</style>
