import db from '../../shared/db';
import type { Prisma } from '../../generated/prisma/client';

/** Client Prisma classique ou client de transaction interactive (`$transaction`). */
type PrismaClientOrTx = typeof db | Prisma.TransactionClient;

/**
 * Service intra-process du module billing.
 * L'essentiel des données est au niveau établissement (organisation), pas
 * personnel — seul `Establishment.billingEmail` peut être l'email personnel
 * d'un contact de facturation.
 */

/**
 * RGPD — appartenances de l'utilisateur à des établissements, et les
 * établissements dont il est le contact de facturation (via son email).
 */
export async function collectRgpdData({ userId, email }: { userId: string; email: string }) {
  const [memberships, billingContactFor] = await Promise.all([
    db.establishmentMember.findMany({
      where: { userId },
      select: { establishmentId: true, isBillingContact: true, createdAt: true },
    }),
    db.establishment.findMany({
      where: { billingEmail: email },
      select: { id: true, name: true, slug: true, billingEmail: true },
    }),
  ]);
  return { memberships, billingContactFor };
}

/**
 * RGPD — retire l'email personnel d'un contact de facturation lors de
 * l'effacement. Les données comptables/Stripe de l'établissement sont conservées
 * (obligation légale de conservation). No-op si l'email n'est contact nulle part.
 */
export async function clearBillingEmail(email: string, client: PrismaClientOrTx = db): Promise<void> {
  await client.establishment.updateMany({
    where: { billingEmail: email },
    data: { billingEmail: null },
  });
}
