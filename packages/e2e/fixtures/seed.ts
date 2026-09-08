/**
 * Constantes du jeu de démonstration, telles que posées par
 * `scripts/seed/dev-users.ts` (source de vérité) et consommées par
 * `packages/backend/prisma/seed.ts`.
 *
 * Ces identifiants y sont déclarés sans `export` et ne sont donc pas
 * importables depuis les specs : ils sont recopiés ici plutôt que dispersés
 * dans chaque fichier de test. Si le seed change, c'est le seul endroit à
 * suivre côté E2E.
 */
export const SEED = {
  classes: {
    cm2a: '22222222-2222-2222-2222-222222222201',
    sciences6: '22222222-2222-2222-2222-222222222202',
  },
  courses: {
    maths: '33333333-3333-3333-3333-333333333302',
    sciences: '33333333-3333-3333-3333-333333333303',
    francais: '33333333-3333-3333-3333-333333333304',
    histoire: '33333333-3333-3333-3333-333333333305',
  },
  users: {
    admin: '11111111-1111-1111-1111-111111111101',
    user: '11111111-1111-1111-1111-111111111102',
    teacher: '11111111-1111-1111-1111-111111111103',
    student: '11111111-1111-1111-1111-111111111104',
  },
} as const;

/**
 * Prochain dimanche, à l'heure UTC demandée.
 *
 * L'emploi du temps seedé ne couvre que les jours de classe : poser un créneau
 * de test un dimanche garantit une plage libre, et rend le scénario
 * indépendant de l'heure à laquelle la CI l'exécute — le piège corrigé en #260,
 * où un créneau calé sur « maintenant » entrait en conflit avec une séance
 * seedée selon l'heure de la journée.
 */
export function dimanche(heure: number, minute = 0): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7 || 7));
  d.setUTCHours(heure, minute, 0, 0);
  return d;
}
