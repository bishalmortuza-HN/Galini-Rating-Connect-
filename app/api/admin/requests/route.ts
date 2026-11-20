import { neon } from "@neondatabase/serverless";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getAdminSession() {
  const { data, error } = await auth.getSession();
  if (error || !data?.user) return null;
  return data.user;
}

export async function GET() {
  const user = await getAdminSession();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.DATABASE_URL) return Response.json({ error: "Database is not configured." }, { status: 503 });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const results = await sql.transaction([
      sql`select set_config('app.user_id', ${user.id}, true)`,
      sql`select a.id, a.legal_name, a.display_name, a.npn, a.contact_email, a.created_at,
                 u.id as requester_id, u.full_name as requester_name, u.email as requester_email
          from app.agencies a
          left join app.agency_memberships am on am.agency_id = a.id and am.role = 'agency_admin'
          left join app.users u on u.id = am.user_id
          where a.status = 'pending'
          order by a.created_at asc`,
      sql`select id, email, full_name, site_role, status, created_at
          from app.users where status = 'pending' order by created_at asc`,
    ]);
    return Response.json({ agencies: results[1] ?? [], users: results[2] ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Administrator access is required or the database is unavailable." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  const user = await getAdminSession();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.DATABASE_URL) return Response.json({ error: "Database is not configured." }, { status: 503 });

  let body: { action?: unknown; id?: unknown; decision?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!uuidPattern.test(id)) return Response.json({ error: "Invalid record ID." }, { status: 400 });

  try {
    const sql = neon(process.env.DATABASE_URL);
    if (body.action === "review-agency" && (body.decision === "approved" || body.decision === "rejected")) {
      await sql.transaction([
        sql`select set_config('app.user_id', ${user.id}, true)`,
        sql`select app.admin_review_agency(${id}::uuid, ${body.decision})`,
      ]);
      return Response.json({ success: true });
    }

    if (body.action === "review-user" && (body.status === "active" || body.status === "rejected" || body.status === "suspended")) {
      await sql.transaction([
        sql`select set_config('app.user_id', ${user.id}, true)`,
        sql`select app.admin_update_user(${id}::uuid, ${body.status}, 'agent')`,
      ]);
      return Response.json({ success: true });
    }

    return Response.json({ error: "Unsupported administrator action." }, { status: 400 });
  } catch {
    return Response.json({ error: "Administrator permission is required, or the review could not be completed." }, { status: 403 });
  }
}
