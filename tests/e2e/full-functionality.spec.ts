import { expect, test, type Page } from '@playwright/test';

async function runCommand(page: Page, value: string) {
  const command = page.getByLabel('Terminal command');
  await command.fill(value);
  await command.press('Enter');
}

test('all public CLI routes and filters execute', async ({ page }) => {
  await page.goto('/');

  await runCommand(page, 'tail -n 3 experience.log');
  await expect(
    page.getByRole('heading', { name: /tail -n 3 experience\.log/ }),
  ).toBeVisible();
  await expect(
    page.getByText('AI Engineer Intern · Vulcan Labs'),
  ).toBeVisible();

  await runCommand(page, 'ls -la /myworks/projects');
  await expect(
    page.getByRole('heading', { name: /ls -la \/myworks\/projects/ }),
  ).toBeVisible();
  await expect(
    page.getByText('End-to-End Recommendation MLOps & Agentic Platform'),
  ).toBeVisible();
  await expect(page.getByText('ViSpeechFormer', { exact: false })).toHaveCount(
    0,
  );

  await runCommand(page, 'ls -la /myworks/publications');
  await expect(
    page.getByText('ViSpeechFormer', { exact: false }),
  ).toBeVisible();

  await runCommand(page, 'ls -la /myworks/competitions');
  await expect(
    page.getByText('SAGE — Smart App for Graduation Exam Prep'),
  ).toBeVisible();

  await runCommand(page, 'cat contacts.env');
  await expect(page.getByText('khoa.work424@gmail.com')).toBeVisible();

  await runCommand(page, 'ls -lt /blogs');
  await expect(
    page.getByText('Practical Agent Evals for Production Systems'),
  ).toBeVisible();

  await runCommand(page, './whoami');
  await expect(page.getByText('itsmekhoathekid@github')).toBeVisible();
});

test('help, invalid command, CLI search, and CLI theme work', async ({
  page,
}) => {
  await page.goto('/');

  await runCommand(page, 'help');
  await expect(page.getByText(/\/login username=/)).toBeVisible();

  await runCommand(page, 'definitely-not-a-command');
  await expect(page.getByText('command not found — type “help”')).toBeVisible();

  await runCommand(page, '/theme dark');
  await expect(page.locator('.portfolio-app')).toHaveAttribute(
    'data-theme',
    'dark',
  );

  await runCommand(page, '/search "recsys"');
  await expect(
    page.getByLabel('Search published portfolio content'),
  ).toHaveValue('recsys');
  await expect(
    page.getByText('End-to-End Recommendation MLOps & Agentic Platform'),
  ).toBeVisible();
});

test('blog command opens sanitized Markdown detail without admin controls', async ({
  page,
}) => {
  await page.goto('/');
  await runCommand(page, 'bat /blogs/agent-evals.md');
  await expect(page).toHaveURL(/\/blogs\/agent-evals$/);
  await expect(
    page.getByRole('heading', {
      name: 'Practical Agent Evals for Production Systems',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'A minimal evaluator' }),
  ).toBeVisible();
  await expect(
    page.locator('pre').filter({ hasText: 'def evaluate' }),
  ).toBeVisible();
  await expect(page.getByText('edit article', { exact: true })).toHaveCount(0);
  await expect(page.getByText('delete', { exact: true })).toHaveCount(0);
});

test('visitor cannot access admin pages or asset mutations', async ({
  page,
  request,
}) => {
  const editorResponse = await page.goto('/admin/blogs/new/edit');
  expect(editorResponse?.status()).toBe(200);
  await expect(page).toHaveURL(/\/$/);

  const presign = await request.post('/api/admin/assets/presign', {
    data: {
      filename: 'test.png',
      mimeType: 'image/png',
      size: 100,
      purpose: 'cover',
    },
  });
  expect(presign.status()).toBe(401);

  const finalize = await request.post(
    '/api/admin/assets/00000000-0000-4000-8000-000000000000/finalize',
    { data: { width: 1, height: 1, altText: 'test' } },
  );
  expect(finalize.status()).toBe(401);
});

test('failed login stays in viewer mode and redacts the password', async ({
  page,
}) => {
  await page.goto('/');
  await runCommand(
    page,
    '/login username="nobody" password="not-a-real-password"',
  );
  await expect(page.locator('.viewer-state')).toContainText('viewer');
  await expect(page.getByLabel('Terminal command')).toHaveValue(
    '/login username="redacted" password="••••••••"',
  );
  await expect(page.getByText('login failed', { exact: false })).toBeVisible();
  await expect(page.getByText('add', { exact: true })).toHaveCount(0);
});

test('search validation and portrait geometry stay correct', async ({
  page,
  request,
}) => {
  const shortQuery = await request.get('/api/search?q=x');
  expect(shortQuery.ok()).toBeTruthy();
  expect(await shortQuery.json()).toEqual({ results: [] });

  const longQuery = await request.get(`/api/search?q=${'x'.repeat(121)}`);
  expect(longQuery.status()).toBe(400);

  await page.goto('/');
  const geometry = await page.locator('.portrait-frame').evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.width / bounds.height;
  });
  expect(geometry).toBeCloseTo(4 / 3, 2);
});

test('admin can upload rich Markdown, keep a draft private, publish, search, and logout', async ({
  page,
  request,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  test.skip(
    testInfo.project.name === 'mobile',
    'Rich editor workflow runs once on desktop.',
  );
  const slug = `ci-rich-blog-${Date.now()}`;
  const title = `CI Rich Blog ${Date.now()}`;
  const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

  await page.goto('/');
  await runCommand(
    page,
    `/login username="${process.env.ADMIN_USERNAME ?? 'anhkhoa'}" password="${process.env.ADMIN_PASSWORD ?? 'portfolio-test-2026'}"`,
  );
  await expect(page.locator('.viewer-state')).toContainText('admin');
  await expect(page.getByLabel('Terminal command')).toHaveValue(
    '/login username="redacted" password="••••••••"',
  );

  await page.getByRole('button', { name: '/blogs' }).click();
  await page.getByRole('link', { name: 'add' }).click();
  await expect(page).toHaveURL(/\/admin\/blogs\/new\/edit$/);
  await page.getByLabel('title').fill(title);
  await page.getByLabel('slug').fill(slug);
  await page
    .getByLabel('summary')
    .fill('A CI article with every rich Markdown primitive.');
  await page.getByLabel('tags').fill('ci, mermaid, markdown');

  const markdown = `# ${title}

Text before the uploaded image.

## Release-gate matrix

| Layer | Signal | Release gate |
| --- | --- | --- |
| Response | Task score | >= 0.90 |
| Trajectory | Invalid tool calls | 0 |

\`\`\`python
def release(score: float) -> bool:
    return score >= 0.90
\`\`\`

\`\`\`mermaid
flowchart LR
  Draft --> Eval
  Eval --> Publish
\`\`\`
`;
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(markdown);

  await page.locator('.code-pane').evaluate((element, encoded) => {
    const bytes = Uint8Array.from(atob(encoded), (character) =>
      character.charCodeAt(0),
    );
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], 'inline.png', { type: 'image/png' }));
    element.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      }),
    );
  }, png);
  await expect(page.locator('.editor-status')).toContainText(
    'image uploaded and inserted',
  );

  await page.getByRole('button', { name: 'save draft' }).click();
  await expect(page.locator('.editor-status')).toContainText('draft saved');
  const draftResponse = await request.get(`/blogs/${slug}`);
  expect(draftResponse.status()).toBe(404);

  await page.locator('.cover-trigger').click();
  await page.locator('.dropzone-dialog input[type="file"]').setInputFiles({
    name: 'invalid.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  });
  await expect(page.getByText(/SVG is disabled/)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'publish' }).click();

  await expect(page).toHaveURL(new RegExp(`/blogs/${slug}$`));
  await expect(
    page.locator('.article-header').getByRole('heading', { name: title }),
  ).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(
    page.locator('pre').filter({ hasText: 'def release' }),
  ).toBeVisible();
  await expect(page.locator('.mermaid-diagram svg')).toBeVisible();
  await expect(page.locator('.markdown-body img')).toHaveAttribute(
    'src',
    /\/media\/assets\//,
  );

  const searchResponse = await request.get(
    `/api/search?q=${encodeURIComponent(title)}`,
  );
  expect(searchResponse.ok()).toBeTruthy();
  expect(JSON.stringify(await searchResponse.json())).toContain(slug);

  await page.getByText('edit article', { exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/blogs/.+/edit$`));
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'delete' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/');
  await runCommand(page, '/logout');
  await expect(page.locator('.viewer-state')).toContainText('viewer');
  await page.goto('/blogs/agent-evals');
  await expect(page.getByText('edit article', { exact: true })).toHaveCount(0);

  const health = await request.get('/api/health');
  expect(health.ok()).toBeTruthy();
  expect(await health.json()).toMatchObject({ status: 'ok' });
});
