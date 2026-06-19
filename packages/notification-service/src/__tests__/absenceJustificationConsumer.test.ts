import { describe, it, expect, beforeEach, mock } from 'bun:test';

type Handler = (payload: unknown) => Promise<void>;
const handlers = new Map<string, Handler>();

mock.module('@skolr/rabbitmq', () => ({
  consume: mock((_queue: string, routingKey: string, handler: Handler) => {
    handlers.set(routingKey, handler);
    return Promise.resolve();
  }),
}));

mock.module('../db', () => ({
  default: {
    notification: { createMany: mock() },
  },
}));

mock.module('../lib/classServiceClient', () => ({
  getClassTeacherIds: mock(() => Promise.resolve<string[]>(['teacher-1'])),
}));

mock.module('../lib/authServiceClient', () => ({
  getUserIdsByRole: mock(() => Promise.resolve<string[]>(['staff-1'])),
}));

import db from '../db';
import { startAbsenceJustificationConsumer } from '../consumers/absenceJustificationConsumer';

const prismaMock = db as unknown as { notification: { createMany: ReturnType<typeof mock> } };

describe('absenceJustificationConsumer', () => {
  beforeEach(async () => {
    prismaMock.notification.createMany.mockReset();
    handlers.clear();
    await startAbsenceJustificationConsumer();
  });

  it('notifie les profs de la classe + le staff sur submitted', async () => {
    const handler = handlers.get('absence.justification.submitted')!;
    await handler({ justificationId: 'just-1', studentId: 'student-1', classId: 'class-1' });

    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: 'teacher-1', type: 'absence.justification.submitted' }),
        expect.objectContaining({ userId: 'staff-1', type: 'absence.justification.submitted' }),
      ],
    });
  });

  it("notifie l'élève sur approved", async () => {
    const handler = handlers.get('absence.justification.approved')!;
    await handler({ justificationId: 'just-1', studentId: 'student-1', reviewComment: null });

    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ userId: 'student-1', type: 'absence.justification.approved' })],
    });
  });

  it("notifie l'élève avec le commentaire sur rejected", async () => {
    const handler = handlers.get('absence.justification.rejected')!;
    await handler({ justificationId: 'just-1', studentId: 'student-1', reviewComment: 'Document illisible' });

    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'student-1',
          type: 'absence.justification.rejected',
          body: expect.stringContaining('Document illisible'),
        }),
      ],
    });
  });
});
