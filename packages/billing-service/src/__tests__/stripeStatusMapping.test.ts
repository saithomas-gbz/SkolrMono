import { describe, it, expect } from 'bun:test';
import { mapStripeStatus, mapPriceIdToTier, type SubscriptionStatus } from '../lib/stripeStatusMapping';
import type { PlanDefinition } from '../lib/plans';

describe('mapStripeStatus', () => {
  const cases: [string, SubscriptionStatus][] = [
    ['trialing', 'TRIALING'],
    ['active', 'ACTIVE'],
    ['past_due', 'PAST_DUE'],
    ['canceled', 'CANCELED'],
    ['unpaid', 'UNPAID'],
    ['incomplete', 'INCOMPLETE'],
    ['incomplete_expired', 'INCOMPLETE'],
    ['paused', 'INCOMPLETE'],
  ];

  for (const [input, expected] of cases) {
    it(`mappe "${input}" vers ${expected}`, () => {
      expect(mapStripeStatus(input)).toBe(expected);
    });
  }
});

describe('mapPriceIdToTier', () => {
  const plans: PlanDefinition[] = [
    { tier: 'STARTER', priceId: 'price_starter', studentLimit: 200 },
    { tier: 'STANDARD', priceId: 'price_standard', studentLimit: 800 },
    { tier: 'PREMIUM', priceId: 'price_premium', studentLimit: null },
  ];

  it('retrouve le tier correspondant au priceId', () => {
    expect(mapPriceIdToTier('price_standard', plans)).toBe('STANDARD');
  });

  it('retombe sur STARTER si le priceId est inconnu', () => {
    expect(mapPriceIdToTier('price_unknown', plans)).toBe('STARTER');
  });

  it('retombe sur STARTER si priceId est undefined', () => {
    expect(mapPriceIdToTier(undefined, plans)).toBe('STARTER');
  });
});
