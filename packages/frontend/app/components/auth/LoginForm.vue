<template>
  <Card class="card">
    <template #title>{{ $t('auth.login.title') }}</template>
    <template #content>
      <div class="form auth-form-fields">
        <div class="field">
          <label for="login-email">{{ $t('auth.email') }}</label>
          <InputText
            id="login-email"
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

        <div class="field">
          <label for="login-password">{{ $t('auth.password') }}</label>
          <Password
            id="login-password"
            v-model="password"
            class="full-width"
            fluid
            variant="outlined"
            input-class="full-width"
            :feedback="false"
            toggle-mask
            autocomplete="current-password"
            :invalid="!!passwordError"
          />
          <small v-if="passwordError" class="p-error">{{ passwordError }}</small>
        </div>

        <Message v-if="error" severity="error">{{ error }}</Message>

        <Divider align="center" class="divider">
          <span class="divider-text">{{ $t('auth.login.or_separator') }}</span>
        </Divider>

        <Button
          :label="$t('auth.login.continue_with_google')"
          icon="pi pi-google"
          severity="secondary"
          outlined
          class="full-width"
          @click="continueWithGoogle"
        />
      </div>
    </template>
    <template #footer>
      <div class="footer-actions">
        <Button :loading="loading" :label="$t('auth.login.submit')" @click="submit" />
      </div>
      <p class="forgot-password">
        <NuxtLink to="/auth/forgot-password" class="link">{{ $t('auth.login.forgot_password') }}</NuxtLink>
      </p>
    </template>
  </Card>
</template>

<script setup lang="ts">
import {
  normalizeAuthError,
  useAuthCredentialPolicy,
  type AuthSuccess,
} from '~/composables/useAuth';

const emit = defineEmits<{
  success: [payload: AuthSuccess];
}>();

const { t } = useI18n();
const { login, googleLoginUrl } = useAuth();
const router = useRouter();

function continueWithGoogle() {
  navigateTo(googleLoginUrl(), { external: true });
}

const email = ref('');
const password = ref('');
const credentialPolicy = useAuthCredentialPolicy(email, password);
const loading = ref(false);
const error = ref<string | null>(null);
const emailError = ref<string | null>(null);
const passwordError = ref<string | null>(null);

function validate(): boolean {
  emailError.value = null;
  passwordError.value = null;

  if (!credentialPolicy.satisfiesEmailNonEmpty.value) {
    emailError.value = t('auth.validation.email_required');
    return false;
  }
  if (!credentialPolicy.satisfiesEmailFormat.value) {
    emailError.value = t('auth.validation.email_invalid');
    return false;
  }

  if (!credentialPolicy.satisfiesPasswordNonEmpty.value) {
    passwordError.value = t('auth.validation.password_required');
    return false;
  }
  if (!credentialPolicy.satisfiesPasswordMinLength.value) {
    passwordError.value = t('auth.validation.password_min');
    return false;
  }

  return true;
}

async function submit() {
  error.value = null;
  if (!validate()) {
    return;
  }

  loading.value = true;
  try {
    const result = await login(credentialPolicy.trimmedEmail.value, password.value);
    emit('success', result);
    await router.push('/dashboard');
  } catch (e) {
    error.value = normalizeAuthError(e);
  } finally {
    loading.value = false;
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

.forgot-password {
  margin: 0.5rem 0 0;
  text-align: right;
  font-size: 0.9rem;
}

.link {
  color: var(--p-primary-color, var(--skolr-color-brand-green));
  font-weight: 600;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.full-width {
  width: 100%;
}

.divider {
  margin: 0.25rem 0;
}

.divider-text {
  font-size: 0.85rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.auth-form-fields :deep(.p-password) {
  width: 100%;
}

.auth-form-fields :deep(.p-password-fluid .p-password-input) {
  width: 100%;
}

.auth-form-fields :deep(input:-webkit-autofill:not(:disabled)),
.auth-form-fields :deep(.p-password-input:-webkit-autofill:not(:disabled)) {
  -webkit-text-fill-color: var(--p-inputtext-color, inherit);
  box-shadow: inset 0 0 0 120px var(--p-inputtext-background);
}
</style>
