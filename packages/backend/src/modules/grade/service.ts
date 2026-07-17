import db from '../../shared/db';
import type { Prisma } from '../../generated/prisma/client';

/** Client Prisma classique ou client de transaction interactive (`$transaction`). */
type PrismaClientOrTx = typeof db | Prisma.TransactionClient;

/**
 * Service intra-process du module grade.
 *
 * ⚠️ Le domaine grade conserve une **copie locale** de l'identité de l'élève
 * (`GradeUser`, avec `name` + `email`) : `Grade.userId` pointe vers
 * `GradeUser.id`, PAS vers `auth.User.id`. On retrouve donc l'utilisateur par
 * son **email**, seule clé partagée entre `auth.User` et `grade.GradeUser`.
 */

/**
 * RGPD — données scolaires de l'utilisateur : sa fiche `GradeUser` (copie locale
 * d'identité), ses notes, et — s'il est enseignant — les devoirs qu'il a créés.
 */
export async function collectRgpdData({ userId, email }: { userId: string; email: string }) {
  const gradeUser = await db.gradeUser.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, classId: true },
  });

  const [grades, assignments] = await Promise.all([
    gradeUser
      ? db.grade.findMany({
          where: { userId: gradeUser.id },
          select: {
            assignmentId: true,
            classId: true,
            courseId: true,
            status: true,
            value: true,
            comment: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    db.assignment.findMany({
      where: { teacherId: userId },
      select: { id: true, title: true, classId: true, courseId: true, assignedAt: true, dueAt: true },
    }),
  ]);

  return { gradeUser, grades, assignments };
}

/**
 * RGPD — anonymise la copie locale d'identité (`GradeUser`) retrouvée par email.
 * Les notes (`Grade`) sont **conservées** (valeur institutionnelle + intégrité
 * référentielle) : elles restent rattachées à une fiche désormais anonyme.
 * No-op si aucun `GradeUser` ne correspond.
 */
export async function anonymizeGradeUserByEmail(
  email: string,
  anonymizedEmail: string,
  client: PrismaClientOrTx = db,
): Promise<void> {
  await client.gradeUser.updateMany({
    where: { email },
    data: { email: anonymizedEmail, name: 'Utilisateur supprimé' },
  });
}
