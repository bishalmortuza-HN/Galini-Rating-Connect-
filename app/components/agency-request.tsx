"use client";

import { FormEvent, useState } from "react";
import { Building2, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";

type Membership = {
  id: string;
  display_name: string;
  agency_status: string;
  role: string;
  membership_status: string;
};

export default function AgencyRequestPanel({ memberships }: { memberships: Membership[] }) {
  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [npn, setNpn] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const pending = memberships.find(item => item.membership_status === "invited" && item.agency_status === "pending");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/agencies/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legalName, displayName, npn, contactEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to submit the agency request.");
      setSubmitted(true);
      setMessage("Your agency request has been submitted for administrator review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit the agency request.");
    } finally {
      setBusy(false);
    }
  }

  const field = "modal-input";
  return <div className="panel">
    <div className="panel-heading">
      <div><h2>Agency registration</h2><p>Request an agency workspace. Approval is required before staff and shared submissions can be accessed.</p></div>
      <span className="stat-icon blue"><Building2 size={18}/></span>
    </div>
    {memberships.filter(item => item.membership_status === "active" && item.agency_status === "approved").map(item =>
      <div key={item.id} className="check-row complete"><span><CheckCircle2 size={17}/></span><div><b>{item.display_name}</b><small>Approved agency · {item.role.replace("_"," ")}</small></div></div>
    )}
    {pending && <div className="notice"><div className="notice-icon"><Clock3 size={17}/></div><div><b>Agency request pending</b><p>{pending.display_name} is awaiting administrator review. You do not need to submit it again.</p></div></div>}
    {!pending && !submitted && <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginTop: 18 }}>
      <label className="field-label">Legal agency name<input className={field} required maxLength={180} value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="Registered legal name"/></label>
      <label className="field-label">Agency display name<input className={field} required maxLength={120} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Name shown in workspace"/></label>
      <label className="field-label">National Producer Number (NPN)<input className={field} maxLength={30} value={npn} onChange={e => setNpn(e.target.value)} placeholder="Optional"/></label>
      <label className="field-label">Agency contact email<input className={field} type="email" maxLength={254} value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="agency@example.com"/></label>
      <div style={{ gridColumn: "1 / -1" }}><button className="primary-button" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit agency for review"}</button></div>
    </form>}
    {message && <p role="status" style={{ marginTop: 14, fontSize: 13, color: submitted ? "#23866d" : "#9b6a2d" }}>{message}</p>}
    <div className="readiness-note"><ShieldCheck size={15}/> Submitting a request does not verify licensing or automatically approve the agency.</div>
  </div>;
}
