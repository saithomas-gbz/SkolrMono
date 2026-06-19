export type PlanTier = 'STARTER' | 'STANDARD' | 'PREMIUM';

export interface PlanDefinition {
  tier: PlanTier;
  priceId: string | null;
  studentLimit: number | null;
}

/** Limites indicatives par plan (issue #83) ; les prix viennent du dashboard Stripe (mode test). */
export function getPlans(): PlanDefinition[] {
  return [
    { tier: 'STARTER', priceId: process.env.STRIPE_PRICE_STARTER || null, studentLimit: 200 },
    { tier: 'STANDARD', priceId: process.env.STRIPE_PRICE_STANDARD || null, studentLimit: 800 },
    { tier: 'PREMIUM', priceId: process.env.STRIPE_PRICE_PREMIUM || null, studentLimit: null },
  ];
}
