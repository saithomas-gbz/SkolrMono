/**
 * URL de redirection Stripe.
 *
 * Deux défauts historiques sont corrigés ici (#267).
 *
 * Le portail de facturation réutilisait `STRIPE_SUCCESS_URL` comme URL de
 * retour. Cette URL porte `?success=1` — c'est sa raison d'être côté checkout —
 * si bien qu'un administrateur revenant du portail, y compris APRÈS AVOIR
 * ANNULÉ son abonnement, voyait s'afficher « Paiement confirmé ». Le retour de
 * portail n'est ni un succès ni une annulation : il ne doit rien annoncer.
 *
 * Et les deux URL du checkout retombaient silencieusement sur `localhost` : une
 * variable oubliée en production envoyait un client fraîchement débité sur une
 * impasse. Dans un flux de paiement, refuser de démarrer se remarque tout de
 * suite ; une redirection dans le vide ne se remarque qu'au premier paiement
 * réel. On échoue donc au démarrage — mais seulement si Stripe est réellement
 * actif, pour que le service continue de tourner sans Stripe configuré.
 */

/** Retire la query d'une URL, en tolérant une valeur non parsable. */
function stripQuery(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    return parsed.toString();
  } catch {
    return url.split('?')[0] ?? url;
  }
}

export function successUrl(): string {
  return process.env.STRIPE_SUCCESS_URL ?? '';
}

export function cancelUrl(): string {
  return process.env.STRIPE_CANCEL_URL ?? '';
}

/**
 * Retour du portail. Par défaut l'URL de succès débarrassée de sa query, pour
 * atterrir sur la page de facturation sans rien annoncer.
 */
export function portalReturnUrl(): string {
  return process.env.STRIPE_PORTAL_RETURN_URL ?? stripQuery(successUrl());
}

/**
 * Vérifie que la facturation est configurable, à appeler au démarrage.
 *
 * Sans `STRIPE_SECRET_KEY`, Stripe n'est pas actif : le service doit démarrer
 * quand même, `stripeClient` prévoyant déjà un placeholder pour ce cas.
 */
export function assertBillingRedirectsConfigured(env = process.env): void {
  if (!env.STRIPE_SECRET_KEY) return;

  const manquantes = (['STRIPE_SUCCESS_URL', 'STRIPE_CANCEL_URL'] as const).filter(
    (name) => !env[name],
  );
  if (manquantes.length > 0) {
    const plusieurs = manquantes.length > 1;
    throw new Error(
      `[billing] Stripe est actif mais ${manquantes.join(' et ')} ` +
        `${plusieurs ? 'ne sont pas définies' : "n'est pas définie"}. ` +
        'Sans ' +
        `${plusieurs ? 'elles' : 'elle'}, un client qui vient de payer serait redirigé dans le vide. ` +
        `${plusieurs ? 'Renseignez-les' : 'Renseignez-la'}, ` +
        'ou retirez STRIPE_SECRET_KEY pour désactiver la facturation.',
    );
  }
}
