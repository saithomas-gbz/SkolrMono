import db from '../src/db';

// IDs stables des comptes de dev (alignés sur scripts/seed/dev-users.ts)
const TEACHER_ID = '11111111-1111-1111-1111-111111111103'; // dev.teacher@skolr.local
const STUDENT_ID = '11111111-1111-1111-1111-111111111104'; // dev.student@skolr.local

async function main() {
  const conv = await db.conversation.upsert({
    where: { id: 'seed-conv-1' },
    update: {},
    create: {
      id: 'seed-conv-1',
      name: 'Conversation test',
      participants: {
        create: [
          { userId: TEACHER_ID },
          { userId: STUDENT_ID },
        ],
      },
      messages: {
        create: [
          {
            id: 'seed-msg-1',
            senderId: TEACHER_ID,
            content: 'Bonjour, avez-vous des questions ?',
          },
          {
            id: 'seed-msg-2',
            senderId: STUDENT_ID,
            content: 'Oui, sur le devoir de la semaine.',
          },
          {
            id: 'seed-msg-3',
            senderId: TEACHER_ID,
            content: 'Je vous écoute, posez votre question.',
          },
        ],
      },
    },
  });
  console.log('[seed] Conversation créée :', conv.id);
  console.log('  • Visible par dev.teacher@skolr.local (dev-teacher-123)');
  console.log('  • Visible par dev.student@skolr.local (dev-student-123)');
}

main().catch(console.error).finally(() => db.$disconnect());
