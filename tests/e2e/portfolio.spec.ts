import { expect, test } from '@playwright/test';

test('visitor can navigate by CLI and never sees admin controls', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    'href',
    '/favicon.svg',
  );
  await expect(page.getByText('itsmekhoathekid@github')).toBeVisible();
  await expect(page.getByText('add', { exact: true })).toHaveCount(0);
  await expect(page.getByText('edit', { exact: true })).toHaveCount(0);
  const command = page.getByLabel('Terminal command');
  await command.fill('tail -n 3 experience.log');
  await command.press('Enter');
  await expect(
    page.getByRole('heading', { name: /tail -n 3 experience\.log/ }),
  ).toBeVisible();
});

test('the full prompt row focuses the command input', async ({ page }) => {
  await page.goto('/');
  const command = page.getByLabel('Terminal command');
  await page.locator('.command-line').click({ position: { x: 180, y: 12 } });
  await page.keyboard.type('ls -lt /blogs');
  await expect(command).toHaveValue('ls -lt /blogs');
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: /ls -lt \/blogs/ }),
  ).toBeVisible();
});

test('myworks dropdown overlays content and updates virtual path', async ({
  page,
}) => {
  await page.goto('/');
  const frame = page.locator('.terminal-frame');
  const before = await frame.boundingBox();
  await page.getByRole('button', { name: '/myworks' }).click();
  await page.getByRole('button', { name: '/projects' }).click();
  const after = await frame.boundingBox();
  expect(after?.y).toBe(before?.y);
  await expect(
    page.getByRole('button', { name: '/myworks/projects' }),
  ).toBeVisible();
});

test('search replaces route tabs and returns published resume content', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Search portfolio' }).click();
  await expect(page.getByRole('button', { name: '/home/anhkhoa' })).toHaveCount(
    0,
  );
  await page.getByLabel('Search published portfolio content').fill('recsys');
  await expect(
    page.getByText('End-to-End Recommendation MLOps & Agentic Platform'),
  ).toBeVisible();
});

test('light/night control changes the theme', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to night theme' }).click();
  await expect(page.locator('.portfolio-app')).toHaveAttribute(
    'data-theme',
    'dark',
  );
});
