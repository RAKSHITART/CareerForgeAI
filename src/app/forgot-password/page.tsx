"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { Button, Field, api, cx, inputCls, inputErrCls } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ message: string; devResetLink?: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr("Enter a valid email address"); return; }
    setLoading(true);
    const r = await api("/api/auth/forgot-password", { method: "POST", json: { email } });
    setLoading(false);
    if (!r.ok) { setErr(r.error || "Something went wrong"); return; }
    setDone(r.data);
  };

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we will send you a reset link." footer={<Link href="/login" className="font-semibold text-blue-700 hover:underline">Back to sign in</Link>}>
      {done ? (
        <div className="space-y-4" role="status">
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">{done.message}</p>
          {done.devResetLink && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Development mode: email is not configured.</p>
              <p className="mt-1">Because no SMTP server is set, the link is shown here instead of being emailed. This never appears in production.</p>
              <a href={done.devResetLink} className="mt-2 inline-block font-semibold text-blue-700 underline">Open reset link</a>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label="Email" error={err}>{(p) => <input {...p} type="email" autoComplete="email" className={cx(inputCls, err && inputErrCls)} value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />}</Field>
          <Button type="submit" className="w-full" loading={loading}>Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
}
