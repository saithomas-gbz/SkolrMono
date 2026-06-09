import { consume, ROUTING_KEYS, type StudentEnrolledEvent } from '@skolr/rabbitmq';

export async function startStudentEnrolledConsumer(): Promise<void> {
  await consume<StudentEnrolledEvent>(
    'notification.student.enrolled',
    ROUTING_KEYS.STUDENT_ENROLLED,
    async (event) => {
      console.info('[notification-service] student.enrolled received:', {
        studentId: event.studentId,
        classId: event.classId,
        className: event.className,
      });
      // TODO: send welcome email to parents
    },
  );
}
