/**
 * Découpage de l'année scolaire en périodes, et moyenne par période.
 *
 * Trois périodes égales, soit l'équivalent de trimestres. Le découpage est
 * dérivé des bornes réelles de l'année (cf. `planningServiceClient`) et non de
 * mois codés en dur : le calendrier de démonstration glisse avec la date du jour
 * (#240), et un découpage figé tomberait à côté.
 */

export const PERIOD_COUNT = 3;

export interface PeriodBounds {
  index: number;
  start: Date;
  end: Date;
}

/** Découpe l'intervalle en `PERIOD_COUNT` tranches contiguës de durée égale. */
export function splitIntoPeriods(start: Date, end: Date): PeriodBounds[] {
  const span = end.getTime() - start.getTime();
  const slice = span / PERIOD_COUNT;
  return Array.from({ length: PERIOD_COUNT }, (_, index) => ({
    index,
    start: new Date(start.getTime() + index * slice),
    // La dernière période se termine exactement sur la borne haute, pour qu'une
    // note tombant le dernier jour ne se retrouve hors de toute période.
    end: index === PERIOD_COUNT - 1 ? end : new Date(start.getTime() + (index + 1) * slice),
  }));
}

/**
 * Index de la période contenant cette date, ou `null` si elle tombe hors de
 * l'année scolaire — un devoir peut être daté avant la première séance ou après
 * la dernière, notamment pendant la construction d'une année.
 */
export function periodIndexOf(date: Date, periods: PeriodBounds[]): number | null {
  const time = date.getTime();
  for (const period of periods) {
    const isLast = period.index === periods.length - 1;
    const withinStart = time >= period.start.getTime();
    const withinEnd = isLast ? time <= period.end.getTime() : time < period.end.getTime();
    if (withinStart && withinEnd) return period.index;
  }
  return null;
}

/**
 * Écart entre les deux dernières périodes qui portent une moyenne.
 *
 * On compare les deux dernières périodes RENSEIGNÉES, pas les deux dernières
 * périodes du calendrier : en début de deuxième trimestre, la troisième est
 * vide, et comparer à du vide n'aurait aucun sens. Renvoie `null` tant qu'il n'y
 * a pas deux périodes notées — l'interface masque alors la comparaison plutôt
 * que d'afficher un zéro trompeur.
 */
export function periodDelta(averages: (number | null)[]): number | null {
  const filled = averages
    .map((average, index) => ({ average, index }))
    .filter((entry): entry is { average: number; index: number } => entry.average !== null);
  if (filled.length < 2) return null;
  const last = filled[filled.length - 1]!;
  const previous = filled[filled.length - 2]!;
  return last.average - previous.average;
}
