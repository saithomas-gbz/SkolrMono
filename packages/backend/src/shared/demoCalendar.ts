/**
 * Calendrier de démonstration du seed — décalage glissant.
 *
 * Le seed décrivait une année scolaire figée (2025-09-01 → 2026-06-30) pendant
 * que l'application, elle, tourne à la date du jour. L'écart grandissait d'une
 * semaine par semaine : au bout de quelques mois l'emploi du temps de la semaine
 * courante était vide, les bulletins ne montraient plus rien de récent, et la
 * spec e2e `planning-walkthrough` a fini par échouer faute de trouver une séance
 * (#240).
 *
 * Les dates de référence restent écrites en clair — elles se lisent comme un
 * vrai calendrier — mais sont décalées en bloc. Le décalage est un nombre entier
 * de SEMAINES : les jours de la semaine sont donc préservés, ce dont dépendent
 * `WEEKLY_SLOTS` (index de jour depuis lundi) et les bornes lundi→vendredi des
 * semaines de démonstration.
 *
 * L'ancrage vise la FIN de l'année scolaire plutôt que son début : « aujourd'hui »
 * tombe toujours quelques semaines avant les vacances d'été, ce qui donne à la
 * démonstration une année d'historique derrière elle (notes, absences, moyennes)
 * et des devoirs récents de part et d'autre de la date du jour — dont le DRAFT,
 * qui doit rester à venir. Ancrer sur la rentrée aurait donné un emploi du temps
 * peuplé mais des écrans de statistiques et de bulletins vides.
 *
 * Contrepartie assumée : le décalage étant un nombre quelconque de semaines, les
 * MOIS ne correspondent plus au calendrier scolaire français. Selon la date
 * d'exécution, l'année seedée peut courir de décembre à septembre, avec des
 * séances en août. Rien de tout cela n'est affiché : l'application ne montre
 * jamais « l'année scolaire » ni les libellés de vacances, seulement des dates de
 * séances et de devoirs — qui, elles, tombent naturellement autour d'aujourd'hui.
 * Aligner les mois aurait imposé un décalage d'années entières, donc une
 * démonstration sans historique dès qu'elle tourne en septembre.
 *
 * Ce module est paramétré par une date plutôt que de lire l'horloge : c'est ce
 * qui permet aux tests de balayer des dates d'exécution arbitraires et de
 * verrouiller les invariants ci-dessus, qui ne se voient ni à la relecture ni au
 * merge — seulement à une certaine date, parfois des semaines plus tard (#251).
 */

/** Fin de l'année scolaire dans le calendrier de référence, avant décalage. */
export const REFERENCE_SCHOOL_END = '2026-06-30T00:00:00Z';

/** Début de l'année scolaire dans le calendrier de référence, avant décalage. */
export const REFERENCE_SCHOOL_START = '2025-09-01T00:00:00Z';

/** Nombre de semaines scolaires restantes après « aujourd'hui » dans le seed. */
export const WEEKS_LEFT_AFTER_TODAY = 3;

/**
 * Date de référence du devoir en brouillon. Elle vit ici, et non dans `seed.ts`,
 * pour que le seed et le test qui vérifie « le DRAFT reste à venir » lisent la
 * MÊME valeur. Avec une copie privée côté test, déplacer la date dans le seed
 * faisait passer le devoir dans le passé sans qu'aucun test ne tombe.
 */
export const REFERENCE_DRAFT_ASSIGNMENT_AT = '2026-06-20T08:00:00Z';

/**
 * Jours de la semaine (0 = lundi) sur lesquels le seed pose des créneaux.
 * Partagé pour la même raison : le test qui compte les séances de la semaine
 * courante doit raisonner sur les jours réellement utilisés par `WEEKLY_SLOTS`.
 */
export const WEEKLY_SLOT_DAYS: readonly number[] = [0, 1, 2, 3, 4];

/**
 * Semaines de démonstration où `seedPlanning` va chercher les séances qui
 * porteront les absences et les justificatifs. Chaque écriture y est derrière un
 * garde de vérité : si l'une de ces semaines tombait en vacances, le seed
 * créerait zéro absence et zéro justificatif, sans erreur ni log.
 */
export const REFERENCE_DEMO_WEEKS = {
  absences: ['2025-10-13', '2025-10-17'],
  justifications: ['2025-09-08', '2025-09-12'],
} as const;

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const ONE_WEEK_MS = 7 * ONE_DAY_MS;

/** Vacances de référence, bornes incluses, avant décalage. */
export const REFERENCE_VACATIONS: ReadonlyArray<readonly [string, string]> = [
  ['2025-10-18', '2025-11-02'],
  ['2025-12-20', '2026-01-04'],
  ['2026-02-14', '2026-03-01'],
  ['2026-04-11', '2026-04-26'],
];

/** Jours fériés de référence, avant décalage. */
export const REFERENCE_BANK_HOLIDAYS: readonly string[] = [
  '2025-11-11',
  '2026-05-01',
  '2026-05-08',
  '2026-05-14',
  '2026-05-25',
];

interface DemoCalendar {
  /** Décalage appliqué, en semaines entières (peut être négatif). */
  shiftWeeks: number;
  schoolStart: Date;
  schoolEnd: Date;
  /** Applique le décalage à une date ISO du calendrier de référence. */
  shiftDate: (iso: string) => Date;
  /** Idem, en `YYYY-MM-DD`, pour les comparaisons de jours. */
  shiftDay: (iso: string) => string;
  /**
   * Faux les jours fériés et de vacances, après décalage. Ne teste PAS le
   * week-end : `WEEKLY_SLOTS` n'indexe que lundi→vendredi, la question ne se
   * pose donc jamais. Comportement repris tel quel du seed, volontairement.
   */
  isSchoolDay: (date: Date) => boolean;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Construit le calendrier décalé pour une date d'exécution donnée.
 *
 * `now` est un paramètre et non `Date.now()` afin que le calcul soit
 * reproductible : le seed passe l'heure courante une seule fois au démarrage,
 * ce qui garde toutes ses dates cohérentes même s'il tourne à cheval sur minuit.
 */
export function buildDemoCalendar(now: Date = new Date()): DemoCalendar {
  const referenceEnd = new Date(REFERENCE_SCHOOL_END).getTime();
  const shiftWeeks = Math.round(
    (now.getTime() + WEEKS_LEFT_AFTER_TODAY * ONE_WEEK_MS - referenceEnd) / ONE_WEEK_MS,
  );
  const shiftMs = shiftWeeks * ONE_WEEK_MS;

  const shiftDate = (iso: string): Date => new Date(new Date(iso).getTime() + shiftMs);
  const shiftDay = (iso: string): string => toDateStr(shiftDate(iso));

  const vacations = REFERENCE_VACATIONS.map(
    ([from, to]) => [shiftDay(from), shiftDay(to)] as [string, string],
  );
  const bankHolidays = new Set(REFERENCE_BANK_HOLIDAYS.map(shiftDay));

  const isSchoolDay = (date: Date): boolean => {
    const str = toDateStr(date);
    if (bankHolidays.has(str)) return false;
    for (const [from, to] of vacations) {
      if (str >= from && str <= to) return false;
    }
    return true;
  };

  return {
    shiftWeeks,
    schoolStart: shiftDate(REFERENCE_SCHOOL_START),
    schoolEnd: shiftDate(REFERENCE_SCHOOL_END),
    shiftDate,
    shiftDay,
    isSchoolDay,
  };
}
