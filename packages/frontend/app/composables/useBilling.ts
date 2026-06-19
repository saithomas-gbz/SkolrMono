import { normalizeApiError } from '~/composables/useClass';

export type BillingPlanTier = 'STARTER' | 'STANDARD' | 'PREMIUM';
export type BillingSubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'UNPAID'
  | 'INCOMPLETE';

export type BillingSubscription = {
  id: string;
  planTier: BillingPlanTier;
  status: BillingSubscriptionStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
};

export type BillingEstablishment = {
  id: string;
  name: string;
  slug: string;
  billingEmail?: string | null;
  subscription: BillingSubscription | null;
};

export type BillingPlan = {
  tier: BillingPlanTier;
  priceId: string | null;
  studentLimit: number | null;
};

export function useBilling() {
  const api = useApi();

  async function fetchEstablishment() {
    const response = await api<{ data: BillingEstablishment }>('/billing/establishment');
    return response.data;
  }

  async function fetchPlans() {
    const response = await api<{ data: BillingPlan[] }>('/billing/plans');
    return response.data;
  }

  async function createCheckoutSession(priceId: string) {
    const response = await api<{ url: string }>('/billing/checkout-session', {
      method: 'POST',
      body: { priceId },
    });
    return response.url;
  }

  async function createPortalSession() {
    const response = await api<{ url: string }>('/billing/portal-session', { method: 'POST' });
    return response.url;
  }

  return {
    fetchEstablishment,
    fetchPlans,
    createCheckoutSession,
    createPortalSession,
    normalizeApiError,
  };
}
