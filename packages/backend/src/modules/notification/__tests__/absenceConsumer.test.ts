import { describe, it, expect, beforeEach, mock } from 'bun:test';

type Handler = (payload: unknown) => Promise<void>;
const handlers = new Map<string, Handler>();

mock.module('../../../shared/events', () => ({
  consume: mock((_queue: string, routingKey: string, handler: Handler) => {
    handlers.set(routingKey, handler);
    return Promise.resolve();
  }),
}));

mock.module('../../../shared/db', () => ({
  default: {
    notification: { createMany: mock() },
  },
}));

mock.module('../lib/parentServiceClient', () => ({
  getParentIds: mock(() => Promise.resolve<string[]>(['parent-1'])),
}));

import db from '../../../shared/db';
import { startAbsenceConsumer } from '../consumers/absenceConsumer';
import { getParentIds } from '../lib/parentServiceClient';

const prismaMock = db as unknown as { notification: { createMany: ReturnType<typeof mock> } };
const getParentIdsMock = getParentIds as unknown as ReturnType<typeof mock>;

describe('absenceConsumer', () => {
  beforeEach(async () => {
    prismaMock.notification.createMany.mockReset();
    getParentIdsMock.mockReset();
    getParentIdsMock.mockResolvedValue(['parent-1']);
    handlers.clear();
    await startAbsenceConsumer();
  });

  it("notifie l'élève et ses parents rattachés sur absence.created", async () => {
    const handler = handlers.get('absence.created')!;
    await handler({ absenceId: 'abs-1', sessionId: 'sess-1', userId: 'student-1', role: 'STUDENT', justified: false });

    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: 'student-1', type: 'absence.created' }),
        expect.objectContaining({ userId: 'parent-1', type: 'absence.created' }),
      ],
    });
  });

  it("ne cherche pas de parents pour l'absence d'un professeur", async () => {
    const handler = handlers.get('absence.created')!;
    await handler({ absenceId: 'abs-2', sessionId: 'sess-1', userId: 'teacher-1', role: 'TEACHER', justified: false });

    expect(getParentIdsMock).not.toHaveBeenCalled();
    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ userId: 'teacher-1', type: 'absence.created' })],
    });
  });
});
