<template>
  <Card class="card">
    <template #title>Inscription</template>
    <template #content>
      <div class="form auth-form-fields">
        <div class="field">
          <label for="register-email">Email</label>
          <InputText
            id="register-email"
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
          <label for="register-password">Mot de passe</label>
          <Password
            id="register-password"
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

        <div class="field">
          <label for="register-name">Nom <span class="optional">(optionnel)</span></label>
          <InputText
            id="register-name"
            v-model="name"
            type="text"
            autocomplete="name"
            class="full-width"
            fluid
            variant="outlined"
          />
        </div>

        <Message v-if="error" severity="error">{{ error }}</Message>
      </div>
    </template>
    <template #footer>
      <div class="footer-actions">
        <Button :loading="loading" label="S'inscrire" @click="submit" />
      </div>
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

const { register } = useAuth();
const router = useRouter();

const email = ref('');
const password = ref('');
const credentialPolicy = useAuthCredentialPolicy(email, password);
const name = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const emailError = ref<string | null>(null);
const passwordError = ref<string | null>(null);

function validate(): boolean {
  emailError.value = null;
  passwordError.value = null;

  if (!credentialPolicy.satisfiesEmailNonEmpty.value) {
    emailError.value = "L'email est requis.";
    return false;
  }
  if (!credentialPolicy.satisfiesEmailFormat.value) {
    emailError.value = 'Email invalide.';
    return false;
  }

  if (!credentialPolicy.satisfiesPasswordNonEmpty.value) {
    passwordError.value = 'Le mot de passe est requis.';
    return false;
  }
  if (!credentialPolicy.satisfiesPasswordMinLength.value) {
    passwordError.value = 'Au moins 6 caractères.';
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
    const trimmedName = name.value.trim();
    const result = await register(
      credentialPolicy.trimmedEmail.value,
      password.value,
      trimmedName ? trimmedName : undefined,
    );
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

.optional {
  font-weight: normal;
  opacity: 0.75;
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

.auth-form-fields :deep(input:-webkit-autofill:not(:disabled)),
.auth-form-fields :deep(.p-password-input:-webkit-autofill:not(:disabled)) {
  -webkit-text-fill-color: var(--p-inputtext-color, inherit);
  box-shadow: inset 0 0 0 120px var(--p-inputtext-background);
}
</style>
