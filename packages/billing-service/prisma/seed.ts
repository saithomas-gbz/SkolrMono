import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import Stripe from 'stripe';
import { DEV_ESTABLISHMENT, DEV_USER_IDS } from '../../../scripts/seed/dev-users';
import { mapStripeStatus } from '../src/lib/stripeStatusMapping';

const DEV_ADMIN_EMAIL = 'dev.admin@skolr.local';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run the seed.');
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    let stripeCustomerId = 'cus_seed_demo';
    let stripeSubscriptionId: string | null = null;
    let status: ReturnType<typeof mapStripeStatus> = 'ACTIVE';

    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const customer = await stripe.customers.create({
          email: DEV_ADMIN_EMAIL,
          name: DEV_ESTABLISHMENT.name,
        });
        stripeCustomerId = customer.id;

        if (process.env.STRIPE_PRICE_STARTER) {
          const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: process.env.STRIPE_PRICE_STARTER }],
            payment_behavior: 'default_incomplete',
          });
          stripeSubscriptionId = subscription.id;
          status = mapStripeStatus(subscription.status);
          console.log(`  • Customer + abonnement Stripe (mode test) créés : ${stripeCustomerId} / ${stripeSubscriptionId} (${status})`);
        } else {
          console.log(`  • Customer Stripe (mode test) créé : ${stripeCustomerId} (STRIPE_PRICE_STARTER absent, pas d'abonnement réel)`);
        }
      } catch (err) {
        console.warn('  • Échec de la création Stripe (clé ou price invalide ?) — fallback local (Option B).', err);
        stripeCustomerId = 'cus_seed_demo';
        stripeSubscriptionId = null;
        status = 'ACTIVE';
      }
    } else {
      console.log('  • STRIPE_SECRET_KEY absent — fallback local (Option B : cus_seed_demo, statut ACTIVE).');
    }

    const establishment = await prisma.establishment.upsert({
      where: { id: DEV_ESTABLISHMENT.id },
      create: {
        id: DEV_ESTABLISHMENT.id,
        name: DEV_ESTABLISHMENT.name,
        slug: DEV_ESTABLISHMENT.slug,
        stripeCustomerId,
        billingEmail: DEV_ADMIN_EMAIL,
      },
      update: {
        name: DEV_ESTABLISHMENT.name,
        slug: DEV_ESTABLISHMENT.slug,
        billingEmail: DEV_ADMIN_EMAIL,
      },
    });

    await prisma.establishmentMember.upsert({
      where: {
        establishmentId_userId: { establishmentId: establishment.id, userId: DEV_USER_IDS.admin },
      },
      create: { establishmentId: establishment.id, userId: DEV_USER_IDS.admin, isBillingContact: true },
      update: { isBillingContact: true },
    });

    await prisma.subscription.upsert({
      where: { establishmentId: establishment.id },
      create: {
        establishmentId: establishment.id,
        planTier: 'STARTER',
        status,
        stripeSubscriptionId,
        stripePriceId: process.env.STRIPE_PRICE_STARTER ?? null,
      },
      update: {},
    });

    console.log(`Seed billing-service: établissement "${establishment.name}" (${establishment.id}) prêt.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
