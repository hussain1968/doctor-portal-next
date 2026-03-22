"use client";

import { useEffect, useState, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface Patient {
  id: string; patientId?: string; createdAt?: string; status?: string;
  personal?: { fullName?: string; mobile?: string; email?: string; dob?: string; gender?: string; address?: string };
  visit?: { reasonForVisit?: string; preferredDate?: string; preferredTime?: string; urgency?: string; symptoms?: string };
  medical?: { allergies?: string; chronicIllness?: string; medication?: string };
  emergency?: { name?: string; phone?: string; relationship?: string };
  fullName?: string; mobile?: string; email?: string; reasonForVisit?: string;
}

type SortKey = "name" | "date" | "urgency" | "status";
type FilterUrgency = "all" | "low" | "medium" | "high";

const getName    = (p: Patient) => p.personal?.fullName    ?? p.fullName    ?? "—";
const getMobile  = (p: Patient) => p.personal?.mobile      ?? p.mobile      ?? "—";
const getEmail   = (p: Patient) => p.personal?.email       ?? p.email       ?? "—";
const getReason  = (p: Patient) => p.visit?.reasonForVisit ?? p.reasonForVisit ?? "—";
const getUrgency = (p: Patient) => p.visit?.urgency        ?? "low";
const getDate    = (p: Patient) => p.visit?.preferredDate  ?? p.createdAt?.slice(0, 10) ?? "—";

const URGENCY_CONFIG = {
  high:   { label: "High",   dot: "bg-red-400",     badge: "bg-red-500/15 text-red-400 border-red-500/30" },
  medium: { label: "Medium", dot: "bg-amber-400",   badge: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  low:    { label: "Low",    dot: "bg-emerald-400", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  pending:   { label: "Pending",   badge: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  confirmed: { label: "Confirmed", badge: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  completed: { label: "Completed", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  cancelled: { label: "Cancelled", badge: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
};

function getInitials(name: string) {
  return name === "—" ? "?" : name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
function avatarColor(name: string) {
  const colors = ["from-blue-600 to-cyan-500","from-violet-600 to-purple-500","from-rose-600 to-pink-500","from-emerald-600 to-teal-500","from-orange-600 to-amber-500","from-indigo-600 to-blue-500"];
  return colors[name.charCodeAt(0) % colors.length] ?? colors[0];
}

function StatCard({ icon, label, value, sub, accent }: { icon: string; label: string; value: number | string; sub?: string; accent: string }) {
  return (
    <div className="relative bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 overflow-hidden group hover:border-white/[0.12] transition-all duration-300">
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl">{icon}</span>
          {sub && <span className="text-[10px] text-slate-500 font-semibold bg-white/[0.05] px-2 py-0.5 rounded-full">{sub}</span>}
        </div>
        <p className="text-3xl font-black text-white mb-1">{value}</p>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
      </div>
    </div>
  );
}

function PatientRow({ patient, index, onClick }: { patient: Patient; index: number; onClick: () => void }) {
  const name    = getName(patient);
  const urgency = getUrgency(patient);
  const status  = patient.status ?? "pending";
  const urg     = URGENCY_CONFIG[urgency as keyof typeof URGENCY_CONFIG] ?? URGENCY_CONFIG.low;
  const sta     = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <tr onClick={onClick} className="group border-b border-white/[0.04] hover:bg-white/[0.04] transition-all duration-150 cursor-pointer">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center text-xs font-black text-white shadow-lg flex-shrink-0`}>{getInitials(name)}</div>
          <div><p className="text-sm font-semibold text-white leading-tight">{name}</p><p className="text-[11px] text-slate-500 mt-0.5">{patient.patientId ?? "—"}</p></div>
        </div>
      </td>
      <td className="px-5 py-4 hidden md:table-cell"><p className="text-sm text-slate-300">{getMobile(patient)}</p><p className="text-[11px] text-slate-500 mt-0.5">{getEmail(patient)}</p></td>
      <td className="px-5 py-4 hidden lg:table-cell"><p className="text-sm text-slate-400 max-w-[200px] truncate">{getReason(patient)}</p></td>
      <td className="px-5 py-4 hidden sm:table-cell"><p className="text-sm text-slate-400">{getDate(patient)}</p></td>
      <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${urg.badge}`}><span className={`w-1.5 h-1.5 rounded-full ${urg.dot}`} />{urg.label}</span></td>
      <td className="px-5 py-4 hidden sm:table-cell"><span className={`inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full border ${sta.badge}`}>{sta.label}</span></td>
      <td className="px-5 py-4"><span className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-150 inline-block">→</span></td>
    </tr>
  );
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients,  setPatients]  = useState<Patient[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [sortKey,   setSortKey]   = useState<SortKey>("date");
  const [filterUrg, setFilterUrg] = useState<FilterUrgency>("all");

  useEffect(() => {
    const unsubscribe = onValue(ref(db, "patients"), (snapshot) => {
      const data = snapshot.val();
      if (!data) { setPatients([]); setLoading(false); return; }
      setPatients(Object.keys(data).map((id) => ({ id, ...data[id] })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => ({
    total:   patients.length,
    high:    patients.filter((p) => getUrgency(p) === "high").length,
    pending: patients.filter((p) => (p.status ?? "pending") === "pending").length,
    today:   patients.filter((p) => getDate(p) === new Date().toISOString().slice(0, 10)).length,
  }), [patients]);

  const filtered = useMemo(() => {
    let list = [...patients];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => getName(p).toLowerCase().includes(q) || getEmail(p).toLowerCase().includes(q) || getMobile(p).includes(q) || (p.patientId ?? "").toLowerCase().includes(q));
    }
    if (filterUrg !== "all") list = list.filter((p) => getUrgency(p) === filterUrg);
    list.sort((a, b) => {
      if (sortKey === "name")    return getName(a).localeCompare(getName(b));
      if (sortKey === "urgency") return ["high","medium","low"].indexOf(getUrgency(a)) - ["high","medium","low"].indexOf(getUrgency(b));
      if (sortKey === "status")  return (a.status ?? "").localeCompare(b.status ?? "");
      return getDate(b).localeCompare(getDate(a));
    });
    return list;
  }, [patients, search, filterUrg, sortKey]);

  return (
    <div className="min-h-screen bg-[#040d1a] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-700/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-600/8 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `linear-gradient(#ffffff 1px,transparent 1px),linear-gradient(90deg,#ffffff 1px,transparent 1px)`, backgroundSize: "50px 50px" }} />
      </div>

      {/* ── Navbar ── */}
      

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Title */}
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-4">
            <span className="text-xs text-blue-300 font-semibold tracking-widest uppercase">Patient Management</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            <span className="text-white">All </span>
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">Patients</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Click any row to open the full patient profile</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon="👥" label="Total Patients"     value={stats.total}   accent="from-blue-500/5 to-transparent" />
          <StatCard icon="🔴" label="High Urgency"       value={stats.high}    accent="from-red-500/5 to-transparent" sub="Needs Attention" />
          <StatCard icon="⏳" label="Pending Review"     value={stats.pending} accent="from-amber-500/5 to-transparent" />
          <StatCard icon="📅" label="Appointments Today" value={stats.today}   accent="from-emerald-500/5 to-transparent" />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
            <input type="text" placeholder="Search by name, email, phone, or patient ID..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all" />
          </div>
          <div className="flex gap-2">
            {(["all","high","medium","low"] as FilterUrgency[]).map((u) => (
              <button key={u} onClick={() => setFilterUrg(u)}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold capitalize transition-all duration-150 border
                  ${filterUrg === u ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20" : "bg-white/[0.03] border-white/[0.07] text-slate-400 hover:border-white/20 hover:text-slate-200"}`}>
                {u}
              </button>
            ))}
          </div>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-slate-300 outline-none focus:border-blue-500/50 cursor-pointer">
            <option value="date"    className="bg-[#080f1f]">Sort: Date</option>
            <option value="name"    className="bg-[#080f1f]">Sort: Name</option>
            <option value="urgency" className="bg-[#080f1f]">Sort: Urgency</option>
            <option value="status"  className="bg-[#080f1f]">Sort: Status</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
            <p className="text-xs text-slate-500 font-semibold">Showing <span className="text-white font-bold">{filtered.length}</span> of {patients.length} patients</p>
            <p className="text-[10px] text-slate-600">Click any row to open full profile →</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full" />
                <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin" />
              </div>
              <p className="text-slate-500 text-sm">Loading patient records...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <span className="text-5xl">🏥</span>
              <p className="text-white font-bold text-lg">{search || filterUrg !== "all" ? "No results found" : "No patients yet"}</p>
              <p className="text-slate-500 text-sm">{search || filterUrg !== "all" ? "Try adjusting your search or filter" : "Register your first patient to get started"}</p>
              {!search && filterUrg === "all" && (
                <button onClick={() => router.push("/register")} className="mt-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:scale-105 transition-all shadow-lg shadow-blue-500/25">Register Patient →</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["Patient","Contact","Reason for Visit","Date","Urgency","Status",""].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((patient, i) => (
                    <PatientRow key={patient.id} patient={patient} index={i} onClick={() => router.push(`/patients/${patient.id}`)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.01] flex items-center justify-between">
              <p className="text-[11px] text-slate-600">{filtered.length} record{filtered.length !== 1 ? "s" : ""} · Updated in real-time via Firebase</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[11px] text-emerald-500 font-medium">Live</span>
              </div>
            </div>
          )}
        </div>

        {/* ✅ Bottom nav bar */}
        <div className="flex items-center justify-center gap-4 pb-8">
          <button onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs font-semibold transition-colors">
            <span>🏠</span> Back to Dashboard
          </button>
          <span className="text-slate-700">·</span>
          <button onClick={() => router.push("/register")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs font-semibold transition-colors">
            <span>📝</span> Register New Patient
          </button>
        </div>

      </div>
    </div>
  );
}
