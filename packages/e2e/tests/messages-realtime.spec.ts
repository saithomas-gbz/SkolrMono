import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { loginAs, loginApi } from '../fixtures/auth';

/**
 * Temps réel de la messagerie (issue #243). Chaque scénario pilote deux
 * navigateurs distincts — un enseignant, un élève — et vérifie ce que voit le
 * destinataire *sans* rechargement de page : c'est précisément ce que le
 * polling de secours masquait avant le correctif.
 */

const CONVERSATION_PREFIX = 'E2E temps reel';

/** Ouvre `/messages`, hydratation terminée et WebSocket connectée. */
async function openMessages(page: Page): Promise<void> {
  await page.goto('/messages');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Messages' }).first()).toBeVisible();
}

/**
 * Crée une conversation par l'API plutôt que par le formulaire : le scénario
 * porte sur ce que reçoit le destinataire, pas sur la boîte de dialogue. Le
 * jeton est passé explicitement — le backend authentifie sur l'en-tête
 * `Authorization`, que le contexte navigateur ne rejoue pas.
 */
async function createConversation(
  context: BrowserContext,
  token: string,
  name: string,
  participantIds: string[],
): Promise<string> {
  const response = await context.request.post('/api/message/conversations', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, participantIds },
  });
  expect(response.status()).toBe(201);
  const { data } = (await response.json()) as { data: { id: string } };
  return data.id;
}

async function sendMessage(
  context: BrowserContext,
  token: string,
  conversationId: string,
  content: string,
) {
  const response = await context.request.post(`/api/message/conversations/${conversationId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { content },
  });
  expect(response.status()).toBe(201);
}

test.describe('messagerie temps reel', () => {
  test('une conversation creee par un tiers apparait sans rechargement', async ({ browser }) => {
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();
    const teacher = await teacherContext.newPage();
    const student = await studentContext.newPage();

    await loginAs(teacher, 'teacher');
    await loginAs(student, 'student');
    const { userId: studentId } = await loginApi(studentContext.request, 'student');
    const { token: teacherToken } = await loginApi(teacherContext.request, 'teacher');

    await openMessages(student);

    const name = `${CONVERSATION_PREFIX} nouvelle ${Date.now()}`;
    await createConversation(teacherContext, teacherToken, name, [studentId]);

    // Aucun `reload()` ici : la conversation doit arriver par la WebSocket.
    await expect(student.getByText(name)).toBeVisible({ timeout: 15_000 });

    await teacherContext.close();
    await studentContext.close();
  });

  test('un message recu incremente le compteur de non-lus de la conversation', async ({ browser }) => {
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();
    const teacher = await teacherContext.newPage();
    const student = await studentContext.newPage();

    await loginAs(teacher, 'teacher');
    await loginAs(student, 'student');
    const { userId: studentId } = await loginApi(studentContext.request, 'student');
    const { token: teacherToken } = await loginApi(teacherContext.request, 'teacher');

    const name = `${CONVERSATION_PREFIX} badge ${Date.now()}`;
    const conversationId = await createConversation(teacherContext, teacherToken, name, [studentId]);

    // L'élève reste sur la liste, sans ouvrir la conversation : le badge est
    // le seul retour visible, et il restait figé avant le correctif.
    await openMessages(student);
    const row = student.locator('li', { hasText: name }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });

    await sendMessage(teacherContext, teacherToken, conversationId, 'premier message non lu');
    await expect(row.locator('.unread-badge')).toHaveText('1', { timeout: 15_000 });

    await sendMessage(teacherContext, teacherToken, conversationId, 'deuxieme message non lu');
    await expect(row.locator('.unread-badge')).toHaveText('2', { timeout: 15_000 });

    await teacherContext.close();
    await studentContext.close();
  });

  test('un message recu s affiche dans la conversation ouverte', async ({ browser }) => {
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();
    const teacher = await teacherContext.newPage();
    const student = await studentContext.newPage();

    await loginAs(teacher, 'teacher');
    await loginAs(student, 'student');
    const { userId: studentId } = await loginApi(studentContext.request, 'student');
    const { token: teacherToken } = await loginApi(teacherContext.request, 'teacher');

    const name = `${CONVERSATION_PREFIX} direct ${Date.now()}`;
    const conversationId = await createConversation(teacherContext, teacherToken, name, [studentId]);

    await openMessages(student);
    await student.getByText(name).first().click();

    const content = `message temps reel ${Date.now()}`;
    await sendMessage(teacherContext, teacherToken, conversationId, content);

    // `.message-content` cible le fil de discussion : le même texte apparaît
    // aussi dans l'aperçu de la conversation, côté liste.
    await expect(student.locator('.message-content', { hasText: content })).toBeVisible({ timeout: 15_000 });

    await teacherContext.close();
    await studentContext.close();
  });

  test('la messagerie reste utilisable quand la WebSocket est injoignable', async ({ browser }) => {
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();
    const teacher = await teacherContext.newPage();
    const student = await studentContext.newPage();

    await loginAs(teacher, 'teacher');
    await loginAs(student, 'student');
    const { userId: studentId } = await loginApi(studentContext.request, 'student');
    const { token: teacherToken } = await loginApi(teacherContext.request, 'teacher');

    // La WebSocket est coupée dès le handshake, avant même la première
    // connexion réussie : c'est le cas qui figeait totalement la messagerie,
    // le polling de secours n'étant armé qu'après une connexion établie.
    await student.routeWebSocket(/\/message\/ws/, (ws) => ws.close());

    const name = `${CONVERSATION_PREFIX} repli ${Date.now()}`;
    const conversationId = await createConversation(teacherContext, teacherToken, name, [studentId]);

    await openMessages(student);
    await student.getByText(name).first().click();

    const content = `message via polling ${Date.now()}`;
    await sendMessage(teacherContext, teacherToken, conversationId, content);

    // Le polling des messages tourne toutes les 5 s.
    await expect(student.locator('.message-content', { hasText: content })).toBeVisible({ timeout: 30_000 });

    await teacherContext.close();
    await studentContext.close();
  });

  test('les autres sessions de l expediteur recoivent son propre message', async ({ browser }) => {
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();
    const teacherTab1 = await teacherContext.newPage();
    const student = await studentContext.newPage();

    await loginAs(teacherTab1, 'teacher');
    await loginAs(student, 'student');
    const { userId: studentId } = await loginApi(studentContext.request, 'student');
    const { token: teacherToken } = await loginApi(teacherContext.request, 'teacher');

    const name = `${CONVERSATION_PREFIX} multi-session ${Date.now()}`;
    await createConversation(teacherContext, teacherToken, name, [studentId]);

    // Deuxième session de l'enseignant (autre onglet, autre appareil) ouverte
    // sur la même conversation : elle doit refléter ce qu'il envoie ailleurs.
    const teacherTab2 = await teacherContext.newPage();
    await openMessages(teacherTab1);
    await teacherTab1.getByText(name).first().click();
    await openMessages(teacherTab2);
    await teacherTab2.getByText(name).first().click();

    const content = `envoye depuis l autre session ${Date.now()}`;
    await teacherTab1.getByRole('textbox').last().fill(content);
    await teacherTab1.keyboard.press('Enter');

    await expect(teacherTab2.locator('.message-content', { hasText: content })).toBeVisible({ timeout: 15_000 });
    // L'onglet émetteur ne doit pas afficher le message en double.
    await expect(teacherTab1.locator('.message-content', { hasText: content })).toHaveCount(1);

    await teacherContext.close();
    await studentContext.close();
  });

  test('la presence reste en ligne quand un onglet sur deux se ferme', async ({ browser }) => {
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();
    const teacher = await teacherContext.newPage();
    const studentTab1 = await studentContext.newPage();

    await loginAs(teacher, 'teacher');
    await loginAs(studentTab1, 'student');
    const { userId: studentId } = await loginApi(studentContext.request, 'student');
    const { token: teacherToken } = await loginApi(teacherContext.request, 'teacher');

    const name = `${CONVERSATION_PREFIX} presence ${Date.now()}`;
    await createConversation(teacherContext, teacherToken, name, [studentId]);

    await openMessages(studentTab1);
    const studentTab2 = await studentContext.newPage();
    await openMessages(studentTab2);

    const isOnline = async () => {
      const response = await teacherContext.request.get(`/api/message/presence?userIds=${studentId}`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });
      const { data } = (await response.json()) as { data: { online: boolean }[] };
      return data[0]?.online ?? false;
    };

    await expect.poll(isOnline, { timeout: 15_000 }).toBe(true);

    // Fermeture d'un seul onglet : l'élève reste connecté par l'autre, la
    // présence diffusée à ses interlocuteurs ne doit pas basculer hors ligne.
    await studentTab2.close();
    await studentTab1.waitForTimeout(2_000);
    expect(await isOnline()).toBe(true);

    await teacherContext.close();
    await studentContext.close();
  });
});
