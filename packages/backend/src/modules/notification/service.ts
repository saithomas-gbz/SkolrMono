import db from '../../shared/db';

/**
 * Service intra-process du module notification.
 * Ne stocke qu'un `userId` nu ; `title`/`body`/`metadata` peuvent contenir des
 * données personnelles adressées à l'utilisateur.
 */

/** RGPD — notifications reçues par l'utilisateur. */
export async function collectRgpdData(userId: string) {
  const notifications = await db.notification.findMany({
    where: { userId },
    select: {
      type: true,
      title: true,
      body: true,
      read: true,
      metadata: true,
      createdAt: true,
    },
  });
  return { notifications };
}
