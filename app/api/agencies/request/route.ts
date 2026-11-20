import { neon } from "@neondatabase/serverless";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type AgencyRequest = {
  legalName?: unknown;
  displayName?: unknown;
  npn?: unknown;
  contactEmail?: unknown;
};

const cleanText = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request) {
  const { data: session, error } = await auth.getSession();
  if (error || !session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "Database is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  let body: AgencyRequest;
  try {
    body = await request.json() as AgencyRequest;
  } catch {
    return Response.json({ error: "Please submit valid agency details." }, { status: 400 });
  }

  const legalName = cleanText(body.legalName, 180);
  const displayName = cleanText(body.displayName, 120);
  const npn = cleanText(body.npn, 30);
  const contactEmail = cleanText(body.contactEmail, 254).toLowerCase();
  if (legalName.length < 2 || displayName.length < 2) {
    return Response.json({ error: "Legal agency name and display name are required." }, { status: 400 });
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return Response.json({ error: "Enter a valid agency contact email." }, { status: 400 });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const results = await sql.transaction([
      sql`select set_config('app.user_id', ${session.user.id}, true)`,
      sql`select app.request_agency(${legalName}, ${displayName}, ${npn || null}, ${contactEmail || null}) as agency_id`,
    ]);
    return Response.json(
      { success: true, agencyId: results[1]?.[0]?.agency_id, status: "pending" },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { error: "The agency request could not be submitted. You may already have a request awaiting review; otherwise contact the site administrator." },
      { status: 409, headers: { "Cache-Control": "no-store" } }
    );
  }
}
