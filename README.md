# Galini Rate & Connect

A separate insurance quoting and carrier-appetite workspace. This repository is independent from the Galini Training Portal.

## Development

```bash
npm install
npm run dev
```

## Required runtime configuration

Configure these values in Netlify (Production and Deploy Preview contexts):

- `DATABASE_URL` — pooled Neon PostgreSQL connection string for database `galini_rate_connect`, using the restricted `galini_runtime` role.
- `NEON_AUTH_BASE_URL` — Neon Auth URL for the same Neon branch and database.
- `NEON_AUTH_COOKIE_SECRET` — a random secret of at least 32 characters. Keep it private.
- `NEXT_PUBLIC_NEON_AUTH_URL` — retained for compatibility with Neon client integrations. The current Next.js SDK uses the same-origin auth proxy and does not read this variable in browser code.

Never commit real secrets or place them in client-side code.

## Authentication and account provisioning

Neon Managed Better Auth is integrated using `@neon/auth`. The dashboard root is protected by the Next.js auth proxy. Authenticated visits to `/api/me` create a minimal Galini profile with the database defaults (`site_role = agent`, `status = pending`) and return only the signed-in user's profile and agency memberships.

Users can submit an agency registration request from **Agencies & Agents**. Requests are stored as pending and the initial agency-admin membership remains invited until a site administrator approves the agency. Approval activates that agency membership and the requesting account. Sign-in alone never grants site-admin rights, agency membership, carrier access, or permission to bind coverage.

## Administrator setup

The **Site Admin** review queue is shown only to accounts whose database role is `site_admin`. The first site administrator must be provisioned by the database owner after that person has registered and signed in; there is intentionally no public self-service admin bootstrap. Subsequent user and agency reviews are performed through database-guarded administrator functions.

## Database security

Migration `db/migrations/0002_rls_and_agency_approval.sql` adds row-level security across all `app` tables, limits profile writes, and defines guarded functions for agency requests and administrator approvals. It has been tested on a separate Neon branch; it must still be reviewed and explicitly applied to the primary database before shared agency records are enabled.

## Diagnostics

Open `/diagnostics` to check whether authentication is configured and whether the database can be reached. The endpoint reports booleans only and never returns credentials.

## Current feature boundaries

The dashboard's quote drafts remain browser-local. Shared agency submissions are not enabled until the database migration is applied to the primary branch, an initial site administrator is securely provisioned, and end-to-end tests are complete.

Carrier appetite rules, carrier API rating, live quote comparisons, ACORD exchange, binding, policy issuance, and private document uploads remain disabled until authorized carrier integrations and secure workflows are configured. Sample or test data must never be represented as live carrier offers.

## Release process

Changes are prepared on a feature branch for review. Do not merge to `main` or deploy to production until build checks, authentication trusted-origin configuration, database authorization, and end-to-end tests pass.
