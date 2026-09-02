export {};

const baseUrl = process.env.PRODUCTION_URL?.replace(/\/$/, '');
const expectedCommit = process.env.EXPECTED_COMMIT;
if (!baseUrl || !expectedCommit)
  throw new Error('PRODUCTION_URL and EXPECTED_COMMIT are required.');

async function fetchText(path: string) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${path} returned ${response.status}.`);
  return response.text();
}

const deadline = Date.now() + 10 * 60_000;
let health: { status?: string; commit?: string } = {};
while (Date.now() < deadline) {
  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      cache: 'no-store',
    });
    health = (await response.json()) as typeof health;
    if (
      response.ok &&
      health.status === 'ok' &&
      health.commit === expectedCommit
    )
      break;
  } catch {
    // Vercel may not have promoted the deployment yet.
  }
  await new Promise((resolve) => setTimeout(resolve, 10_000));
}
if (health.status !== 'ok' || health.commit !== expectedCommit)
  throw new Error(
    `Production did not reach commit ${expectedCommit}; last health=${JSON.stringify(health)}.`,
  );

const home = await fetchText('/');
for (const marker of ['itsmekhoathekid@github', 'B.Sc. Data Science']) {
  if (!home.includes(marker))
    throw new Error(`Homepage is missing “${marker}”.`);
}

const searchResponse = await fetch(
  `${baseUrl}/api/search?q=${encodeURIComponent('agent evals')}`,
);
if (!searchResponse.ok) throw new Error('Production search failed.');
const search = JSON.stringify(await searchResponse.json());
if (!search.includes('reliable-agent-evals') && !search.includes('Agent Evals'))
  throw new Error('Production search did not return the migrated article.');

const article = await fetchText('/blogs/reliable-agent-evals');
for (const marker of [
  'Release-gate matrix',
  'language-python',
  'markdown-table-wrap',
  'mermaid',
]) {
  if (!article.includes(marker))
    throw new Error(`Article is missing “${marker}”.`);
}

const mediaMatch = article.match(/(?:src|href)="(\/media\/assets\/[^"]+)"/);
if (!mediaMatch) throw new Error('Article does not reference migrated media.');
const mediaResponse = await fetch(`${baseUrl}${mediaMatch[1]}`, {
  method: 'HEAD',
});
if (!mediaResponse.ok) throw new Error('Private R2 media proxy failed.');
if (!mediaResponse.headers.get('cache-control')?.includes('immutable'))
  throw new Error('Media proxy is missing immutable caching.');

console.log(`Production smoke passed at ${baseUrl} (${expectedCommit}).`);
