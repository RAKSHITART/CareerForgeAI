"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { PasswordInput, PasswordRules } from "@/components/PasswordInput";
import { Button, Field, api } from "@/components/ui";
import { PasswordField } from "@/lib/validations";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [pw, setPw] = useState(""); const [confirm, setConfirm] = useState("");
  const [fe, setFe] = useState<Record<string, string>>({});
  const [error, setError] = useState(""); const [done, setDone] = useState(false); const [loading, setLoading] = useState(false);
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("token") || ""); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    const local: Record<string, string> = {};
    const p = PasswordField.safeParse(pw); if (!p.success) local.pw = p.error.issues[0].message;
    if (confirm !== pw) local.confirm = "Passwords do not match";
    setFe(local); if (Object.keys(local).length) return;
    setLoading(true);
    const r = await api("/api/auth/reset-password", { method: "POST", json: { token, newPassword: pw } });
    setLoading(false);
    if (!r.ok) { setError(r.error || "Could not reset the password"); return; }
    setDone(true);
  };

  if (done) return <AuthShell title="Password updated" subtitle="You can now sign in with your new password."><Link href="/login" className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Go to sign in</Link></AuthShell>;
  if (token === "" ) return <AuthShell title="Reset link missing" subtitle="Open the link from your email, or request a new one." footer={<Link href="/forgot-password" className="font-semibold text-blue-700 hover:underline">Request a reset link</Link>}><span /></AuthShell>;

  return (
    <AuthShell title="Choose a new password" footer={<Link href="/login" className="font-semibold text-blue-700 hover:underline">Back to sign in</Link>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">{error} <Link href="/forgot-password" className="underline">Request a new link</Link></div>}
        <div><Field label="New password" error={fe.pw}>{(p) => <PasswordInput {...p} autoComplete="new-password" invalid={!!fe.pw} value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />}</Field><PasswordRules value={pw} /></div>
        <Field label="Confirm new password" error={fe.confirm}>{(p) => <PasswordInput {...p} autoComplete="new-password" invalid={!!fe.confirm} value={confirm} onChange={(e) => setConfirm(e.target.value)} />}</Field>
        <Button type="submit" className="w-full" loading={loading}>Update password</Button>
      </form>
    </AuthShell>
  );
}
