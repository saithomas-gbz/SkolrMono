import { consume } from '@skolr/rabbitmq';
import db from '../db';
import { resolveRecipients } from '../lib/resolveRecipients';

interface StudentEnrolledEvent {
  studentId: string;
  classId: string;
}

export async function startEnrollmentConsumer() {
  await consume(
    'notification.student.enrolled',
    'student.enrolled',
    async (payload) => {
      const event = payload as StudentEnrolledEvent;
      const metadata = event as unknown as Record<string, unknown>;

      // Notify the student directly
      const studentIds = await resolveRecipients({ userId: event.studentId });
      // Notify all current class members (teachers + students already enrolled)
      const classIds = await resolveRecipients({ classId: event.classId });
      // Deduplicate
      const allIds = [...new Set([...studentIds, ...classIds])];

      await db.notification.createMany({
        data: allIds.map((userId) => ({
          userId,
          type: 'student.enrolled',
          title: userId === event.studentId ? 'Ajouté à une classe' : 'Nouvel étudiant dans votre classe',
          body: userId === event.studentId
            ? 'Vous avez été ajouté à une nouvelle classe.'
            : 'Un nouvel étudiant a rejoint votre classe.',
          metadata,
        })),
      });
    },
  );
  console.log('[notification-service] Enrollment consumer started');
}
