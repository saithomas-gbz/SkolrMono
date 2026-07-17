import db from '../../shared/db';

/**
 * Service intra-process du module message.
 *
 * Le domaine ne stocke qu'un `userId`/`senderId` nu. Le contenu des messages est
 * de la donnée personnelle mais partagée avec les autres participants : il est
 * exporté (droit d'accès) mais **conservé** lors de l'effacement (l'expéditeur
 * pointe alors vers une identité anonymisée).
 */

/**
 * RGPD — messagerie de l'utilisateur : ses participations aux conversations,
 * les messages qu'il a envoyés (avec métadonnées des pièces jointes, jamais le
 * contenu binaire) et ses accusés de lecture.
 */
export async function collectRgpdData(userId: string) {
  const [participations, messages, reads] = await Promise.all([
    db.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true, joinedAt: true },
    }),
    db.message.findMany({
      where: { senderId: userId },
      select: {
        id: true,
        conversationId: true,
        content: true,
        sentAt: true,
        attachments: {
          select: { fileName: true, mimeType: true, sizeBytes: true, uploadedAt: true },
        },
      },
    }),
    db.messageRead.findMany({
      where: { userId },
      select: { messageId: true, readAt: true },
    }),
  ]);

  return { participations, messages, reads };
}
