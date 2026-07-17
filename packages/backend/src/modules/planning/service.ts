import db from '../../shared/db';

/**
 * Service intra-process du module planning.
 *
 * Le domaine ne stocke que des `userId`/`teacherId`/`studentId` nus (aucune PII
 * directe hors le texte libre `reason`/`reviewComment` saisi par la personne).
 */

/**
 * RGPD — emploi du temps et vie scolaire de l'utilisateur : ses sessions
 * (comme enseignant), ses absences, et ses justificatifs (déposés ou relus),
 * avec les métadonnées des documents joints (jamais leur contenu binaire).
 */
export async function collectRgpdData(userId: string) {
  const [sessions, absences, justifications] = await Promise.all([
    db.session.findMany({
      where: { teacherId: userId },
      select: { id: true, classId: true, courseId: true, room: true, startAt: true, endAt: true },
    }),
    db.absence.findMany({
      where: { userId },
      select: { sessionId: true, role: true, justified: true, reason: true, createdAt: true },
    }),
    db.absenceJustification.findMany({
      where: { OR: [{ studentId: userId }, { reviewerId: userId }] },
      select: {
        id: true,
        studentId: true,
        reviewerId: true,
        status: true,
        reason: true,
        reviewComment: true,
        reviewedAt: true,
        createdAt: true,
        documents: {
          select: { fileName: true, mimeType: true, sizeBytes: true, uploadedAt: true },
        },
      },
    }),
  ]);

  return { sessions, absences, justifications };
}
