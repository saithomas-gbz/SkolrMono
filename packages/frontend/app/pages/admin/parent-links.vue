<template>
  <div class="page">
    <Card>
      <template #title>{{ $t('admin.parent_links.title') }}</template>
      <template #content>
        <div class="create-form">
          <div class="field">
            <label for="link-parent">{{ $t('admin.parent_links.parent_id') }}</label>
            <Select
              id="link-parent"
              v-model="form.parentId"
              :options="parentOptions"
              option-label="label"
              option-value="value"
              filter
              :placeholder="$t('admin.parent_links.choose_parent')"
              class="w-full"
            />
          </div>
          <div class="field">
            <label for="link-student">{{ $t('admin.parent_links.student_id') }}</label>
            <Select
              id="link-student"
              v-model="form.studentId"
              :options="studentOptions"
              option-label="label"
              option-value="value"
              filter
              :placeholder="$t('admin.parent_links.choose_student')"
              class="w-full"
            />
          </div>
          <div class="field">
            <label for="link-type">{{ $t('admin.parent_links.link_type') }}</label>
            <Select
              id="link-type"
              v-model="form.linkType"
              :options="linkTypeOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
          <div class="field checkbox-field">
            <Checkbox v-model="form.isPrimary" input-id="link-primary" binary />
            <label for="link-primary">{{ $t('admin.parent_links.is_primary') }}</label>
          </div>
          <Button
            :label="$t('admin.parent_links.create')"
            icon="pi pi-plus"
            :loading="creating"
            :disabled="!isValid"
            @click="create"
          />
        </div>

        <Message v-if="formError" severity="error" :closable="false">{{ formError }}</Message>

        <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

        <div v-else-if="pending" class="loading">
          <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
          <span>{{ $t('admin.loading') }}</span>
        </div>

        <DataTable v-else :value="links" data-key="id" class="table">
          <Column :header="$t('admin.parent_links.parent_id')">
            <template #body="{ data }">{{ resolveUserName(data.parentId) }}</template>
          </Column>
          <Column :header="$t('admin.parent_links.student_id')">
            <template #body="{ data }">{{ resolveUserName(data.studentId) }}</template>
          </Column>
          <Column field="linkType" :header="$t('admin.parent_links.link_type')" />
          <Column field="isPrimary" :header="$t('admin.parent_links.is_primary')">
            <template #body="{ data }">
              <Tag v-if="data.isPrimary" :value="$t('common.yes')" severity="success" />
            </template>
          </Column>
          <Column :header="$t('common.actions')">
            <template #body="{ data }">
              <Button
                icon="pi pi-trash"
                size="small"
                severity="danger"
                text
                :aria-label="$t('common.delete')"
                @click="remove(data.id)"
              />
            </template>
          </Column>
        </DataTable>
        <p v-if="!pending && links.length === 0" class="empty">{{ $t('admin.parent_links.no_links') }}</p>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import type { ParentLink, ParentLinkType } from '~/composables/useParent';
import { userOptionLabel, type UserProfile } from '~/composables/useUser';

definePageMeta({ middleware: ['auth', 'admin'] });

const { t } = useI18n();
const { fetchParentLinks, createParentLink, deleteParentLink } = useParent();
const { fetchAllUsers } = useUser();

const links = ref<ParentLink[]>([]);
const users = ref<UserProfile[]>([]);
const pending = ref(true);
const fetchError = ref<string | null>(null);
const formError = ref<string | null>(null);
const creating = ref(false);

const form = reactive({ parentId: '', studentId: '', linkType: 'LEGAL_GUARDIAN' as ParentLinkType, isPrimary: false });

const parentOptions = computed(() =>
  users.value.filter((u) => u.role === 'PARENT').map((u) => ({ label: userOptionLabel(u), value: u.id })),
);
const studentOptions = computed(() =>
  users.value.filter((u) => u.role === 'USER').map((u) => ({ label: userOptionLabel(u), value: u.id })),
);

const linkTypeOptions = computed(() => [
  { label: t('admin.parent_links.types.LEGAL_GUARDIAN'), value: 'LEGAL_GUARDIAN' },
  { label: t('admin.parent_links.types.EMERGENCY_CONTACT'), value: 'EMERGENCY_CONTACT' },
  { label: t('admin.parent_links.types.OTHER'), value: 'OTHER' },
]);

const isValid = computed(() => form.parentId.trim().length > 0 && form.studentId.trim().length > 0);

const usersById = computed(() => new Map(users.value.map((u) => [u.id, u])));

function resolveUserName(id: string): string {
  return usersById.value.get(id)?.name || usersById.value.get(id)?.email || id;
}

async function load() {
  pending.value = true;
  fetchError.value = null;
  try {
    [links.value, users.value] = await Promise.all([fetchParentLinks(), fetchAllUsers()]);
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}

onMounted(load);

async function create() {
  formError.value = null;
  creating.value = true;
  try {
    await createParentLink({
      parentId: form.parentId.trim(),
      studentId: form.studentId.trim(),
      linkType: form.linkType,
      isPrimary: form.isPrimary,
    });
    form.parentId = '';
    form.studentId = '';
    form.linkType = 'LEGAL_GUARDIAN';
    form.isPrimary = false;
    await load();
  } catch (e) {
    formError.value = normalizeApiError(e);
  } finally {
    creating.value = false;
  }
}

async function remove(id: string) {
  try {
    await deleteParentLink(id);
    await load();
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  }
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.create-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--p-content-border-color);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 12rem;
}

.field label {
  font-size: 0.875rem;
  font-weight: 600;
}

.checkbox-field {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  min-width: unset;
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

.w-full {
  width: 100%;
}

.table {
  font-size: 0.9rem;
}
</style>
