import { consume } from '@skolr/rabbitmq';
import db from '../db';

interface BillingSubscriptionActivatedEvent {
  establishmentId: string;
  recipientUserIds: string[];
  status: string;
  planTier: string;
}

interface BillingEvent {
  establishmentId: string;
  recipientUserIds: string[];
}

async function notifyRecipients(
  recipientUserIds: string[],
  type: string,
  title: string,
  body: string,
  metadata: Record<string, unknown>,
) {
  if (recipientUserIds.length === 0) return;
  await db.notification.createMany({
    data: recipientUserIds.map((userId) => ({ userId, type, title, body, metadata })),
  });
}

export async function startBillingConsumer() {
  await consume(
    'notification.billing.subscription.activated',
    'billing.subscription.activated',
    async (payload) => {
      const event = payload as BillingSubscriptionActivatedEvent;
      await notifyRecipients(
        event.recipientUserIds,
        'billing.subscription.activated',
        'Abonnement activé',
        `Votre abonnement (${event.planTier}) est désormais actif.`,
        event as unknown as Record<string, unknown>,
      );
    },
  );

  await consume('notification.billing.payment.failed', 'billing.payment.failed', async (payload) => {
    const event = payload as BillingEvent;
    await notifyRecipients(
      event.recipientUserIds,
      'billing.payment.failed',
      'Paiement refusé',
      'Le paiement de votre abonnement a échoué — merci de mettre à jour votre moyen de paiement.',
      event as unknown as Record<string, unknown>,
    );
  });

  await consume(
    'notification.billing.subscription.canceled',
    'billing.subscription.canceled',
    async (payload) => {
      const event = payload as BillingEvent;
      await notifyRecipients(
        event.recipientUserIds,
        'billing.subscription.canceled',
        'Abonnement annulé',
        'Votre abonnement a été annulé.',
        event as unknown as Record<string, unknown>,
      );
    },
  );

  console.log('[notification-service] Billing consumer started');
}
