import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

function safeDatabaseFailure(error: unknown) {
  const candidate = error as { code?: unknown; message?: unknown };
  const code = typeof candidate?.code === "string" ? candidate.code : "DATABASE_PING_FAILED";
  const message = typeof candidate?.message === "string" ? candidate.message.toLowerCase() : "";
  if (code === "28P01" || message.includes("password authentication failed")) return "DATABASE_AUTH_FAILED";
  if (code === "3D000" || message.includes("database") && message.includes("does not exist")) return "DATABASE_NAME_INVALID";
  if (code === "ENOTFOUND" || message.includes("getaddrinfo")) return "DATABASE_HOST_NOT_FOUND";
  if (code === "ETIMEDOUT" || message.includes("timeout")) return "DATABASE_CONNECTION_TIMEOUT";
  if (message.includes("certificate") || message.includes("ssl")) return "DATABASE_TLS_ERROR";
  return code.match(/^[A-Z0-9_]{1,48}$/) ? code : "DATABASE_PING_FAILED";
}

export async function GET() {
  const authConfigured = Boolean(
    process.env.NEON_AUTH_BASE_URL &&
    process.env.NEON_AUTH_COOKIE_SECRET &&
    process.env.NEON_AUTH_COOKIE_SECRET.length >= 32
  );
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  let databaseConnected = false;
  let databaseIssue: string | null = null;

  if (databaseConfigured) {
    try {
      const sql = neon(process.env.DATABASE_URL!);
      const rows = await sql`select 1 as ok`;
      // Neon may serialize integer values as either numbers or numeric strings.
      databaseConnected = Number(rows[0]?.ok) === 1;
      if (!databaseConnected) databaseIssue = "DATABASE_PING_UNEXPECTED_RESULT";
    } catch (error) {
      databaseIssue = safeDatabaseFailure(error);
      console.error("[api/health] database ping failed", databaseIssue);
    }
  } else {
    databaseIssue = "DATABASE_URL_MISSING";
  }

  const ready = authConfigured && databaseConnected;
  return Response.json({
    status: ready ? "ready" : "needs-configuration",
    checks: {
      authenticationConfigured: authConfigured,
      databaseConfigured,
      databaseConnected,
    },
    diagnostics: { databaseIssue },
    capabilities: {
      authenticatedWorkspace: authConfigured,
      submissionDrafts: databaseConnected,
      sharedAgencyRecords: databaseConnected,
      carrierManagement: databaseConnected,
      manualCarrierPortal: databaseConnected,
      carrierApiRating: false,
      appetiteAutomation: false,
      bindingAndPolicyIssuance: false,
      privateDocumentStorage: false,
    },
    note: "Submission drafts, shared records and carrier setup are available when the production database connection works. Each user still needs an approved agency membership for agency-owned records. Live carrier rating, automated appetite decisions, binding and private document storage require additional authorized integrations and configuration.",
  }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
