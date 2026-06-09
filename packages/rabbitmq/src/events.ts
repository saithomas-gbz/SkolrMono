export const EXCHANGE = 'skolr.events';

export const ROUTING_KEYS = {
  ABSENCE_CREATED: 'absence.created',
  GRADE_CREATED: 'grade.created',
  STUDENT_ENROLLED: 'student.enrolled',
  MESSAGE_RECEIVED: 'message.received',
} as const;

export type RoutingKey = (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

export interface AbsenceCreatedEvent {
  absenceId: string;
  sessionId: string;
  userId: string;
  role: string;
  justified: boolean;
  reason?: string;
  createdAt: string;
}

export interface GradeCreatedEvent {
  gradeId: string;
  assignmentId: string;
  userId: string;
  classId: string;
  courseId: string;
  value?: number;
  status?: string;
  teacherId: string;
  createdAt: string;
}

export interface StudentEnrolledEvent {
  studentId: string;
  classId: string;
  className: string;
  enrolledAt: string;
}

export interface MessageReceivedEvent {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientIds: string[];
  content: string;
  sentAt: string;
}

export type SkolrEvent =
  | AbsenceCreatedEvent
  | GradeCreatedEvent
  | StudentEnrolledEvent
  | MessageReceivedEvent;
