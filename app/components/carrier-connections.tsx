"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Plus, RefreshCw, ShieldCheck, Globe, KeyRound } from "lucide-react";

type Carrier = { id: string; name: string; website: string | null; integration_status: string; connection_type: string | null; connection_status: string | null; environment: string | null };

async function readResponse(response: Response) {
  const data = await response.json().catch(() => ({})) as { error?: string; code?: string; carriers?: Carrier[] };
  if (!response.ok) {
    const detail = data.code ? ` (${data.code})` : "";
    throw new Error((data.error || `Request failed with status ${response.status}.`) + detail);
  }
  return data;
}

export default function CarrierConnections() {
  const [items, setItems] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [portalUrl, setPortalUrl] = useState("");
  const [mode, setMode] = useState("manual");
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/carriers", { cache: "no-store" });
      const data = await readResponse(response);
      setItems(data.carriers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load carrier settings.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/carriers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), portalUrl: portalUrl.trim(), mode }),
      });
      await readResponse(response);
      setName("");
      setPortalUrl("");
      setMode("manual");
      setShowForm(false);
      setNotice("Carrier saved. Add the official portal URL when available. Portal access remains manual and API rating is inactive until authorized.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save carrier.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="panel carrier-settings">
    <div className="panel-heading">
      <div><h2>Carrier connections</h2><p>Use an authorized API when available, or open the carrier's agent portal for manual quoting.</p></div>
      <button type="button" className="primary-button" aria-expanded={showForm} onClick={() => { setShowForm(v => !v); setError(""); setNotice(""); }}>
        <Plus size={15}/> {showForm ? "Close form" : "Add carrier"}
      </button>
    </div>
    <div className="carrier-method-grid">
      <div className="carrier-method"><span className="line-icon teal"><Globe size={18}/></span><div><b>API / aggregator</b><small>Automated rating only after approved credentials, documentation and connection testing.</small></div><span className="status status-review">Authorization required</span></div>
      <div className="carrier-method"><span className="line-icon violet"><KeyRound size={18}/></span><div><b>Carrier portal login</b><small>Open the carrier's official agent portal and sign in there. MFA and CAPTCHA remain with the carrier.</small></div><span className="status status-draft">Manual workflow</span></div>
    </div>
    {notice && <div className="notice" role="status"><div className="notice-icon"><ShieldCheck size={17}/></div><div><b>Saved</b><p>{notice}</p></div></div>}
    {error && <div className="notice" role="alert"><div className="notice-icon"><ShieldCheck size={17}/></div><div><b>Carrier settings</b><p>{error}</p></div></div>}
    {showForm && <form className="carrier-form" onSubmit={save}>
      <div className="section-heading"><div><h2>Add carrier</h2><p>Add the carrier now; the official portal URL can be added when you have it. Never enter passwords here.</p></div></div>
      <label className="field-label" htmlFor="carrier-name">Carrier name</label>
      <input id="carrier-name" className="modal-input" required minLength={2} maxLength={120} placeholder="e.g. Travelers" value={name} onChange={e => setName(e.target.value)}/>
      <label className="field-label" htmlFor="carrier-portal">Official agent portal / website URL (optional)</label>
      <input id="carrier-portal" className="modal-input" type="url" placeholder="https://..." value={portalUrl} onChange={e => setPortalUrl(e.target.value)}/>
      <label className="field-label" htmlFor="carrier-mode">Connection method</label>
      <div className="select-wrap"><select id="carrier-mode" value={mode} onChange={e => setMode(e.target.value)}><option value="manual">Portal login (manual)</option><option value="direct_api">Direct API (authorization pending)</option><option value="aggregator">Approved aggregator (authorization pending)</option></select></div>
      <div className="modal-info"><ShieldCheck size={16}/> Passwords and MFA codes are never stored by this form. Use the carrier's own sign-in page. API secrets must be provisioned through secure server-side secret storage before activation.</div>
      <div className="modal-actions">
        <button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button>
        <button type="submit" className="primary-button" disabled={saving || name.trim().length < 2}>{saving ? "Saving..." : "Save carrier"}</button>
      </div>
    </form>}
    <div className="panel-heading carrier-list-heading"><div><h2>Configured carriers</h2><p>{items.length} carrier records</p></div><button type="button" className="secondary-button" onClick={load} disabled={loading}><RefreshCw size={14}/> {loading ? "Refreshing..." : "Refresh"}</button></div>
    {loading ? <p className="muted">Loading carrier settings…</p> : items.length === 0 ? <div className="empty-state">No carriers added yet. Add your first carrier to create a portal shortcut or prepare an approved API connection.</div> :
      <div className="table-wrap"><table><thead><tr><th>CARRIER</th><th>METHOD</th><th>STATUS</th><th>PORTAL</th></tr></thead><tbody>{items.map(c => <tr key={c.id}><td><b>{c.name}</b><small>{c.environment || "Production"}</small></td><td>{c.connection_type === "direct_api" ? "Direct API" : c.connection_type === "aggregator" ? "Aggregator" : "Portal / manual"}</td><td><span className="status status-review">{c.connection_status || c.integration_status || "Not configured"}</span></td><td>{c.website ? <a className="carrier-open-link" href={c.website} target="_blank" rel="noopener noreferrer">Open portal <ExternalLink size={13}/></a> : "—"}</td></tr>)}</tbody></table></div>}
    <p className="carrier-security-note"><ShieldCheck size={15}/> Galini does not collect or replay carrier website passwords. Portal sessions are handled by the carrier in a separate tab. No quote, bind or policy action is represented as automated unless a verified integration is enabled.</p>
  </div>;
}
