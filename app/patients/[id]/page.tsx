"use client";

import { useEffect, useState } from "react";
import { ref, onValue, remove, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Patient {
  id: string;
  patientId?: string;
  createdAt?: string;
  status?: string;
  personal?: { fullName?: string; mobile?: string; email?: string; dob?: string; gender?: string; address?: string };
  visit?: { reasonForVisit?: string; preferredDate?: string; preferredTime?: string; urgency?: string; symptoms?: string };
  medical?: { medication?: string; allergies?: string; chronicIllness?: string; previousSurgeries?: string };
  emergency?: { name?: string; phone?: string; relationship?: string };
  // flat fallback
  fullName?: string; mobile?: string; email?: string; reasonForVisit?: string;
}

interface EditForm {
  fullName: string; mobile: string; email: string; dob: string; gender: string; address: string;
  emergencyName: string; emergencyPhone: string; emergencyRelationship: string;
  medication: string; allergies: string; chronicIllness: string; previousSurgeries: string;
  reasonForVisit: string; symptoms: string; preferredDate: string; preferredTime: string;
  urgency: string; status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getName    = (p: Patient) => p.personal?.fullName    ?? p.fullName    ?? "—";
const getMobile  = (p: Patient) => p.personal?.mobile      ?? p.mobile      ?? "—";
const getEmail   = (p: Patient) => p.personal?.email       ?? p.email       ?? "—";
const getReason  = (p: Patient) => p.visit?.reasonForVisit ?? p.reasonForVisit ?? "—";
const getUrgency = (p: Patient) => p.visit?.urgency        ?? "low";

const URGENCY_CONFIG = {
  high:   { label: "High",   dot: "bg-red-400",     badge: "bg-red-500/15 text-red-400 border-red-500/30"         },
  medium: { label: "Medium", dot: "bg-amber-400",   badge: "bg-amber-500/15 text-amber-400 border-amber-500/30"   },
  low:    { label: "Low",    dot: "bg-emerald-400", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  pending:   { label: "Pending",   badge: "bg-amber-500/15 text-amber-400 border-amber-500/30"       },
  confirmed: { label: "Confirmed", badge: "bg-blue-500/15 text-blue-400 border-blue-500/30"          },
  completed: { label: "Completed", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  cancelled: { label: "Cancelled", badge: "bg-slate-500/15 text-slate-400 border-slate-500/30"       },
};

function getInitials(name: string) {
  return name === "—" ? "?" : name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
function avatarColor(name: string) {
  const colors = ["from-blue-600 to-cyan-500","from-violet-600 to-purple-500","from-rose-600 to-pink-500","from-emerald-600 to-teal-500","from-orange-600 to-amber-500","from-indigo-600 to-blue-500"];
  return colors[name.charCodeAt(0) % colors.length] ?? colors[0];
}

// ─── Reusable UI ──────────────────────────────────────────────────────────────

function InfoCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-lg">{icon}</span>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value?: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-6 py-1">
      <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex-shrink-0 w-36">{label}</span>
      <span className={`text-sm text-right leading-relaxed ${highlight ? "text-white font-semibold" : "text-slate-300"}`}>{value || "—"}</span>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">{label}</p>
      <p className="text-sm text-slate-300 leading-relaxed bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">{value || "Not specified"}</p>
    </div>
  );
}

function StatPill({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-4 text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-base font-black text-white">{value}</p>
      <p className="text-[10px] text-slate-500 font-medium">{label}</p>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ patient, onClose, onSave }: {
  patient: Patient;
  onClose: () => void;
  onSave: (data: EditForm) => Promise<void>;
}) {
  const [form, setForm] = useState<EditForm>({
    fullName:              patient.personal?.fullName    ?? patient.fullName    ?? "",
    mobile:                patient.personal?.mobile      ?? patient.mobile      ?? "",
    email:                 patient.personal?.email       ?? patient.email       ?? "",
    dob:                   patient.personal?.dob         ?? "",
    gender:                patient.personal?.gender      ?? "",
    address:               patient.personal?.address     ?? "",
    emergencyName:         patient.emergency?.name       ?? "",
    emergencyPhone:        patient.emergency?.phone      ?? "",
    emergencyRelationship: patient.emergency?.relationship ?? "",
    medication:            patient.medical?.medication   ?? "",
    allergies:             patient.medical?.allergies    ?? "",
    chronicIllness:        patient.medical?.chronicIllness ?? "",
    previousSurgeries:     patient.medical?.previousSurgeries ?? "",
    reasonForVisit:        patient.visit?.reasonForVisit ?? patient.reasonForVisit ?? "",
    symptoms:              patient.visit?.symptoms       ?? "",
    preferredDate:         patient.visit?.preferredDate  ?? "",
    preferredTime:         patient.visit?.preferredTime  ?? "",
    urgency:               patient.visit?.urgency        ?? "low",
    status:                patient.status                ?? "pending",
  });
  const [saving, setSaving] = useState(false);

  const set = (field: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const inputCls = "w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.10] rounded-xl text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all";
  const labelCls = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-[#080f20] border border-white/[0.10] rounded-3xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white text-sm">✏️</span>
            </div>
            <div>
              <p className="text-[10px] text-blue-400 font-bold tracking-widest uppercase leading-none">Edit Record</p>
              <p className="text-sm font-bold text-white leading-tight">{getName(patient)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/[0.05] hover:bg-white/[0.10] rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-all text-sm">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Personal */}
          <div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2"><span>👤</span> Personal Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Full Name *</label>
                <input className={inputCls} value={form.fullName} onChange={set("fullName")} placeholder="Full name" />
              </div>
              <div>
                <label className={labelCls}>Date of Birth</label>
                <input type="date" className={inputCls} value={form.dob} onChange={set("dob")} />
              </div>
              <div>
                <label className={labelCls}>Gender</label>
                <select className={`${inputCls} cursor-pointer`} value={form.gender} onChange={set("gender")}>
                  <option value="" className="bg-[#080f20]">Select gender</option>
                  <option value="male" className="bg-[#080f20]">Male</option>
                  <option value="female" className="bg-[#080f20]">Female</option>
                  <option value="non-binary" className="bg-[#080f20]">Non-Binary</option>
                  <option value="prefer-not" className="bg-[#080f20]">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Mobile</label>
                <input className={inputCls} value={form.mobile} onChange={set("mobile")} placeholder="+27 82 000 0000" />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" className={inputCls} value={form.email} onChange={set("email")} placeholder="email@example.com" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Address</label>
                <input className={inputCls} value={form.address} onChange={set("address")} placeholder="Street, City, Province" />
              </div>
            </div>
          </div>

          {/* Emergency */}
          <div>
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2"><span>🚨</span> Emergency Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Contact Name</label>
                <input className={inputCls} value={form.emergencyName} onChange={set("emergencyName")} placeholder="Emergency contact name" />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input className={inputCls} value={form.emergencyPhone} onChange={set("emergencyPhone")} placeholder="+27 83 000 0000" />
              </div>
              <div>
                <label className={labelCls}>Relationship</label>
                <select className={`${inputCls} cursor-pointer`} value={form.emergencyRelationship} onChange={set("emergencyRelationship")}>
                  <option value="" className="bg-[#080f20]">Select</option>
                  {["spouse","parent","sibling","child","friend","other"].map((r) => (
                    <option key={r} value={r} className="bg-[#080f20]">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Medical */}
          <div>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2"><span>🩺</span> Medical Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Allergies</label>
                <input className={inputCls} value={form.allergies} onChange={set("allergies")} placeholder="e.g. Penicillin" />
              </div>
              <div>
                <label className={labelCls}>Chronic Illness</label>
                <input className={inputCls} value={form.chronicIllness} onChange={set("chronicIllness")} placeholder="e.g. Diabetes" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Current Medication</label>
                <textarea rows={2} className={`${inputCls} resize-none`} value={form.medication} onChange={set("medication")} placeholder="List medications..." />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Previous Surgeries</label>
                <textarea rows={2} className={`${inputCls} resize-none`} value={form.previousSurgeries} onChange={set("previousSurgeries")} placeholder="Describe any past surgeries..." />
              </div>
            </div>
          </div>

          {/* Visit */}
          <div>
            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2"><span>📋</span> Visit Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Preferred Date</label>
                <input type="date" className={inputCls} value={form.preferredDate} onChange={set("preferredDate")} />
              </div>
              <div>
                <label className={labelCls}>Preferred Time</label>
                <input type="time" className={inputCls} value={form.preferredTime} onChange={set("preferredTime")} />
              </div>
              <div>
                <label className={labelCls}>Urgency</label>
                <select className={`${inputCls} cursor-pointer`} value={form.urgency} onChange={set("urgency")}>
                  <option value="low"    className="bg-[#080f20]">Low</option>
                  <option value="medium" className="bg-[#080f20]">Medium</option>
                  <option value="high"   className="bg-[#080f20]">High</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select className={`${inputCls} cursor-pointer`} value={form.status} onChange={set("status")}>
                  <option value="pending"   className="bg-[#080f20]">Pending</option>
                  <option value="confirmed" className="bg-[#080f20]">Confirmed</option>
                  <option value="completed" className="bg-[#080f20]">Completed</option>
                  <option value="cancelled" className="bg-[#080f20]">Cancelled</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Reason for Visit *</label>
                <textarea rows={2} className={`${inputCls} resize-none`} value={form.reasonForVisit} onChange={set("reasonForVisit")} placeholder="Reason for visit..." />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Symptoms</label>
                <textarea rows={2} className={`${inputCls} resize-none`} value={form.symptoms} onChange={set("symptoms")} placeholder="Current symptoms..." />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-5 border-t border-white/[0.07] flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 font-bold rounded-xl transition-all text-sm">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm flex items-center justify-center gap-2">
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Saving...
              </>
            ) : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ patient, onClose, onConfirm }: {
  patient: Patient;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#080f20] border border-red-500/20 rounded-3xl shadow-2xl shadow-red-500/10 p-6">

        {/* Icon */}
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">🗑️</span>
        </div>

        <h2 className="text-xl font-black text-white text-center mb-2">Delete Patient?</h2>
        <p className="text-slate-400 text-sm text-center mb-1">
          You are about to permanently delete
        </p>
        <p className="text-white font-bold text-center mb-1">{getName(patient)}</p>
        <p className="text-slate-500 text-xs text-center font-mono mb-6">{patient.patientId ?? patient.id}</p>

        {/* Warning */}
        <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
          <p className="text-red-400 text-xs leading-relaxed text-center">
            ⚠ This action cannot be undone. All medical records, visit history, and emergency contacts for this patient will be permanently erased.
          </p>
        </div>

        {/* Confirmation checkbox */}
        <label className="flex items-center gap-3 cursor-pointer mb-5 group">
          <div
            onClick={() => setConfirmed((c) => !c)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${confirmed ? "bg-red-500 border-red-500" : "border-white/20 group-hover:border-red-500/50"}`}
          >
            {confirmed && <span className="text-white text-xs font-black">✓</span>}
          </div>
          <span className="text-xs text-slate-400 leading-relaxed">I understand this is permanent and cannot be reversed</span>
        </label>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 font-bold rounded-xl transition-all text-sm">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!confirmed || deleting}
            className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
          >
            {deleting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Deleting...
              </>
            ) : "Delete Patient"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl text-sm font-semibold transition-all
      ${type === "success" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-emerald-500/10" : "bg-red-500/15 border-red-500/30 text-red-300 shadow-red-500/10"}`}>
      <span>{type === "success" ? "✓" : "✕"}</span>
      {message}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [patient,    setPatient]    = useState<Patient | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [showEdit,   setShowEdit]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [toast,      setToast]      = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onValue(ref(db, `patients/${id}`), (snapshot) => {
      const data = snapshot.val();
      if (!data) { setNotFound(true); setLoading(false); return; }
      setPatient({ id, ...data });
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  // ── Handle Edit Save ──
  const handleSave = async (form: EditForm) => {
    try {
      await update(ref(db, `patients/${id}`), {
        status: form.status,
        personal: {
          fullName: form.fullName, mobile: form.mobile, email: form.email,
          dob: form.dob, gender: form.gender, address: form.address,
        },
        emergency: {
          name: form.emergencyName, phone: form.emergencyPhone, relationship: form.emergencyRelationship,
        },
        medical: {
          medication: form.medication, allergies: form.allergies,
          chronicIllness: form.chronicIllness, previousSurgeries: form.previousSurgeries,
        },
        visit: {
          reasonForVisit: form.reasonForVisit, symptoms: form.symptoms,
          preferredDate: form.preferredDate, preferredTime: form.preferredTime, urgency: form.urgency,
        },
      });
      setShowEdit(false);
      showToast("Patient record updated successfully", "success");
    } catch {
      showToast("Failed to update patient. Please try again.", "error");
    }
  };

  // ── Handle Delete ──
  const handleDelete = async () => {
    try {
      await remove(ref(db, `patients/${id}`));
      setShowDelete(false);
      showToast("Patient deleted successfully", "success");
      setTimeout(() => router.push("/patients"), 1200);
    } catch {
      showToast("Failed to delete patient. Please try again.", "error");
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#040d1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full" />
            <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin" />
          </div>
          <p className="text-slate-500 text-sm">Loading patient profile...</p>
        </div>
      </div>
    );
  }

  // ── Not Found ──
  if (notFound || !patient) {
    return (
      <div className="min-h-screen bg-[#040d1a] flex items-center justify-center p-6">
        <div className="text-center">
          <span className="text-6xl">🔍</span>
          <h2 className="text-2xl font-black text-white mt-4 mb-2">Patient Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">No record exists for ID: <span className="font-mono text-blue-400">{id}</span></p>
          <button onClick={() => router.push("/patients")} className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold px-6 py-3 rounded-xl hover:scale-105 transition-all shadow-lg shadow-blue-500/25">← Back to Patients</button>
        </div>
      </div>
    );
  }

  const name    = getName(patient);
  const urgency = getUrgency(patient);
  const status  = patient.status ?? "pending";
  const urg     = URGENCY_CONFIG[urgency as keyof typeof URGENCY_CONFIG] ?? URGENCY_CONFIG.low;
  const sta     = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const dob     = patient.personal?.dob ?? "";
  const age     = dob ? `${Math.floor((Date.now() - new Date(dob).getTime()) / 31_557_600_000)} yrs` : "—";

  return (
    <div className="min-h-screen bg-[#040d1a] text-white">

      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] bg-blue-700/10 rounded-full blur-[150px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-cyan-600/8 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `linear-gradient(#ffffff 1px,transparent 1px),linear-gradient(90deg,#ffffff 1px,transparent 1px)`, backgroundSize: "50px 50px" }} />
      </div>

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 bg-[#040d1a]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/patients")}
              className="flex items-center gap-2 text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150">
              ← Back
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
              <span className="hover:text-slate-400 cursor-pointer" onClick={() => router.push("/patients")}>Patients</span>
              <span>/</span>
              <span className="text-slate-400 font-mono">{patient.patientId ?? id}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Edit Button */}
            <button onClick={() => setShowEdit(true)}
              className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200">
              <span>✏️</span>
              <span className="hidden sm:inline">Edit</span>
            </button>
            {/* Delete Button */}
            <button onClick={() => setShowDelete(true)}
              className="flex items-center gap-2 bg-red-600/15 hover:bg-red-600/25 border border-red-500/25 hover:border-red-500/50 text-red-400 hover:text-red-300 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200">
              <span>🗑️</span>
              <span className="hidden sm:inline">Delete</span>
            </button>
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-black text-sm">✚</span>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Hero Card ── */}
        <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 md:p-8 overflow-hidden">
          <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${avatarColor(name)} opacity-[0.04]`} />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center text-2xl font-black text-white shadow-2xl flex-shrink-0`}>
              {getInitials(name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${urg.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${urg.dot}`} /> {urg.label} Urgency
                </span>
                <span className={`inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full border ${sta.badge}`}>{sta.label}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1">{name}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5"><span className="text-blue-400 font-mono text-xs">#</span>{patient.patientId ?? "No ID"}</span>
                {getMobile(patient) !== "—" && <span>📞 {getMobile(patient)}</span>}
                {getEmail(patient) !== "—" && <span className="truncate max-w-[200px]">✉ {getEmail(patient)}</span>}
              </div>
            </div>
            {patient.createdAt && (
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Registered</p>
                <p className="text-sm text-slate-300 font-semibold">{new Date(patient.createdAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}</p>
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/[0.06]">
            <StatPill icon="🎂" label="Age"        value={age} />
            <StatPill icon="⚧"  label="Gender"     value={patient.personal?.gender ?? "—"} />
            <StatPill icon="📅" label="Appt. Date" value={patient.visit?.preferredDate ?? "—"} />
            <StatPill icon="🕐" label="Appt. Time" value={patient.visit?.preferredTime ?? "—"} />
          </div>
        </div>

        {/* ── Edit / Delete quick action bar ── */}
        <div className="flex gap-3">
          <button onClick={() => setShowEdit(true)}
            className="flex-1 flex items-center justify-center gap-2.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 hover:text-blue-300 py-3 rounded-2xl font-bold text-sm transition-all duration-200">
            <span>✏️</span> Edit Patient Record
          </button>
          <button onClick={() => setShowDelete(true)}
            className="flex-1 flex items-center justify-center gap-2.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 py-3 rounded-2xl font-bold text-sm transition-all duration-200">
            <span>🗑️</span> Delete Patient
          </button>
        </div>

        {/* ── Detail grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <InfoCard title="Personal Details" icon="👤">
            <InfoRow label="Full Name"     value={getName(patient)}          highlight />
            <InfoRow label="Date of Birth" value={patient.personal?.dob}     />
            <InfoRow label="Gender"        value={patient.personal?.gender}  />
            <InfoRow label="Mobile"        value={getMobile(patient)}        />
            <InfoRow label="Email"         value={getEmail(patient)}         />
            <InfoRow label="Address"       value={patient.personal?.address} />
          </InfoCard>

          <InfoCard title="Emergency Contact" icon="🚨">
            <InfoRow label="Name"         value={patient.emergency?.name}         highlight />
            <InfoRow label="Phone"        value={patient.emergency?.phone}        />
            <InfoRow label="Relationship" value={patient.emergency?.relationship} />
            <div className="mt-4 bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-3">
              <p className="text-[11px] text-red-400/70 leading-relaxed">Contact immediately in case of emergency or life-threatening situation.</p>
            </div>
          </InfoCard>

          <InfoCard title="Visit Details" icon="📋">
            <InfoRow label="Preferred Date" value={patient.visit?.preferredDate} highlight />
            <InfoRow label="Preferred Time" value={patient.visit?.preferredTime} />
            <div className="pt-2 border-t border-white/[0.05]">
              <InfoBlock label="Reason for Visit" value={getReason(patient)} />
            </div>
            <InfoBlock label="Current Symptoms" value={patient.visit?.symptoms} />
          </InfoCard>

          <InfoCard title="Medical Information" icon="🩺">
            <InfoBlock label="Current Medication"  value={patient.medical?.medication}        />
            <InfoRow   label="Known Allergies"     value={patient.medical?.allergies}         />
            <InfoRow   label="Chronic Illness"     value={patient.medical?.chronicIllness}    />
            <InfoBlock label="Previous Surgeries"  value={patient.medical?.previousSurgeries} />
          </InfoCard>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <button onClick={() => router.push("/patients")}
            className="flex-1 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 font-bold rounded-xl transition-all text-sm">
            ← All Patients
          </button>
          <button onClick={() => router.push("/register")}
            className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] text-sm">
            + Register New Patient
          </button>
        </div>
      </div>

      {/* ── Modals ── */}
      {showEdit   && <EditModal   patient={patient} onClose={() => setShowEdit(false)}   onSave={handleSave}   />}
      {showDelete && <DeleteModal patient={patient} onClose={() => setShowDelete(false)} onConfirm={handleDelete} />}

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
