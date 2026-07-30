import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import NEXGEN_EXECUTIVES from "../assets/NEXGEN_EXECUTIVES.png";

export default function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [account, setAccount] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invitation token is missing.");
      setLoading(false);
      return;
    }
    api.get("/auth/invitation", { params: { token } })
      .then((response) => setAccount(response.data))
      .catch((requestError) => setError(formatApiError(requestError?.response?.data?.detail)))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/activate", { token, password });
      setComplete(true);
    } catch (requestError) {
      setError(formatApiError(requestError?.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a10] text-slate-100 flex items-center justify-center p-6" dir="ltr">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-emerald-500/5" />
      <div className="relative w-full max-w-md glass-card p-8 md:p-10">
        <img src={NEXGEN_EXECUTIVES} alt="NEXGEN EXECUTIVES" className="h-20 w-auto object-contain mx-auto mb-6" />

        {loading ? (
          <div className="text-center text-slate-400">Validating secure invitation...</div>
        ) : complete ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto text-emerald-300" size={48} />
            <h1 className="font-heading text-2xl font-bold mt-4">Account activated</h1>
            <p className="text-sm text-slate-400 mt-2">Your password is private and was never visible to the administrator.</p>
            <button onClick={() => navigate("/login")} className="mt-6 w-full py-3 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400">
              Continue to Sign In
            </button>
          </div>
        ) : error && !account ? (
          <div className="text-center">
            <ShieldCheck className="mx-auto text-rose-300" size={44} />
            <h1 className="font-heading text-xl font-bold mt-4">Invitation unavailable</h1>
            <p className="text-sm text-rose-300 mt-3">{error}</p>
            <button onClick={() => navigate("/login")} className="mt-6 w-full py-3 rounded-lg border border-white/10 hover:bg-white/5">
              Return to Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <KeyRound className="mx-auto text-yellow-400" size={34} />
              <h1 className="font-heading text-2xl font-bold mt-3">Activate your account</h1>
              <p className="text-sm text-slate-400 mt-2">
                Welcome {account?.name}. Create your private password for {account?.email}.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Password</label>
                <div className="relative">
                  <input
                    required
                    minLength={12}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full px-4 py-3 pr-11 rounded-lg bg-[#0a0d14]/80 border border-white/10 focus:border-yellow-500/50 focus:outline-none text-slate-100"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Confirm password</label>
                <input
                  required
                  minLength={12}
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#0a0d14]/80 border border-white/10 focus:border-yellow-500/50 focus:outline-none text-slate-100"
                  autoComplete="new-password"
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Use at least 12 characters with uppercase, lowercase, number, and special character. The invitation can be used once only.
              </p>
              {error && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3">{error}</div>}
              <button disabled={submitting} type="submit" className="w-full py-3 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400 disabled:opacity-50">
                {submitting ? "Activating..." : "Set Password and Activate"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
