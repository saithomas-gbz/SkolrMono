import { test, expect, loginAs } from '../fixtures/auth';

test('la messagerie liste la conversation de démonstration', async ({ page }) => {
  // La conversation seedée (seed-conv-1) a pour participants dev.teacher et
  // dev.student — on se connecte donc en élève pour la voir.
  await loginAs(page, 'student');
  await page.goto('/messages');

  await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();
  await expect(page.getByText('Conversation test')).toBeVisible();
});
