import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Shield, ChevronRight, Building2, Sparkles, LockKeyhole } from "lucide-react";
import NEXGEN_EXECUTIVES from "../assets/NEXGEN_EXECUTIVES.png";

const DEMO_MODE = import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true";
const DEMO_PASSWORD = "ExecAgent2026!";
const ROLE_QUICK = [
  { email: "ceo@company.demo", label: "Chief Executive Officer", role: "ceo" },
  { email: "development@company.demo", label: "Executive VP – Development", role: "vp_development" },
  { email: "investment@company.demo", label: "Executive VP – Investment", role: "vp_investment" },
  { email: "manager@company.demo", label: "Business Unit Manager", role: "dev_manager" },
  { email: "followup@company.demo", label: "Executive Follow-up", role: "tracker" },
  { email: "admin@company.demo", label: "Administrator", role: "admin" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome to NEXGEN EXECUTIVES");
      navigate("/dashboard");
    } catch (error) {
      const message = formatApiError(error?.response?.data?.detail) || "Unable to sign in";
      setErr(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden" dir="ltr">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1710438399422-2fca27686bcd?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGVsZWdhbnQlMjBkYXJrJTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3ODEwMDA2NDh8MA&ixlib=rb-4.1.0&q=85')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-[#0a0d14]/85 to-black/70" />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div className="text-left hidden lg:block space-y-7">
          <img src={NEXGEN_EXECUTIVES} alt="NEXGEN EXECUTIVES OS" className="h-44 w-auto object-contain mb-2" />
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-yellow-500/20 bg-yellow-500/5 text-yellow-400 text-xs uppercase tracking-[0.25em]">
            <Building2 size={14} /> Executive Intelligence Platform
          </div>
          <div>
            <h1 className="font-heading font-black text-5xl text-slate-50 leading-tight">AI Chief of Staff</h1>
            <p className="mt-4 text-lg text-slate-400 leading-relaxed max-w-md">
              A secure enterprise operating system for executive coordination, operational intelligence, strategic follow-up, and leadership decision-making.
            </p>
          </div>
          <div className="gold-divider" />
          <div className="grid grid-cols-3 gap-4">
            {[
              { v: "Gemini", l: "Executive AI" },
              { v: "MongoDB", l: "Organizational Memory" },
              { v: "MCP", l: "Agent Integration" },
            ].map((item) => (
              <div key={item.v} className="glass-card p-4 text-center">
                <div className="font-heading text-yellow-400 font-bold text-xl">{item.v}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{item.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-8 md:p-10 max-w-md w-full mx-auto" data-testid="login-card">
          <div className="text-center mb-8">
            <img src={NEXGEN_EXECUTIVES} alt="NEXGEN EXECUTIVES OS" className="h-20 w-auto object-contain mx-auto mb-4 lg:hidden" />
            <div className="inline-flex items-center gap-2 text-yellow-400 text-xs uppercase tracking-[0.25em] mb-3">
              <Sparkles size={13} /> {DEMO_MODE ? "Demo Environment" : "Institutional Access"}
            </div>
            <h2 className="font-heading text-2xl font-bold text-slate-50">Sign in</h2>
            <p className="text-sm text-slate-500 mt-2">Use the account issued by the platform administrator</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Institutional email</label>
              <input
                data-testid="login-email-input"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={DEMO_MODE ? "name@company.demo" : "name@araak.org"}
                className="w-full px-4 py-3 rounded-lg bg-[#0a0d14]/80 border border-white/10 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/30 text-slate-100 placeholder-slate-600 transition-colors"
                dir="ltr"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Password</label>
              <input
                data-testid="login-password-input"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#0a0d14]/80 border border-white/10 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/30 text-slate-100 placeholder-slate-600 transition-colors"
                autoComplete="current-password"
              />
            </div>
            {err && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3">{err}</div>}
            <button
              data-testid="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:from-yellow-400 hover:to-yellow-500 transition-all shadow-lg shadow-yellow-900/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Verifying..." : <>Enter Platform <ChevronRight size={18} /></>}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5 flex items-start gap-3 text-xs text-slate-500">
            <LockKeyhole size={16} className="text-emerald-300 mt-0.5 shrink-0" />
            <span>Registration is closed. Accounts are created by the administrator through a single-use invitation, and passwords are never visible to administrators.</span>
          </div>

          {DEMO_MODE && (
            <div className="mt-7 pt-6 border-t border-white/5">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><Shield size={12} /> Demo quick access</div>
              <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {ROLE_QUICK.map((role) => (
                  <button
                    key={role.email}
                    type="button"
                    data-testid={`quick-login-${role.role}`}
                    onClick={() => { setEmail(role.email); setPassword(DEMO_PASSWORD); }}
                    className="px-3 py-2 rounded-md text-xs bg-white/[0.02] hover:bg-yellow-500/5 hover:border-yellow-500/20 border border-white/5 text-slate-300 transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="font-medium">{role.label}</span>
                    <span className="text-slate-500 text-[10px] tabular-nums" dir="ltr">{role.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
