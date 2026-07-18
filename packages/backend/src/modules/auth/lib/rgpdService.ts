import { randomUUID } from 'crypto';
import db from '../../../shared/db';
import * as authService from '../service';
import * as classService from '../../class/service';
import * as gradeService from '../../grade/service';
import * as planningService from '../../planning/service';
import * as messageService from '../../message/service';
import * as notificationService from '../../notification/service';
import * as billingService from '../../billing/service';
import * as parentService from '../../parent/service';

/**
 * Orchestrateur RGPD du monolithe (issue #145).
 *
 * Le monolithe modulaire partage une seule base Postgres multi-schema : il n'y a
 * aucune FK cross-schema vers `auth.User` (chaque domaine stocke un `userId` nu).
 * L'export comme l'effacement doivent donc parcourir explicitement chaque domaine,
 * via les fonctions `collectRgpdData` exposées par les `service.ts`.
 */

/** Adresse email d'anonymisation, unique et non routable (droit à l'effacement). */
function anonymizedEmail(): string {
  return `deleted-${randomUUID()}@anonymized.skolr.local`;
}

/**
 * Droit d'accès / portabilité (art. 15 & 20 RGPD) : agrège l'ensemble des données
 * personnelles de l'utilisateur, tous domaines confondus, en un objet JSON.
 */
export async function collectPersonalData(userId: string, email: string) {
  const [auth, klass, grade, planning, message, notification, billing, parent] = await Promise.all([
    authService.collectRgpdData({ userId, email }),
    classService.collectRgpdData(userId),
    gradeService.collectRgpdData({ userId, email }),
    planningService.collectRgpdData(userId),
    messageService.collectRgpdData(userId),
    notificationService.collectRgpdData(userId),
    billingService.collectRgpdData({ userId, email }),
    parentService.collectRgpdData(userId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    subject: { userId, email },
    auth,
    class: klass,
    grade,
    planning,
    message,
    notification,
    billing,
    parent,
  };
}

/**
 * Droit à l'effacement (art. 17 RGPD) — anonymisation.
 *
 * L'identité est effacée à la source (`auth.User` + la copie `grade.GradeUser`
 * + l'email de facturation) et les comptes OAuth / jetons sont supprimés, le tout
 * dans une transaction. La ligne `auth.User` est **conservée** (marquée
 * `deletedAt`) pour préserver l'intégrité référentielle : les enregistrements
 * liés (notes, absences, messages…) restent valides mais pointent désormais vers
 * une identité anonyme.
 *
 * Idempotent : ré-anonymiser un compte déjà anonymisé ne fait que régénérer un
 * pseudonyme. Retourne `false` si l'utilisateur n'existe pas.
 */
export async function anonymizeUser(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return false;

  const originalEmail = user.email;
  const scrubbedEmail = anonymizedEmail();

  await db.$transaction(async (tx) => {
    await tx.account.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: {
        email: scrubbedEmail,
        name: null,
        password: null,
        image: null,
        oauthProvider: null,
        oauthId: null,
        deletedAt: new Date(),
      },
    });

    // PII dupliquée hors du schéma auth.
    await gradeService.anonymizeGradeUserByEmail(originalEmail, scrubbedEmail, tx);
    await billingService.clearBillingEmail(originalEmail, tx);
  });

  return true;
}
