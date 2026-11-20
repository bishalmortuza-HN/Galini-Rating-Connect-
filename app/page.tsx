"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BookOpen,
  Building2, CarFront, CheckCircle2, ChevronDown, CircleHelp, ClipboardList,
  FileText, Filter, Home, LayoutDashboard, LifeBuoy, Menu, Plus, Search,
  Settings, ShieldCheck, SlidersHorizontal, Sparkles, Users, Wallet,
  X, Zap, BriefcaseBusiness, Umbrella, HeartPulse
} from "lucide-react";

const lines = [
  { name: "Personal Auto", detail: "Private passenger vehicles", icon: CarFront, color: "blue" },
  { name: "Homeowners", detail: "Home, condo & renters", icon: Home, color: "violet" },
  { name: "Commercial Package", detail: "BOP, GL & property", icon: Building2, color: "teal" },
  { name: "Commercial Auto", detail: "Business vehicles & fleets", icon: BriefcaseBusiness, color: "amber" },
  { name: "Workers’ Compensation", detail: "Workers’ compensation", icon: Users, color: "rose" },
  { name: "Umbrella", detail: "Personal & commercial excess", icon: Umbrella, color: "indigo" },
  { name: "Professional Liability", detail: "E&O, cyber & specialty", icon: HeartPulse, color: "green" },
];

const submissions = [
  { id: "GRC-10042", insured: "Northstar Auto Group", line: "Commercial Auto", status: "Under review", carrier: "Awaiting carrier", date: "Nov 20, 2026" },
  { id: "GRC-10041", insured: "Oak & Stone Properties", line: "BOP", status: "Information needed", carrier: "Appetite review", date: "Nov 19, 2026" },
  { id: "GRC-10040", insured: "Bright Path Consulting", line: "Professional Liability", status: "Draft", carrier: "Not submitted", date: "Nov 18, 2026" },
];

export default function Dashboard() {
  const [active, setActive] = useState("Overview");
  const [query, setQuery] = useState("");
  const [showQuote, setShowQuote] = useState(false);
  const [selectedLine, setSelectedLine] = useState("Commercial Package");
  const [mobileOpen, setMobileOpen] = useState(false);
  const filtered = useMemo(() => submissions.filter(s => (s.insured + s.id + s.line + s.status).toLowerCase().includes(query.toLowerCase())), [query]);

  const nav = [
    { group: "WORKSPACE", items: [
      { name: "Overview", icon: LayoutDashboard },
      { name: "New Quote", icon: Plus },
      { name: "Submissions", icon: ClipboardList },
      { name: "Appetite Finder", icon: Sparkles },
      { name: "Quote Comparison", icon: SlidersHorizontal },
      { name: "Policies & Renewals", icon: FileText },
    ]},
    { group: "MANAGEMENT", items: [
      { name: "Agencies & Agents", icon: Users },
      { name: "Carrier Connections", icon: ShieldCheck },
      { name: "Documents", icon: FileText },
      { name: "Reports", icon: Activity },
    ]},
    { group: "SUPPORT", items: [
      { name: "Settings", icon: Settings },
      { name: "Help Center", icon: LifeBuoy },
    ]}
  ];

  const chooseNav = (name: string) => {
    setActive(name);
    setMobileOpen(false);
    if (name === "New Quote") setShowQuote(true);
  };

  return (
    <main className="shell">
      {mobileOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><span>G</span><i /></div>
          <div><div className="brand-name">GALINI</div><div className="brand-sub">RATE & CONNECT</div></div>
          <button className="close-menu" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18}/></button>
        </div>
        <div className="workspace-switch">
          <div className="workspace-avatar">MA</div>
          <div className="workspace-copy"><b>Mogul Agency Services</b><span>Agency workspace</span></div>
          <ChevronDown size={15} />
        </div>
        <nav className="nav">
          {nav.map(section => <div className="nav-section" key={section.group}>
            <div className="nav-label">{section.group}</div>
            {section.items.map(item => {
              const Icon = item.icon;
              return <button key={item.name} onClick={() => chooseNav(item.name)} className={`nav-item ${active === item.name ? "nav-active" : ""}`}>
                <Icon size={17} strokeWidth={1.8}/><span>{item.name}</span>
                {item.name === "Submissions" && <em>3</em>}
              </button>;
            })}
          </div>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="support-card"><div className="support-icon"><LifeBuoy size={17}/></div><b>Need a hand?</b><p>Our support team is here to help you move business forward.</p><button onClick={() => setActive("Help Center")}>Visit help center <ArrowRight size={13}/></button></div>
          <div className="profile"><div className="profile-avatar">NM</div><div className="profile-copy"><b>Nasir Mogul</b><span>Agency administrator</span></div><button aria-label="Profile menu"><ChevronDown size={15}/></button></div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20}/></button>
          <div className="breadcrumb">Workspace <span>/</span> <b>{active}</b></div>
          <div className="top-actions">
            <div className="environment"><i/> Development workspace</div>
            <button className="icon-button" aria-label="Help"><CircleHelp size={18}/></button>
            <button className="icon-button notification" aria-label="Notifications"><Bell size={18}/><i/></button>
            <div className="top-avatar">NM</div>
          </div>
        </header>

        <div className="content">
          <div className="welcome-row">
            <div><div className="eyebrow"><span className="eyebrow-dot"/> THURSDAY, NOVEMBER 20, 2026</div><h1>{active === "Overview" ? "Good morning, Nasir" : active}</h1><p className="welcome-sub">{active === "Overview" ? "Here’s what’s happening across your agency today." : "Your insurance workspace, connected in one place."}</p></div>
            <button className="primary-button" onClick={() => setShowQuote(true)}><Plus size={17}/> Start a new quote</button>
          </div>

          <div className="notice"><div className="notice-icon"><Zap size={17}/></div><div><b>Your workspace is ready for setup</b><p>Carrier connections and live rating require authorized carrier credentials and API access. No live carrier rates are being displayed yet.</p></div><button onClick={() => setActive("Carrier Connections")}>Configure connections <ArrowRight size={14}/></button></div>

          <div className="stat-grid">
            <div className="stat-card"><div className="stat-top"><span>Open submissions</span><span className="stat-icon blue"><ClipboardList size={17}/></span></div><div className="stat-number">03</div><div className="stat-foot"><span className="muted">Across all lines</span><span className="stat-link" onClick={() => setActive("Submissions")}>View all <ArrowRight size={13}/></span></div></div>
            <div className="stat-card"><div className="stat-top"><span>Quotes in progress</span><span className="stat-icon violet"><FileText size={17}/></span></div><div className="stat-number">02</div><div className="stat-foot"><span className="muted">Drafts & reviews</span><span className="positive"><ArrowUpRight size={13}/> Active</span></div></div>
            <div className="stat-card"><div className="stat-top"><span>Carrier connections</span><span className="stat-icon teal"><ShieldCheck size={17}/></span></div><div className="stat-number">0<span className="stat-denom"> / 0</span></div><div className="stat-foot"><span className="muted">Live integrations</span><span className="stat-link" onClick={() => setActive("Carrier Connections")}>Set up <ArrowRight size={13}/></span></div></div>
            <div className="stat-card"><div className="stat-top"><span>Renewals upcoming</span><span className="stat-icon amber"><Wallet size={17}/></span></div><div className="stat-number">00</div><div className="stat-foot"><span className="muted">Next 60 days</span><span className="muted">No records yet</span></div></div>
          </div>

          <div className="section-heading"><div><h2>Start with a line of business</h2><p>Choose a coverage type to begin an application.</p></div><button className="text-button" onClick={() => setActive("New Quote")}>View all products <ArrowRight size={14}/></button></div>
          <div className="line-grid">
            {lines.map(line => { const Icon = line.icon; return <button className="line-card" key={line.name} onClick={() => { setSelectedLine(line.name); setShowQuote(true); }}>
              <span className={`line-icon ${line.color}`}><Icon size={19}/></span><span className="line-text"><b>{line.name}</b><small>{line.detail}</small></span><ArrowUpRight className="line-arrow" size={16}/>
            </button>; })}
          </div>

          <div className="bottom-grid">
            <div className="panel submissions-panel">
              <div className="panel-heading"><div><h2>Recent submissions</h2><p>Track the latest activity in your pipeline.</p></div><button className="text-button" onClick={() => setActive("Submissions")}>All submissions <ArrowRight size={14}/></button></div>
              <div className="table-toolbar"><div className="search-box"><Search size={15}/><input placeholder="Search submissions..." value={query} onChange={e => setQuery(e.target.value)}/></div><button className="filter-button"><Filter size={15}/> Filter</button></div>
              <div className="table-wrap"><table><thead><tr><th>INSURED / ID</th><th>LINE</th><th>STATUS</th><th>UPDATED</th><th></th></tr></thead><tbody>
                {filtered.map(s => <tr key={s.id}><td><b>{s.insured}</b><small>{s.id}</small></td><td>{s.line}</td><td><span className={`status ${s.status === "Under review" ? "status-review" : s.status === "Information needed" ? "status-needed" : "status-draft"}`}>{s.status}</span></td><td className="date-cell">{s.date}</td><td><button className="row-arrow" aria-label={`Open ${s.id}`}><ArrowRight size={15}/></button></td></tr>)}
                {filtered.length === 0 && <tr><td colSpan={5} className="empty-row">No matching submissions.</td></tr>}
              </tbody></table></div>
            </div>
            <div className="panel readiness-panel">
              <div className="panel-heading"><div><h2>Platform readiness</h2><p>Setup checklist for your agency.</p></div><span className="progress-label">1 of 4</span></div>
              <div className="progress-track"><span/></div>
              <div className="check-list">
                <div className="check-row complete"><span><CheckCircle2 size={17}/></span><div><b>Workspace created</b><small>Your separate Galini workspace is ready.</small></div></div>
                <div className="check-row"><span className="check-empty">2</span><div><b>Connect a carrier</b><small>Configure an authorized carrier or aggregator.</small></div><button onClick={() => setActive("Carrier Connections")}><ArrowRight size={15}/></button></div>
                <div className="check-row"><span className="check-empty">3</span><div><b>Set appetite rules</b><small>Define eligibility and referral guidelines.</small></div><button onClick={() => setActive("Appetite Finder")}><ArrowRight size={15}/></button></div>
                <div className="check-row"><span className="check-empty">4</span><div><b>Invite your team</b><small>Add agency admins and agents.</small></div><button onClick={() => setActive("Agencies & Agents")}><ArrowRight size={15}/></button></div>
              </div>
              <div className="readiness-note"><ShieldCheck size={15}/> Appetite indicators are guidance, not carrier approval.</div>
            </div>
          </div>
          <footer><span>© 2026 Galini Rate & Connect</span><span>Independent insurance workflow platform <i/> Secure workspace</span></footer>
        </div>
      </section>

      {showQuote && <div className="modal-backdrop" onClick={() => setShowQuote(false)}><div className="quote-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><div><div className="modal-kicker">NEW SUBMISSION</div><h2>Start an insurance quote</h2><p>Choose a line of business to create a submission workspace.</p></div><button className="icon-button" onClick={() => setShowQuote(false)} aria-label="Close"><X size={19}/></button></div>
        <label className="field-label">Line of business</label><div className="select-wrap"><select value={selectedLine} onChange={e => setSelectedLine(e.target.value)}>{lines.map(l => <option key={l.name}>{l.name}</option>)}</select><ChevronDown size={16}/></div>
        <label className="field-label">Named insured / business name</label><input className="modal-input" placeholder="Enter the applicant or business name"/>
        <label className="field-label">Primary location ZIP code</label><input className="modal-input" placeholder="e.g. 07001" maxLength={10}/>
        <div className="modal-info"><ShieldCheck size={16}/> This creates a draft only. No carrier is contacted and no premium is generated until a live integration is configured.</div>
        <div className="modal-actions"><button className="secondary-button" onClick={() => setShowQuote(false)}>Cancel</button><button className="primary-button" onClick={() => { setShowQuote(false); setActive("Submissions"); }}>Create draft <ArrowRight size={15}/></button></div>
      </div></div>}
    </main>
  );
}
