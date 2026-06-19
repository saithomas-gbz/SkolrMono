<template>
  <div class="billing-widget">
    <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

    <div v-else-if="pending" class="widget-loading">
      <ProgressSpinner style="width: 1.5rem; height: 1.5rem" stroke-width="4" />
      <span>{{ $t('common.loading') }}</span>
    </div>

    <div v-else-if="!subscription" class="widget-empty">
      <p>{{ $t('billing.widget_no_subscription') }}</p>
    </div>

    <div v-else class="status-row">
      <Tag :value="statusLabel" :severity="statusSeverity" />
      <span class="plan-name">{{ planLabel }}</span>
    </div>

    <div class="widget-footer">
      <NuxtLink to="/admin/billing" class="widget-link">{{ $t('billing.widget_see_billing') }}</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import type { BillingSubscription } from '~/composables/useBilling';

const { t } = useI18n();
const { fetchEstablishment } = useBilling();

const pending = ref(true);
const fetchError = ref<string | null>(null);
const subscription = ref<BillingSubscription | null>(null);

onMounted(async () => {
  try {
    const establishment = await fetchEstablishment();
    subscription.value = establishment.subscription;
  } catch (e) {
    const message = normalizeApiError(e);
    if (message !== 'Establishment not found') {
      fetchError.value = message;
    }
  } finally {
    pending.value = false;
  }
});

const statusLabel = computed(() => (subscription.value ? t(`billing.status.${subscription.value.status}`) : ''));
const planLabel = computed(() => (subscription.value ? t(`billing.plan_label.${subscription.value.planTier}`) : ''));

const statusSeverity = computed(() => {
  const status = subscription.value?.status;
  if (status === 'ACTIVE' || status === 'TRIALING') return 'success';
  if (status === 'PAST_DUE') return 'warn';
  return 'danger';
});
</script>

<style scoped>
.billing-widget {
  display: grid;
  gap: 0.75rem;
}

.widget-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 4rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.widget-empty {
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
  padding: 0.5rem 0;
}

.widget-empty p {
  margin: 0;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.plan-name {
  font-weight: 600;
}

.widget-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.25rem;
}

.widget-link {
  font-size: 0.9rem;
  color: var(--p-primary-color, var(--skolr-color-brand-green));
  text-decoration: none;
}

.widget-link:hover {
  text-decoration: underline;
}
</style>
