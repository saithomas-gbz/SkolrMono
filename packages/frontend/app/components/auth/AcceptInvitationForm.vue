<template>
  <Card class="card">
    <template #title>{{ $t('auth.accept_invitation.title') }}</template>
    <template #content>
      <div v-if="loadingInvitation" class="loading">
        <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
        <span>{{ $t('auth.accept_invitation.checking') }}</span>
      </div>

      <Message v-else-if="invitationError" severity="error" :closable="false">
        {{ invitationError }}
      </Message>

      <div v-else class="form auth-form-fields">
        <div class="field">
          <label for="invitation-email">{{ $t('auth.email') }}</label>
          <InputText id="invitation-email" :model-value="invitation?.email" class="full-width" fluid variant="outlined" disabled />
        </div>

        <div class="field">
          <label for="invitation-name">{{ $t('auth.register.name_optional') }}</label>
          <InputText
            id="invitation-name"
            v-model="name"
            type="text"
            autocomplete="name"
            class="full-width"
            fluid
            variant="outlined"
          />
        </div>

        <div class="field">
          <label for="invitation-password">{{ $t('auth.password') }}</label>
          <Password
            id="invitation-password"
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
      <div v-if="!loadingInvitation && !invitationError" class="footer-actions">
        <Button :loading="submitting" :label="$t('auth.accept_invitation.submit')" @click="submit" />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { AUTH_PASSWORD_MIN_LENGTH, type AuthSuccess } from '~/composables/useAuth';
import { useInvitation, type InvitationPreview } from '~/composables/useInvitation';

const emit = defineEmits<{
  success: [payload: AuthSuccess];
}>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { setSession } = useAuth();
const { fetchInvitation, acceptInvitation, normalizeApiError } = useInvitation();

const token = computed(() => {
  const q = route.query.token;
  return typeof q === 'string' ? q.trim() : '';
});

const invitation = ref<InvitationPreview | null>(null);
const loadingInvitation = ref(true);
const invitationError = ref<string | null>(null);

const password = ref('');
const name = ref('');
const submitting = ref(false);
const submitError = ref<string | null>(null);
const passwordError = ref<string | null>(null);

onMounted(async () => {
  if (!token.value) {
    invitationError.value = t('auth.accept_invitation.missing_token');
    loadingInvitation.value = false;
    return;
  }
  try {
    invitation.value = await fetchInvitation(token.value);
  } catch (e) {
    invitationError.value = normalizeApiError(e) || t('auth.accept_invitation.invalid_token');
  } finally {
    loadingInvitation.value = false;
  }
});

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
    const result = await acceptInvitation(token.value, password.value, name.value);
    setSession(result.token, result.user);
    emit('success', result);
    await router.push('/dashboard');
  } catch (e) {
    submitError.value = normalizeApiError(e);
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

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 6rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.auth-form-fields :deep(.p-password) {
  width: 100%;
}

.auth-form-fields :deep(.p-password-fluid .p-password-input) {
  width: 100%;
}
</style>
