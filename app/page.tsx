"use client";

import { useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth/client";
import AgencyRequestPanel from "@/app/components/agency-request";
import AdminReviewPanel from "@/app/components/admin-review";
import CarrierConnections from "@/app/components/carrier-connections";
import {
  Activity, ArrowRight, ArrowUpRight, Bell, Building2, CarFront, CheckCircle2,
  ChevronDown, CircleHelp, ClipboardList, FileText, Filter, Home, LayoutDashboard,
  LifeBuoy, LogOut, Menu, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles,
  Users, Wallet, X, Zap, BriefcaseBusiness, Umbrella, HeartPulse, Upload, BookOpen
} from "lucide-react";

type AccountProfile = { id: string; email: string; full_name: string; site_role: string; status: string };
type AgencyMembership = { id: string; display_name: string; agency_status: string; role: string; membership_status: string };
type Submission = {
  id: string; display_id: string; insured: string; line: string; zip: string; status: string; carrier: string; date: string;
};
const lines = [
  { name: "Personal Auto", detail: "Private passenger vehicles", icon: CarFront, color: "blue" },
  { name: "Homeowners", detail: "Home, condo & renters", icon: Home, color: "violet" },
  { name: "Commercial Package", detail: "BOP, GL & property", icon: Building2, color: "teal" },
  { name: "Commercial Auto", detail: "Business vehicles & fleets", icon: BriefcaseBusiness, color: "amber" },
  { name: "Workers’ Compensation", detail: "Workers’ compensation", icon: Users, color: "rose" },
  { name: "Umbrella", detail: "Personal & commercial excess", icon: Umbrella, color: "indigo" },
  { name: "Professional Liability", detail: "E&O, cyber & specialty", icon: HeartPulse, color: "green" },
  { name: "General Liability", detail: "Business liability", icon: ShieldCheck, color: "blue" },
  { name: "Commercial Property", detail: "Buildings & business property", icon: Building2, color: "teal" },
  { name: "Liquor Liability", detail: "Liquor-related business liability", icon: Wallet, color: "amber" },
  { name: "Inland Marine", detail: "Tools, equipment & transit", icon: BriefcaseBusiness, color: "violet" },
  { name: "Cyber Liability", detail: "Privacy & network risks", icon: ShieldCheck, color: "green" },
];
const initialSubmissions: Submission[] = [];
const nav = [
  { group: "WORKSPACE", items: [
    { name: "Overview", icon: LayoutDashboard }, { name: "New Quote", icon: Plus },
    { name: "Submissions", icon: ClipboardList }, { name: "Appetite Finder", icon: Sparkles },
    { name: "Quote Comparison", icon: SlidersHorizontal }, { name: "Policies & Renewals", icon: FileText },
  ]},
  { group: "MANAGEMENT", items: [
    { name: "Site Admin", icon: ShieldCheck }, { name: "Agencies & Agents", icon: Users }, { name: "Carrier Connections", icon: ShieldCheck },
    { name: "Documents", icon: FileText }, { name: "Reports", icon: Activity },
  ]},
  { group: "SUPPORT", items: [{ name: "Training & Learning", icon: BookOpen }, { name: "Settings", icon: Settings }, { name: "Help Center", icon: LifeBuoy }]},
];

export default function Dashboard() {
  const [active, setActive] = useState("Overview");
  const [query, setQuery] = useState("");
  const [showQuote, setShowQuote] = useState(false);
  const [selectedLine, setSelectedLine] = useState("Commercial Package");
  const [insured, setInsured] = useState("");
  const [zip, setZip] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [savingSubmission, setSavingSubmission] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [agencies, setAgencies] = useState<AgencyMembership[]>([]);
  const [accountError, setAccountError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/submissions", { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load submissions.");
        if (active) setSubmissions(data.submissions as Submission[]);
      })
      .catch(error => {
        if (active) setSubmissionError(error instanceof Error ? error.message : "Unable to load submissions.");
      })
      .finally(() => { if (active) setSubmissionsLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/me", { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load your account.");
        if (active) { setAccount(data.profile as AccountProfile); setAgencies(data.agencies as AgencyMembership[]); }
      })
      .catch(error => { if (active) setAccountError(error instanceof Error ? error.message : "Unable to load your account."); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => submissions.filter(s =>
    (s.insured + s.id + s.line + s.status).toLowerCase().includes(query.toLowerCase())
  ), [submissions, query]);

  const chooseNav = (name: string) => {
    setActive(name); setMobileOpen(false);
    if (name === "New Quote") setShowQuote(true);
  };
  const createDraft = async () => {
    if (!insured.trim() || !zip.trim() || savingSubmission) return;
    setSavingSubmission(true);
    setSubmissionError("");
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insured: insured.trim(), line: selectedLine, zip: zip.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this submission.");
      setSubmissions(current => [data.submission as Submission, ...current]);
      setInsured(""); setZip(""); setShowQuote(false); setActive("Submissions");
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Could not save this submission.");
    } finally {
      setSavingSubmission(false);
    }
  };

  const statusLabel = (status: string) => status.replaceAll("_", " ").replace(/\\b\\w/g, letter => letter.toUpperCase());
  const statusClass = (status: string) => status === "appetite_review" || status === "submitted" ? "status-review" : status === "referred" || status === "error" ? "status-needed" : "status-draft";

  const signOut = async () => {
    await authClient.signOut();
    window.location.assign("/auth/sign-in");
  };

  const renderSubmissions = () => <div className="panel submissions-panel">
    <div className="panel-heading"><div><h2>Submission pipeline</h2><p>Draft applications and submissions in your workspace.</p></div><button className="primary-button" onClick={() => setShowQuote(true)}><Plus size={15}/> New submission</button></div>
    <div className="table-toolbar"><div className="search-box"><Search size={15}/><input placeholder="Search insured, ID or line..." value={query} onChange={e => setQuery(e.target.value)}/></div><span className="muted">{filtered.length} records</span></div>
    <div className="table-wrap"><table><thead><tr><th>INSURED / ID</th><th>LINE</th><th>ZIP</th><th>STATUS</th><th>UPDATED</th></tr></thead><tbody>
      {filtered.map(s => <tr key={s.id}><td><b>{s.insured}</b><small>{s.display_id}</small></td><td>{s.line}</td><td>{s.zip}</td><td><span className={`status ${statusClass(s.status)}`}>{statusLabel(s.status)}</span></td><td>{s.date}</td></tr>)}
      {!filtered.length && <tr><td colSpan={5} className="empty-row">{submissionsLoading ? "Loading agency submissions…" : "No agency submissions yet. Create a draft to get started."}</td></tr>}
    </tbody></table></div>
  </div>;

  const renderSection = () => {
    if (active === "Overview") return null;
    if (active === "New Quote") return <div className="panel"><div className="panel-heading"><div><h2>Start a new quote</h2><p>Select a line of business and enter applicant details.</p></div></div><div className="line-grid">{lines.map(line => { const Icon = line.icon; return <button className="line-card" key={line.name} onClick={() => { setSelectedLine(line.name); setShowQuote(true); }}><span className={`line-icon ${line.color}`}><Icon size={19}/></span><span className="line-text"><b>{line.name}</b><small>{line.detail}</small></span><ArrowUpRight size={16}/></button>; })}</div></div>;
    if (active === "Submissions") return renderSubmissions();
    if (active === "Agencies & Agents") return <AgencyRequestPanel memberships={agencies}/>;
    if (active === "Site Admin") return <AdminReviewPanel/>;
    if (active === "Carrier Connections") return <CarrierConnections/>;
    const info: Record<string, { title: string; desc: string; steps: string[] }> = {
      "Appetite Finder": { title: "Carrier appetite finder", desc: "Review configured underwriting guidelines and identify potential market fit.", steps: ["No carrier appetite rules have been configured yet.", "Add carrier products, states, classes and eligibility rules.", "Treat every result as guidance only—not a quote or carrier approval."] },
      "Quote Comparison": { title: "Quote comparison", desc: "Compare carrier proposals side by side when verified quotes are available.", steps: ["No carrier quotes are connected yet.", "Live premiums will be clearly distinguished from test or manually entered data.", "Coverage limits, deductibles, exclusions and payment terms belong in each comparison."] },
      "Policies & Renewals": { title: "Policies & renewals", desc: "Keep issued policies, effective dates and renewal activity organized.", steps: ["No policy records have been added.", "Policy records should be created only from verified bind or issue confirmation.", "Renewal reminders and activity history will appear here."] },
      "Agencies & Agents": { title: "Agencies & agents", desc: "Request agency registration and manage agency membership.", steps: ["Submit your agency details for site administrator review.", "Agency approval and user activation are separate from sign-in.", "Agent invitations and role management will be enabled after approval."] },
      "Carrier Connections": { title: "Carrier connections", desc: "Connect approved carrier or aggregator integrations securely.", steps: ["No live carrier integrations are configured.", "Connection setup requires authorized API credentials and carrier permission.", "Never enter carrier passwords or API secrets into public notes or quote forms."] },
      "Documents": { title: "Document center", desc: "Organize applications, ACORD forms, loss runs, quotes and policy documents.", steps: ["No documents have been uploaded.", "Private document storage and access controls must be configured before production use.", "Only upload documents you are authorized to store and process."] },
      "Reports": { title: "Reports & analytics", desc: "Monitor submissions, quote activity and agency production.", steps: [`${submissions.length} submission records currently appear in your approved agency workspace.`, "Reports show records available to your approved agency membership.", "Live carrier metrics will be shown only after authorized integrations are connected."] },
      "Training & Learning": { title: "Training & learning", desc: "Reference insurance workflows, coverage concepts and platform guidance.", steps: ["Training content will be added in this platform.", "Training progress and agency reporting require user accounts.", "This workspace is separate from the Galini Training Portal."] },
      "Settings": { title: "Workspace settings", desc: "Configure profile, agency preferences, permissions and integrations.", steps: ["Authentication is connected; agency approval and role-based permissions are still being completed.", "Set agency profile and user roles before inviting staff.", "Shared agency records remain disabled until membership authorization and row-level security checks are complete."] },
      "Help Center": { title: "Help center", desc: "Get assistance with quoting workflows and platform setup.", steps: ["Use the navigation to access each workspace area.", "New quote drafts are saved to your approved agency workspace database.", "Carrier rating and binding are not active until authorized integrations are configured."] },
    };
    const current = info[active] ?? info["Help Center"];
    return <div className="panel"><div className="panel-heading"><div><h2>{current.title}</h2><p>{current.desc}</p></div></div><div className="check-list">{current.steps.map((step, i) => <div className="check-row" key={step}><span className="check-empty">{i + 1}</span><div><b>{i === 0 ? "Current status" : i === 1 ? "Next setup item" : "Important note"}</b><small>{step}</small></div></div>)}</div>{active === "Carrier Connections" && <button className="primary-button" onClick={() => setActive("Appetite Finder")}>Review appetite setup <ArrowRight size={14}/></button>}{active === "Submissions" && renderSubmissions()}</div>;
  };

  return <main className="shell">
    {mobileOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><img className="brand-logo" src="/galini-logo.svg" alt="Galini Rate & Connect" /><button className="close-menu" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="workspace-switch"><div className="workspace-avatar">{(agencies[0]?.display_name || "G").slice(0,2).toUpperCase()}</div><div className="workspace-copy"><b>{agencies[0]?.display_name || "Galini workspace"}</b><span>{agencies.length ? agencies[0].role.replace("_"," ") : "No approved agency"}</span></div><ChevronDown size={15}/></div>
      <nav className="nav">{nav.map(section => <div className="nav-section" key={section.group}><div className="nav-label">{section.group}</div>{section.items.filter(item => item.name !== "Site Admin" || account?.site_role === "site_admin").map(item => { const Icon = item.icon; return <button key={item.name} onClick={() => chooseNav(item.name)} className={`nav-item ${active === item.name ? "nav-active" : ""}`}><Icon size={17} strokeWidth={1.8}/><span>{item.name}</span>{item.name === "Submissions" && <em>{submissions.length}</em>}</button>; })}</div>)}</nav>
      <div className="sidebar-bottom"><div className="support-card"><div className="support-icon"><LifeBuoy size={17}/></div><b>Need a hand?</b><p>Find guidance for your insurance workflow.</p><button onClick={() => chooseNav("Help Center")}>Visit help center <ArrowRight size={13}/></button></div><div className="profile"><div className="profile-avatar">{(account?.full_name || "GU").split(" ").map(part => part[0]).slice(0,2).join("").toUpperCase()}</div><div className="profile-copy"><b>{account?.full_name || "Loading account…"}</b><span>{account ? account.status.replace("_"," ") : "Account profile"}</span></div><button aria-label="Profile menu"><ChevronDown size={15}/></button></div></div>
    </aside>
    <section className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <b>{active}</b></div><div className="top-actions"><div className="environment"><i/> Development workspace</div><button className="text-button" onClick={() => window.location.assign("/diagnostics")}>Diagnostics</button><button className="icon-button" aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut size={17}/></button><button className="icon-button" aria-label="Help" onClick={() => chooseNav("Help Center")}><CircleHelp size={18}/></button><button className="icon-button notification" aria-label="Notifications"><Bell size={18}/><i/></button><div className="top-avatar">{(account?.full_name || "GU").split(" ").map(part => part[0]).slice(0,2).join("").toUpperCase()}</div></div></header>
      <div className="content">
         {accountError && <div className="notice"><div className="notice-icon"><ShieldCheck size={17}/></div><div><b>Account profile unavailable</b><p>{accountError}</p></div><button onClick={() => window.location.assign("/diagnostics")}>Diagnostics <ArrowRight size={14}/></button></div>}
         {account?.status === "pending" && <div className="notice"><div className="notice-icon"><ShieldCheck size={17}/></div><div><b>Account awaiting administrator approval</b><p>Your sign-in is active, but agency workspace features will remain restricted until an administrator approves your account.</p></div></div>}
         {account?.status === "suspended" && <div className="notice"><div className="notice-icon"><ShieldCheck size={17}/></div><div><b>Account suspended</b><p>Please contact your Galini site administrator to review access.</p></div></div>}
         {account?.status === "active" && agencies.length === 0 && <div className="notice"><div className="notice-icon"><Building2 size={17}/></div><div><b>No approved agency membership</b><p>Your account is active, but no approved agency workspace is assigned yet.</p></div></div>}
        {submissionError && !showQuote && <div className="notice" role="alert"><div className="notice-icon"><ShieldCheck size={17}/></div><div><b>Submission workspace notice</b><p>{submissionError}</p></div></div>}
        <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot"/> GALINI RATE & CONNECT</div><h1>{active === "Overview" ? `Good morning${account?.full_name ? `, ${account.full_name.split(" ")[0]}` : ""}` : active}</h1><p className="welcome-sub">{active === "Overview" ? "Your insurance workflow workspace at a glance." : "Manage this area of your agency workspace."}</p></div><button className="primary-button" onClick={() => setShowQuote(true)}><Plus size={17}/> Start a new quote</button></div>
        {active === "Overview" ? <>
          <div className="notice"><div className="notice-icon"><Zap size={17}/></div><div><b>Development workspace — setup in progress</b><p>When your agency is approved, submissions are saved to the shared database. Carrier connections, live premiums and binding are not active.</p></div><button onClick={() => chooseNav("Carrier Connections")}>View connections <ArrowRight size={14}/></button></div>
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-top"><span>Submissions</span><span className="stat-icon blue"><ClipboardList size={17}/></span></div><div className="stat-number">{String(submissions.length).padStart(2,"0")}</div><div className="stat-foot"><span className="muted">In this workspace</span><span className="stat-link" onClick={() => chooseNav("Submissions")}>View all <ArrowRight size={13}/></span></div></div>
            <div className="stat-card"><div className="stat-top"><span>Draft quotes</span><span className="stat-icon violet"><FileText size={17}/></span></div><div className="stat-number">{String(submissions.filter(s => s.status === "draft").length).padStart(2,"0")}</div><div className="stat-foot"><span className="muted">Not submitted</span><span className="positive"><ArrowUpRight size={13}/> Drafts</span></div></div>
            <div className="stat-card"><div className="stat-top"><span>Carrier connections</span><span className="stat-icon teal"><ShieldCheck size={17}/></span></div><div className="stat-number">0</div><div className="stat-foot"><span className="muted">Live integrations</span><span className="stat-link" onClick={() => chooseNav("Carrier Connections")}>Set up <ArrowRight size={13}/></span></div></div>
            <div className="stat-card"><div className="stat-top"><span>Renewals upcoming</span><span className="stat-icon amber"><Wallet size={17}/></span></div><div className="stat-number">00</div><div className="stat-foot"><span className="muted">Next 60 days</span><span className="muted">No records yet</span></div></div>
          </div>
          <div className="section-heading"><div><h2>Start with a line of business</h2><p>Choose a coverage type to begin an application.</p></div><button className="text-button" onClick={() => chooseNav("New Quote")}>View all products <ArrowRight size={14}/></button></div>
          <div className="line-grid">{lines.slice(0,8).map(line => { const Icon = line.icon; return <button className="line-card" key={line.name} onClick={() => { setSelectedLine(line.name); setShowQuote(true); }}><span className={`line-icon ${line.color}`}><Icon size={19}/></span><span className="line-text"><b>{line.name}</b><small>{line.detail}</small></span><ArrowUpRight className="line-arrow" size={16}/></button>; })}</div>
          <div className="bottom-grid">{renderSubmissions()}<div className="panel readiness-panel"><div className="panel-heading"><div><h2>Platform readiness</h2><p>Setup checklist for your agency.</p></div><span className="progress-label">1 of 4</span></div><div className="progress-track"><span/></div><div className="check-list"><div className="check-row complete"><span><CheckCircle2 size={17}/></span><div><b>Workspace created</b><small>Your Galini workspace is ready.</small></div></div>{["Connect a carrier","Set appetite rules","Enable agency users"].map((label,i)=><div className="check-row" key={label}><span className="check-empty">{i+2}</span><div><b>{label}</b><small>{["Configure authorized API access.","Define underwriting eligibility guidelines.","Set up secure user roles and invitations."][i]}</small></div><button onClick={() => chooseNav(["Carrier Connections","Appetite Finder","Agencies & Agents"][i])}><ArrowRight size={15}/></button></div>)}</div><div className="readiness-note"><ShieldCheck size={15}/> Appetite indicators are guidance, not carrier approval.</div></div></div>
        </> : renderSection()}
        <footer><span>© 2026 Galini Rate & Connect</span><span>Insurance workflow platform <i/> Development preview</span></footer>
      </div>
    </section>
    {showQuote && <div className="modal-backdrop" onClick={() => setShowQuote(false)}><div className="quote-modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><div className="modal-kicker">NEW SUBMISSION</div><h2>Start an insurance quote</h2><p>Save a shared agency draft. No carrier is contacted or rated.</p></div><button className="icon-button" onClick={() => setShowQuote(false)} aria-label="Close"><X size={19}/></button></div>
      <label className="field-label">Line of business</label><div className="select-wrap"><select value={selectedLine} onChange={e => setSelectedLine(e.target.value)}>{lines.map(l => <option key={l.name}>{l.name}</option>)}</select><ChevronDown size={16}/></div>
      <label className="field-label">Named insured / business name</label><input className="modal-input" placeholder="Enter applicant or business name" value={insured} onChange={e => setInsured(e.target.value)}/>
      <label className="field-label">Primary location ZIP code</label><input className="modal-input" placeholder="e.g. 07001" maxLength={10} value={zip} onChange={e => setZip(e.target.value)}/>
      {submissionError && <div className="modal-info" role="alert"><ShieldCheck size={16}/> {submissionError}</div>}
      <div className="modal-info"><ShieldCheck size={16}/> Drafts are saved to your approved agency workspace. Carrier rating and binding are not triggered.</div>
      <div className="modal-actions"><button className="secondary-button" onClick={() => setShowQuote(false)}>Cancel</button><button className="primary-button" disabled={!insured.trim() || !/^\\d{5}(-\\d{4})?$/.test(zip.trim()) || savingSubmission} onClick={createDraft}>{savingSubmission ? "Saving…" : "Create draft"} <ArrowRight size={15}/></button></div>
    </div></div>}
  </main>;
}
