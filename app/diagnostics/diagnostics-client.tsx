"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Health = {
  status: string;
  checks: Record<string, boolean>;
  capabilities: Record<string, boolean>;
  note: string;
};

export default function DiagnosticsClient() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        setHealth(data as Health);
      })
      .catch(() => setError(true));
  }, []);

  const row = (label: string, value: boolean | undefined) => (
    <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 15, padding: "13px 0", borderBottom: "1px solid #E4EDF1", fontSize: 13 }}>
      <span style={{ color: "#526A7B" }}>{label}</span>
      <strong style={{ color: value ? "#376F85" : "#B91F33" }}>{value ? "Available" : "Not enabled"}</strong>
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: "#F8FBFC", padding: 24, fontFamily: "Arial, sans-serif", color: "#14263D" }}>
      <div style={{ maxWidth: 760, margin: "35px auto", background: "#fff", border: "1px solid #E4EDF1", borderRadius: 14, padding: 26 }}>
        <Link href="/" style={{ color: "#B91F33", fontSize: 12, textDecoration: "none" }}>← Return to Galini workspace</Link>
        <h1 style={{ margin: "18px 0 6px", fontSize: 25 }}>System diagnostics</h1>
        <p style={{ margin: "0 0 22px", color: "#687B8D", fontSize: 13 }}>Safe configuration checks. Secret values are never displayed.</p>
        {!health && !error && <p style={{ color: "#687B8D", fontSize: 13 }}>Checking application configuration…</p>}
        {error && <p role="alert" style={{ color: "#B91F33" }}>The diagnostics endpoint could not be reached.</p>}
        {health && <>
          <div style={{ padding: 13, borderRadius: 8, background: health.status === "ready" ? "#EAF5F9" : "#FCEDEF", color: health.status === "ready" ? "#24566C" : "#B91F33", fontWeight: 700, fontSize: 13, marginBottom: 18 }}>System status: {health.status}</div>
          <h2 style={{ fontSize: 14, margin: "18px 0 4px" }}>Configuration</h2>
          {row("Neon Auth configuration", health.checks.authenticationConfigured)}
          {row("Database URL configured", health.checks.databaseConfigured)}
          {row("Database connection", health.checks.databaseConnected)}
          <h2 style={{ fontSize: 14, margin: "25px 0 4px" }}>Feature availability</h2>
          {row("Authenticated workspace", health.capabilities.authenticatedWorkspace)}
          {row("Submission drafts", health.capabilities.submissionDrafts)}
          {row("Shared agency records", health.capabilities.sharedAgencyRecords)}
          {row("Carrier management", health.capabilities.carrierManagement)}
          {row("Manual carrier portal workflow", health.capabilities.manualCarrierPortal)}
          {row("Carrier API rating", health.capabilities.carrierApiRating)}
          {row("Automated appetite decisions", health.capabilities.appetiteAutomation)}
          {row("Binding and policy issuance", health.capabilities.bindingAndPolicyIssuance)}
          {row("Private document storage", health.capabilities.privateDocumentStorage)}
          <p style={{ margin: "20px 0 0", color: "#718494", fontSize: 11, lineHeight: 1.6 }}>{health.note}</p>
        </>}
      </div>
    </main>
  );
}
