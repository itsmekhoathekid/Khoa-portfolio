# Khoa CLI Portfolio CMS

A single-deployable Next.js portfolio whose public interface behaves like a terminal and whose private CMS edits versioned Markdown content.

## What is implemented

- Single-page public routes for `/home/anhkhoa`, `/experiences`, `/myworks/*`, `/contacts`, and `/blogs`.
- A command registry for `./whoami`, `tail`, `ls`, `cat`, `bat`, search, theme, login, password change, and logout.
- Better Auth username sessions. Admin controls are derived from the real session and every mutation checks the session again on the server.
- Draft revisions and explicit publish pointers for blogs, works, and experiences.
- PostgreSQL full-text search populated only when a revision is published.
- CodeMirror Markdown editor with live sanitized preview, inline image drop, draft/save/publish/delete, and responsive editor/preview tabs.
- R2 presigned uploads with file-size, declared MIME, magic-byte, and object metadata checks. SVG is rejected.
- Cover replacement dialog with focal point controls. The asset becomes public only after the containing draft is published.
- Light and night terminal themes and a browser-native colored ASCII renderer based on the supplied source photo. This gives the `jp2a --colors` look without requiring a shell binary in Vercel.

Without environment variables the public app deliberately uses demo published content; admin and upload endpoints stay disabled.

## Local setup

1. Install Node.js 22+ and pnpm.
2. Copy `.env.example` to `.env.local` and fill in Neon, Better Auth, and R2 values.
3. Run `pnpm install`.
4. Run `pnpm db:migrate`.
5. Run `pnpm content:seed` to publish the CV-backed initial works, experience, education, and contacts.
6. Temporarily provide `ADMIN_USERNAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`, then run `pnpm admin:seed`. Remove the password variable afterward.
7. Run `pnpm dev`.

Login is intentionally command-only:

```text
/login username="anhkhoa" password="your-password"
/passwd current="old-password" new="new-password"
/logout
```

Credential commands are marked sensitive and redacted immediately after submit. They are not sent to search, analytics, or application logs.

## Production

Production uses GitHub Actions as the required quality gate and Vercel Git Integration for deployments. Pull requests receive a read-only demo Preview; merging `main` deploys Production in `sin1`.

Configure these Production-only Vercel variables:

```text
DATABASE_URL=<Neon pooled URL with sslmode=require>
BETTER_AUTH_SECRET=<at least 32 random bytes>
BETTER_AUTH_URL=https://<project>.vercel.app
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<bucket-scoped key>
R2_SECRET_ACCESS_KEY=<bucket-scoped secret>
R2_BUCKET=khoa-portfolio-media-prod
NEXT_PUBLIC_MEDIA_URL=/media
```

Do not set `DATABASE_DRIVER` or `R2_FORCE_PATH_STYLE` in Vercel. The R2 bucket stays private: browser uploads use short-lived signed PUT URLs while public reads go through `/media/assets/...`. Allow only the real Production origin in the bucket CORS policy.

The `Migrate Production` workflow needs only `DATABASE_URL` in the protected GitHub Environment named `production`. Set the repository variable `PRODUCTION_URL` to the actual Vercel origin so `Production Smoke` can wait for and verify the exact merged commit.

To migrate local content and all revision history after applying the schema, provide `TARGET_DATABASE_URL` plus the `TARGET_R2_*` variables, then run:

```bash
pnpm content:migrate --dry-run
pnpm content:migrate --apply
pnpm content:migrate --dry-run
```

The migration copies only ready referenced assets, rewrites local media URLs to `/media/*`, excludes auth/session data, rebuilds published search, and fails on UUID/slug/checksum conflicts. Seed the production admin separately:

```bash
ADMIN_USERNAME=anhkhoa ADMIN_EMAIL=<private-admin-email> \
  DATABASE_URL=<production-url> pnpm admin:seed:generated
```

The generated password is printed once and is never written to a file. Remove the seed variables immediately afterward.

The database is the source of truth. Markdown paths shown in the UI are virtual paths; the application never relies on persistent filesystem writes at runtime.

Schedule `pnpm assets:gc` daily (for example with Vercel Cron or CI) to remove incomplete uploads older than 24 hours.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e:ci
```
