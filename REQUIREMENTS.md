# C2I2A / ICAIA Platform Requirements

This document lists the external services, accounts, subscriptions, secrets, local software, production configuration, and presentation-day checks required to run the conference platform reliably.

It is intended as an operational checklist for the project owner, future maintainers, and presentation/demo day. It is not a replacement for `.env.example`, `README.md`, migrations, or the security/context documentation.

## 1. What the application depends on

The application is a single Next.js + Payload CMS application with a PostgreSQL database, private file storage, transactional email, and Vercel deployment.

Runtime dependencies:

| Requirement | Purpose | Required for production? | Paid subscription required by the code? |
| --- | --- | --- | --- |
| Vercel project | Hosts the Next.js/Payload application | Yes for the intended deployment | No specific paid plan is hardcoded; plan limits must be checked for the expected traffic/runtime/cron usage |
| Neon PostgreSQL | Main application/CMS database | Yes | No specific paid plan is hardcoded; the selected plan must provide enough storage, connections, and uptime |
| Vercel Blob | Private submission/payment-related file storage | Yes for durable private uploads | No specific paid plan is hardcoded; storage/bandwidth limits must be monitored |
| Resend | Transactional email provider | Yes if real email delivery is required | No specific paid plan is hardcoded; sending/domain limits depend on the current Resend plan |
| Sending domain + DNS access | Allows Resend to send from an official conference address | Recommended for real production email | Domain registration/DNS hosting may have a cost depending on provider |
| GitHub repository access | Source control and Vercel deployment source | Required for the project workflow | Depends on organization/account needs; the application itself does not require a paid GitHub plan |
| Internet connection | External database, Blob, Resend, Vercel, and live demo access | Yes for the hosted system | N/A |

Important: exact provider pricing and free-tier quotas change over time. No feature in the codebase currently requires a particular commercial plan, but production usage must stay within the selected provider limits.

## 2. Required accounts and permissions

The project owner/maintainer should have access to all of the following:

- **GitHub**: access to `c2i2aconf/c2i2a-conference` with permission to push/merge when needed.
- **Vercel**: access to the Vercel project connected to the repository and permission to view deployments, configure environment variables, Blob, domains, and cron/scheduled execution.
- **Neon**: access to the production database/project plus the isolated test branch/database.
- **Resend**: access to the API key, sending-domain configuration, delivery logs, and domain verification status.
- **DNS/domain provider**: access to the official domain's DNS if a custom website domain or verified Resend sender is used.
- **Payload admin**: at least one production administrator account. Editors/reviewers should use their own role-appropriate accounts.

Do not share one administrator account between multiple people for normal operation.

## 3. Local development software

Required on a developer/demo laptop:

- Git
- Node.js matching the repository engine requirement: `^20.19.0 || ^22.13.0 || >=24.0.0`
- npm
- a modern browser
- network access to the configured Neon/Vercel/Resend services when those features are being exercised

Common setup:

```bash
npm install
npm run dev
```

For a production-style check:

```bash
npm run build
npm start
```

Useful verification commands:

```bash
npm run lint
npx tsc --noEmit
npm run test:int
npm run test:e2e
```

Database-backed tests must use the isolated `TEST_DATABASE_URL`; they must never fall back to the normal application database.

## 4. Production environment variables

The production deployment must have the required secrets/configuration set in Vercel. Never commit real secret values to Git.

| Variable | Production role | Required? | Where it comes from |
| --- | --- | --- | --- |
| `DATABASE_URL` | Main Neon PostgreSQL connection | Yes | Neon production database/project |
| `PAYLOAD_SECRET` | Payload signing/encryption secret | Yes | Generate a strong random secret and store only in secret management/Vercel |
| `NEXT_PUBLIC_SERVER_URL` | Canonical public application URL used in links/metadata/email | Yes for production | Final Vercel/custom-domain URL |
| `BLOB_READ_WRITE_TOKEN` | Private Vercel Blob access | Yes for durable private uploads | Vercel Blob store |
| `RESEND_API_KEY` | Transactional email provider authentication | Yes when real email is enabled | Resend |
| `EMAIL_FROM` | Verified sender address | Yes when real email is enabled | Resend-verified domain/address |
| `EMAIL_FROM_NAME` | Display sender name | Optional | Project choice |
| `EMAIL_OUTBOX_ENCRYPTION_KEY` | Encrypts durable outbox message snapshots | Yes for production email outbox | Independently generated strong key; do not reuse `PAYLOAD_SECRET` |
| `CRON_SECRET` | Protects the internal email-outbox worker endpoint | Yes when scheduled worker is enabled | Independently generated strong secret |
| `TEST_DATABASE_URL` | Isolated integration/E2E database | Tests only; not a production runtime dependency | Separate Neon test branch/database |
| `PAYLOAD_DB_PUSH` | Controls schema push behavior | Environment-specific | Normally migrations should manage deployed schema |

Test-only flags such as `PAYLOAD_TEST_ENV` should not be permanently configured as production environment variables.

## 5. Email requirements

The application now has a durable email outbox for the current transactional notification paths.

For production email to function:

1. A valid `RESEND_API_KEY` must exist.
2. `EMAIL_FROM` must use an allowed/verified sender.
3. For normal external recipients, the official sending domain should be verified in Resend with the DNS records Resend requires.
4. `EMAIL_OUTBOX_ENCRYPTION_KEY` must be configured independently from other secrets.
5. `CRON_SECRET` must protect scheduled worker execution.
6. A reliable scheduled invocation of the email-outbox worker route must be configured.
7. Resend delivery logs should be accessible to an operator for ambiguous/provider-side reconciliation.

The application treats provider acceptance as `sent`; inbox delivery/bounces are a separate concern.

### Current operational TODO

`vercel.json` currently defines the framework/build command but does not yet define the email-outbox cron schedule. Production worker scheduling must therefore be configured/verified during the deployment-readiness ticket before relying on automatic retries.

## 6. Database requirements

### Production database

A dedicated Neon PostgreSQL production database is required.

Before deployment:

- verify the production connection string;
- verify the deployment is not using the test branch;
- apply/review committed Payload migrations in order;
- confirm migration history matches the deployed schema;
- back up or branch before risky production schema work;
- never use `migrate:fresh` against production.

The Vercel build command is `npm run ci`, which runs the migration script before the production build. Production migration readiness therefore matters before a deployment is triggered.

### Test database

Integration/E2E tests require a different, disposable database or Neon branch through `TEST_DATABASE_URL`.

The safety guard intentionally rejects unsafe test configuration, including attempts to reuse the normal application database.

## 7. Private file-storage requirements

Private conference files use Vercel Blob through access-controlled application routes.

Production requires:

- a Blob store linked to the correct Vercel project;
- a valid `BLOB_READ_WRITE_TOKEN`;
- confirmation that private submission/revision/camera-ready/payment-related files are not publicly exposed by direct application access;
- enough Blob storage/bandwidth for expected conference uploads.

Never put private conference documents in the public Git repository.

## 8. Deployment requirements

The intended topology is:

`GitHub main branch -> Vercel -> Next.js/Payload -> Neon + Vercel Blob + Resend`

Before considering production healthy, verify:

- Vercel is connected to the correct GitHub repository;
- the production branch is `main` (or the explicitly chosen release branch);
- the deployed commit SHA matches the commit expected by the project owner;
- the latest production deployment succeeded rather than Vercel serving an older successful build;
- all required Production environment variables exist;
- Preview variables are configured when Preview deployments are expected to work;
- `NEXT_PUBLIC_SERVER_URL` matches the real production URL;
- pending migrations are understood and safe;
- `/fr`, `/en`, `/admin`, account/auth flows, archive routes, private files, and email behavior are smoke-tested;
- the email-outbox worker is scheduled and authenticated;
- the application is tested on the final custom domain if one will be used.

## 9. API/service integrations used by the project

### External integrations

- **Neon PostgreSQL** — database connectivity.
- **Vercel Blob** — private/durable uploaded objects.
- **Resend API** — transactional email delivery.
- **Vercel deployment/runtime** — hosting and scheduled worker execution.

### Application APIs

Payload exposes application APIs such as REST and GraphQL. These are part of the application itself, not additional paid third-party subscriptions. Authorization/business rules must remain enforced at the Payload/backend layer rather than relying only on the frontend.

## 10. Domain and DNS requirements

A custom domain is not strictly required for a technical demo because the Vercel URL can be used.

For a polished real deployment, recommended requirements are:

- official conference domain/subdomain;
- access to its DNS provider;
- domain connected and verified in Vercel;
- HTTPS functioning on the final domain;
- Resend SPF/DKIM/domain records configured as instructed by Resend;
- `NEXT_PUBLIC_SERVER_URL` and `EMAIL_FROM` updated to the final production domain/sender.

Do not change DNS on presentation day unless necessary; verify it beforehand.

## 11. Application operator requirements

Before opening a real conference edition, organizers should have:

- at least one Payload administrator;
- appropriate editor/reviewer accounts;
- confirmed conference dates/content;
- registration/submission gates deliberately configured;
- fee categories confirmed;
- accepted payment-proof formats configured;
- official invitation wording/assets approved before PDF generation is enabled;
- tested email sender/domain;
- tested private file upload/download;
- tested backup/recovery procedure or at minimum a recent database branch/backup.

## 12. Presentation/demo-day checklist

### At least one day before

- [ ] Pull/merge the final `main` branch.
- [ ] Confirm Git working tree is clean on the demo machine.
- [ ] Confirm Vercel production shows the expected latest commit.
- [ ] Confirm the production deployment is successful.
- [ ] Confirm the live FR and EN home pages load.
- [ ] Confirm `/admin` loads and the demo/admin account can sign in.
- [ ] Confirm Neon production connectivity.
- [ ] Confirm private Blob upload/download works.
- [ ] Confirm Resend sender/domain is verified.
- [ ] Send at least one controlled real transactional email and confirm provider acceptance.
- [ ] Confirm the email-outbox worker/cron executes successfully.
- [ ] Confirm no unexpected pending/failed migrations.
- [ ] Confirm the key conference pages and archives render correctly.
- [ ] Check responsive behavior on phone, tablet/laptop, and a wide desktop.
- [ ] Specifically verify hero/title typography does not become excessively large when resolution changes.
- [ ] Prepare demo user/admin/reviewer credentials separately and securely; do not put passwords in this file.
- [ ] Prepare a backup internet connection/hotspot if the presentation depends on the hosted site.

### Local fallback on the presentation laptop

Have a working local copy available in case Vercel/network access fails:

- [ ] repository cloned and dependencies already installed;
- [ ] `.env` prepared locally without committing it;
- [ ] local `npm run dev` tested before presentation day;
- [ ] database used by the fallback is known and intentional;
- [ ] browser bookmarks for local `/fr`, `/en`, `/admin`, and `/account` prepared if useful.

Do not run migrations, destructive seeds, or environment changes live during the presentation unless absolutely necessary.

## 13. Current known readiness items

These are operational/product items to resolve before calling the project fully presentation/production ready:

- **Vercel deployment synchronization:** the live deployment must be checked because an older site version has recently been observed.
- **Responsive UI audit:** the existing UI specification requires mobile/tablet/laptop/wide-desktop behavior; professor feedback specifically identified oversized top/hero text when changing resolution.
- **Email-outbox production setup:** production secrets and worker scheduling must be configured and verified.
- **Invitation PDF generation:** workflow records exist, but official PDF rendering/template work remains a separate product ticket.
- **Payment/invitation correction flows:** correction/revocation/amendment workflows remain a follow-up.
- **Final lifecycle rehearsal:** complete participant-to-review-to-payment/invitation flow should be rehearsed before launch/demo.

## 14. What is not currently required

Unless the project scope changes, the platform does **not** require the following for its current intended operation:

- Stripe/PayPal/card-payment gateway;
- direct bank API/reconciliation integration;
- automatic invoice/tax service;
- automatic reviewer assignment service;
- marketing/newsletter platform;
- AI API subscription;
- separate headless CMS hosting service (Payload runs inside the same application);
- separate GraphQL hosting service.

These may be added later, but they should not be purchased or integrated merely for presentation unless a real requirement is confirmed.

## 15. Secret-management rules

Never commit or paste production credentials into GitHub issues, documentation, screenshots, presentation slides, or chat transcripts.

Treat at minimum these as secrets:

- `DATABASE_URL`
- `TEST_DATABASE_URL`
- `PAYLOAD_SECRET`
- `BLOB_READ_WRITE_TOKEN`
- `RESEND_API_KEY`
- `EMAIL_OUTBOX_ENCRYPTION_KEY`
- `CRON_SECRET`
- administrator passwords
- private magic links/tokens

Use Vercel/environment secret storage and local untracked `.env` files. Rotate any credential that is accidentally exposed.
