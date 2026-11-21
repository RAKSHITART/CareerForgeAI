"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";

/* ---------- class helpers ---------- */
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/25 disabled:bg-slate-100 disabled:text-slate-500";
export const inputErrCls = "border-rose-500 focus:border-rose-500 focus:ring-rose-500/25";

/* ---------- Button ---------- */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; loading?: boolean; size?: "sm" | "md" };
export function Button({ variant = "primary", loading, size = "md", className, children, disabled, ...rest }: BtnProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm" };
  const variants = {
    primary: "bg-blue-600 text-white shadow-sm hover:bg-blue-700",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    ghost: "text-slate-600 hover:bg-slate-100",
  };
  return (
    <button className={cx(base, sizes[size], variants[variant], className)} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ---------- Field: label + hint + error wired for screen readers ---------- */
export function Field({ label, hint, error, required, children, className }: { label: string; hint?: string; error?: string; required?: boolean; children: (p: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode; className?: string }) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-600" aria-hidden>*</span>}
      </label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1 flex items-center gap-1 text-xs font-medium text-rose-600"><XCircle className="h-3.5 w-3.5" aria-hidden />{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---------- small pieces ---------- */
export function Badge({ tone = "slate", children, className }: { tone?: "slate" | "green" | "amber" | "rose" | "blue" | "violet"; children: React.ReactNode; className?: string }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200", green: "bg-emerald-50 text-emerald-800 ring-emerald-200", amber: "bg-amber-50 text-amber-800 ring-amber-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200", blue: "bg-blue-50 text-blue-800 ring-blue-200", violet: "bg-violet-50 text-violet-700 ring-violet-200",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", tones[tone], className)}>{children}</span>;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return <div role="status" className="flex items-center justify-center gap-2 py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" aria-hidden /><span className="text-sm">{label}…</span></div>;
}

export function EmptyState({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      {icon && <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, tone = "blue" }: { value: number; tone?: "blue" | "green" | "amber" }) {
  const c = { blue: "bg-blue-600", green: "bg-emerald-500", amber: "bg-amber-500" }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full transition-all", c)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/* ---------- Modal (Esc to close, focus trap, scroll lock) ---------- */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Always call the latest onClose without making the effect depend on it. Parents pass a new inline
  // function on every render; depending on it re-ran the effect on each keystroke, which moved focus
  // away from the field being typed in.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onCloseRef.current(); return; }
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    // focus the first form field once, when the dialog opens (not the close button)
    const t = setTimeout(() => {
      const root = ref.current;
      if (!root || root.contains(document.activeElement) && document.activeElement !== root) return;
      (root.querySelector<HTMLElement>("input:not([type=hidden]),select,textarea") || root.querySelector<HTMLElement>("button"))?.focus();
    }, 30);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; opener?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cx("flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl", wide ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Toasts + confirm dialog ---------- */
type Toast = { id: number; tone: "success" | "error" | "info"; text: string };
type Ctx = { toast: (text: string, tone?: Toast["tone"]) => void; confirm: (o: { title: string; body?: string; confirmLabel?: string; danger?: boolean }) => Promise<boolean> };
const ToastCtx = createContext<Ctx | null>(null);

export function useUI(): Ctx {
  const c = useContext(ToastCtx);
  if (!c) throw new Error("useUI must be used inside <ToastProvider>");
  return c;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dlg, setDlg] = useState<null | { title: string; body?: string; confirmLabel?: string; danger?: boolean; resolve: (v: boolean) => void }>(null);
  const idRef = useRef(0);
  const toast = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 7000 : 4000);
  }, []);
  const confirm = useCallback((o: { title: string; body?: string; confirmLabel?: string; danger?: boolean }) => new Promise<boolean>((resolve) => setDlg({ ...o, resolve })), []);
  const close = (v: boolean) => { dlg?.resolve(v); setDlg(null); };
  const icon = { success: <CheckCircle2 className="h-5 w-5 text-emerald-600" />, error: <AlertTriangle className="h-5 w-5 text-rose-600" />, info: <Info className="h-5 w-5 text-blue-600" /> };
  return (
    <ToastCtx.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            {icon[t.tone]}<p className="flex-1 text-sm text-slate-800">{t.text}</p>
            <button aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <Modal open={!!dlg} onClose={() => close(false)} title={dlg?.title || ""}>
        {dlg?.body && <p className="text-sm text-slate-600">{dlg.body}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => close(false)}>Cancel</Button>
          <Button variant={dlg?.danger ? "danger" : "primary"} onClick={() => close(true)}>{dlg?.confirmLabel || "Confirm"}</Button>
        </div>
      </Modal>
    </ToastCtx.Provider>
  );
}

/* ---------- fetch helper: always returns {ok, data, error, fieldErrors} and never throws ---------- */
export interface ApiResult<T = any> { ok: boolean; status: number; data: T; error?: string; fieldErrors?: Record<string, string> }
export async function api<T = any>(url: string, init?: RequestInit & { json?: unknown }): Promise<ApiResult<T>> {
  try {
    const { json, ...rest } = init || {};
    const res = await fetch(url, { ...rest, headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(rest.headers || {}) }, body: json !== undefined ? JSON.stringify(json) : rest.body });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && typeof window !== "undefined" && !url.includes("/api/auth/")) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    return { ok: res.ok, status: res.status, data, error: res.ok ? undefined : data?.error || `Request failed (${res.status})`, fieldErrors: data?.fieldErrors };
  } catch {
    return { ok: false, status: 0, data: {} as T, error: "Network problem. Check your connection and try again." };
  }
}
