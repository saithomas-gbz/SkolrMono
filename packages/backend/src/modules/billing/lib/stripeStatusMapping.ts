import type { getPlans } from './plans';

type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE';
type PlanTier = ReturnType<typeof getPlans>[number]['tier'];

/** Mappe les statuts Stripe (string) vers notre enum local ; tout statut inconnu reste INCOMPLETE. */
export function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'TRIALING';
    case 'active':
      return 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
      return 'CANCELED';
    case 'unpaid':
      return 'UNPAID';
    default:
      return 'INCOMPLETE';
  }
}

export function mapPriceIdToTier(priceId: string | undefined, plans: ReturnType<typeof getPlans>): PlanTier {
  return plans.find((plan) => plan.priceId === priceId)?.tier ?? 'STARTER';
}
