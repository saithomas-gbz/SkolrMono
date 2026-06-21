import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { FastifyReply } from 'fastify';

mock.module('../db', () => ({
  default: {
    absenceJustification: { findUnique: mock(), update: mock() },
    absence: { updateMany: mock() },
  },
}));

mock.module('@skolr/rabbitmq', () => ({
  publish: mock(() => Promise.resolve()),
}));

mock.module('../lib/classServiceClient', () => ({
  getClassIdsForTeacher: mock(() => Promise.resolve<string[]>([])),
  getClassIdsForStudent: mock(() => Promise.resolve<string[]>([])),
}));

mock.module('../lib/parentServiceClient', () => ({
  getChildIds: mock(() => Promise.resolve<string[]>([])),
}));

const { submitAbsenceJustification, reviewAbsenceJustification } = await import(
  '../controllers/absenceJustificationController'
);
const db = (await import('../db')).default as unknown as {
  absenceJustification: { findUnique: ReturnType<typeof mock>; update: ReturnType<typeof mock> };
  absence: { updateMany: ReturnType<typeof mock> };
};
const { publish } = (await import('@skolr/rabbitmq')) as unknown as { publish: ReturnType<typeof mock> };
const { getClassIdsForTeacher } = (await import('../lib/classServiceClient')) as unknown as {
  getClassIdsForTeacher: ReturnType<typeof mock>;
};
const { getChildIds } = (await import('../lib/parentServiceClient')) as unknown as {
  getChildIds: ReturnType<typeof mock>;
};

function buildReply(): FastifyReply {
  return { status: mock().mockReturnThis(), send: mock().mockReturnThis() } as unknown as FastifyReply;
}

type SubmitRequest = Parameters<typeof submitAbsenceJustification>[0];
type ReviewRequest = Parameters<typeof reviewAbsenceJustification>[0];

function justificationFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'just-1',
    studentId: 'student-1',
    status: 'DRAFT',
    absences: [{ absenceId: 'abs-1', absence: { session: { classId: 'class-1' } } }],
    ...overrides,
  };
}

beforeEach(() => {
  db.absenceJustification.findUnique.mockReset();
  db.absenceJustification.update.mockReset();
  db.absence.updateMany.mockReset();
  publish.mockReset();
  publish.mockImplementation(() => Promise.resolve());
  getClassIdsForTeacher.mockReset();
  getClassIdsForTeacher.mockResolvedValue([]);
  getChildIds.mockReset();
  getChildIds.mockResolvedValue([]);
});

describe('submitAbsenceJustification', () => {
  it('renvoie 404 si la demande est introuvable', async () => {
    db.absenceJustification.findUnique.mockResolvedValue(null);
    const reply = buildReply();

    await submitAbsenceJustification(
      { params: { id: 'just-1' }, planningUser: { userId: 'student-1', email: '', role: 'USER' } } as unknown as SubmitRequest,
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(404);
  });

  it("renvoie 403 si l'élève n'est pas le propriétaire", async () => {
    db.absenceJustification.findUnique.mockResolvedValue(justificationFixture());
    const reply = buildReply();

    await submitAbsenceJustification(
      { params: { id: 'just-1' }, planningUser: { userId: 'other-student', email: '', role: 'USER' } } as unknown as SubmitRequest,
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it("renvoie 409 si la demande n'est pas en DRAFT", async () => {
    db.absenceJustification.findUnique.mockResolvedValue(justificationFixture({ status: 'PENDING' }));
    const reply = buildReply();

    await submitAbsenceJustification(
      { params: { id: 'just-1' }, planningUser: { userId: 'student-1', email: '', role: 'USER' } } as unknown as SubmitRequest,
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(409);
  });

  it('passe en PENDING et publie absence.justification.submitted avec le classId', async () => {
    db.absenceJustification.findUnique.mockResolvedValue(justificationFixture());
    db.absenceJustification.update.mockResolvedValue(justificationFixture({ status: 'PENDING' }));
    const reply = buildReply();
    const req = {
      params: { id: 'just-1' },
      planningUser: { userId: 'student-1', email: '', role: 'USER' },
      log: { warn: mock() },
    } as unknown as SubmitRequest;

    await submitAbsenceJustification(req, reply);

    expect(db.absenceJustification.update).toHaveBeenCalledWith({
      where: { id: 'just-1' },
      data: { status: 'PENDING' },
    });
    expect(publish).toHaveBeenCalledWith('absence.justification.submitted', {
      justificationId: 'just-1',
      studentId: 'student-1',
      classId: 'class-1',
    });
    expect(reply.send).toHaveBeenCalled();
  });

  it("renvoie 403 si le PARENT n'a pas de lien vers cet enfant", async () => {
    db.absenceJustification.findUnique.mockResolvedValue(justificationFixture());
    getChildIds.mockResolvedValue(['other-student']);
    const reply = buildReply();

    await submitAbsenceJustification(
      { params: { id: 'just-1' }, planningUser: { userId: 'parent-1', email: '', role: 'PARENT' } } as unknown as SubmitRequest,
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(db.absenceJustification.update).not.toHaveBeenCalled();
  });

  it('laisse passer un PARENT avec un enfant rattaché', async () => {
    db.absenceJustification.findUnique.mockResolvedValue(justificationFixture());
    db.absenceJustification.update.mockResolvedValue(justificationFixture({ status: 'PENDING' }));
    getChildIds.mockResolvedValue(['student-1']);
    const reply = buildReply();
    const req = {
      params: { id: 'just-1' },
      planningUser: { userId: 'parent-1', email: '', role: 'PARENT' },
      log: { warn: mock() },
    } as unknown as SubmitRequest;

    await submitAbsenceJustification(req, reply);

    expect(db.absenceJustification.update).toHaveBeenCalledWith({
      where: { id: 'just-1' },
      data: { status: 'PENDING' },
    });
  });
});

describe('reviewAbsenceJustification', () => {
  it('renvoie 400 si refus sans commentaire', async () => {
    const reply = buildReply();

    await reviewAbsenceJustification(
      {
        params: { id: 'just-1' },
        body: { action: 'reject' },
        planningUser: { userId: 'staff-1', email: '', role: 'STAFF' },
      } as unknown as ReviewRequest,
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(db.absenceJustification.findUnique).not.toHaveBeenCalled();
  });

  it("renvoie 409 si la demande n'est pas PENDING", async () => {
    db.absenceJustification.findUnique.mockResolvedValue(justificationFixture({ status: 'APPROVED' }));
    const reply = buildReply();

    await reviewAbsenceJustification(
      {
        params: { id: 'just-1' },
        body: { action: 'approve' },
        planningUser: { userId: 'staff-1', email: '', role: 'STAFF' },
      } as unknown as ReviewRequest,
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(409);
  });

  it("approuve : marque l'absence justifiée et publie l'événement", async () => {
    db.absenceJustification.findUnique.mockResolvedValue(justificationFixture({ status: 'PENDING' }));
    db.absenceJustification.update.mockResolvedValue(justificationFixture({ status: 'APPROVED' }));
    const reply = buildReply();
    const req = {
      params: { id: 'just-1' },
      body: { action: 'approve' },
      planningUser: { userId: 'staff-1', email: '', role: 'STAFF' },
      log: { warn: mock() },
    } as unknown as ReviewRequest;

    await reviewAbsenceJustification(req, reply);

    expect(db.absence.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['abs-1'] } },
      data: { justified: true },
    });
    expect(publish).toHaveBeenCalledWith(
      'absence.justification.approved',
      expect.objectContaining({ justificationId: 'just-1', studentId: 'student-1' }),
    );
  });

  it("renvoie 403 si le TEACHER n'a pas la classe concernée", async () => {
    db.absenceJustification.findUnique.mockResolvedValue(justificationFixture({ status: 'PENDING' }));
    getClassIdsForTeacher.mockResolvedValue(['other-class']);
    const reply = buildReply();

    await reviewAbsenceJustification(
      {
        params: { id: 'just-1' },
        body: { action: 'approve' },
        planningUser: { userId: 'teacher-1', email: '', role: 'TEACHER' },
      } as unknown as ReviewRequest,
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(db.absenceJustification.update).not.toHaveBeenCalled();
  });
});
