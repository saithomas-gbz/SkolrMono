import db from '../db';

/**
 * Destinataires des notifications de facturation pour un établissement :
 * les membres marqués isBillingContact, ou tous les membres si aucun n'est marqué.
 */
export async function resolveBillingRecipients(establishmentId: string): Promise<string[]> {
  const members = await db.establishmentMember.findMany({ where: { establishmentId } });
  const billingContacts = members.filter((member) => member.isBillingContact);
  const targets = billingContacts.length > 0 ? billingContacts : members;
  return targets.map((member) => member.userId);
}
