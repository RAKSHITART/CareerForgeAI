import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui";

export const metadata: Metadata = {
  title: "CareerForge AI — Truthful AI Career Development & Job Readiness",
  description:
    "Generate truthful, evidence-backed ATS resumes, conduct job-specific AI mock interviews, and build missing skills with structured roadmaps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-slate-50 text-slate-900"><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
