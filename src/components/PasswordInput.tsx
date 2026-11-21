"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cx, inputCls, inputErrCls } from "./ui";

export function PasswordInput({ invalid, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={cx(inputCls, "pr-11", invalid && inputErrCls)} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:text-slate-800">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
    </div>
  );
}

export function PasswordRules({ value }: { value: string }) {
  const rules = [["8 or more characters", value.length >= 8], ["A letter", /[A-Za-z]/.test(value)], ["A number", /\d/.test(value)]] as const;
  return <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Password requirements">{rules.map(([l, ok]) => <li key={l} className={ok ? "text-emerald-700" : "text-slate-500"}>{ok ? "✓" : "○"} {l}</li>)}</ul>;
}
