import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from 'bun:test';
import presenceController from '../controllers/presenceController';
import * as presence from '../utils/presence';
import type { FastifyRequest, FastifyReply } from 'fastify';

// `../presence` est partagé avec presence.test.ts dans le même run : on patche
// getPresence via spyOn (restauré après chaque test) plutôt que mock.module, qui
// remplacerait le module pour tous les fichiers de test du process.
let getPresenceSpy: ReturnType<typeof spyOn>;

function buildRequest(query: { userIds?: string | string[] } = {}) {
  return {
    messageUser: { userId: 'user-1', email: 'a@a.com', role: 'TEACHER' },
    query,
  } as unknown as FastifyRequest<{ Querystring: { userIds?: string | string[] } }>;
}

function buildReply(): FastifyReply {
  return {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  } as unknown as FastifyReply;
}

describe('presenceController.getPresence', () => {
  beforeEach(() => {
    getPresenceSpy = spyOn(presence, 'getPresence').mockReturnValue([]);
  });

  afterEach(() => {
    getPresenceSpy.mockRestore();
  });

  it('returns presence data for the requested userIds', async () => {
    const request = buildRequest({ userIds: ['peer-1', 'peer-2'] });
    const reply = buildReply();
    getPresenceSpy.mockReturnValue([
      { userId: 'peer-1', online: true, lastSeen: 1 },
      { userId: 'peer-2', online: false, lastSeen: null },
    ]);

    await presenceController.getPresence(request, reply);

    expect(getPresenceSpy).toHaveBeenCalledWith(['peer-1', 'peer-2']);
    expect(reply.status).toHaveBeenCalledWith(200);
  });

  it('wraps a single userId query value into an array', async () => {
    const request = buildRequest({ userIds: 'peer-1' });
    const reply = buildReply();
    getPresenceSpy.mockReturnValue([{ userId: 'peer-1', online: false, lastSeen: null }]);

    await presenceController.getPresence(request, reply);

    expect(getPresenceSpy).toHaveBeenCalledWith(['peer-1']);
  });

  it('defaults to an empty array when no userIds are provided', async () => {
    const request = buildRequest({});
    const reply = buildReply();

    await presenceController.getPresence(request, reply);

    expect(getPresenceSpy).toHaveBeenCalledWith([]);
  });
});
