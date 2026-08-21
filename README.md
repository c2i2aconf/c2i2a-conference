# C2I2A Conference Platform

The bilingual, multi-edition conference platform for C2I2A at HEEC Marrakech. Next.js 16 and Payload CMS run as one application: public French and English routes, yearly archives, registration, author submissions, reviewer decisions, email notifications, and the CMS all share one secured content model.

Production: [c2i2a-conference-kappa.vercel.app](https://c2i2a-conference-kappa.vercel.app)

All organization, contact, navigation, edition, program, and page content is managed in `/admin`. The public site falls back gracefully when its database is unavailable.

## Stack

| Layer        | Technology                                                           |
| ------------ | -------------------------------------------------------------------- |
| Web          | Next.js 16 App Router, React 19, TypeScript                          |
| CMS          | Payload CMS 3 at `/admin`, REST at `/api`, GraphQL at `/api/graphql` |
| Data         | Neon Postgres with committed Payload migrations                      |
| Files        | Private Vercel Blob objects served through Payload access control    |
| UI           | Tailwind CSS v4, shadcn/ui, Framer Motion                            |
| Localization | next-intl (`fr` default, `en` fallback to French content)            |
| Email        | Resend and reusable React Email templates                            |
| Tests        | Vitest integration tests and Playwright browser tests                |

## Local setup

1. Copy `.env.example` to `.env` and set at least `DATABASE_URL` and a strong `PAYLOAD_SECRET`.
2. Install dependencies with `npm install`.
3. Apply migrations with `npm run payload -- migrate`.
4. Optionally run the idempotent seed with `npm run seed`.
5. Start the application with `npm run dev`, then open `http://localhost:3000` or `/admin`.

When no user exists, Payload prompts for the first account. Assign the `admin` role before using it for production administration.

## Environment

| Variable                 | Required   | Purpose                                                                                       |
| ------------------------ | ---------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Yes        | Pooled Neon Postgres connection string                                                        |
| `PAYLOAD_SECRET`         | Yes        | Payload signing/encryption secret and privacy-preserving IP hash key                          |
| `NEXT_PUBLIC_SERVER_URL` | Production | Trusted canonical origin used in links, metadata, and email; set to the production Vercel URL |
| `BLOB_READ_WRITE_TOKEN`  | Production | Private Vercel Blob store token                                                               |
| `RESEND_API_KEY`         | For email  | Resend API key; email is disabled locally when absent                                         |
| `EMAIL_FROM`             | For email  | Sender address only, for example `conference@example.org`                                     |
| `EMAIL_FROM_NAME`        | Optional   | Human-readable sender name                                                                    |

Never put credentials in the Git remote URL or commit `.env` files.

## Commands

| Command                  | Purpose                                                     |
| ------------------------ | ----------------------------------------------------------- |
| `npm run dev`            | Start the local development server                          |
| `npm run build`          | Build the production application                            |
| `npm run ci`             | Apply pending migrations, then build (Vercel build command) |
| `npm run generate:types` | Regenerate Payload TypeScript types after schema changes    |
| `npm run migrate:create` | Generate a migration after schema changes                   |
| `npm run migrate:status` | Show applied and pending migrations                         |
| `npm run seed`           | Create/update demo and live content idempotently            |
| `npm run lint`           | Run ESLint                                                  |
| `npx tsc --noEmit`       | Run the TypeScript checker                                  |
| `npm run test:int`       | Run Vitest integration tests                                |
| `npm run test:e2e`       | Run Playwright tests against the dev server                 |

## Security and workflow model

- Public magic links are only for `author` and `attendee` accounts. Admins, editors, and reviewers use Payload password login.
- Magic-link tokens are hashed, single-use, expire after 30 minutes, and are consumed atomically. Requests are non-enumerating and limited to three per email per 15 minutes and twenty per hashed client IP per hour.
- Portal authentication signs Payload-compatible JWT cookies and never creates, replaces, or rotates a user password.
- The admin panel is limited to administrators, editors, and reviewers. User records are visible to administrators or their owner, and only administrators can assign roles.
- Submissions require an authenticated portal account and an enabled edition whose deadline is still in the future. Both the page and server action enforce that rule.
- Submission ownership is forced by hooks. PDFs are private, limited to 4 MB, and validated by MIME type and PDF signature. Failed submissions clean up their uploaded object.
- Reviewers can read all submissions but update only status and review notes. A localized decision email is sent once when the final status actually changes.
- `/account` uses collection access checks and shows only the signed-in user's linked registrations and submissions.

## Schema and migrations

After changing a collection or global:

```bash
npm run generate:types
npm run migrate:create
npm run migrate:status
```

Commit generated files in `src/migrations/`. Production builds use `npm run ci`, which applies pending migrations before `next build`. Do not run a newly generated initial migration against an existing unmanaged database whose tables already exist; use a clean production database or establish a migration baseline first.

## Deployment

The intended production topology is a Vercel project named `c2i2a-conference`, a new Neon production database, and a private Vercel Blob store.

1. Authenticate and link with the Vercel CLI.
2. Provision Neon and private Blob resources for the project.
3. Configure all required variables for Production and Preview. Use distinct secrets/databases when previews must be isolated.
4. Deploy a preview and verify public routes, `/admin`, email, author/reviewer workflows, files, metadata, `sitemap.xml`, and `robots.txt`.
5. Apply migrations, run `npm run seed`, create the first production administrator interactively, set `NEXT_PUBLIC_SERVER_URL` to the generated production URL, and deploy to production.

The seed is safe to rerun and creates localized site settings, an archived edition, a usable live edition, and submission controls.
