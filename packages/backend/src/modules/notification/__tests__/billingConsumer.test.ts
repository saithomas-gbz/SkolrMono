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
    notification: {
      createMany: mock(),
    },
  },
}));

import db from '../../../shared/db';
import { startBillingConsumer } from '../consumers/billingConsumer';

const prismaMock = db as unknown as { notification: { createMany: ReturnType<typeof mock> } };

describe('billingConsumer', () => {
  beforeEach(async () => {
    prismaMock.notification.createMany.mockReset();
    handlers.clear();
    await startBillingConsumer();
  });

  it('crée une notification par destinataire sur billing.subscription.activated', async () => {
    const handler = handlers.get('billing.subscription.activated')!;
    await handler({
      establishmentId: 'est-1',
      recipientUserIds: ['admin-1', 'admin-2'],
      status: 'ACTIVE',
      planTier: 'STARTER',
    });

    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'admin-1',
          type: 'billing.subscription.activated',
          title: 'Abonnement activé',
          body: 'Votre abonnement (STARTER) est désormais actif.',
          metadata: expect.objectContaining({ establishmentId: 'est-1' }),
        },
        {
          userId: 'admin-2',
          type: 'billing.subscription.activated',
          title: 'Abonnement activé',
          body: 'Votre abonnement (STARTER) est désormais actif.',
          metadata: expect.objectContaining({ establishmentId: 'est-1' }),
        },
      ],
    });
  });

  it('crée une notification sur billing.payment.failed', async () => {
    const handler = handlers.get('billing.payment.failed')!;
    await handler({ establishmentId: 'est-1', recipientUserIds: ['admin-1'] });

    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: 'admin-1', type: 'billing.payment.failed' }),
      ],
    });
  });

  it('crée une notification sur billing.subscription.canceled', async () => {
    const handler = handlers.get('billing.subscription.canceled')!;
    await handler({ establishmentId: 'est-1', recipientUserIds: ['admin-1'] });

    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: 'admin-1', type: 'billing.subscription.canceled' }),
      ],
    });
  });

  it("ne crée aucune notification si la liste de destinataires est vide", async () => {
    const handler = handlers.get('billing.subscription.canceled')!;
    await handler({ establishmentId: 'est-1', recipientUserIds: [] });

    expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
  });
});
