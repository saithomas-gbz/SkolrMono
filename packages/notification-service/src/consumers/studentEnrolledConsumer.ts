import { consume, ROUTING_KEYS, type StudentEnrolledEvent } from '@skolr/rabbitmq';
import { sendEmail } from '../notifiers/email.js';

export async function startStudentEnrolledConsumer(): Promise<void> {
  await consume<StudentEnrolledEvent>(
    'notification.student.enrolled',
    ROUTING_KEYS.STUDENT_ENROLLED,
    async (event) => {
      console.info('[notification-service] student.enrolled:', {
        studentId: event.studentId,
        classId: event.classId,
        className: event.className,
      });

      await sendEmail({
        to: `parent+${event.studentId}@skolr.app`,
        subject: `Bienvenue dans la classe ${event.className}`,
        html: `
          <p>Votre enfant (ID: <strong>${event.studentId}</strong>) a été inscrit dans la classe <strong>${event.className}</strong>.</p>
          <p>Date d'inscription : ${new Date(event.enrolledAt).toLocaleString('fr-FR')}</p>
          <p>Bienvenue sur la plateforme Skolr !</p>
        `,
      });
    },
  );
}
