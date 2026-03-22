"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const STATS = [
  { value: "50K+", label: "Patients Served" },
  { value: "200+", label: "Specialists" },
  { value: "24/7", label: "AI Support" },
  { value: "98%", label: "Satisfaction" },
];

const FEATURES = [
  {
    icon: "🧠",
    title: "AI-Powered Diagnosis",
    desc: "Preliminary symptom analysis powered by advanced machine learning before your consultation.",
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: "📅",
    title: "Smart Scheduling",
    desc: "Instantly book appointments with the right specialist based on your symptoms and availability.",
    color: "from-violet-500 to-purple-400",
  },
  {
    icon: "🔒",
    title: "Secure Health Records",
    desc: "Your data is encrypted, POPIA-compliant, and accessible only to your care team.",
    color: "from-emerald-500 to-teal-400",
  },
  {
    icon: "💊",
    title: "Medication Tracking",
    desc: "Manage prescriptions, set reminders, and monitor your treatment progress in one place.",
    color: "from-orange-500 to-amber-400",
  },
];

const SPECIALTIES = [
  "General Practice", "Cardiology", "Neurology",
  "Pediatrics", "Dermatology", "Orthopedics",
];

function AnimatedCounter({ target }: { target: string }) {
  return <span>{target}</span>;
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSpecialty, setActiveSpecialty] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveSpecialty((p) => (p + 1) % SPECIALTIES.length), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#040d1a] text-white overflow-x-hidden">

      {/* ── Ambient background blobs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── NAV ── */}
      

      {/* ── HERO ── */}
      <section className="relative z-10 pt-16 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-blue-300 font-semibold tracking-widest uppercase">
              AI-Powered Healthcare Platform
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            <span className="text-white">Smart </span>
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
              Healthcare
            </span>
            <br />
            <span className="text-white">Starts Here</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Register once. Get matched with the right specialist instantly.
            AI-assisted diagnosis, seamless booking, and secure records — all in one portal.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/register">
              <button className="group w-full sm:w-auto flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold px-8 py-4 rounded-2xl shadow-2xl shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105 text-base">
                <span>Register as Patient</span>
                <span className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-hover:translate-x-0.5 transition-transform text-sm">→</span>
              </button>
            </Link>
           
          </div>

          {/* Rotating specialty pill */}
          <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
            <span>Now accepting:</span>
            <div className="relative h-7 overflow-hidden w-40">
              {SPECIALTIES.map((s, i) => (
                <span
                  key={s}
                  className={`absolute inset-0 flex items-center justify-center font-semibold text-blue-400 transition-all duration-500 ${
                    i === activeSpecialty ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="max-w-4xl mx-auto mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map(({ value, label }) => (
            <div key={label} className="relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 text-center hover:bg-white/[0.06] transition-colors group">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-3xl font-black bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-1">
                <AnimatedCounter target={value} />
              </p>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs text-blue-400 font-bold tracking-widest uppercase mb-3">Why Choose Us</p>
            <h2 className="text-4xl font-black text-white mb-4">Everything You Need,<br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">In One Platform</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon, title, desc, color }) => (
              <div key={title} className="group relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-1">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl mb-4 shadow-lg`}>
                  {icon}
                </div>
                <h3 className="font-bold text-white mb-2 text-base">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs text-blue-400 font-bold tracking-widest uppercase mb-3">Simple Process</p>
            <h2 className="text-4xl font-black text-white">
              From Registration to<br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Consultation in Minutes</span>
            </h2>
          </div>
          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { step: "01", icon: "📝", title: "Register", desc: "Fill in your patient profile with health information" },
                { step: "02", icon: "🧠", title: "AI Analysis", desc: "Our AI reviews your symptoms and history" },
                { step: "03", icon: "👨‍⚕️", title: "Get Matched", desc: "Instantly paired with the right specialist" },
                { step: "04", icon: "✅", title: "Consult", desc: "Book your slot and attend your appointment" },
              ].map(({ step, icon, title, desc }) => (
                <div key={step} className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center text-2xl shadow-xl shadow-blue-500/20">
                      {icon}
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#040d1a] border border-blue-500/40 rounded-full text-[10px] font-black text-blue-400 flex items-center justify-center">
                      {step}
                    </span>
                  </div>
                  <h3 className="font-bold text-white mb-1">{title}</h3>
                  <p className="text-slate-500 text-sm">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-cyan-500 rounded-3xl p-10 md:p-14 text-center shadow-2xl shadow-blue-500/30">
            {/* inner glow blobs */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
            <div className="relative">
              <p className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-3">Get Started Today</p>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
                Your Health Journey<br />Begins With One Step
              </h2>
              <p className="text-white/70 mb-8 max-w-md mx-auto text-sm">
                Join over 50,000 patients who trust MedAI Portal for their healthcare needs.
              </p>
              <Link href="/register">
                <button className="bg-white text-blue-600 font-black px-10 py-4 rounded-2xl hover:bg-blue-50 transition-all duration-200 hover:scale-105 shadow-xl text-base">
                  Register as Patient →
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">✚</span>
            </div>
            <span className="font-bold text-white">MedAI Portal</span>
          </div>
          <p className="text-slate-600 text-xs text-center">
            © 2026 MedAI Portal. All rights reserved. POPIA Compliant. Not a substitute for professional medical advice.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Contact</span>
          </div>
        </div>
      </footer>

    </div>
  );
}