<template>
  <div class="page">
    <Card>
      <template #title>{{ $t('billing.title') }}</template>
      <template #content>
        <Message
          v-if="checkoutResult === 'success'"
          severity="success"
          :closable="true"
          @close="checkoutResult = null"
        >
          {{ $t('billing.checkout_success') }}
        </Message>
        <Message
          v-else-if="checkoutResult === 'canceled'"
          severity="warn"
          :closable="true"
          @close="checkoutResult = null"
        >
          {{ $t('billing.checkout_canceled') }}
        </Message>

        <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

        <div v-else-if="pending" class="loading">
          <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
          <span>{{ $t('admin.loading') }}</span>
        </div>

        <Message v-else-if="establishmentMissing" severity="warn" :closable="false">
          {{ $t('billing.establishment_not_found') }}
        </Message>

        <template v-else-if="establishment">
          <div class="status-row">
            <span class="status-label">{{ $t('billing.status_label') }}</span>
            <Tag :value="statusLabel" :severity="statusSeverity" />
          </div>

          <p v-if="establishment.subscription" class="plan-line">
            {{ $t('billing.current_plan', { plan: planLabel(establishment.subscription.planTier) }) }}
            <template v-if="establishment.subscription.currentPeriodEnd">
              — {{ $t('billing.renews_on', { date: formatDate(establishment.subscription.currentPeriodEnd) }) }}
            </template>
          </p>
          <p v-else class="plan-line muted">{{ $t('billing.no_subscription') }}</p>

          <Message v-if="showInactiveWarning" severity="warn" :closable="false">
            {{ $t('billing.inactive_warning') }}
          </Message>

          <div class="actions">
            <Button
              :label="$t('billing.manage_billing')"
              icon="pi pi-credit-card"
              severity="secondary"
              :disabled="!establishment.subscription"
              :loading="portalLoading"
              @click="openPortal"
            />
          </div>

          <h3 class="plans-title">{{ $t('billing.choose_plan') }}</h3>
          <div class="plans-grid">
            <Card v-for="plan in plans" :key="plan.tier" class="plan-card">
              <template #title>{{ planLabel(plan.tier) }}</template>
              <template #content>
                <p class="plan-limit">{{ $t(`billing.plan_limit.${plan.tier}`) }}</p>
                <Button
                  :label="
                    isCurrentPlan(plan.tier)
                      ? $t('billing.current_plan_label')
                      : plan.priceId
                        ? $t('billing.select_plan')
                        : $t('billing.plan_unavailable')
                  "
                  size="small"
                  :disabled="isCurrentPlan(plan.tier) || !plan.priceId"
                  :loading="checkoutLoadingTier === plan.tier"
                  @click="startCheckout(plan)"
                />
              </template>
            </Card>
          </div>
        </template>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import type { BillingEstablishment, BillingPlan, BillingPlanTier } from '~/composables/useBilling';

definePageMeta({ middleware: ['auth', 'admin'] });

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { fetchEstablishment, fetchPlans, createCheckoutSession, createPortalSession, normalizeApiError } =
  useBilling();

const pending = ref(true);
const fetchError = ref<string | null>(null);
const establishmentMissing = ref(false);
const establishment = ref<BillingEstablishment | null>(null);
const plans = ref<BillingPlan[]>([]);
const portalLoading = ref(false);
const checkoutLoadingTier = ref<BillingPlanTier | null>(null);

const checkoutResult = ref<'success' | 'canceled' | null>(
  route.query.success ? 'success' : route.query.canceled ? 'canceled' : null,
);

if (checkoutResult.value) {
  const rest = { ...route.query };
  delete rest.success;
  delete rest.canceled;
  void router.replace({ query: rest });
}

async function refresh() {
  pending.value = true;
  fetchError.value = null;
  establishmentMissing.value = false;
  try {
    [establishment.value, plans.value] = await Promise.all([fetchEstablishment(), fetchPlans()]);
  } catch (e) {
    const message = normalizeApiError(e);
    if (message === 'Establishment not found') {
      establishmentMissing.value = true;
    } else {
      fetchError.value = message;
    }
    establishment.value = null;
  } finally {
    pending.value = false;
  }
}

await refresh();

const statusLabel = computed(() =>
  establishment.value?.subscription
    ? t(`billing.status.${establishment.value.subscription.status}`)
    : '',
);

const statusSeverity = computed(() => {
  const status = establishment.value?.subscription?.status;
  if (status === 'ACTIVE' || status === 'TRIALING') return 'success';
  if (status === 'PAST_DUE') return 'warn';
  return 'danger';
});

const showInactiveWarning = computed(() => {
  const status = establishment.value?.subscription?.status;
  return Boolean(status) && status !== 'ACTIVE' && status !== 'TRIALING';
});

function planLabel(tier: BillingPlanTier) {
  return t(`billing.plan_label.${tier}`);
}

function isCurrentPlan(tier: BillingPlanTier) {
  return establishment.value?.subscription?.planTier === tier;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function openPortal() {
  portalLoading.value = true;
  try {
    const url = await createPortalSession();
    window.location.href = url;
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    portalLoading.value = false;
  }
}

async function startCheckout(plan: BillingPlan) {
  if (!plan.priceId) return;
  checkoutLoadingTier.value = plan.tier;
  try {
    const url = await createCheckoutSession(plan.priceId);
    window.location.href = url;
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    checkoutLoadingTier.value = null;
  }
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 6rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.status-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.status-label {
  font-weight: 600;
}

.plan-line {
  margin: 0 0 1rem;
}

.muted {
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.actions {
  display: flex;
  margin-bottom: 1.5rem;
}

.plans-title {
  font-size: 1rem;
  margin: 0 0 0.75rem;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.plan-card :deep(.p-card-body) {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.plan-limit {
  margin: 0;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
  font-size: 0.9rem;
}
</style>
