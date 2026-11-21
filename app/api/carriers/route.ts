import { neon } from "@neondatabase/serverless";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type AdminContext =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

async function getAdmin(): Promise<AdminContext> {
  const { data, error } = await auth.getSession();
  if (error || !data?.user) {
    return { ok: false, response: Response.json({ error: "Sign in required." }, { status: 401 }) };
  }
  if (!process.env.DATABASE_URL) {
    return { ok: false, response: Response.json({ error: "Database is not configured." }, { status: 503 }) };
  }

  const sql = neon(process.env.DATABASE_URL);
  try {
    const result = await sql.transaction([
      sql`select set_config('app.user_id', ${data.user.id}, true)`,
      sql`select app.is_site_admin() as allowed`,
    ]) as unknown as [Array<Record<string, unknown>>, Array<{ allowed: boolean }>];
    if (!result[1]?.[0]?.allowed) {
      return { ok: false, response: Response.json({ error: "Site administrator access is required to manage carrier connections." }, { status: 403 }) };
    }
  } catch {
    return { ok: false, response: Response.json({ error: "Carrier settings are unavailable for this account." }, { status: 403 }) };
  }
  return { ok: true, userId: data.user.id };
}

export async function GET() {
  const context = await getAdmin();
  if (!context.ok) return context.response;
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql.transaction([
      sql`select set_config('app.user_id', ${context.userId}, true)`,
      sql`select c.id, c.name, c.website, c.integration_status,
        cc.connection_type, cc.status as connection_status, cc.environment
        from app.carriers c
        left join lateral (
          select connection_type, status, environment
          from app.carrier_connections
          where carrier_id = c.id
          order by case when environment = 'production' then 0 else 1 end, created_at desc
          limit 1
        ) cc on true
        order by c.name asc`,
    ]) as unknown as [Array<Record<string, unknown>>, Array<Record<string, unknown>>];
    return Response.json({ carriers: result[1] || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not load carrier records." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const context = await getAdmin();
  if (!context.ok) return context.response;

  let body: { name?: unknown; portalUrl?: unknown; mode?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const portalUrl = typeof body.portalUrl === "string" ? body.portalUrl.trim() : "";
  const mode = body.mode;
  if (name.length < 2) return Response.json({ error: "Enter a valid carrier name." }, { status: 400 });
  if (!["manual", "direct_api", "aggregator"].includes(String(mode))) {
    return Response.json({ error: "Choose a supported connection method." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(portalUrl);
  } catch {
    return Response.json({ error: "Enter a valid official portal URL." }, { status: 400 });
  }
  if (parsed.protocol !== "https:") {
    return Response.json({ error: "Carrier portal URLs must use HTTPS." }, { status: 400 });
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql.transaction([
      sql`select set_config('app.user_id', ${context.userId}, true)`,
      sql`insert into app.carriers (name, website, integration_status)
        values (${name}, ${portalUrl}, 'pending_authorization')
        on conflict (name) do update
          set website = excluded.website, updated_at = now()
        returning id`,
    ]) as unknown as [Array<Record<string, unknown>>, Array<{ id: string }>];
    const carrierId = result[1]?.[0]?.id;
    if (!carrierId) throw new Error("Carrier was not created.");

    await sql.transaction([
      sql`select set_config('app.user_id', ${context.userId}, true)`,
      sql`insert into app.carrier_connections
        (carrier_id, connection_type, environment, status, capabilities)
        values (
          ${carrierId}::uuid,
          ${mode},
          'production',
          'pending_authorization',
          ${JSON.stringify({ portal_login: mode === "manual", api_authorization_required: mode !== "manual" })}::jsonb
        )
        on conflict (carrier_id, connection_type, environment)
        do update set
          status = 'pending_authorization',
          capabilities = excluded.capabilities,
          updated_at = now()`,
    ]);
    return Response.json({ success: true, carrierId }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not save this carrier. Confirm your site administrator access and try again." }, { status: 500 });
  }
}
