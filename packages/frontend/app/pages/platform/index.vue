<template>
  <div class="page">
    <Card>
      <template #title>{{ $t('platform.title') }}</template>
      <template #content>
        <p class="hint">{{ $t('platform.hint') }}</p>

        <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

        <div v-else-if="pending" class="loading">
          <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
          <span>{{ $t('platform.loading') }}</span>
        </div>

        <p v-else-if="establishments.length === 0" class="empty">{{ $t('platform.empty') }}</p>

        <DataTable v-else :value="establishments" data-key="id" class="establishments">
          <Column field="name" :header="$t('platform.column_name')" />
          <Column :header="$t('platform.column_status')">
            <template #body="{ data }">
              <Tag :value="statusLabelOf(data)" :severity="statusSeverityOf(data)" />
            </template>
          </Column>
          <Column :header="$t('platform.column_plan')">
            <template #body="{ data }">
              {{ data.subscription ? data.subscription.planTier : '—' }}
            </template>
          </Column>
          <Column field="billingEmail" :header="$t('platform.column_contact')">
            <template #body="{ data }">{{ data.billingEmail ?? '—' }}</template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { useBilling, type BillingEstablishment } from '~/composables/useBilling';

definePageMeta({ middleware: ['auth', 'platform'] });

const { t } = useI18n();
const { fetchEstablishments, normalizeApiError } = useBilling();

usePageHeader().setPageHeader({ title: t('platform.title') });

const establishments = ref<BillingEstablishment[]>([]);
const pending = ref(true);
const fetchError = ref<string | null>(null);

/**
 * Libellés de statut réutilisés depuis le bloc `billing` : un abonnement a le
 * même sens ici que sur l'écran de facturation d'un établissement, seul le point
 * de vue change. Les dupliquer les ferait diverger.
 */
function statusLabelOf(establishment: BillingEstablishment): string {
  return establishment.subscription
    ? t(`billing.status.${establishment.subscription.status}`)
    : t('billing.no_subscription');
}

function statusSeverityOf(establishment: BillingEstablishment): string {
  const status = establishment.subscription?.status;
  if (status === 'ACTIVE' || status === 'TRIALING') return 'success';
  if (status === 'PAST_DUE') return 'warn';
  if (!status) return 'secondary';
  return 'danger';
}

onMounted(async () => {
  try {
    establishments.value = await fetchEstablishments();
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hint {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.empty {
  margin: 0;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}
</style>
