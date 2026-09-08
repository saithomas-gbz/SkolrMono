import { describe, it, expect } from 'bun:test';
import { splitIntoPeriods, periodIndexOf, periodDelta, PERIOD_COUNT } from '../lib/periods';

const start = new Date('2026-01-01T00:00:00Z');
const end = new Date('2026-12-31T00:00:00Z');

describe('splitIntoPeriods', () => {
  it('produit des périodes contiguës qui couvrent toute l\'année', () => {
    const periods = splitIntoPeriods(start, end);
    expect(periods).toHaveLength(PERIOD_COUNT);
    expect(periods[0]!.start.getTime()).toBe(start.getTime());
    expect(periods[PERIOD_COUNT - 1]!.end.getTime()).toBe(end.getTime());
    // Aucun trou : la fin de chaque période est le début de la suivante.
    for (let i = 1; i < periods.length; i++) {
      expect(periods[i]!.start.getTime()).toBe(periods[i - 1]!.end.getTime());
    }
  });
});

describe('periodIndexOf', () => {
  const periods = splitIntoPeriods(start, end);

  it('range une date selon sa période', () => {
    expect(periodIndexOf(new Date('2026-01-15T00:00:00Z'), periods)).toBe(0);
    expect(periodIndexOf(new Date('2026-06-15T00:00:00Z'), periods)).toBe(1);
    expect(periodIndexOf(new Date('2026-11-15T00:00:00Z'), periods)).toBe(2);
  });

  it('rattache une borne au début de la période suivante, jamais aux deux', () => {
    const boundary = periods[1]!.start;
    expect(periodIndexOf(boundary, periods)).toBe(1);
  });

  it('inclut le dernier instant de l\'année dans la dernière période', () => {
    // Sans le traitement particulier de la borne haute, une note datée du
    // dernier jour ne tomberait dans aucune période.
    expect(periodIndexOf(end, periods)).toBe(PERIOD_COUNT - 1);
  });

  it('renvoie null hors de l\'année scolaire', () => {
    expect(periodIndexOf(new Date('2025-06-01T00:00:00Z'), periods)).toBeNull();
    expect(periodIndexOf(new Date('2027-06-01T00:00:00Z'), periods)).toBeNull();
  });
});

describe('periodDelta', () => {
  it('compare les deux dernières périodes renseignées', () => {
    expect(periodDelta([10, 12, 15])).toBe(3);
  });

  it('ignore les périodes vides intercalées', () => {
    // Deuxième trimestre sans note : on compare le troisième au premier, plutôt
    // que de comparer à du vide.
    expect(periodDelta([10, null, 14])).toBe(4);
  });

  it('renvoie null tant qu\'une seule période porte une moyenne', () => {
    expect(periodDelta([null, null, 15])).toBeNull();
    expect(periodDelta([12, null, null])).toBeNull();
  });

  it('renvoie null sans aucune moyenne', () => {
    expect(periodDelta([null, null, null])).toBeNull();
  });

  it('rend un écart négatif quand la moyenne baisse', () => {
    expect(periodDelta([15, 12])).toBe(-3);
  });
});
