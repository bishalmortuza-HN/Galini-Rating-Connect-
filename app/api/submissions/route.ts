import { neon } from "@neondatabase/serverless";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type SessionUser = { id: string; email?: string; name?: string };

const personalLines = new Set([
  "Personal Auto", "Homeowners", "Renters", "Condo", "Personal Umbrella",
  "Dwelling Fire / Landlord", "Flood", "Motorcycle",
]);

async function getSessionUser() {
  const { data, error } = await auth.getSession();
  if (error || !data?.user?.id) return null;
  return data.user as SessionUser;
}

function databaseUnavailable() {
  return Response.json(
    { error: "Database is not configured." },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!process.env.DATABASE_URL) return databaseUnavailable();

  try {
    const sql = neon(process.env.DATABASE_URL);
    const results = await sql.transaction([
      sql`select set_config('app.user_id', ${user.id}, true)`,
      sql`select s.id,
          'GRC-' || upper(left(replace(s.id::text, '-', ''), 8)) as display_id,
          ap.display_name as insured,
          s.line_of_business as line,
          coalesce(s.data_snapshot->>'zip', '') as zip,
          s.status,
          'Not submitted'::text as carrier,
          to_char(s.updated_at, 'Mon DD, YYYY') as date
        from app.submissions s
        join app.applicants ap on ap.id = s.applicant_id
        join app.agency_memberships am on am.agency_id = s.agency_id
        join app.users u on u.id = am.user_id
        join app.agencies a on a.id = am.agency_id
        where u.auth_subject = ${user.id}
          and u.status = 'active'
          and am.status = 'active'
          and a.status = 'approved'
        order by s.updated_at desc
        limit 200`,
    ]);
    return Response.json({ submissions: results[1] ?? [] }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Unable to load submissions. Check database access and agency permissions." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!process.env.DATABASE_URL) return databaseUnavailable();

  let body: { insured?: unknown; line?: unknown; zip?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const insured = typeof body.insured === "string" ? body.insured.trim().slice(0, 180) : "";
  const line = typeof body.line === "string" ? body.line.trim() : "";
  const zip = typeof body.zip === "string" ? body.zip.trim() : "";
  if (insured.length < 2) return Response.json({ error: "Enter the named insured or business name." }, { status: 400 });
  if (!/^[A-Za-z0-9 /&().’'-]{2,80}$/.test(line)) return Response.json({ error: "Choose a valid line of business." }, { status: 400 });
  if (!/^\d{5}(-\d{4})?$/.test(zip)) return Response.json({ error: "Enter a valid 5-digit ZIP code or ZIP+4." }, { status: 400 });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const access = await sql.transaction([
      sql`select set_config('app.user_id', ${user.id}, true)`,
      sql`select id, status from app.users where auth_subject = ${user.id} limit 1`,
      sql`select a.id as agency_id
          from app.agency_memberships am
          join app.agencies a on a.id = am.agency_id
          join app.users u on u.id = am.user_id
          where u.auth_subject = ${user.id}
            and u.status = 'active'
            and am.status = 'active'
            and a.status = 'approved'
          order by a.display_name
          limit 1`,
    ]);

    const profile = access[1]?.[0] as { id: string; status: string } | undefined;
    const membership = access[2]?.[0] as { agency_id: string } | undefined;
    if (!profile || profile.status !== "active") {
      return Response.json({ error: "Your account must be active before creating submissions." }, { status: 403 });
    }
    if (!membership) {
      return Response.json({
        error: "Your account does not have an approved agency workspace yet. Submit your agency request and wait for site administrator approval before creating shared submissions.",
        code: "AGENCY_MEMBERSHIP_REQUIRED",
      }, { status: 409 });
    }

    const applicantType = personalLines.has(line) ? "individual" : "business";
    const idempotencyKey = crypto.randomUUID();
    const created = await sql.transaction([
      sql`select set_config('app.user_id', ${user.id}, true)`,
      sql`with applicant as (
          insert into app.applicants (agency_id, created_by, applicant_type, display_name)
          values (${membership.agency_id}::uuid, ${profile.id}::uuid, ${applicantType}, ${insured})
          returning id
        ),
        submission as (
          insert into app.submissions
            (agency_id, applicant_id, created_by, line_of_business, status, idempotency_key, data_snapshot)
          select ${membership.agency_id}::uuid, applicant.id, ${profile.id}::uuid,
            ${line}, 'draft', ${idempotencyKey},
            jsonb_build_object('zip', ${zip}, 'source', 'agency_workspace', 'rating_status', 'not_rated')
          from applicant
          returning id, line_of_business, status, updated_at, data_snapshot
        )
        select submission.id,
          'GRC-' || upper(left(replace(submission.id::text, '-', ''), 8)) as display_id,
          ${insured}::text as insured,
          submission.line_of_business as line,
          submission.data_snapshot->>'zip' as zip,
          submission.status,
          'Not submitted'::text as carrier,
          to_char(submission.updated_at, 'Mon DD, YYYY') as date
        from submission`,
    ]);
    const row = created[1]?.[0];
    if (!row) throw new Error("Submission was not created.");
    return Response.json({ submission: row }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not save the submission. Verify your approved agency access and try again." }, { status: 503 });
  }
}
