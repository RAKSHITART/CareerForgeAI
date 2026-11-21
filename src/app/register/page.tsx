"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { PasswordInput, PasswordRules } from "@/components/PasswordInput";
import { Button, Field, api, cx, inputCls, inputErrCls } from "@/components/ui";
import { RegisterSchema } from "@/lib/validations";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [fe, setFe] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    const local: Record<string, string> = {};
    const parsed = RegisterSchema.safeParse({ name: form.name, email: form.email, password: form.password });
    if (!parsed.success) for (const i of parsed.error.issues) if (!local[i.path[0] as string]) local[i.path[0] as string] = i.message;
    if (form.confirm !== form.password) local.confirm = "Passwords do not match";
    setFe(local);
    if (Object.keys(local).length) return;
    setLoading(true);
    const r = await api("/api/auth/register", { method: "POST", json: { name: form.name, email: form.email, password: form.password } });
    if (!r.ok) { setLoading(false); setError(r.error || "Could not create your account"); setFe(r.fieldErrors || {}); return; }
    window.location.href = "/onboarding";
  };

  return (
    <AuthShell title="Create your account" subtitle="It takes about five minutes to build a profile you can trust." footer={<>Already have an account? <Link href="/login" className="font-semibold text-blue-700 hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">{error}</div>}
        <Field label="Full name" error={fe.name}>{(p) => <input {...p} autoComplete="name" className={cx(inputCls, fe.name && inputErrCls)} value={form.name} onChange={set("name")} autoFocus />}</Field>
        <Field label="Email" error={fe.email}>{(p) => <input {...p} type="email" autoComplete="email" className={cx(inputCls, fe.email && inputErrCls)} value={form.email} onChange={set("email")} />}</Field>
        <div>
          <Field label="Password" error={fe.password}>{(p) => <PasswordInput {...p} autoComplete="new-password" invalid={!!fe.password} value={form.password} onChange={set("password")} />}</Field>
          <PasswordRules value={form.password} />
        </div>
        <Field label="Confirm password" error={fe.confirm}>{(p) => <PasswordInput {...p} autoComplete="new-password" invalid={!!fe.confirm} value={form.confirm} onChange={set("confirm")} />}</Field>
        <Button type="submit" className="w-full" loading={loading}>Create account</Button>
      </form>
    </AuthShell>
  );
}
