import { neon } from "@neondatabase/serverless";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type SessionUser = { id: string; email: string; name: string };

export async function GET() {
  const { data: session, error } = await auth.getSession();
  if (error || !session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const user = session.user as SessionUser;
  if (!user.id || !user.email || !user.name) {
    return Response.json({ error: "Authentication profile is incomplete." }, { status: 422, headers: { "Cache-Control": "no-store" } });
  }
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "Database is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const results = await sql.transaction([
      sql`select set_config('app.user_id', ${user.id}, true)`,
      sql`insert into app.users (auth_subject, email, full_name)
          values (${user.id}, ${user.email.toLowerCase()}, ${user.name})
          on conflict (auth_subject) do nothing`,
      sql`select id, email, full_name, site_role, status
          from app.users where auth_subject = ${user.id} limit 1`,
      sql`select a.id, a.display_name, a.status as agency_status,
                 am.role, am.status as membership_status
          from app.agency_memberships am
          join app.agencies a on a.id = am.agency_id
          join app.users u on u.id = am.user_id
          where u.auth_subject = ${user.id}
            and am.status in ('active','invited')
            and a.status in ('pending','approved')
          order by a.display_name`,
    ]);

    const profile = results[2]?.[0];
    if (!profile) {
      return Response.json(
        { error: "This email is already linked to another workspace identity. Contact the site administrator." },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    return Response.json({ profile, agencies: results[3] ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "Unable to load the account profile. Check the database and account provisioning setup." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
