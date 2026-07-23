import { describe, expect, test } from 'bun:test';
import { resolveSelectedClassId } from './useChartClassSelection';

const classes = (...ids: string[]) => ids.map((id) => ({ id }));

describe('resolveSelectedClassId', () => {
  test('liste vide → aucune sélection', () => {
    expect(resolveSelectedClassId([], 'a', 'b')).toBeNull();
  });

  test('classe préférée présente → prioritaire sur la sélection courante', () => {
    expect(resolveSelectedClassId(classes('a', 'b', 'c'), 'a', 'c')).toBe('c');
  });

  test('classe préférée absente de la liste → ignorée', () => {
    expect(resolveSelectedClassId(classes('a', 'b'), 'b', 'zzz')).toBe('b');
  });

  test('sélection courante encore valide et pas de préférée → conservée (régression widget qui perd ses données)', () => {
    expect(resolveSelectedClassId(classes('a', 'b'), 'b', null)).toBe('b');
  });

  test('sélection courante devenue invalide → 1ʳᵉ classe', () => {
    expect(resolveSelectedClassId(classes('a', 'b'), 'disparue', null)).toBe('a');
  });

  test('aucune sélection courante → 1ʳᵉ classe', () => {
    expect(resolveSelectedClassId(classes('a', 'b'), null, null)).toBe('a');
  });
});
