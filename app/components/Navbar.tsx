"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { href: "/",          label: "Home",      icon: "🏠" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/patients",  label: "Patients",  icon: "👥" },
  { href: "/register",  label: "Register",  icon: "📝" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
  };

  // Hide navbar completely on login page
  if (pathname === "/login") return null;

  return (
    <>
      {/* ── Main Navbar ── */}
      <nav className="sticky top-0 z-50 bg-[#040d1a]/90 backdrop-blur-xl border-b border-white/[0.07] shadow-xl shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <button onClick={() => router.push("/")} className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-200">
                <span className="text-white font-black text-sm">✚</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] text-blue-400 font-bold tracking-widest uppercase leading-none">MedAI Portal</p>
                <p className="text-sm font-black text-white leading-tight tracking-tight">Doctor System</p>
              </div>
            </button>

            {/* Desktop Nav — only when logged in */}
            {user && (
              <div className="hidden md:flex items-center gap-1">
                {NAV_LINKS.map(({ href, label, icon }) => {
                  const active = isActive(href);
                  return (
                    <Link key={href} href={href}
                      className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150
                        ${active
                          ? "bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/10"
                          : "text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent"}`}>
                      <span className="text-base leading-none">{icon}</span>
                      <span>{label}</span>
                      {active && <span className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Right side */}
            <div className="flex items-center gap-2">
              {!loading && user ? (
                <>
                  {/* Live dot */}
                  <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[11px] text-emerald-400 font-semibold">Live</span>
                  </div>

                  {/* User badge */}
                  <div className="hidden md:flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1.5">
                    <div className="w-5 h-5 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">
                      {user.email?.[0]?.toUpperCase() ?? "A"}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium max-w-[140px] truncate">
                      {user.email}
                    </span>
                  </div>

                  {/* New Patient */}
                  {!isActive("/register") && (
                    <Link href="/register"
                      className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-105">
                      + New Patient
                    </Link>
                  )}

                  {/* Logout */}
                  <button onClick={handleLogout} disabled={loggingOut}
                    className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                    {loggingOut
                      ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                      : <span>⏻</span>
                    }
                    <span className="hidden sm:inline">{loggingOut ? "..." : "Logout"}</span>
                  </button>
                </>
              ) : !loading && !user ? (
                <Link href="/login"
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-105">
                  🔐 Sign In
                </Link>
              ) : null}

              {/* Mobile hamburger */}
              <button onClick={() => setMobileOpen((o) => !o)}
                className="md:hidden w-9 h-9 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all">
                <span className={`w-4 h-0.5 bg-slate-300 rounded-full transition-all duration-200 ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
                <span className={`w-4 h-0.5 bg-slate-300 rounded-full transition-all duration-200 ${mobileOpen ? "opacity-0" : ""}`} />
                <span className={`w-4 h-0.5 bg-slate-300 rounded-full transition-all duration-200 ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? "max-h-96 border-t border-white/[0.06]" : "max-h-0"}`}>
          <div className="px-4 py-3 space-y-1 bg-[#040d1a]">
            {user && NAV_LINKS.map(({ href, label, icon }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all
                    ${active ? "bg-blue-600/20 text-blue-300 border border-blue-500/30" : "text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent"}`}>
                  <span className="text-lg">{icon}</span>
                  <span>{label}</span>
                  {active && <span className="ml-auto w-2 h-2 bg-blue-400 rounded-full" />}
                </Link>
              );
            })}

            {user && (
              <>
                <div className="px-4 py-2 border-t border-white/[0.06] mt-1">
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Signed in as</p>
                  <p className="text-xs text-slate-300 font-semibold truncate">{user.email}</p>
                </div>
                <button onClick={() => { setMobileOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-xl text-sm">
                  <span>⏻</span> Logout
                </button>
              </>
            )}

            {!user && !loading && (
              <Link href="/login" onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-bold rounded-xl">
                🔐 Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="bg-white/[0.01] border-b border-white/[0.04] px-4 sm:px-6">
        <div className="max-w-7xl mx-auto py-2 flex items-center gap-2 text-[11px] text-slate-600">
          <Link href="/" className="hover:text-slate-400 transition-colors font-medium">Home</Link>
          {NAV_LINKS.filter((l) => l.href !== "/" && isActive(l.href)).map((l) => (
            <span key={l.href} className="flex items-center gap-2">
              <span>/</span>
              <span className="text-slate-400 font-semibold">{l.label}</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
