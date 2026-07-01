import { test, expect } from '../fixtures/auth';

test('le dashboard et la barre applicative s’affichent après connexion', async ({
  authenticatedPage: page,
}) => {
  await expect(page).toHaveURL(/\/dashboard/);

  // Raccourci messagerie de la barre supérieure (aria-label `nav.messages`).
  await expect(page.getByRole('button', { name: 'Messages' })).toBeVisible();
  // Cloche de notifications (aria-label `notifications.aria_label`).
  await expect(page.getByRole('button', { name: /^Notifications/ })).toBeVisible();
});
