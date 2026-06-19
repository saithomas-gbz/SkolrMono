import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { resolveBillingRecipients } from '../lib/resolveBillingRecipients';
import db from '../db';

mock.module('../db', () => ({
  default: {
    establishmentMember: {
      findMany: mock(),
    },
  },
}));

const prismaMock = db as unknown as {
  establishmentMember: { findMany: ReturnType<typeof mock> };
};

describe('resolveBillingRecipients', () => {
  beforeEach(() => {
    prismaMock.establishmentMember.findMany.mockReset();
  });

  it('ne renvoie que les contacts de facturation si au moins un est marqué', async () => {
    prismaMock.establishmentMember.findMany.mockResolvedValue([
      { userId: 'admin-1', isBillingContact: true },
      { userId: 'admin-2', isBillingContact: false },
    ]);

    const recipients = await resolveBillingRecipients('est-1');

    expect(recipients).toEqual(['admin-1']);
  });

  it("retombe sur tous les membres si aucun n'est marqué isBillingContact", async () => {
    prismaMock.establishmentMember.findMany.mockResolvedValue([
      { userId: 'admin-1', isBillingContact: false },
      { userId: 'admin-2', isBillingContact: false },
    ]);

    const recipients = await resolveBillingRecipients('est-1');

    expect(recipients).toEqual(['admin-1', 'admin-2']);
  });

  it("renvoie un tableau vide si l'établissement n'a aucun membre", async () => {
    prismaMock.establishmentMember.findMany.mockResolvedValue([]);

    const recipients = await resolveBillingRecipients('est-1');

    expect(recipients).toEqual([]);
  });
});
