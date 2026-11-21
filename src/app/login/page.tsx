"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { PasswordInput } from "@/components/PasswordInput";
import { Button, Field, api, cx, inputCls, inputErrCls } from "@/components/ui";

const DEMO = process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fe, setFe] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const go = async (e?: string, p?: string) => {
    setError(""); setFe({});
    const em = (e ?? email).trim(), pw = p ?? password;
    const local: Record<string, string> = {};
    if (!em) local.email = "Enter your email"; else if (!/^\S+@\S+\.\S+$/.test(em)) local.email = "That does not look like an email address";
    if (!pw) local.password = "Enter your password";
    if (Object.keys(local).length) { setFe(local); return; }
    setLoading(true);
    const r = await api("/api/auth/login", { method: "POST", json: { email: em, password: pw } });
    if (!r.ok) { setLoading(false); setError(r.error || "Could not sign in"); setFe(r.fieldErrors || {}); return; }
    // only follow same-site relative paths from ?next=
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue building your evidence-based resume." footer={<>New here? <Link href="/register" className="font-semibold text-blue-700 hover:underline">Create an account</Link></>}>
      <form onSubmit={(e) => { e.preventDefault(); go(); }} noValidate className="space-y-4">
        {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">{error}</div>}
        <Field label="Email" error={fe.email}>{(p) => <input {...p} type="email" autoComplete="email" className={cx(inputCls, fe.email && inputErrCls)} value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />}</Field>
        <Field label="Password" error={fe.password}>{(p) => <PasswordInput {...p} autoComplete="current-password" invalid={!!fe.password} value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
        <div className="text-right"><Link href="/forgot-password" className="text-sm font-medium text-blue-700 hover:underline">Forgot password?</Link></div>
        <Button type="submit" className="w-full" loading={loading}>Sign in</Button>
        {DEMO && <Button type="button" variant="secondary" className="w-full" onClick={() => { setEmail("alex@careerforge.ai"); setPassword("password123"); go("alex@careerforge.ai", "password123"); }}>Try the demo account</Button>}
      </form>
    </AuthShell>
  );
}
