"use client";

import { useState } from "react";
import { ref, set as firebaseSet } from "firebase/database";
import { db } from "@/lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  fullName: string;
  dob: string;
  gender: string;
  mobile: string;
  email: string;
  address: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
  medication: string;
  allergies: string;
  chronicIllness: string;
  previousSurgeries: string;
  reasonForVisit: string;
  symptoms: string;
  preferredDate: string;
  preferredTime: string;
  urgency: string;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generatePatientId = (): string => {
  const prefix = "PAT";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

const INITIAL_FORM: FormData = {
  fullName: "", dob: "", gender: "", mobile: "", email: "", address: "",
  emergencyName: "", emergencyPhone: "", emergencyRelationship: "",
  medication: "", allergies: "", chronicIllness: "", previousSurgeries: "",
  reasonForVisit: "", symptoms: "", preferredDate: "", preferredTime: "", urgency: "",
};

const REQUIRED_FIELDS: (keyof FormData)[] = [
  "fullName", "dob", "gender", "mobile", "email",
  "emergencyName", "emergencyPhone", "emergencyRelationship",
  "reasonForVisit", "preferredDate", "urgency",
];

const URGENCY_OPTIONS = [
  { value: "low",    label: "Low",    icon: "🟢", ring: "ring-emerald-500", bg: "bg-emerald-950/60", text: "text-emerald-400", border: "border-emerald-500/60" },
  { value: "medium", label: "Medium", icon: "🟡", ring: "ring-amber-500",   bg: "bg-amber-950/60",   text: "text-amber-400",   border: "border-amber-500/60"   },
  { value: "high",   label: "High",   icon: "🔴", ring: "ring-red-500",     bg: "bg-red-950/60",     text: "text-red-400",     border: "border-red-500/60"     },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 md:p-8 backdrop-blur-sm ${className}`}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/[0.04] to-transparent pointer-events-none" />
      <div className="relative">{children}</div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, step }: {
  icon: string; title: string; subtitle: string; step: string;
}) {
  return (
    <div className="flex items-start gap-4 mb-7">
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-xl">
          {icon}
        </div>
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#0a1628] border border-blue-500/40 rounded-full text-[9px] font-black text-blue-400 flex items-center justify-center">
          {step}
        </span>
      </div>
      <div className="pt-0.5">
        <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
      {text}{required && <span className="text-blue-400 ml-1">*</span>}
    </label>
  );
}

function Field({ error, children }: { error?: string; children: React.ReactNode }) {
  return (
    <div>
      {children}
      {error && (
        <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

const inputClass = (hasError: boolean) =>
  `w-full px-4 py-3 rounded-xl text-sm text-slate-200 bg-white/[0.05] border transition-all duration-150 outline-none
   placeholder:text-slate-600 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/30
   ${hasError ? "border-red-500/60 focus:border-red-500" : "border-white/[0.08] focus:border-blue-500/50"}`;

function Input({ id, type = "text", placeholder, value, onChange, error }: {
  id: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; error?: string;
}) {
  return (
    <Field error={error}>
      <input
        id={id} type={type} placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass(!!error)}
      />
    </Field>
  );
}

function Textarea({ id, placeholder, value, onChange, rows = 3, error }: {
  id: string; placeholder?: string; value: string;
  onChange: (v: string) => void; rows?: number; error?: string;
}) {
  return (
    <Field error={error}>
      <textarea
        id={id} placeholder={placeholder} value={value} rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass(!!error)} resize-none`}
      />
    </Field>
  );
}

function Select({ id, value, onChange, options, placeholder, error }: {
  id: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder: string; error?: string;
}) {
  return (
    <Field error={error}>
      <select
        id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className={`${inputClass(!!error)} cursor-pointer ${value === "" ? "text-slate-600" : "text-slate-200"}`}
      >
        <option value="" disabled className="bg-[#0a1628]">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0a1628]">{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ patientId, name, date, onReset }: {
  patientId: string; name: string; date: string; onReset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#040d1a] flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px]" />
      </div>
      <div className="relative max-w-md w-full">
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-10 text-center backdrop-blur-sm">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-emerald-400 font-bold tracking-widest uppercase mb-3">Registration Complete</p>
          <h2 className="text-2xl font-black text-white mb-2">Welcome, {name.split(" ")[0]}!</h2>
          <p className="text-slate-400 text-sm mb-8">
            Your patient profile has been saved. We will confirm your appointment for{" "}
            <span className="text-white font-semibold">{date}</span>.
          </p>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 mb-8">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Your Patient ID</p>
            <p className="font-black text-blue-400 text-xl tracking-wider font-mono">{patientId}</p>
            <p className="text-[11px] text-slate-600 mt-2">Save this ID for future appointments</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onReset}
              className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl font-bold text-sm transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
              Register Another
            </button>
            <button className="flex-1 py-3.5 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-slate-300 rounded-xl font-bold text-sm transition-all duration-200">
              Go to Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatientRegistration() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [savedPatient, setSavedPatient] = useState<{ patientId: string; name: string; date: string } | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // ✅ Renamed to "setField" — no conflict with Firebase's imported "set"
  const setField = (field: keyof FormData) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    REQUIRED_FIELDS.forEach((f) => {
      if (!form[f].trim()) errs[f] = "This field is required";
    });
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Enter a valid email address";
    if (form.mobile && !/^\+?[\d\s\-]{7,15}$/.test(form.mobile)) errs.mobile = "Enter a valid phone number";
    return errs;
  };

  const handleSubmit = async () => {
    setFirebaseError(null);
    const errs = validate();

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      document.getElementById(firstKey)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const patientId = generatePatientId();
      const patientRef = ref(db, "patients/" + patientId);

      // ✅ Using aliased "firebaseSet" — no naming conflict
      await firebaseSet(patientRef, {
        patientId,
        personal: {
          fullName:  form.fullName,
          dob:       form.dob,
          gender:    form.gender,
          mobile:    form.mobile,
          email:     form.email,
          address:   form.address,
        },
        emergency: {
          name:         form.emergencyName,
          phone:        form.emergencyPhone,
          relationship: form.emergencyRelationship,
        },
        medical: {
          medication:        form.medication,
          allergies:         form.allergies,
          chronicIllness:    form.chronicIllness,
          previousSurgeries: form.previousSurgeries,
        },
        visit: {
          reasonForVisit: form.reasonForVisit,
          symptoms:       form.symptoms,
          preferredDate:  form.preferredDate,
          preferredTime:  form.preferredTime,
          urgency:        form.urgency,
        },
        createdAt: new Date().toISOString(),
        status: "pending",
      });

      setSavedPatient({ patientId, name: form.fullName, date: form.preferredDate });

    } catch (err: unknown) {
      console.error("Realtime DB error:", err);
      setFirebaseError(
        err instanceof Error ? err.message : "Failed to save. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setSavedPatient(null);
    setFirebaseError(null);
  };

  if (savedPatient) {
    return (
      <SuccessScreen
        patientId={savedPatient.patientId}
        name={savedPatient.name}
        date={savedPatient.date}
        onReset={handleReset}
      />
    );
  }

  const steps = ["Personal", "Emergency", "Medical", "Visit"];

  return (
    <div className="min-h-screen bg-[#040d1a] text-white">

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-700/15 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-600/8 rounded-full blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(#ffffff 1px,transparent 1px),linear-gradient(90deg,#ffffff 1px,transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Sticky Navbar */}
      <header className="sticky top-0 z-50 bg-[#040d1a]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-black text-sm">✚</span>
            </div>
            <div>
              <p className="text-[10px] text-blue-400 font-bold tracking-widest uppercase leading-none">MedAI Portal</p>
              <p className="text-sm font-bold text-white leading-tight">Patient Registration</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[11px] text-emerald-400 font-semibold">Secure · POPIA Compliant</span>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10 space-y-5">

        {/* Hero */}
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-5">
            <span className="text-xs text-blue-300 font-semibold tracking-widest uppercase">New Patient Intake Form</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">
            <span className="text-white">Register as a </span>
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">Patient</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Complete all four sections below. Fields marked <span className="text-blue-400 font-bold">*</span> are required.
          </p>
        </div>

        {/* Progress bar */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-col items-center gap-1.5">
              <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 w-full" />
              </div>
              <span className="text-[10px] text-slate-600 font-semibold hidden sm:block">{i + 1}. {s}</span>
            </div>
          ))}
        </div>

        {/* Firebase Error Banner */}
        {firebaseError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 flex items-start gap-3">
            <span className="text-red-400 text-lg mt-0.5">⚠</span>
            <div>
              <p className="text-red-400 text-sm font-bold">Submission Failed</p>
              <p className="text-red-400/70 text-xs mt-0.5">{firebaseError}</p>
            </div>
          </div>
        )}

        {/* SECTION 1 — Personal Details */}
        <SectionCard>
          <SectionHeader icon="👤" title="Personal Details" subtitle="Basic identification and contact information" step="1" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <Label text="Full Name" required />
              <Input id="fullName" placeholder="e.g. John Doe" value={form.fullName} onChange={setField("fullName")} error={errors.fullName} />
            </div>
            <div>
              <Label text="Date of Birth" required />
              <Input id="dob" type="date" value={form.dob} onChange={setField("dob")} error={errors.dob} />
            </div>
            <div>
              <Label text="Gender" required />
              <Select id="gender" value={form.gender} onChange={setField("gender")} placeholder="Select gender" error={errors.gender}
                options={[
                  { value: "male",       label: "Male" },
                  { value: "female",     label: "Female" },
                  { value: "non-binary", label: "Non-Binary" },
                  { value: "prefer-not", label: "Prefer not to say" },
                ]}
              />
            </div>
            <div>
              <Label text="Mobile Number" required />
              <Input id="mobile" type="tel" placeholder="+27 82 000 0000" value={form.mobile} onChange={setField("mobile")} error={errors.mobile} />
            </div>
            <div>
              <Label text="Email Address" required />
              <Input id="email" type="email" placeholder="john@example.com" value={form.email} onChange={setField("email")} error={errors.email} />
            </div>
            <div className="sm:col-span-2">
              <Label text="Residential Address" />
              <Input id="address" placeholder="Street, City, Province" value={form.address} onChange={setField("address")} error={errors.address} />
            </div>
          </div>
        </SectionCard>

        {/* SECTION 2 — Emergency Contact */}
        <SectionCard>
          <SectionHeader icon="🚨" title="Emergency Contact" subtitle="Someone we can reach in case of an emergency" step="2" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <Label text="Contact Full Name" required />
              <Input id="emergencyName" placeholder="e.g. Jane Doe" value={form.emergencyName} onChange={setField("emergencyName")} error={errors.emergencyName} />
            </div>
            <div>
              <Label text="Phone Number" required />
              <Input id="emergencyPhone" type="tel" placeholder="+27 83 000 0000" value={form.emergencyPhone} onChange={setField("emergencyPhone")} error={errors.emergencyPhone} />
            </div>
            <div>
              <Label text="Relationship" required />
              <Select id="emergencyRelationship" value={form.emergencyRelationship} onChange={setField("emergencyRelationship")} placeholder="Select relationship" error={errors.emergencyRelationship}
                options={[
                  { value: "spouse",  label: "Spouse / Partner" },
                  { value: "parent",  label: "Parent" },
                  { value: "sibling", label: "Sibling" },
                  { value: "child",   label: "Child" },
                  { value: "friend",  label: "Friend" },
                  { value: "other",   label: "Other" },
                ]}
              />
            </div>
          </div>
        </SectionCard>

        {/* SECTION 3 — Medical Information */}
        <SectionCard>
          <SectionHeader icon="🩺" title="Medical Information" subtitle="Help our doctors understand your health background" step="3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <Label text="Current Medication" />
              <Textarea id="medication" placeholder="List all medications you currently take..." value={form.medication} onChange={setField("medication")} />
            </div>
            <div>
              <Label text="Known Allergies" />
              <Input id="allergies" placeholder="e.g. Penicillin, Peanuts" value={form.allergies} onChange={setField("allergies")} />
            </div>
            <div>
              <Label text="Chronic Illness" />
              <Input id="chronicIllness" placeholder="e.g. Diabetes, Hypertension" value={form.chronicIllness} onChange={setField("chronicIllness")} />
            </div>
            <div className="sm:col-span-2">
              <Label text="Previous Surgeries" />
              <Textarea id="previousSurgeries" placeholder="Describe any past operations or procedures..." value={form.previousSurgeries} onChange={setField("previousSurgeries")} rows={2} />
            </div>
          </div>
        </SectionCard>

        {/* SECTION 4 — Visit Details */}
        <SectionCard>
          <SectionHeader icon="📋" title="Visit Details" subtitle="Tell us about this appointment" step="4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <Label text="Reason for Visit" required />
              <Textarea id="reasonForVisit" placeholder="Brief description of your reason for visiting..." value={form.reasonForVisit} onChange={setField("reasonForVisit")} error={errors.reasonForVisit} />
            </div>
            <div className="sm:col-span-2">
              <Label text="Current Symptoms" />
              <Textarea id="symptoms" placeholder="Describe any symptoms you are currently experiencing..." value={form.symptoms} onChange={setField("symptoms")} />
            </div>
            <div>
              <Label text="Preferred Date" required />
              <Input id="preferredDate" type="date" value={form.preferredDate} onChange={setField("preferredDate")} error={errors.preferredDate} />
            </div>
            <div>
              <Label text="Preferred Time" />
              <Input id="preferredTime" type="time" value={form.preferredTime} onChange={setField("preferredTime")} />
            </div>
            <div className="sm:col-span-2">
              <Label text="Urgency Level" required />
              {errors.urgency && (
                <p className="mb-2 text-[11px] text-red-400 flex items-center gap-1"><span>⚠</span> {errors.urgency}</p>
              )}
              <div className="flex gap-3 flex-wrap">
                {URGENCY_OPTIONS.map(({ value, label, icon, ring, bg, text, border }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setField("urgency")(value)}
                    className={`flex-1 min-w-[110px] py-3.5 px-4 rounded-xl border-2 text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2
                      ${form.urgency === value
                        ? `${bg} ${border} ${text} ring-2 ${ring}/30 scale-[1.03] shadow-lg`
                        : "bg-white/[0.03] border-white/[0.08] text-slate-500 hover:border-white/20 hover:text-slate-300"
                      }`}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Disclaimer */}
        <div className="flex gap-4 items-start bg-blue-500/[0.06] border border-blue-500/[0.15] rounded-2xl px-5 py-4">
          <span className="text-blue-400 text-lg mt-0.5 flex-shrink-0">ℹ</span>
          <p className="text-xs text-blue-400/70 leading-relaxed">
            By submitting this form you confirm the information is accurate and consent to its use for medical and administrative purposes.
            Your data is encrypted, POPIA-compliant, and only accessible to your care team.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="relative w-full py-5 rounded-2xl font-black text-base overflow-hidden group
            bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400
            disabled:opacity-70 disabled:cursor-not-allowed
            shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50
            transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="relative flex items-center justify-center gap-3">
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <span>Submit Registration</span>
                <span className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-sm group-hover:translate-x-0.5 transition-transform">→</span>
              </>
            )}
          </span>
        </button>

        <p className="text-center text-xs text-slate-600 pb-8">
          Already registered?{" "}
          <span className="text-blue-500 hover:text-blue-400 font-semibold cursor-pointer transition-colors">
            Sign in to your patient portal
          </span>
        </p>

      </div>
    </div>
  );
}
