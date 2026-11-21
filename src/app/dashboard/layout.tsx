"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  LayoutDashboard,
  User,
  Wrench,
  Target,
  FileText,
  Bot,
  BookOpen,
  Briefcase,
  TrendingUp,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  ShieldCheck,
  Check,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadUserAndNotifications() {
      try {
        const [meRes, notifRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/notifications"),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user);
        } else {
          router.push("/login");
        }

        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setNotifications(notifData.notifications || []);
          setUnreadCount(notifData.unreadCount || 0);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadUserAndNotifications();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const markAllNotificationsRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setUnreadCount(0);
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Profile", href: "/dashboard/profile", icon: User },
    { name: "My Skills", href: "/dashboard/skills", icon: Wrench },
    { name: "JD Analyzer", href: "/dashboard/jd-analyzer", icon: Target },
    { name: "Resume Builder", href: "/dashboard/resumes", icon: FileText },
    { name: "AI Interview Studio", href: "/dashboard/interviews", icon: Bot },
    { name: "Skill Growth", href: "/dashboard/skill-growth", icon: BookOpen },
    { name: "Job Tracker", href: "/dashboard/job-tracker", icon: Briefcase },
    { name: "Analytics", href: "/dashboard/analytics", icon: TrendingUp },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 border-r border-slate-200/80 bg-white shrink-0">
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900">CareerForge</span>
            <span className="text-blue-600 font-bold ml-1 text-xs uppercase bg-blue-50 px-1 py-0.5 rounded border border-blue-200">
              AI
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Isolation & Anti-Fabrication Badge */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 m-3 rounded-xl border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-slate-800">Anti-Fabrication</p>
              <p className="text-[10px] text-slate-500 leading-tight">Verified Candidate Isolation</p>
            </div>
          </div>
        </div>

        {/* Profile / Logout footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.name || "Candidate"}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden sm:block text-xs font-medium text-slate-500">
              Welcome back, <span className="font-semibold text-slate-800">{user?.name || "Candidate"}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white"></span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-left">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Mark read
                      </button>
                    )}
                  </div>
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">No notifications yet</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl text-xs transition-colors ${
                            n.isRead ? "bg-slate-50 text-slate-600" : "bg-blue-50/70 text-slate-900 font-medium"
                          }`}
                        >
                          <p className="font-bold text-slate-800">{n.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/dashboard/jd-analyzer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm shadow-blue-500/20"
            >
              <Target className="w-3.5 h-3.5" /> Analyze New JD
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${
                    isActive ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {item.name}
                </Link>
              );
            })}
          </div>
        )}

        {/* Dynamic Route View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
