/**
 * Cantonne une session dont le mot de passe est provisoire.
 *
 * Global (`.global.ts`) et non nommé : une page qui oublierait de le déclarer
 * serait une brèche, et l'oubli ne se verrait pas.
 *
 * Un compte créé par un administrateur reçoit son mot de passe hors application
 * — à l'oral, par SMS. Tant qu'il n'a pas été remplacé, la navigation est
 * ramenée à l'écran de changement : l'utilisateur ne peut ni consulter ni
 * modifier quoi que ce soit avec un secret qu'un tiers connaît.
 *
 * Le drapeau est lu dans le JWT (voir `authUserFromToken`), donc disponible sans
 * appel réseau. Il retombe à faux dès que le mot de passe est changé, le
 * backend émettant alors un jeton sans le drapeau.
 *
 * Ce cantonnement est une mesure d'hygiène côté interface, pas une frontière de
 * sécurité : l'administrateur connaît déjà le mot de passe, et l'API reste
 * accessible à ce compte. Voir la description de la PR.
 */
const CHEMIN_CHANGEMENT = '/auth/change-password';

/**
 * Chemins laissés passer malgré le cantonnement.
 *
 * L'écran de changement lui-même, sous peine de boucle de redirection ; et le
 * lien d'invitation, qui purge la session en cours pour laisser un nouvel
 * arrivant créer son compte — un middleware global s'exécutant avant le setup
 * de la page, l'omettre le rendrait inatteignable.
 */
const CHEMINS_AUTORISES = [CHEMIN_CHANGEMENT, '/auth/accept-invitation'];

export default defineNuxtRouteMiddleware((to) => {
  const { isLoggedIn, mustChangePassword } = useAuth();

  if (!isLoggedIn.value || !mustChangePassword.value) {
    return;
  }

  if (CHEMINS_AUTORISES.includes(to.path)) {
    return;
  }

  return navigateTo(CHEMIN_CHANGEMENT);
});
