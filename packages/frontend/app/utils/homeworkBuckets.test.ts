import { describe, expect, test } from 'bun:test';
import { bucketHomework, type HomeworkItem } from './homeworkBuckets';

function makeItem(overrides: Partial<HomeworkItem> = {}): HomeworkItem {
  return {
    assignmentId: 'a1',
    subject: 'Mathématiques',
    title: 'Exercice 1',
    dueAt: null,
    done: false,
    ...overrides,
  };
}

describe('bucketHomework', () => {
  test('un devoir fait va dans "done", même si sa date est future', () => {
    const now = new Date('2026-07-20T12:00:00Z'); // lundi
    const future = new Date('2026-07-27T12:00:00Z');
    const buckets = bucketHomework([makeItem({ done: true, dueAt: future })], now);

    expect(buckets.done).toHaveLength(1);
    expect(buckets.thisWeek).toHaveLength(0);
    expect(buckets.nextWeek).toHaveLength(0);
    expect(buckets.done[0].overdue).toBe(false);
  });

  test('un devoir PENDING en retard remonte dans "thisWeek" avec overdue=true', () => {
    const now = new Date('2026-07-20T12:00:00Z');
    const past = new Date('2026-07-15T12:00:00Z');
    const buckets = bucketHomework([makeItem({ dueAt: past })], now);

    expect(buckets.thisWeek).toHaveLength(1);
    expect(buckets.thisWeek[0].overdue).toBe(true);
  });

  test('un devoir sans date d\'échéance va dans "thisWeek" (non en retard)', () => {
    const now = new Date('2026-07-20T12:00:00Z');
    const buckets = bucketHomework([makeItem({ dueAt: null })], now);

    expect(buckets.thisWeek).toHaveLength(1);
    expect(buckets.thisWeek[0].overdue).toBe(false);
  });

  test('un devoir dû la semaine prochaine va dans "nextWeek"', () => {
    const now = new Date('2026-07-20T12:00:00Z'); // lundi, semaine du 20 au 27
    const nextWeek = new Date('2026-07-29T12:00:00Z'); // mercredi suivant
    const buckets = bucketHomework([makeItem({ dueAt: nextWeek })], now);

    expect(buckets.nextWeek).toHaveLength(1);
    expect(buckets.thisWeek).toHaveLength(0);
  });

  test('un devoir au-delà de la semaine prochaine est masqué (aucun bucket)', () => {
    const now = new Date('2026-07-20T12:00:00Z');
    const farFuture = new Date('2026-08-15T12:00:00Z');
    const buckets = bucketHomework([makeItem({ dueAt: farFuture })], now);

    expect(buckets.thisWeek).toHaveLength(0);
    expect(buckets.nextWeek).toHaveLength(0);
    expect(buckets.done).toHaveLength(0);
  });

  test('thisWeek est trié par date d\'échéance croissante', () => {
    const now = new Date('2026-07-20T12:00:00Z');
    const later = makeItem({ assignmentId: 'later', dueAt: new Date('2026-07-22T12:00:00Z') });
    const earlier = makeItem({ assignmentId: 'earlier', dueAt: new Date('2026-07-21T12:00:00Z') });
    const buckets = bucketHomework([later, earlier], now);

    expect(buckets.thisWeek.map((i) => i.assignmentId)).toEqual(['earlier', 'later']);
  });
});
