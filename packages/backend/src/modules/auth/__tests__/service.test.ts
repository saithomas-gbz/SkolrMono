import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { getUsersByIds, getUserIdsByRole } from '../service';
import db from '../../../shared/db';

mock.module('../../../shared/db', () => ({
  default: {
    user: {
      findMany: mock(),
    },
  },
}));

const prismaMock = db as unknown as {
  user: { findMany: ReturnType<typeof mock> };
};

describe('auth service', () => {
  beforeEach(() => {
    prismaMock.user.findMany.mockReset();
  });

  describe('getUsersByIds', () => {
    it('should return an empty array without querying the database when ids is empty', async () => {
      const result = await getUsersByIds([]);
      expect(result).toEqual([]);
      expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    });

    it('should fetch public user info for the given ids', async () => {
      const users = [{ id: 'user-1', name: 'Léa Martin', email: 'lea@skolr.local' }];
      prismaMock.user.findMany.mockResolvedValue(users);

      const result = await getUsersByIds(['user-1']);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-1'] } },
        select: { id: true, name: true, email: true },
      });
      expect(result).toEqual(users);
    });
  });

  describe('getUserIdsByRole', () => {
    it('should return the ids of users with the given role', async () => {
      prismaMock.user.findMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);

      const result = await getUserIdsByRole('TEACHER');

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { role: 'TEACHER' },
        select: { id: true },
      });
      expect(result).toEqual(['user-1', 'user-2']);
    });

    it('should return an empty array when no user has the given role', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);

      const result = await getUserIdsByRole('ADMIN');

      expect(result).toEqual([]);
    });
  });
});
