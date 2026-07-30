import React, { useEffect, useState } from "react";
import api, { ROLE_LABELS } from "../lib/api";
import {
  Plus,
  X,
  Shield,
  UserX,
  UserCheck,
  MailPlus,
  Copy,
  RefreshCw,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = { email: "", name: "", role: "tracker", title: "" };

function statusFor(user) {
  if (user.invitation_status === "pending") return { label: "Invitation pending", cls: "bg-amber-500/15 text-amber-300" };
  if (user.invitation_status === "expired") return { label: "Invitation expired", cls: "bg-orange-500/15 text-orange-300" };
  if (user.active) return { label: "Active", cls: "bg-emerald-500/15 text-emerald-300" };
  return { label: "Disabled", cls: "bg-rose-500/15 text-rose-300" };
}

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  const load = () => api.get("/users").then((response) => setUsers(response.data));
  useEffect(() => { load(); }, []);

  const copyInvite = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Secure invitation link copied");
    } catch {
      toast.error("Unable to copy the invitation link");
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post("/users/invite", form);
      setInviteResult(response.data);
      setShowForm(false);
      setForm(EMPTY_FORM);
      toast.success("Invitation created. The user will choose their own password.");
      load();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Unable to create invitation");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.patch(`/users/${user.id}`, { active: !user.active });
      toast.success(user.active ? "Account disabled" : "Account activated");
      load();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Unable to update account");
    }
  };

  const changeRole = async (user, role) => {
    try {
      await api.patch(`/users/${user.id}`, { role });
      toast.success("Role updated");
      load();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Unable to update role");
    }
  };

  const resetAccess = async (user) => {
    try {
      const response = await api.post(`/users/${user.id}/reset-invite`);
      setInviteResult(response.data);
      toast.success("Previous access was revoked and a new invitation was created");
      load();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Unable to reset access");
    }
  };

  return (
    <div data-testid="admin-page">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">System Administration</div>
          <h1 className="font-heading text-4xl font-black mt-2 flex items-center gap-3">
            <Shield className="text-yellow-500" /> Access Control
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Invitation-only accounts. Administrators never create, view, or distribute permanent passwords.
          </p>
        </div>
        <button
          data-testid="new-user-btn"
          onClick={() => setShowForm(true)}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold flex items-center gap-2"
        >
          <MailPlus size={18} /> Invite User
        </button>
      </div>

      <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3">
        <KeyRound className="text-emerald-300 mt-0.5" size={18} />
        <div>
          <div className="font-semibold text-emerald-200">Closed institutional registration</div>
          <p className="text-xs text-slate-400 mt-1">
            Only the platform administrator can invite accounts. Each invitation is single-use, expires automatically, and lets the user set a private password.
          </p>
        </div>
      </div>

      <div className="glass-card p-2 overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[850px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-widest text-slate-500 border-b border-white/5">
              <th className="py-3 px-4 font-semibold">Name</th>
              <th className="py-3 px-4 font-semibold">Email</th>
              <th className="py-3 px-4 font-semibold">Role</th>
              <th className="py-3 px-4 font-semibold">Access status</th>
              <th className="py-3 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const status = statusFor(user);
              return (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-100">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.title}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs" dir="ltr">{user.email}</td>
                  <td className="py-3 px-4">
                    <select
                      value={user.role}
                      onChange={(event) => changeRole(user, event.target.value)}
                      className="px-3 py-1.5 rounded bg-[#0a0d14] border border-white/10 text-xs"
                    >
                      {Object.entries(ROLE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] px-2 py-1 rounded ${status.cls}`}>{status.label}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => resetAccess(user)}
                        title={user.invitation_status === "pending" ? "Reissue invitation" : "Reset access and issue invitation"}
                        className="p-2 rounded hover:bg-yellow-500/10 text-yellow-300 transition-colors"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        onClick={() => toggleActive(user)}
                        title={user.active ? "Disable" : "Activate"}
                        className={`p-2 rounded transition-colors ${user.active ? "hover:bg-rose-500/10 text-rose-300" : "hover:bg-emerald-500/10 text-emerald-300"}`}
                      >
                        {user.active ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-card p-6 max-w-md w-full" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-heading text-xl font-bold">Invite User</h2>
                <p className="text-xs text-slate-500 mt-1">No password is created or shown to the administrator.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-white/10 rounded"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <input
                required
                placeholder="Full name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"
              />
              <input
                required
                type="email"
                placeholder="Institutional email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"
                dir="ltr"
              />
              <input
                placeholder="Job title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"
              />
              <select
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"
              >
                {Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <button
                disabled={submitting}
                type="submit"
                className="w-full py-3 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400 disabled:opacity-50"
              >
                {submitting ? "Creating invitation..." : "Create Secure Invitation"}
              </button>
            </form>
          </div>
        </div>
      )}

      {inviteResult?.activation_url && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setInviteResult(null)}>
          <div className="glass-card p-6 max-w-xl w-full" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-emerald-300 mt-0.5" size={22} />
                <div>
                  <h2 className="font-heading text-xl font-bold">Secure invitation ready</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Send this single-use link privately to {inviteResult.user?.name || "the user"}. It expires automatically.
                  </p>
                </div>
              </div>
              <button onClick={() => setInviteResult(null)} className="p-1 hover:bg-white/10 rounded"><X size={18} /></button>
            </div>
            <div className="mt-5 p-3 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-xs text-slate-300 break-all" dir="ltr">
              {inviteResult.activation_url}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => copyInvite(inviteResult.activation_url)}
                className="flex-1 py-3 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400 flex items-center justify-center gap-2"
              >
                <Copy size={16} /> Copy Invitation Link
              </button>
              <button onClick={() => setInviteResult(null)} className="px-5 py-3 rounded-lg border border-white/10 hover:bg-white/5">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
