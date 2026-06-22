<template>
  <Card class="card">
    <template #title>{{ $t('auth.reset_password.title') }}</template>
    <template #content>
      <Message v-if="missingToken" severity="error" :closable="false">
        {{ $t('auth.reset_password.missing_token') }}
      </Message>

      <div v-else-if="success" class="form">
        <Message severity="success" :closable="false">
          {{ $t('auth.reset_password.success') }}
        </Message>
      </div>

      <div v-else class="form auth-form-fields">
        <div class="field">
          <label for="reset-password-password">{{ $t('auth.password') }}</label>
          <Password
            id="reset-password-password"
            v-model="password"
            class="full-width"
            fluid
            variant="outlined"
            input-class="full-width"
            :feedback="true"
            toggle-mask
            autocomplete="new-password"
            :invalid="!!passwordError"
          />
          <small v-if="passwordError" class="p-error">{{ passwordError }}</small>
        </div>

        <Message v-if="submitError" severity="error">{{ submitError }}</Message>
      </div>
    </template>
    <template #footer>
      <div v-if="success" class="footer-actions">
        <Button :label="$t('auth.reset_password.go_to_login')" @click="router.push('/auth/login')" />
      </div>
      <div v-else-if="!missingToken" class="footer-actions">
        <Button :loading="submitting" :label="$t('auth.reset_password.submit')" @click="submit" />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { AUTH_PASSWORD_MIN_LENGTH } from '~/composables/useAuth';
import { usePasswordReset } from '~/composables/usePasswordReset';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { resetPassword, normalizePasswordResetError } = usePasswordReset();

const token = computed(() => {
  const q = route.query.token;
  return typeof q === 'string' ? q.trim() : '';
});
const missingToken = computed(() => !token.value);

const password = ref('');
const passwordError = ref<string | null>(null);
const submitting = ref(false);
const submitError = ref<string | null>(null);
const success = ref(false);

function validate(): boolean {
  passwordError.value = null;

  if (!password.value) {
    passwordError.value = t('auth.validation.password_required');
    return false;
  }
  if (password.value.length < AUTH_PASSWORD_MIN_LENGTH) {
    passwordError.value = t('auth.validation.password_min');
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
    await resetPassword(token.value, password.value);
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

.auth-form-fields :deep(.p-password) {
  width: 100%;
}

.auth-form-fields :deep(.p-password-fluid .p-password-input) {
  width: 100%;
}
</style>
