import { describe, it, expect } from 'bun:test';
import {
  buildDemoCalendar,
  ONE_DAY_MS,
  ONE_WEEK_MS,
  REFERENCE_BANK_HOLIDAYS,
  REFERENCE_DEMO_WEEKS,
  REFERENCE_DRAFT_ASSIGNMENT_AT,
  REFERENCE_SCHOOL_END,
  REFERENCE_SCHOOL_START,
  REFERENCE_VACATIONS,
  WEEKLY_SLOT_DAYS,
  WEEKS_LEFT_AFTER_TODAY,
} from '../demoCalendar';

/**
 * Ces tests verrouillent les invariants du calendrier glissant (#240, #251).
 *
 * Ils balaient des dates d'EXÉCUTION, pas des dates de données : le bug d'origine
 * ne se voyait ni à la relecture ni au merge, seulement une fois qu'assez de
 * temps s'était écoulé. Un test à une seule date ne l'aurait pas attrapé.
 */

/** Date d'exécution arbitraire mais fixe, pour les assertions ponctuelles. */
const FIXED_TODAY = new Date('2026-09-08T12:00:00Z');

/** Lundi de la semaine contenant `date`, à minuit UTC. */
function mondayOf(date: Date): Date {
  const monday = new Date(date);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday;
}

/** Nombre de séances que le seed produirait dans la semaine de `today`. */
function sessionsInWeekOf(today: Date): number {
  const cal = buildDemoCalendar(today);
  const monday = mondayOf(today);
  let count = 0;
  for (const offset of WEEKLY_SLOT_DAYS) {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + offset);
    if (day >= cal.schoolStart && day <= cal.schoolEnd && cal.isSchoolDay(day)) count++;
  }
  return count;
}

/**
 * Dates d'exécution, un jour sur un.
 *
 * Attention à ne pas surestimer ce que ce balayage couvre : `shiftWeeks` suit
 * `now`, si bien que la seule variable libre est `(now − fin de référence) mod
 * 1 semaine`. Les itérations retombent donc sur 7 états distincts seulement,
 * répétés — ce qui suffit à couvrir tous les résidus de l'arrondi, mais ne
 * couvre PAS les autres semaines de l'année scolaire. Le test
 * « couverture réelle » plus bas verrouille ce constat pour qu'il ne se reperde
 * pas à la relecture.
 */
function* executionDates(days = 730): Generator<Date> {
  const cursor = new Date('2026-01-01T12:00:00Z');
  for (let i = 0; i < days; i++) {
    yield new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

describe('buildDemoCalendar — alignement', () => {
  it('décale d\'un nombre entier de semaines', () => {
    for (const today of executionDates(120)) {
      const { shiftWeeks } = buildDemoCalendar(today);
      expect(Number.isInteger(shiftWeeks)).toBe(true);
    }
  });

  it('préserve le jour de la semaine de chaque date de référence', () => {
    // Invariant critique : `WEEKLY_SLOTS` indexe les créneaux par jour depuis
    // lundi. Un décalage qui ne serait pas un multiple de 7 jours ferait glisser
    // tous les cours d'un jour.
    const references = [
      REFERENCE_SCHOOL_START,
      REFERENCE_SCHOOL_END,
      REFERENCE_DRAFT_ASSIGNMENT_AT,
      ...REFERENCE_VACATIONS.flat(),
      ...REFERENCE_BANK_HOLIDAYS,
    ];
    for (const today of executionDates(120)) {
      const cal = buildDemoCalendar(today);
      for (const iso of references) {
        const before = new Date(iso).getUTCDay();
        const after = cal.shiftDate(iso).getUTCDay();
        expect(after).toBe(before);
      }
    }
  });

  it('conserve les écarts entre dates de référence', () => {
    const cal = buildDemoCalendar(FIXED_TODAY);
    const a = cal.shiftDate(REFERENCE_SCHOOL_START);
    const b = cal.shiftDate(REFERENCE_SCHOOL_END);
    const referenceGap =
      new Date(REFERENCE_SCHOOL_END).getTime() - new Date(REFERENCE_SCHOOL_START).getTime();
    expect(b.getTime() - a.getTime()).toBe(referenceGap);
  });
});

describe('buildDemoCalendar — invariants de démonstration', () => {
  it('place toujours la date du jour dans l\'année scolaire seedée', () => {
    for (const today of executionDates()) {
      const { schoolStart, schoolEnd } = buildDemoCalendar(today);
      expect(today >= schoolStart && today <= schoolEnd).toBe(true);
    }
  });

  it('laisse toujours des séances dans la semaine courante', () => {
    // C'est exactement la propriété dont l'absence avait rendu le job e2e rouge :
    // `planning-walkthrough` ne trouvait plus aucune `.fc-event`.
    for (const today of executionDates()) {
      expect(sessionsInWeekOf(today)).toBeGreaterThan(0);
    }
  });

  it('garde le devoir DRAFT dans le futur', () => {
    // Le seed dépose un devoir en brouillon daté 2026-06-20 : il alimente les
    // écrans « à venir » et doit rester postérieur à la date du jour.
    for (const today of executionDates()) {
      const { shiftDate } = buildDemoCalendar(today);
      expect(shiftDate(REFERENCE_DRAFT_ASSIGNMENT_AT).getTime()).toBeGreaterThan(today.getTime());
    }
  });

  it('laisse une année d\'historique derrière la date du jour', () => {
    // L'ancrage vise la fin de l'année scolaire pour que statistiques et
    // bulletins aient de la matière. Sans historique, ces écrans sont vides.
    for (const today of executionDates()) {
      const { schoolStart } = buildDemoCalendar(today);
      // L'ancrage garantit ~9,3 mois. Un seuil à 6 aurait laissé passer un
      // changement divisant l'historique par deux, ce qui vide statistiques et
      // bulletins — précisément ce que le nom de ce test prétend protéger.
      const monthsOfHistory = (today.getTime() - schoolStart.getTime()) / (30 * ONE_DAY_MS);
      expect(monthsOfHistory).toBeGreaterThan(9);
    }
  });

  it('laisse WEEKS_LEFT_AFTER_TODAY semaines après la date du jour, à une semaine près', () => {
    for (const today of executionDates(120)) {
      const { schoolEnd } = buildDemoCalendar(today);
      const weeksLeft = (schoolEnd.getTime() - today.getTime()) / ONE_WEEK_MS;
      expect(Math.abs(weeksLeft - WEEKS_LEFT_AFTER_TODAY)).toBeLessThanOrEqual(0.5);
    }
  });
});

describe('buildDemoCalendar — isSchoolDay', () => {
  it('exclut les vacances et jours fériés décalés', () => {
    const cal = buildDemoCalendar(FIXED_TODAY);

    for (const [from, to] of REFERENCE_VACATIONS) {
      // Les deux bornes ET un jour au milieu : `isSchoolDay` compare avec `>=`
      // et `<=`, une régression vers `<` laisserait le dernier jour de chaque
      // vacance ouvert et sèmerait des séances fantômes.
      expect(cal.isSchoolDay(cal.shiftDate(`${from}T00:00:00Z`))).toBe(false);
      expect(cal.isSchoolDay(cal.shiftDate(`${to}T00:00:00Z`))).toBe(false);

      const middle = new Date(
        (new Date(`${from}T00:00:00Z`).getTime() + new Date(`${to}T00:00:00Z`).getTime()) / 2,
      );
      expect(cal.isSchoolDay(cal.shiftDate(middle.toISOString()))).toBe(false);
    }
    for (const holiday of REFERENCE_BANK_HOLIDAYS) {
      expect(cal.isSchoolDay(cal.shiftDate(`${holiday}T00:00:00Z`))).toBe(false);
    }
  });

  it('accepte un jour de cours ordinaire', () => {
    const cal = buildDemoCalendar(FIXED_TODAY);
    // 2025-09-08 est un lundi de rentrée, hors vacances et hors férié.
    expect(cal.isSchoolDay(cal.shiftDate('2025-09-08T00:00:00Z'))).toBe(true);
  });

  it('ne teste pas le week-end, comme le seed d\'origine', () => {
    // `WEEKLY_SLOTS` n'indexe que lundi→vendredi : la question ne se pose jamais.
    // Documenté par un test pour que la reprise du comportement soit délibérée
    // et non un oubli.
    const cal = buildDemoCalendar(FIXED_TODAY);
    const saturday = cal.shiftDate('2025-09-06T00:00:00Z');
    expect(saturday.getUTCDay()).toBe(6);
    expect(cal.isSchoolDay(saturday)).toBe(true);
  });
});

describe('buildDemoCalendar — couverture réelle du balayage', () => {
  it('ne parcourt que 7 positions distinctes dans le repère de référence', () => {
    // Verrouille un constat contre-intuitif relevé en review : `shiftWeeks` suit
    // `now`, donc « aujourd'hui » retombe toujours au même endroit de l'année de
    // référence, à un résidu de semaine près. Les 730 itérations des tests
    // ci-dessus ne valent pas 730 cas : elles valent 7 cas répétés 104 fois.
    //
    // Ce test existe pour que personne ne relise le balayage en croyant qu'il
    // couvre toute l'année scolaire. Il couvre tous les arrondis, rien de plus.
    const positions = new Set<string>();
    for (const today of executionDates()) {
      const { shiftWeeks } = buildDemoCalendar(today);
      positions.add(new Date(today.getTime() - shiftWeeks * ONE_WEEK_MS).toISOString().slice(0, 10));
    }
    expect(positions.size).toBe(7);
  });
});

describe('semaines de démonstration', () => {
  // `seedPlanning` va chercher les séances de ces deux semaines pour y accrocher
  // absences et justificatifs, derrière des gardes de vérité. Si l'une tombait en
  // vacances, le seed créerait zéro absence et zéro justificatif — sans erreur,
  // sans log, et les parcours e2e correspondants casseraient avec une suite
  // unitaire verte. C'est le trou que ces deux tests ferment.
  const weeks = [
    ['absences', REFERENCE_DEMO_WEEKS.absences] as const,
    ['justificatifs', REFERENCE_DEMO_WEEKS.justifications] as const,
  ];

  for (const [label, [from, to]] of weeks) {
    it(`la semaine ${label} reste ouverte du lundi au vendredi`, () => {
      const cal = buildDemoCalendar(FIXED_TODAY);

      const monday = cal.shiftDate(`${from}T00:00:00Z`);
      expect(monday.getUTCDay()).toBe(1);
      expect(cal.shiftDate(`${to}T00:00:00Z`).getUTCDay()).toBe(5);

      for (const offset of WEEKLY_SLOT_DAYS) {
        const day = new Date(monday);
        day.setUTCDate(monday.getUTCDate() + offset);
        expect(cal.isSchoolDay(day)).toBe(true);
      }
    });

    it(`la semaine ${label} tombe dans l'année scolaire`, () => {
      const cal = buildDemoCalendar(FIXED_TODAY);
      const monday = cal.shiftDate(`${from}T00:00:00Z`);
      expect(monday >= cal.schoolStart && monday <= cal.schoolEnd).toBe(true);
    });
  }
});
