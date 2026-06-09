import { consume, ROUTING_KEYS, type GradeCreatedEvent } from '@skolr/rabbitmq';

export async function startGradeConsumer(): Promise<void> {
  await consume<GradeCreatedEvent>(
    'notification.grade.created',
    ROUTING_KEYS.GRADE_CREATED,
    async (event) => {
      console.info('[notification-service] grade.created received:', {
        gradeId: event.gradeId,
        userId: event.userId,
        classId: event.classId,
        value: event.value,
      });
      // TODO: notify student/parent of new grade
    },
  );
}
