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

## Authentication

Neon Managed Better Auth is integrated through the Next.js server proxy. The dashboard root is protected by the auth proxy. New registrations create an authentication identity only; they do not grant site-admin rights, agency membership, carrier access, or permission to bind coverage.

## Diagnostics

Open `/diagnostics` to check whether authentication is configured and whether the database can be reached. The endpoint reports booleans only and never returns credentials.

## Current feature boundaries

The dashboard currently supports browser-local draft submissions only. Shared agency records are not yet enabled because authenticated profile provisioning, agency approval, membership authorization, and row-level security enforcement must be completed first.

Carrier appetite rules, carrier API rating, live quote comparisons, ACORD exchange, binding, policy issuance, and private document uploads remain disabled until authorized carrier integrations and secure workflows are configured. Sample or test data must never be represented as live carrier offers.

## Release process

Changes are prepared on a feature branch for review. Do not merge to `main` or deploy to production until build checks, authentication trusted-origin configuration, database authorization, and end-to-end tests pass.
