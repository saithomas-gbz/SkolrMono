import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[billing-service] STRIPE_SECRET_KEY is not set — Stripe API calls will fail.');
}

// Placeholder non-vide : permet au service de démarrer sans clé (dev sans Stripe configuré),
// les appels Stripe réels échoueront alors avec une erreur d'authentification explicite.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_missing_key');

export default stripe;
