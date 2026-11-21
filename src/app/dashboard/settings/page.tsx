"use client";

import { useEffect, useState } from "react";
import { Bot, Download, KeyRound, ShieldAlert, UserCircle2 } from "lucide-react";
import { Button, Field, Modal, Spinner, api, useUI } from "@/components/ui";
import { PasswordInput, PasswordRules } from "@/components/PasswordInput";
import { PasswordField } from "@/lib/validations";

export default function SettingsPage() {
  const { toast } = useUI();
  const [user, setUser] = useState<{ name: string; email: string; createdAt?: string } | null>(null);
  const [cur, setCur] = useState(""); const [pw, setPw] = useState(""); const [conf, setConf] = useState("");
  const [fe, setFe] = useState<Record<string, string>>({}); const [saving, setSaving] = useState(false);
  const [aiRes, setAiRes] = useState<{ ok: boolean; model: string; message: string } | null>(null); const [aiBusy, setAiBusy] = useState(false);
  const [delOpen, setDelOpen] = useState(false); const [delPw, setDelPw] = useState(""); const [delErr, setDelErr] = useState(""); const [deleting, setDeleting] = useState(false);

  useEffect(() => { api("/api/auth/me").then((r) => r.ok && setUser(r.data.user)); }, []);

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!cur) local.currentPassword = "Enter your current password";
    const p = PasswordField.safeParse(pw); if (!p.success) local.newPassword = p.error.issues[0].message;
    if (pw && pw === cur) local.newPassword = "Choose a password different from the current one";
    if (conf !== pw) local.confirm = "Passwords do not match";
    setFe(local); if (Object.keys(local).length) return;
    setSaving(true);
    const r = await api("/api/auth/change-password", { method: "POST", json: { currentPassword: cur, newPassword: pw } });
    setSaving(false);
    if (!r.ok) { setFe(r.fieldErrors || {}); toast(r.error || "Could not change the password.", "error"); return; }
    setCur(""); setPw(""); setConf(""); setFe({});
    toast("Password changed. Other devices have been signed out.", "success");
  };

  const testAi = async () => {
    setAiBusy(true); setAiRes(null);
    const r = await api("/api/ai/status", { method: "POST" });
    setAiBusy(false);
    setAiRes(r.ok ? r.data : { ok: false, model: "", message: r.error || "Could not run the test." });
  };

  const del = async () => {
    setDelErr(""); setDeleting(true);
    const r = await api("/api/auth/delete-account", { method: "DELETE", json: { password: delPw } });
    setDeleting(false);
    if (!r.ok) { setDelErr(r.error || "Could not delete the account"); return; }
    window.location.href = "/";
  };

  if (!user) return <Spinner label="Loading settings" />;
  const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <section className={card} aria-labelledby="acct">
        <h2 id="acct" className="flex items-center gap-2 text-base font-semibold text-slate-900"><UserCircle2 className="h-5 w-5 text-blue-700" />Account</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Name</dt><dd className="font-medium text-slate-900">{user.name}</dd></div>
          <div><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-900">{user.email}</dd></div>
        </dl>
      </section>

      <section className={card} aria-labelledby="pw">
        <h2 id="pw" className="flex items-center gap-2 text-base font-semibold text-slate-900"><KeyRound className="h-5 w-5 text-blue-700" />Change password</h2>
        <form onSubmit={changePw} noValidate className="mt-4 space-y-4">
          <Field label="Current password" error={fe.currentPassword}>{(p) => <PasswordInput {...p} autoComplete="current-password" invalid={!!fe.currentPassword} value={cur} onChange={(e) => setCur(e.target.value)} />}</Field>
          <div><Field label="New password" error={fe.newPassword}>{(p) => <PasswordInput {...p} autoComplete="new-password" invalid={!!fe.newPassword} value={pw} onChange={(e) => setPw(e.target.value)} />}</Field><PasswordRules value={pw} /></div>
          <Field label="Confirm new password" error={fe.confirm}>{(p) => <PasswordInput {...p} autoComplete="new-password" invalid={!!fe.confirm} value={conf} onChange={(e) => setConf(e.target.value)} />}</Field>
          <Button type="submit" loading={saving}>Update password</Button>
        </form>
      </section>

      <section className={card} aria-labelledby="ai">
        <h2 id="ai" className="flex items-center gap-2 text-base font-semibold text-slate-900"><Bot className="h-5 w-5 text-blue-700" />AI connection</h2>
        <p className="mt-2 text-sm text-slate-600">Proper interview scoring (judging whether your answers are actually correct) and smarter job-description reading need a Gemini key in your <code>.env</code> file. Without it the app uses a basic offline check.</p>
        <Button className="mt-3" variant="secondary" onClick={testAi} loading={aiBusy}>Test AI connection</Button>
        {aiRes && <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-sm ${aiRes.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{aiRes.ok ? "Working. " : "Not working. "}{aiRes.message}</p>}
        <p className="mt-3 text-xs text-slate-500">Get a free key at aistudio.google.com, set <code>GEMINI_API_KEY</code> in <code>.env</code>, restart the server, then test again.</p>
      </section>

      <section className={card} aria-labelledby="data">
        <h2 id="data" className="flex items-center gap-2 text-base font-semibold text-slate-900"><Download className="h-5 w-5 text-blue-700" />Your data</h2>
        <p className="mt-2 text-sm text-slate-600">Download a copy of your profile, resumes, analyzed jobs, applications and interview practice as one JSON file.</p>
        <a href="/api/account/export" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />Download my data</a>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 sm:p-6" aria-labelledby="danger">
        <h2 id="danger" className="flex items-center gap-2 text-base font-semibold text-rose-800"><ShieldAlert className="h-5 w-5" />Delete account</h2>
        <p className="mt-2 text-sm text-rose-900/80">This permanently deletes your profile, resumes, interview history and everything else. It cannot be undone. Consider downloading your data first.</p>
        <Button variant="danger" className="mt-3" onClick={() => { setDelPw(""); setDelErr(""); setDelOpen(true); }}>Delete my account</Button>
      </section>

      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Delete your account?">
        <p className="text-sm text-slate-600">Enter your password to confirm. This cannot be undone.</p>
        <div className="mt-4"><Field label="Password" error={delErr}>{(p) => <PasswordInput {...p} autoComplete="current-password" invalid={!!delErr} value={delPw} onChange={(e) => setDelPw(e.target.value)} />}</Field></div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setDelOpen(false)}>Cancel</Button><Button variant="danger" onClick={del} loading={deleting} disabled={!delPw}>Delete permanently</Button></div>
      </Modal>
    </div>
  );
}
