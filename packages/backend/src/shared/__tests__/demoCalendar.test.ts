import { describe, it, expect } from 'bun:test';
import {
  buildDemoCalendar,
  ONE_DAY_MS,
  ONE_WEEK_MS,
  REFERENCE_BANK_HOLIDAYS,
  REFERENCE_SCHOOL_END,
  REFERENCE_SCHOOL_START,
  REFERENCE_VACATIONS,
  WEEKS_LEFT_AFTER_TODAY,
} from '../demoCalendar';

/**
 * Ces tests verrouillent les invariants du calendrier glissant (#240, #251).
 *
 * Ils balaient des dates d'EXÉCUTION, pas des dates de données : le bug d'origine
 * ne se voyait ni à la relecture ni au merge, seulement une fois qu'assez de
 * temps s'était écoulé. Un test à une seule date ne l'aurait pas attrapé.
 */

/** Créneaux hebdomadaires du seed : `WEEKLY_SLOTS` n'utilise que lundi→vendredi. */
const WEEKLY_SLOT_DAYS = [0, 1, 2, 3, 4];

/** Devoir en brouillon du seed — doit rester postérieur à la date du jour. */
const DRAFT_ASSIGNMENT_AT = '2026-06-20T08:00:00Z';

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

/** Deux ans de dates d'exécution, un jour sur un. */
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
      DRAFT_ASSIGNMENT_AT,
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
      expect(shiftDate(DRAFT_ASSIGNMENT_AT).getTime()).toBeGreaterThan(today.getTime());
    }
  });

  it('laisse une année d\'historique derrière la date du jour', () => {
    // L'ancrage vise la fin de l'année scolaire pour que statistiques et
    // bulletins aient de la matière. Sans historique, ces écrans sont vides.
    for (const today of executionDates()) {
      const { schoolStart } = buildDemoCalendar(today);
      const monthsOfHistory = (today.getTime() - schoolStart.getTime()) / (30 * ONE_DAY_MS);
      expect(monthsOfHistory).toBeGreaterThan(6);
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

    for (const [from] of REFERENCE_VACATIONS) {
      expect(cal.isSchoolDay(cal.shiftDate(`${from}T00:00:00Z`))).toBe(false);
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
