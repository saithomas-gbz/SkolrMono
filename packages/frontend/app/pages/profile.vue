<template>
  <div class="page">
    <h1 class="page-title">{{ $t('profile.title') }}</h1>

    <Card class="card">
      <template #title>{{ $t('profile.info_title') }}</template>
      <template #content>
        <div v-if="loadError" class="form">
          <Message severity="error" :closable="false">{{ loadError }}</Message>
        </div>
        <div v-else-if="loading" class="loading">
          <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
        </div>
        <div v-else class="form">
          <div class="field">
            <label for="profile-name">{{ $t('common.name') }}</label>
            <InputText
              id="profile-name"
              v-model="form.name"
              class="full-width"
              fluid
              variant="outlined"
              :invalid="!!nameError"
            />
            <small v-if="nameError" class="p-error">{{ nameError }}</small>
          </div>

          <div class="field">
            <label for="profile-email">{{ $t('common.email') }}</label>
            <InputText
              id="profile-email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              class="full-width"
              fluid
              variant="outlined"
              :invalid="!!emailError"
            />
            <small v-if="emailError" class="p-error">{{ emailError }}</small>
          </div>

          <Message v-if="infoSuccess" severity="success" :closable="true" @close="infoSuccess = false">
            {{ $t('profile.update_success') }}
          </Message>
          <Message v-if="infoError" severity="error">{{ infoError }}</Message>
        </div>
      </template>
      <template #footer>
        <div v-if="!loading && !loadError" class="footer-actions">
          <Button :loading="infoSaving" :label="$t('profile.save')" @click="saveInfo" />
        </div>
      </template>
    </Card>

    <Card v-if="!loading && !loadError" class="card">
      <template #title>{{ $t('profile.password_change') }}</template>
      <template #content>
        <div class="form">
          <div class="field">
            <label for="profile-current-password">{{ $t('profile.current_password') }}</label>
            <Password
              id="profile-current-password"
              v-model="passwordForm.currentPassword"
              class="full-width"
              fluid
              variant="outlined"
              input-class="full-width"
              :feedback="false"
              toggle-mask
              autocomplete="current-password"
              :invalid="!!currentPasswordError"
            />
            <small v-if="currentPasswordError" class="p-error">{{ currentPasswordError }}</small>
          </div>

          <div class="field">
            <label for="profile-new-password">{{ $t('profile.new_password') }}</label>
            <Password
              id="profile-new-password"
              v-model="passwordForm.newPassword"
              class="full-width"
              fluid
              variant="outlined"
              input-class="full-width"
              :feedback="true"
              toggle-mask
              autocomplete="new-password"
              :invalid="!!newPasswordError"
            />
            <small v-if="newPasswordError" class="p-error">{{ newPasswordError }}</small>
          </div>

          <div class="field">
            <label for="profile-confirm-password">{{ $t('profile.confirm_password') }}</label>
            <Password
              id="profile-confirm-password"
              v-model="passwordForm.confirmPassword"
              class="full-width"
              fluid
              variant="outlined"
              input-class="full-width"
              :feedback="false"
              toggle-mask
              autocomplete="new-password"
              :invalid="!!confirmPasswordError"
            />
            <small v-if="confirmPasswordError" class="p-error">{{ confirmPasswordError }}</small>
          </div>

          <Message v-if="passwordSuccess" severity="success" :closable="true" @close="passwordSuccess = false">
            {{ $t('profile.password_update_success') }}
          </Message>
          <Message v-if="passwordError" severity="error">{{ passwordError }}</Message>
        </div>
      </template>
      <template #footer>
        <div class="footer-actions">
          <Button :loading="passwordSaving" :label="$t('profile.save')" @click="savePassword" />
        </div>
      </template>
    </Card>

    <Card v-if="!loading && !loadError" class="card">
      <template #title>{{ $t('profile.rgpd.title') }}</template>
      <template #content>
        <p class="rgpd-description">{{ $t('profile.rgpd.description') }}</p>
      </template>
      <template #footer>
        <div class="footer-actions">
          <Button
            severity="secondary"
            icon="pi pi-download"
            :loading="exporting"
            :label="$t('profile.rgpd.export_button')"
            @click="exportData"
          />
          <Button
            severity="danger"
            icon="pi pi-trash"
            :label="$t('profile.rgpd.delete_button')"
            @click="deleteDialogVisible = true"
          />
        </div>
      </template>
    </Card>

    <Dialog
      v-model:visible="deleteDialogVisible"
      modal
      :header="$t('profile.rgpd.delete_dialog_title')"
      :style="{ width: '30rem', maxWidth: '90vw' }"
    >
      <div class="delete-dialog">
        <Message severity="warn" :closable="false">{{ $t('profile.rgpd.delete_dialog_body') }}</Message>
        <div class="field">
          <label for="delete-confirm">{{ $t('profile.rgpd.delete_confirm_label', { word: confirmWord }) }}</label>
          <InputText id="delete-confirm" v-model="deleteConfirmInput" class="full-width" fluid variant="outlined" />
        </div>
      </div>
      <template #footer>
        <Button
          text
          severity="secondary"
          :label="$t('profile.rgpd.delete_cancel')"
          :disabled="deleting"
          @click="deleteDialogVisible = false"
        />
        <Button
          severity="danger"
          icon="pi pi-trash"
          :loading="deleting"
          :disabled="!deleteConfirmed"
          :label="$t('profile.rgpd.delete_confirm')"
          @click="confirmDelete"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { AUTH_EMAIL_FORMAT_REGEX, AUTH_PASSWORD_MIN_LENGTH } from '~/composables/useAuth';
import { normalizeUserError } from '~/composables/useUser';

definePageMeta({ middleware: ['auth'] });

const { t } = useI18n();
const toast = useToast();
const { userId, setSession, clearSession } = useAuth();
const authTokenCookie = useAuthTokenCookie();
const {
  fetchUsersByIds,
  updateProfile,
  changePassword: changePasswordRequest,
  exportMyData,
  deleteMyAccount,
} = useUser();

const loading = ref(true);
const loadError = ref<string | null>(null);

const form = reactive({ name: '', email: '' });
const nameError = ref<string | null>(null);
const emailError = ref<string | null>(null);
const infoSaving = ref(false);
const infoSuccess = ref(false);
const infoError = ref<string | null>(null);

const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' });
const currentPasswordError = ref<string | null>(null);
const newPasswordError = ref<string | null>(null);
const confirmPasswordError = ref<string | null>(null);
const passwordSaving = ref(false);
const passwordSuccess = ref(false);
const passwordError = ref<string | null>(null);

onMounted(async () => {
  if (!userId.value) {
    loadError.value = t('profile.load_error');
    loading.value = false;
    return;
  }
  try {
    const [profile] = await fetchUsersByIds([userId.value]);
    if (!profile) {
      loadError.value = t('profile.load_error');
      return;
    }
    form.name = profile.name ?? '';
    form.email = profile.email;
  } catch (e) {
    loadError.value = normalizeUserError(e);
  } finally {
    loading.value = false;
  }
});

function validateInfo(): boolean {
  nameError.value = null;
  emailError.value = null;

  if (!form.name.trim()) {
    nameError.value = t('auth.validation.name_required');
    return false;
  }
  if (!form.email.trim()) {
    emailError.value = t('auth.validation.email_required');
    return false;
  }
  if (!AUTH_EMAIL_FORMAT_REGEX.test(form.email.trim())) {
    emailError.value = t('auth.validation.email_invalid');
    return false;
  }
  return true;
}

async function saveInfo() {
  infoSuccess.value = false;
  infoError.value = null;
  if (!validateInfo() || !userId.value) {
    return;
  }

  infoSaving.value = true;
  try {
    const updated = await updateProfile(userId.value, {
      name: form.name.trim(),
      email: form.email.trim(),
    });
    const token = authTokenCookie.value;
    if (token) {
      setSession(token, undefined, {
        id: updated.id,
        email: updated.email,
        name: updated.name ?? undefined,
        role: updated.role,
      });
    }
    infoSuccess.value = true;
  } catch (e) {
    infoError.value = normalizeUserError(e);
  } finally {
    infoSaving.value = false;
  }
}

function validatePassword(): boolean {
  currentPasswordError.value = null;
  newPasswordError.value = null;
  confirmPasswordError.value = null;

  if (!passwordForm.currentPassword) {
    currentPasswordError.value = t('auth.validation.password_required');
    return false;
  }
  if (!passwordForm.newPassword) {
    newPasswordError.value = t('auth.validation.password_required');
    return false;
  }
  if (passwordForm.newPassword.length < AUTH_PASSWORD_MIN_LENGTH) {
    newPasswordError.value = t('auth.validation.password_min');
    return false;
  }
  if (passwordForm.confirmPassword !== passwordForm.newPassword) {
    confirmPasswordError.value = t('profile.password_mismatch');
    return false;
  }
  return true;
}

async function savePassword() {
  passwordSuccess.value = false;
  passwordError.value = null;
  if (!validatePassword()) {
    return;
  }

  passwordSaving.value = true;
  try {
    await changePasswordRequest(passwordForm.currentPassword, passwordForm.newPassword);
    passwordSuccess.value = true;
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
  } catch (e) {
    passwordError.value = normalizeUserError(e);
  } finally {
    passwordSaving.value = false;
  }
}

// RGPD — export & effacement --------------------------------------------------

const exporting = ref(false);
const deleteDialogVisible = ref(false);
const deleteConfirmInput = ref('');
const deleting = ref(false);

const confirmWord = computed(() => t('profile.rgpd.delete_confirm_word'));
const deleteConfirmed = computed(() => deleteConfirmInput.value.trim() === confirmWord.value);

// Réinitialise la saisie de confirmation à chaque ouverture/fermeture du dialogue.
watch(deleteDialogVisible, () => {
  deleteConfirmInput.value = '';
});

async function exportData() {
  exporting.value = true;
  try {
    await exportMyData();
    toast.add({ severity: 'success', summary: t('profile.rgpd.export_success'), life: 4000 });
  } catch (e) {
    console.error(e);
    toast.add({ severity: 'error', summary: t('profile.rgpd.export_error'), life: 5000 });
  } finally {
    exporting.value = false;
  }
}

async function confirmDelete() {
  if (!deleteConfirmed.value) {
    return;
  }
  deleting.value = true;
  try {
    await deleteMyAccount();
    clearSession();
    await navigateTo('/auth/login');
  } catch (e) {
    console.error(e);
    toast.add({ severity: 'error', summary: t('profile.rgpd.delete_error'), life: 5000 });
    deleting.value = false;
  }
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 560px;
  margin: 0 auto;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
}

.card {
  width: 100%;
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

.rgpd-description {
  color: var(--p-text-muted-color);
  font-size: 0.9rem;
  line-height: 1.4;
}

.delete-dialog {
  display: grid;
  gap: 1rem;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 1.5rem 0;
}

.form :deep(.p-password) {
  width: 100%;
}

.form :deep(.p-password-fluid .p-password-input) {
  width: 100%;
}
</style>
