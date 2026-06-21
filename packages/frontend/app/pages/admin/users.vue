<template>
  <div class="page">
    <Card>
      <template #title>
        <div class="card-header">
          <span>{{ $t('admin.users_title') }}</span>
          <div class="card-header-actions">
            <Button icon="pi pi-refresh" severity="secondary" outlined size="small" :loading="pending" @click="load" />
            <Button :label="$t('admin.invite_user')" icon="pi pi-user-plus" size="small" @click="dialogVisible = true" />
          </div>
        </div>
      </template>
      <template #content>
        <Message v-if="successMessage" severity="success" :closable="true" @close="successMessage = null">
          {{ successMessage }}
        </Message>

        <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

        <div v-else-if="pending" class="loading">
          <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
          <span>{{ $t('admin.loading') }}</span>
        </div>

        <template v-else>
          <DataTable
            :value="users"
            data-key="id"
            class="table"
            sort-field="name"
            :sort-order="1"
            removable-sort
          >
            <Column field="name" :header="$t('common.name')" sortable>
              <template #body="{ data }">{{ data.name || '—' }}</template>
            </Column>
            <Column field="email" :header="$t('common.email')" sortable />
            <Column field="role" :header="$t('admin.users_table.role')" sortable>
              <template #body="{ data }">
                <Tag :value="roleLabel(data.role)" :severity="roleSeverity(data.role)" />
              </template>
            </Column>
            <Column field="createdAt" :header="$t('admin.joined_on')" sortable>
              <template #body="{ data }">{{ formatDate(data.createdAt) }}</template>
            </Column>
          </DataTable>
          <p v-if="users.length === 0" class="empty">{{ $t('admin.users_table.empty') }}</p>
        </template>
      </template>
    </Card>

    <AdminInviteUserDialog v-model:visible="dialogVisible" @invited="onInvited" />
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import type { UserProfile } from '~/composables/useUser';

definePageMeta({ middleware: ['auth', 'admin'] });

const { t } = useI18n();
const { fetchAllUsers } = useUser();

const users = ref<UserProfile[]>([]);
const pending = ref(true);
const fetchError = ref<string | null>(null);
const dialogVisible = ref(false);
const successMessage = ref<string | null>(null);

async function load() {
  pending.value = true;
  fetchError.value = null;
  try {
    users.value = await fetchAllUsers();
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}

onMounted(load);

function onInvited(email: string) {
  successMessage.value = t('admin.invite_sent', { email });
  void load();
}

function roleLabel(role: UserProfile['role']): string {
  return t(`admin.invite_dialog.role_${role.toLowerCase()}`);
}

function roleSeverity(role: UserProfile['role']): 'success' | 'info' | 'warn' | 'secondary' {
  return { ADMIN: 'warn', TEACHER: 'info', STAFF: 'info', PARENT: 'success', USER: 'secondary' }[role] as
    | 'success'
    | 'info'
    | 'warn'
    | 'secondary';
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR');
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.card-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 6rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.empty {
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.table {
  font-size: 0.9rem;
}
</style>
