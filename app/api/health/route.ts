import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function GET() {
  const authConfigured = Boolean(
    process.env.NEON_AUTH_BASE_URL &&
    process.env.NEON_AUTH_COOKIE_SECRET &&
    process.env.NEON_AUTH_COOKIE_SECRET.length >= 32
  );
  let databaseConnected = false;
  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      const rows = await sql`select 1 as ok`;
      databaseConnected = rows[0]?.ok === 1;
    } catch (error) {
      console.error("[api/health] database ping failed", error);
    }
  }
  const ready = authConfigured && databaseConnected;
  return Response.json({
    status: ready ? "ready" : "needs-configuration",
    checks: {
      authenticationConfigured: authConfigured,
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      databaseConnected,
    },
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
    note: "Submission drafts, shared records and carrier setup are available when the database is connected. Each user still needs an approved agency membership for agency-owned records. Live carrier rating, automated appetite decisions, binding and private document storage require additional authorized integrations and configuration.",
  }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
