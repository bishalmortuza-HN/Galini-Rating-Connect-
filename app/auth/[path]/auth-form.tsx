"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";

export default function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = mode === "sign-in"
        ? await authClient.signIn.email({ email, password, callbackURL: "/" })
        : await authClient.signUp.email({ name, email, password, callbackURL: "/" });

      if (result.error) {
        setMessage(result.error.message || "Authentication could not be completed. Please check your details.");
      } else if (mode === "sign-up") {
        setMessage("Account created. Sign in to continue. Account registration does not grant agency approval or carrier access.");
        router.push("/auth/sign-in");
        router.refresh();
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setMessage("Unable to reach the authentication service. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  const fieldStyle = {
    width: "100%", padding: "12px 13px", border: "1px solid #dce4ef",
    borderRadius: 8, fontSize: 14, color: "#20324c", background: "#fff",
  } as const;

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#f4f7fb", fontFamily: "Arial, sans-serif" }}>
      <section style={{ width: "min(100%, 430px)", background: "#fff", border: "1px solid #e3eaf2", borderRadius: 16, padding: 30, boxShadow: "0 18px 55px rgba(25,48,78,.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "#173b69", color: "#fff", display: "grid", placeItems: "center", fontSize: 24, fontWeight: 800 }}>G</div>
          <div><div style={{ fontWeight: 800, letterSpacing: 2, color: "#1b3150" }}>GALINI</div><div style={{ fontSize: 10, letterSpacing: 2, color: "#74859a", fontWeight: 700 }}>RATE & CONNECT</div></div>
        </div>
        <p style={{ color: "#5480ba", fontSize: 11, fontWeight: 700, letterSpacing: 1.3, marginBottom: 8 }}>SECURE WORKSPACE ACCESS</p>
        <h1 style={{ fontSize: 25, color: "#1c2d45", margin: "0 0 8px" }}>{mode === "sign-in" ? "Welcome back" : "Create your account"}</h1>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#7c899b", margin: "0 0 24px" }}>{mode === "sign-in" ? "Sign in to continue to your insurance workspace." : "Register to request access to Galini Rate & Connect."}</p>
        <form onSubmit={submit} style={{ display: "grid", gap: 13 }}>
          {mode === "sign-up" && <label style={{ display: "grid", gap: 7, color: "#45566d", fontSize: 12, fontWeight: 700 }}>Full name<input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} style={fieldStyle} /></label>}
          <label style={{ display: "grid", gap: 7, color: "#45566d", fontSize: 12, fontWeight: 700 }}>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={fieldStyle} /></label>
          <label style={{ display: "grid", gap: 7, color: "#45566d", fontSize: 12, fontWeight: 700 }}>Password<input required minLength={8} type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} style={fieldStyle} /></label>
          {message && <p role="status" style={{ margin: 0, padding: 11, borderRadius: 8, background: "#f2f6fc", color: "#526982", fontSize: 12, lineHeight: 1.5 }}>{message}</p>}
          <button disabled={busy} type="submit" style={{ marginTop: 5, border: 0, borderRadius: 8, padding: 13, background: busy ? "#8ca8d1" : "#245fc0", color: "#fff", fontWeight: 700, cursor: busy ? "wait" : "pointer" }}>{busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}</button>
        </form>
        <p style={{ margin: "22px 0 0", fontSize: 12, color: "#7c899b", textAlign: "center" }}>
          {mode === "sign-in" ? "New to Galini? " : "Already registered? "}
          <Link href={mode === "sign-in" ? "/auth/sign-up" : "/auth/sign-in"} style={{ color: "#245fc0", fontWeight: 700 }}>{mode === "sign-in" ? "Create an account" : "Sign in"}</Link>
        </p>
        <p style={{ borderTop: "1px solid #edf1f6", paddingTop: 15, margin: "18px 0 0", fontSize: 10, lineHeight: 1.5, color: "#9aa5b4" }}>Registration is separate from agency membership approval. Carrier quoting, binding and policy issuance are not enabled by creating an account.</p>
      </section>
    </main>
  );
}
