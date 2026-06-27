import db from '../src/db';

// IDs stables des comptes de dev (alignés sur scripts/seed/dev-users.ts)
const TEACHER_ID = '11111111-1111-1111-1111-111111111103'; // dev.teacher@skolr.local
const STUDENT_ID = '11111111-1111-1111-1111-111111111104'; // dev.student@skolr.local
const CONV_ID = 'seed-conv-1';

async function main() {
  // Conversation (idempotent)
  await db.conversation.upsert({
    where: { id: CONV_ID },
    update: {},
    create: { id: CONV_ID, name: 'Conversation test' },
  });

  // Participants (idempotent via contrainte unique conversationId_userId)
  await db.conversationParticipant.upsert({
    where: { conversationId_userId: { conversationId: CONV_ID, userId: TEACHER_ID } },
    update: {},
    create: { conversationId: CONV_ID, userId: TEACHER_ID },
  });
  await db.conversationParticipant.upsert({
    where: { conversationId_userId: { conversationId: CONV_ID, userId: STUDENT_ID } },
    update: {},
    create: { conversationId: CONV_ID, userId: STUDENT_ID },
  });

  // Messages (idempotent via id stable)
  await db.message.upsert({
    where: { id: 'seed-msg-1' },
    update: {},
    create: {
      id: 'seed-msg-1',
      conversationId: CONV_ID,
      senderId: TEACHER_ID,
      content: 'Bonjour, avez-vous des questions ?',
    },
  });
  await db.message.upsert({
    where: { id: 'seed-msg-2' },
    update: {},
    create: {
      id: 'seed-msg-2',
      conversationId: CONV_ID,
      senderId: STUDENT_ID,
      content: 'Oui, sur le devoir de la semaine.',
    },
  });
  await db.message.upsert({
    where: { id: 'seed-msg-3' },
    update: {},
    create: {
      id: 'seed-msg-3',
      conversationId: CONV_ID,
      senderId: TEACHER_ID,
      content: 'Je vous écoute, posez votre question.',
    },
  });

  // Accusés de lecture — seed-msg-3 intentionnellement non lu par le student
  // → le teacher voit ✓✓ sur msg-1 et msg-2, ✓ simple sur msg-3
  // → le student voit 1 message non lu (badge rouge)
  await db.messageRead.upsert({
    where: { messageId_userId: { messageId: 'seed-msg-1', userId: STUDENT_ID } },
    update: {},
    create: { messageId: 'seed-msg-1', userId: STUDENT_ID },
  });
  await db.messageRead.upsert({
    where: { messageId_userId: { messageId: 'seed-msg-2', userId: TEACHER_ID } },
    update: {},
    create: { messageId: 'seed-msg-2', userId: TEACHER_ID },
  });

  console.log('[seed] seed-conv-1 prête');
  console.log('  seed-msg-1 : envoyé par teacher → lu par student  ✓✓');
  console.log('  seed-msg-2 : envoyé par student → lu par teacher  ✓✓');
  console.log('  seed-msg-3 : envoyé par teacher → non lu par student  ✓  (badge non-lu visible)');
  console.log('  • dev.teacher@skolr.local / dev-teacher-123');
  console.log('  • dev.student@skolr.local  / dev-student-123');
}

main().catch(console.error).finally(() => db.$disconnect());
