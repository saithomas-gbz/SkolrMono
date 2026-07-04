import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { FastifyReply } from 'fastify';

mock.module('../../../shared/db', () => ({
  default: {
    parentStudent: { findUnique: mock(), create: mock(), delete: mock() },
  },
}));

const { createLink, deleteLink } = await import('../controllers/parentLinkController');
const db = (await import('../../../shared/db')).default as unknown as {
  parentStudent: {
    findUnique: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
  };
};

type CreateLinkRequest = Parameters<typeof createLink>[0];
type DeleteLinkRequest = Parameters<typeof deleteLink>[0];

function buildReply(): FastifyReply {
  return { status: mock().mockReturnThis(), send: mock().mockReturnThis() } as unknown as FastifyReply;
}

beforeEach(() => {
  db.parentStudent.findUnique.mockReset();
  db.parentStudent.create.mockReset();
  db.parentStudent.delete.mockReset();
});

describe('createLink', () => {
  it('renvoie 409 si le lien existe déjà', async () => {
    db.parentStudent.findUnique.mockResolvedValue({ id: 'existing' });
    const reply = buildReply();

    await createLink(
      { body: { parentId: 'p1', studentId: 's1' } } as unknown as CreateLinkRequest,
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(409);
    expect(db.parentStudent.create).not.toHaveBeenCalled();
  });

  it('crée le lien avec les valeurs par défaut', async () => {
    db.parentStudent.findUnique.mockResolvedValue(null);
    db.parentStudent.create.mockResolvedValue({ id: 'new-link' });
    const reply = buildReply();

    await createLink(
      { body: { parentId: 'p1', studentId: 's1' } } as unknown as CreateLinkRequest,
      reply,
    );

    expect(db.parentStudent.create).toHaveBeenCalledWith({
      data: { parentId: 'p1', studentId: 's1', linkType: 'LEGAL_GUARDIAN', isPrimary: false },
    });
    expect(reply.status).toHaveBeenCalledWith(201);
  });
});

describe('deleteLink', () => {
  it('renvoie 404 si le lien est introuvable', async () => {
    db.parentStudent.findUnique.mockResolvedValue(null);
    const reply = buildReply();

    await deleteLink({ params: { id: 'missing' } } as unknown as DeleteLinkRequest, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(db.parentStudent.delete).not.toHaveBeenCalled();
  });

  it('supprime le lien existant', async () => {
    db.parentStudent.findUnique.mockResolvedValue({ id: 'link-1' });
    const reply = buildReply();

    await deleteLink({ params: { id: 'link-1' } } as unknown as DeleteLinkRequest, reply);

    expect(db.parentStudent.delete).toHaveBeenCalledWith({ where: { id: 'link-1' } });
    expect(reply.status).toHaveBeenCalledWith(204);
  });
});
