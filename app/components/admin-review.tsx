"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, RefreshCw, ShieldCheck, X } from "lucide-react";

type AgencyRequest = {
  id: string; legal_name: string; display_name: string; npn: string | null;
  contact_email: string | null; created_at: string; requester_id: string | null;
  requester_name: string | null; requester_email: string | null;
};
type PendingUser = { id: string; email: string; full_name: string; site_role: string; status: string; created_at: string };

export default function AdminReviewPanel() {
  const [agencies, setAgencies] = useState<AgencyRequest[]>([]);
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/requests", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load administrator requests.");
      setAgencies(data.agencies ?? []);
      setUsers(data.users ?? []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function review(action: "review-agency" | "review-user", id: string, decision: string) {
    setBusy(id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "review-agency" ? { action, id, decision } : { action, id, status: decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Review action failed.");
      setMessage("Review saved.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review action failed.");
    } finally {
      setBusy("");
    }
  }

  return <div className="panel">
    <div className="panel-heading"><div><h2>Administrator review queue</h2><p>Approve agency registrations and activate user accounts.</p></div><button className="secondary-button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={14}/> Refresh</button></div>
    {message && <p role="status" style={{ fontSize: 13, color: "#9b6a2d" }}>{message}</p>}
    {loading && <p className="muted">Loading review queue…</p>}
    {!loading && <>
      <h3 style={{ fontSize: 15, margin: "18px 0 10px" }}>Agency requests ({agencies.length})</h3>
      {!agencies.length && <p className="empty-row">No agency requests are waiting for review.</p>}
      {agencies.map(item => <div key={item.id} className="check-row" style={{ alignItems: "center" }}>
        <span className="check-empty"><Clock3 size={15}/></span>
        <div style={{ flex: 1 }}><b>{item.display_name}</b><small>{item.legal_name} · {item.requester_name || "Unknown requester"} · {item.requester_email || "No email"}{item.npn ? ` · NPN ${item.npn}` : ""}</small></div>
        <button className="secondary-button" disabled={busy === item.id} onClick={() => void review("review-agency", item.id, "rejected")} aria-label="Reject agency"><X size={14}/></button>
        <button className="primary-button" disabled={busy === item.id} onClick={() => void review("review-agency", item.id, "approved")}><Check size={14}/> Approve</button>
      </div>)}
      <h3 style={{ fontSize: 15, margin: "26px 0 10px" }}>Pending user accounts ({users.length})</h3>
      {!users.length && <p className="empty-row">No user accounts are waiting for review.</p>}
      {users.map(item => <div key={item.id} className="check-row" style={{ alignItems: "center" }}>
        <span className="check-empty"><ShieldCheck size={15}/></span>
        <div style={{ flex: 1 }}><b>{item.full_name}</b><small>{item.email} · {item.site_role}</small></div>
        <button className="secondary-button" disabled={busy === item.id} onClick={() => void review("review-user", item.id, "rejected")} aria-label="Reject user"><X size={14}/></button>
        <button className="primary-button" disabled={busy === item.id} onClick={() => void review("review-user", item.id, "active")}><Check size={14}/> Activate</button>
      </div>)}
    </>}
    <div className="readiness-note"><ShieldCheck size={15}/> Every approval is checked again by a database function; hiding this page is not the security boundary.</div>
  </div>;
}
