"use client";

import { useEffect, useState, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Patient {
  id: string;
  patientId?: string;
  createdAt?: string;
  status?: string;
  personal?: { fullName?: string; mobile?: string; email?: string; dob?: string; gender?: string };
  visit?: { reasonForVisit?: string; preferredDate?: string; preferredTime?: string; urgency?: string };
  fullName?: string;
  mobile?: string;
  email?: string;
  reasonForVisit?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getName    = (p: Patient) => p.personal?.fullName    ?? p.fullName    ?? "Unknown";
const getUrgency = (p: Patient) => p.visit?.urgency        ?? "low";
const getDate    = (p: Patient) => p.visit?.preferredDate  ?? p.createdAt?.slice(0, 10) ?? "";
const getEmail   = (p: Patient) => p.personal?.email       ?? p.email       ?? "—";

const TODAY = new Date().toISOString().slice(0, 10);

const WEEK_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function getInitials(name: string) {
  return name === "Unknown" ? "?" : name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
function avatarColor(name: string) {
  const colors = ["from-blue-600 to-cyan-500","from-violet-600 to-purple-500","from-rose-600 to-pink-500","from-emerald-600 to-teal-500","from-orange-600 to-amber-500","from-indigo-600 to-blue-500"];
  return colors[name.charCodeAt(0) % colors.length] ?? colors[0];
}

const URGENCY_CONFIG = {
  high:   { label: "High",   dot: "bg-red-400",     badge: "bg-red-500/15 text-red-400 border-red-500/30",         bar: "bg-red-500"     },
  medium: { label: "Medium", dot: "bg-amber-400",   badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",   bar: "bg-amber-500"   },
  low:    { label: "Low",    dot: "bg-emerald-400", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", bar: "bg-emerald-500" },
};

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  pending:   { label: "Pending",   badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",       dot: "bg-amber-400"   },
  confirmed: { label: "Confirmed", badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",          dot: "bg-blue-400"    },
  completed: { label: "Completed", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  cancelled: { label: "Cancelled", badge: "bg-slate-500/15 text-slate-400 border-slate-500/30",       dot: "bg-slate-400"   },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, trend, accent, onClick }: {
  icon: string; label: string; value: number | string;
  sub?: string; trend?: string; accent: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick}
      className={`relative bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 overflow-hidden group transition-all duration-300
        ${onClick ? "hover:border-white/[0.14] hover:-translate-y-0.5 cursor-pointer" : ""}`}>
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      {/* Decorative circle */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br ${accent} rounded-full opacity-20 blur-xl`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 bg-white/[0.06] rounded-xl flex items-center justify-center text-2xl">
            {icon}
          </div>
          {trend && (
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {trend}
            </span>
          )}
        </div>
        <p className="text-3xl font-black text-white mb-1">{value}</p>
        <p className="text-sm text-slate-400 font-medium">{label}</p>
        {sub && <p className="text-[11px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Mini Patient Row ─────────────────────────────────────────────────────────

function MiniPatientRow({ patient, onClick }: { patient: Patient; onClick: () => void }) {
  const name    = getName(patient);
  const urgency = getUrgency(patient);
  const status  = patient.status ?? "pending";
  const urg     = URGENCY_CONFIG[urgency as keyof typeof URGENCY_CONFIG] ?? URGENCY_CONFIG.low;
  const sta     = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  return (
    <div onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-all duration-150 cursor-pointer group">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center text-xs font-black text-white shadow-lg flex-shrink-0`}>
        {getInitials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate leading-tight">{name}</p>
        <p className="text-[11px] text-slate-500 truncate">{getEmail(patient)}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${urg.badge}`}>
          <span className={`w-1 h-1 rounded-full ${urg.dot}`} />{urg.label}
        </span>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sta.badge} hidden sm:inline-flex`}>
          <span className={`w-1 h-1 rounded-full ${sta.dot}`} />{sta.label}
        </span>
        <span className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all text-sm">→</span>
      </div>
    </div>
  );
}

// ─── Donut Chart (pure CSS) ───────────────────────────────────────────────────

function UrgencyDonut({ high, medium, low, total }: { high: number; medium: number; low: number; total: number }) {
  if (total === 0) return (
    <div className="flex items-center justify-center h-32">
      <p className="text-slate-600 text-sm">No data yet</p>
    </div>
  );

  const pHigh   = Math.round((high   / total) * 100);
  const pMed    = Math.round((medium / total) * 100);
  const pLow    = Math.round((low    / total) * 100);

  const segments = [
    { pct: pHigh,   color: "#ef4444", label: "High"   },
    { pct: pMed,    color: "#f59e0b", label: "Medium" },
    { pct: pLow,    color: "#10b981", label: "Low"    },
  ];

  let cumulative = 0;
  const r = 40;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="18" />
          {segments.map(({ pct, color }, i) => {
            const dash = (pct / 100) * circumference;
            const gap  = circumference - dash;
            const offset = circumference - (cumulative / 100) * circumference;
            cumulative += pct;
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={color} strokeWidth="18"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px", transition: "stroke-dasharray 0.6s ease" }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-black text-white leading-none">{total}</p>
          <p className="text-[10px] text-slate-500 font-medium">total</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {[
          { label: "High",   count: high,   color: "bg-red-500"     },
          { label: "Medium", count: medium, color: "bg-amber-500"   },
          { label: "Low",    count: low,    color: "bg-emerald-500" },
        ].map(({ label, count, color }) => (
          <div key={label} className="flex items-center gap-2.5">
            <div className={`w-2.5 h-2.5 rounded-full ${color} flex-shrink-0`} />
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs text-slate-400 w-14">{label}</span>
              <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
              </div>
              <span className="text-xs font-bold text-white">{count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Status Bar Chart ─────────────────────────────────────────────────────────

function StatusBars({ patients }: { patients: Patient[] }) {
  const counts = {
    pending:   patients.filter((p) => (p.status ?? "pending") === "pending").length,
    confirmed: patients.filter((p) => p.status === "confirmed").length,
    completed: patients.filter((p) => p.status === "completed").length,
    cancelled: patients.filter((p) => p.status === "cancelled").length,
  };
  const total = patients.length || 1;
  const bars = [
    { key: "pending",   label: "Pending",   color: "bg-amber-500",   count: counts.pending   },
    { key: "confirmed", label: "Confirmed", color: "bg-blue-500",    count: counts.confirmed },
    { key: "completed", label: "Completed", color: "bg-emerald-500", count: counts.completed },
    { key: "cancelled", label: "Cancelled", color: "bg-slate-500",   count: counts.cancelled },
  ];

  return (
    <div className="space-y-3">
      {bars.map(({ key, label, color, count }) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-400 font-medium">{label}</span>
            <span className="text-xs font-bold text-white">{count}</span>
          </div>
          <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
            <div className={`h-full ${color} rounded-full transition-all duration-700`}
              style={{ width: `${(count / total) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

function ActivityFeed({ patients }: { patients: Patient[] }) {
  const recent = [...patients]
    .filter((p) => p.createdAt)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 6);

  if (recent.length === 0) return (
    <div className="flex items-center justify-center py-8">
      <p className="text-slate-600 text-sm">No activity yet</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {recent.map((p) => {
        const name    = getName(p);
        const urgency = getUrgency(p);
        const urg     = URGENCY_CONFIG[urgency as keyof typeof URGENCY_CONFIG] ?? URGENCY_CONFIG.low;
        const date    = p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" }) : "—";
        return (
          <div key={p.id} className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${urg.dot}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-300 truncate">
                <span className="font-semibold text-white">{name}</span> registered
              </p>
              <p className="text-[11px] text-slate-600">{p.patientId ?? p.id.slice(0, 12)}</p>
            </div>
            <span className="text-[11px] text-slate-600 flex-shrink-0">{date}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const unsubscribe = onValue(ref(db, "patients"), (snapshot) => {
      const data = snapshot.val();
      if (!data) { setPatients([]); setLoading(false); return; }
      setPatients(Object.keys(data).map((id) => ({ id, ...data[id] })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── Computed stats ──
  const stats = useMemo(() => {
    const total     = patients.length;
    const high      = patients.filter((p) => getUrgency(p) === "high").length;
    const medium    = patients.filter((p) => getUrgency(p) === "medium").length;
    const low       = patients.filter((p) => getUrgency(p) === "low").length;
    const pending   = patients.filter((p) => (p.status ?? "pending") === "pending").length;
    const today     = patients.filter((p) => getDate(p) === TODAY).length;
    const thisWeek  = patients.filter((p) => (p.createdAt ?? "") >= WEEK_AGO).length;
    const completed = patients.filter((p) => p.status === "completed").length;

    const todayPatients  = patients.filter((p) => getDate(p) === TODAY);
    const urgentPatients = patients.filter((p) => getUrgency(p) === "high").slice(0, 5);
    const recentPatients = [...patients]
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 5);

    return { total, high, medium, low, pending, today, thisWeek, completed, todayPatients, urgentPatients, recentPatients };
  }, [patients]);

  return (
    <div className="min-h-screen bg-[#040d1a] text-white">

      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] bg-blue-700/10 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-cyan-600/8 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-violet-600/6 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: `linear-gradient(#ffffff 1px,transparent 1px),linear-gradient(90deg,#ffffff 1px,transparent 1px)`, backgroundSize: "50px 50px" }} />
      </div>

      {/* ── Navbar ── */}
    

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Page Title ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-4">
              <span className="text-xs text-blue-300 font-semibold tracking-widest uppercase">Admin Overview</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              <span className="text-white">System </span>
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">Dashboard</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
          <button onClick={() => router.push("/patients")}
            className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all self-start sm:self-auto">
            View All Patients →
          </button>
        </div>

        {/* ── Loading skeleton ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full" />
              <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin" />
            </div>
            <p className="text-slate-500 text-sm">Loading dashboard data...</p>
          </div>
        ) : (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon="👥" label="Total Patients" value={stats.total}
                sub="All time registrations" trend={stats.thisWeek > 0 ? `+${stats.thisWeek} this week` : undefined}
                accent="from-blue-500/8 to-transparent"
                onClick={() => router.push("/patients")}
              />
              <StatCard
                icon="🔴" label="Urgent Cases" value={stats.high}
                sub="Require immediate attention"
                accent="from-red-500/8 to-transparent"
                onClick={() => router.push("/patients")}
              />
              <StatCard
                icon="⏳" label="Pending Review" value={stats.pending}
                sub="Awaiting confirmation"
                accent="from-amber-500/8 to-transparent"
                onClick={() => router.push("/patients")}
              />
              <StatCard
                icon="📅" label="Today's Appointments" value={stats.today}
                sub={`${new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })}`}
                accent="from-emerald-500/8 to-transparent"
              />
            </div>

            {/* ── Secondary stats strip ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: "✅", label: "Completed",    value: patients.filter((p) => p.status === "completed").length, color: "text-emerald-400" },
                { icon: "📋", label: "Confirmed",    value: patients.filter((p) => p.status === "confirmed").length, color: "text-blue-400"    },
                { icon: "🟡", label: "Medium Urgency", value: stats.medium,                                          color: "text-amber-400"   },
                { icon: "🟢", label: "Low Urgency",  value: stats.low,                                               color: "text-emerald-400" },
              ].map(({ icon, label, value, color }) => (
                <div key={label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className={`text-lg font-black ${color}`}>{value}</p>
                    <p className="text-[11px] text-slate-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Main content grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Today's appointments */}
              <div className="lg:col-span-2 bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">📅</span>
                    <h3 className="text-sm font-black text-white">Today's Appointments</h3>
                    <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                      {stats.today}
                    </span>
                  </div>
                  <button onClick={() => router.push("/patients")} className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors">View all →</button>
                </div>
                <div className="p-3">
                  {stats.todayPatients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <span className="text-4xl">📭</span>
                      <p className="text-slate-500 text-sm font-medium">No appointments today</p>
                    </div>
                  ) : (
                    stats.todayPatients.map((p) => (
                      <MiniPatientRow key={p.id} patient={p} onClick={() => router.push(`/patients/${p.id}`)} />
                    ))
                  )}
                </div>
              </div>

              {/* Urgency breakdown */}
              <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
                  <span className="text-lg">📊</span>
                  <h3 className="text-sm font-black text-white">Urgency Breakdown</h3>
                </div>
                <div className="p-5">
                  <UrgencyDonut high={stats.high} medium={stats.medium} low={stats.low} total={stats.total} />
                </div>
              </div>

              {/* Recent registrations */}
              <div className="lg:col-span-2 bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🆕</span>
                    <h3 className="text-sm font-black text-white">Recent Registrations</h3>
                  </div>
                  <button onClick={() => router.push("/patients")} className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors">View all →</button>
                </div>
                <div className="p-3">
                  {stats.recentPatients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <span className="text-4xl">🏥</span>
                      <p className="text-slate-500 text-sm font-medium">No patients registered yet</p>
                      <button onClick={() => router.push("/register")}
                        className="mt-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                        Register first patient →
                      </button>
                    </div>
                  ) : (
                    stats.recentPatients.map((p) => (
                      <MiniPatientRow key={p.id} patient={p} onClick={() => router.push(`/patients/${p.id}`)} />
                    ))
                  )}
                </div>
              </div>

              {/* Status distribution */}
              <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
                  <span className="text-lg">📈</span>
                  <h3 className="text-sm font-black text-white">Status Distribution</h3>
                </div>
                <div className="p-5">
                  <StatusBars patients={patients} />
                </div>
              </div>

            </div>

            {/* ── Urgent cases ── */}
            {stats.urgentPatients.length > 0 && (
              <div className="bg-red-500/[0.04] border border-red-500/[0.15] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-red-500/[0.10]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🚨</span>
                    <h3 className="text-sm font-black text-red-400">Urgent Cases — Immediate Attention Required</h3>
                    <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/30 animate-pulse">
                      {stats.urgentPatients.length}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  {stats.urgentPatients.map((p) => (
                    <MiniPatientRow key={p.id} patient={p} onClick={() => router.push(`/patients/${p.id}`)} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Activity Feed + Quick Actions ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Activity */}
              <div className="lg:col-span-2 bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
                  <span className="text-lg">⚡</span>
                  <h3 className="text-sm font-black text-white">Recent Activity</h3>
                </div>
                <div className="p-5">
                  <ActivityFeed patients={patients} />
                </div>
              </div>

              {/* Quick actions */}
              <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
                  <span className="text-lg">⚙️</span>
                  <h3 className="text-sm font-black text-white">Quick Actions</h3>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { icon: "📝", label: "Register New Patient",    sub: "Add to the system",         href: "/register",  color: "from-blue-600 to-cyan-500",     shadow: "shadow-blue-500/20" },
                    { icon: "👥", label: "View All Patients",        sub: "Browse full records",       href: "/patients",  color: "from-violet-600 to-purple-500", shadow: "shadow-violet-500/20" },
                    { icon: "🔴", label: "View Urgent Cases",        sub: `${stats.high} need attention`, href: "/patients", color: "from-red-600 to-rose-500",    shadow: "shadow-red-500/20" },
                  ].map(({ icon, label, sub, href, color, shadow }) => (
                    <button key={label} onClick={() => router.push(href)}
                      className={`w-full flex items-center gap-3 p-3.5 bg-gradient-to-r ${color} bg-opacity-10 rounded-xl border border-white/[0.08] hover:border-white/[0.15] hover:scale-[1.02] transition-all duration-200 shadow-lg ${shadow} text-left`}>
                      <span className="text-xl flex-shrink-0">{icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white leading-tight">{label}</p>
                        <p className="text-[11px] text-white/50">{sub}</p>
                      </div>
                      <span className="text-white/40 ml-auto text-sm flex-shrink-0">→</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
