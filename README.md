# Galini Rate & Connect

A separate insurance quoting and carrier appetite workspace. This repository is independent from the Galini Training Portal.

## Development

```bash
npm install
npm run dev
```

## Runtime configuration

Set `DATABASE_URL`, `AUTH_SECRET`, and `BLOB_READ_WRITE_TOKEN` in the hosting provider before enabling authenticated database workflows or private document uploads.

## Important

The current dashboard is a development UI. Carrier connections, appetite decisions, quote premiums, binding, and policy issuance must only be enabled after authorized carrier integrations and secure server-side workflows are configured. Do not represent sample or test data as live carrier offers.
