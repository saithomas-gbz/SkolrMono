import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { FastifyRequest, FastifyReply } from 'fastify';

const publishMock = mock();

mock.module('@skolr/rabbitmq', () => ({
  publish: publishMock,
  ROUTING_KEYS: {
    ABSENCE_CREATED: 'absence.created',
  },
}));

mock.module('../db', () => ({
  default: {
    absence: {
      findUnique: mock(),
      create: mock(),
    },
  },
}));

import { createAbsence } from '../controllers/absenceController';
import db from '../db';

const prismaMock = db as {
  absence: {
    findUnique: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
  };
};

const sampleAbsence = {
  id: 'absence-1',
  sessionId: 'session-1',
  userId: 'user-1',
  role: 'STUDENT' as const,
  justified: false,
  reason: null,
  createdAt: new Date('2026-06-09T08:00:00.000Z'),
  updatedAt: new Date('2026-06-09T08:00:00.000Z'),
};

function makeRequest<T extends { Body?: object; Querystring?: object } = object>(
  body: T extends { Body: infer B } ? B : object,
): FastifyRequest<{ Body: typeof body }> {
  return { body, log: { error: mock() } } as unknown as FastifyRequest<{ Body: typeof body }>;
}

const mockReply = {
  status: mock().mockReturnThis(),
  send: mock().mockReturnThis(),
} as unknown as FastifyReply;

describe('absenceController — RabbitMQ publisher', () => {
  beforeEach(() => {
    publishMock.mockReset();
    prismaMock.absence.findUnique.mockReset();
    prismaMock.absence.create.mockReset();
    (mockReply.status as ReturnType<typeof mock>).mockReset().mockReturnThis();
    (mockReply.send as ReturnType<typeof mock>).mockReset().mockReturnThis();
  });

  it('publishes absence.created after successful absence creation', async () => {
    prismaMock.absence.findUnique.mockResolvedValue(null);
    prismaMock.absence.create.mockResolvedValue(sampleAbsence);
    publishMock.mockResolvedValue(undefined);

    const req = makeRequest({
      sessionId: 'session-1',
      userId: 'user-1',
      role: 'STUDENT',
      justified: false,
    });

    await createAbsence(req as FastifyRequest<{ Body: typeof req.body }>, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(201);
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock).toHaveBeenCalledWith('absence.created', {
      absenceId: 'absence-1',
      sessionId: 'session-1',
      userId: 'user-1',
      role: 'STUDENT',
      justified: false,
      reason: undefined,
      createdAt: '2026-06-09T08:00:00.000Z',
    });
  });

  it('does not publish if absence already exists', async () => {
    prismaMock.absence.findUnique.mockResolvedValue(sampleAbsence);

    const req = makeRequest({ sessionId: 'session-1', userId: 'user-1', role: 'STUDENT' });
    await createAbsence(req as FastifyRequest<{ Body: typeof req.body }>, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(409);
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('does not publish if db creation fails', async () => {
    prismaMock.absence.findUnique.mockResolvedValue(null);
    prismaMock.absence.create.mockRejectedValue(new Error('db error'));

    const req = makeRequest({ sessionId: 'session-1', userId: 'user-1', role: 'STUDENT' });

    try {
      await createAbsence(req as FastifyRequest<{ Body: typeof req.body }>, mockReply);
    } catch {
      // controller doesn't catch — test that publish was never called
    }

    expect(publishMock).not.toHaveBeenCalled();
  });
});
