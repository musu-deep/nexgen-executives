import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Shield, ChevronRight, Building2, Sparkles } from "lucide-react";
import NEXGEN_EXECUTIVES from "../assets/NEXGEN_EXECUTIVES.png";
import { LanguageToggle, useLanguage } from "../contexts/LanguageContext";

const DEMO_PASSWORD = "ExecAgent2026!";

const ROLE_QUICK = [
  { email: "ceo@company.demo", label: "Chief Executive Officer", ar: "Chief Executive Officer", role: "ceo" },
  { email: "development@company.demo", label: "Executive VP - Development", ar: "Executive VP - Development", role: "vp_development" },
  { email: "investment@company.demo", label: "Executive VP - Investment", ar: "Executive VP - Investment", role: "vp_investment" },
  { email: "manager@company.demo", label: "Sector Manager", ar: "Sector Manager", role: "dev_manager" },
  { email: "followup@company.demo", label: "Executive Follow-up", ar: "Executive Follow-up Officer", role: "tracker" },
  { email: "admin@company.demo", label: "Administrator", ar: "System Administrator", role: "admin" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const copy = isArabic ? {
    secure: "منصة الذكاء التنفيذي",
    title: "مكتب الرئيس التنفيذي",
    desc: "منصة AI Chief of Staff لإدارة المشاريع والاجتماعات والمهام والمخاطر والقرارات التنفيذية عبر المجموعة.",
    sign: "تسجيل الدخول",
    sub: "وصول آمن لمنصة الذكاء التنفيذي",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    enter: "دخول المنصة",
    checking: "جاري التحقق...",
    quick: "حسابات دخول سريعة",
    demo: "كلمة مرور التجربة:",
    toast: "مرحباً بك في منصة الذكاء التنفيذي",
    err: "تعذر تسجيل الدخول",
    features: [{v:"Gemini",l:"ذكاء تنفيذي"},{v:"MongoDB",l:"ذاكرة مؤسسية"},{v:"MCP",l:"تكامل الوكلاء"}],
  } : {
    secure: "Executive Intelligence Platform",
    title: "AI Chief of Staff",
    desc: "An enterprise AI operating system for projects, meetings, tasks, risks, and executive decisions across the group.",
    sign: "Sign in",
    sub: "Secure access to the executive intelligence platform",
    email: "Email address",
    password: "Password",
    enter: "Enter Platform",
    checking: "Verifying...",
    quick: "Quick Login Accounts",
    demo: "Demo password:",
    toast: "Welcome to the Executive Intelligence Platform",
    err: "Unable to sign in",
    features: [{v:"Gemini",l:"Executive AI"},{v:"MongoDB",l:"Organizational Memory"},{v:"MCP",l:"Agent Integration"}],
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      toast.success(copy.toast);
      navigate("/dashboard");
    } catch (e) {
      const msg = formatApiError(e?.response?.data?.detail) || copy.err;
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden" dir={isArabic ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1710438399422-2fca27686bcd?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGVsZWdhbnQlMjBkYXJrJTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3ODEwMDA2NDh8MA&ixlib=rb-4.1.0&q=85')" }} />
      <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-[#0a0d14]/85 to-black/70" />
      <div className="absolute top-5 right-5 z-20"><LanguageToggle /></div>
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div className={`${isArabic ? "text-right" : "text-left"} hidden lg:block space-y-7`}>
          <img src={NEXGEN_EXECUTIVES} alt="NEXGEN EXECUTIVES OS" className="h-44 w-auto object-contain mb-2" />
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-yellow-500/20 bg-yellow-500/5 text-yellow-400 text-xs uppercase tracking-[0.25em]">
            <Building2 size={14} /><span>{copy.secure}</span>
          </div>
          <div>
            <h1 className="font-heading font-black text-5xl text-slate-50 leading-tight">{copy.title}</h1>
            <p className="mt-4 text-lg text-slate-400 leading-relaxed max-w-md">{copy.desc}</p>
          </div>
          <div className="gold-divider"></div>
          <div className="grid grid-cols-3 gap-4">
            {copy.features.map((s) => (
              <div key={s.v} className="glass-card p-4 text-center">
                <div className="font-heading text-yellow-400 font-bold text-xl">{s.v}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-8 md:p-10 max-w-md w-full mx-auto" data-testid="login-card">
          <div className="text-center mb-8">
            <img src={NEXGEN_EXECUTIVES} alt="NEXGEN EXECUTIVES OS" className="h-20 w-auto object-contain mx-auto mb-4 lg:hidden" />
            <div className="inline-flex items-center gap-2 text-yellow-400 text-xs uppercase tracking-[0.25em] mb-3"><Sparkles size={13}/> Hackathon Edition</div>
            <h2 className="font-heading text-2xl font-bold text-slate-50">{copy.sign}</h2>
            <p className="text-sm text-slate-500 mt-2">{copy.sub}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">{copy.email}</label>
              <input data-testid="login-email-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.demo" className="w-full px-4 py-3 rounded-lg bg-[#0a0d14]/80 border border-white/10 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/30 text-slate-100 placeholder-slate-600 transition-colors" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">{copy.password}</label>
              <input data-testid="login-password-input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-[#0a0d14]/80 border border-white/10 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/30 text-slate-100 placeholder-slate-600 transition-colors" />
            </div>
            {err && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3">{err}</div>}
            <button data-testid="login-submit-btn" type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:from-yellow-400 hover:to-yellow-500 transition-all shadow-lg shadow-yellow-900/30 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? copy.checking : <>{copy.enter}<ChevronRight size={18} /></>}
            </button>
          </form>
          <div className="mt-7 pt-6 border-t border-white/5">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><Shield size={12} />{copy.quick}</div>
            <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
              {ROLE_QUICK.map((r) => (
                <button key={r.email} type="button" data-testid={`quick-login-${r.role}`} onClick={() => { setEmail(r.email); setPassword(DEMO_PASSWORD); }} className="px-3 py-2 rounded-md text-xs bg-white/[0.02] hover:bg-yellow-500/5 hover:border-yellow-500/20 border border-white/5 text-slate-300 transition-colors flex items-center justify-between gap-2">
                  <span className="font-medium">{isArabic ? r.ar : r.label}</span>
                  <span className="text-slate-500 text-[10px] tabular-nums" dir="ltr">{r.email}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 text-[10px] text-slate-600 text-center">{copy.demo} <span className="text-yellow-500 font-bold tabular-nums" dir="ltr">{DEMO_PASSWORD}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
