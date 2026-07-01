import { test, expect } from '../fixtures/auth';

test('la cloche de notifications est présente et ouvrable', async ({
  authenticatedPage: page,
}) => {
  const bell = page.getByRole('button', { name: /^Notifications/ });
  await expect(bell).toBeVisible();

  await bell.click();
  // En-tête du panneau déroulant (`notifications.title`).
  await expect(page.getByText('Notifications', { exact: true })).toBeVisible();
});
