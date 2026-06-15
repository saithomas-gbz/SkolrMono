import db from '../src/db';

async function main() {
  const conv = await db.conversation.upsert({
    where: { id: 'seed-conv-1' },
    update: {},
    create: {
      id: 'seed-conv-1',
      name: 'Conversation test',
      participants: {
        create: [
          { userId: 'seed-user-teacher-1' },
          { userId: 'seed-user-student-1' },
        ],
      },
      messages: {
        create: [
          {
            id: 'seed-msg-1',
            senderId: 'seed-user-teacher-1',
            content: 'Bonjour, avez-vous des questions ?',
          },
          {
            id: 'seed-msg-2',
            senderId: 'seed-user-student-1',
            content: 'Oui, sur le devoir de la semaine.',
          },
          {
            id: 'seed-msg-3',
            senderId: 'seed-user-teacher-1',
            content: 'Je vous écoute, posez votre question.',
          },
        ],
      },
    },
  });
  console.log('[seed] Conversation créée :', conv.id);
}

main().catch(console.error).finally(() => db.$disconnect());
