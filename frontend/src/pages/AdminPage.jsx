import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import {
  Shield, UserX, UserCheck, MailPlus, Copy, RefreshCw,
  KeyRound, CheckCircle2, X, Network, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = {
  email: "", name: "", title: "", access_role_id: "role_viewer",
  scope_type: "global", scope_id: "",
};

function statusFor(user) {
  if (user.invitation_status === "pending") return { label: "Invitation pending", cls: "bg-amber-500/15 text-amber-300" };
  if (user.invitation_status === "expired") return { label: "Invitation expired", cls: "bg-orange-500/15 text-orange-300" };
  if (user.active) return { label: "Active", cls: "bg-emerald-500/15 text-emerald-300" };
  return { label: "Disabled", cls: "bg-rose-500/15 text-rose-300" };
}

const inputClass = "w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm focus:outline-none focus:border-yellow-500/40";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [access, setAccess] = useState({ roles: [], units: [], assignments: [] });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  const load = async () => {
    const [usersResponse, accessResponse] = await Promise.all([api.get("/users"), api.get("/access/bootstrap")]);
    setUsers(usersResponse.data);
    setAccess(accessResponse.data);
    if (!form.access_role_id && accessResponse.data.roles?.[0]) {
      setForm((current) => ({ ...current, access_role_id: accessResponse.data.roles[0].id }));
    }
  };
  useEffect(() => { load().catch(() => toast.error("Unable to load identity administration")); }, []);

  const roleMap = useMemo(() => Object.fromEntries((access.roles || []).map((role) => [role.id, role])), [access.roles]);
  const unitMap = useMemo(() => Object.fromEntries((access.units || []).map((unit) => [unit.id, unit])), [access.units]);
  const primaryByUser = useMemo(() => {
    const result = {};
    for (const assignment of access.assignments || []) {
      if (assignment.subject_type === "user" && assignment.is_primary && assignment.active !== false) result[assignment.subject_id] = assignment;
    }
    return result;
  }, [access.assignments]);

  const copyInvite = async (url) => {
    try { await navigator.clipboard.writeText(url); toast.success("Secure invitation link copied"); }
    catch { toast.error("Unable to copy the invitation link"); }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const role = roleMap[form.access_role_id];
      const payload = {
        ...form,
        role: role?.compatibility_role || "tracker",
        scope_id: form.scope_type === "global" ? null : form.scope_id || null,
      };
      const response = await api.post("/users/invite", payload);
      setInviteResult(response.data);
      setShowForm(false);
      setForm({ ...EMPTY_FORM, access_role_id: access.roles?.[0]?.id || "role_viewer" });
      toast.success("Invitation created with a scoped access role");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Unable to create invitation");
    } finally { setSubmitting(false); }
  };

  const toggleActive = async (user) => {
    try {
      await api.patch(`/users/${user.id}`, { active: !user.active });
      toast.success(user.active ? "Account disabled" : "Account activated");
      await load();
    } catch (error) { toast.error(error?.response?.data?.detail || "Unable to update account"); }
  };

  const resetAccess = async (user) => {
    try {
      const response = await api.post(`/users/${user.id}/reset-invite`);
      setInviteResult(response.data);
      toast.success("Previous access revoked and a new invitation created");
      await load();
    } catch (error) { toast.error(error?.response?.data?.detail || "Unable to reset access"); }
  };

  const scopeOptions = form.scope_type === "unit" ? access.units : form.scope_type === "organization" ? access.organizations : form.scope_type === "project" ? access.projects : [];

  return (
    <div data-testid="admin-page">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">Identity Administration</div>
          <h1 className="font-heading text-4xl font-black mt-2 flex items-center gap-3"><Shield className="text-yellow-500" /> Users & Invitations</h1>
          <p className="text-slate-500 text-sm mt-1">Create identities here; design roles, scopes, groups and policies in Access Fabric.</p>
        </div>
        <div className="flex gap-2">
          <a href="/access-control" className="px-5 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 font-semibold flex items-center gap-2"><Network size={18} /> Access Fabric <ArrowRight size={15} /></a>
          <button data-testid="new-user-btn" onClick={() => setShowForm(true)} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold flex items-center gap-2"><MailPlus size={18} /> Invite User</button>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3">
        <KeyRound className="text-emerald-300 mt-0.5" size={18} />
        <div><div className="font-semibold text-emerald-200">Closed institutional registration</div><p className="text-xs text-slate-400 mt-1">The administrator assigns a role template and scope, then the user privately chooses their password from a single-use invitation.</p></div>
      </div>

      <div className="glass-card p-2 overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[980px]">
          <thead><tr className="text-[11px] uppercase tracking-widest text-slate-500 border-b border-white/5"><th className="py-3 px-4">Name</th><th className="py-3 px-4">Email</th><th className="py-3 px-4">Primary role</th><th className="py-3 px-4">Scope</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">Actions</th></tr></thead>
          <tbody>{users.map((user) => {
            const status = statusFor(user);
            const assignment = primaryByUser[user.id];
            const role = roleMap[assignment?.role_id || user.primary_access_role_id];
            const scope = assignment?.scope_type === "unit" ? unitMap[assignment.scope_id]?.name_ar : assignment?.scope_type;
            return <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02]"><td className="py-3 px-4"><div className="font-medium text-slate-100">{user.name}</div><div className="text-xs text-slate-500">{user.title}</div></td><td className="py-3 px-4 text-slate-400 text-xs" dir="ltr">{user.email}</td><td className="py-3 px-4"><div className="text-xs text-slate-200">{role?.name_ar || user.role}</div><div className="text-[10px] text-slate-600">{role?.name_en}</div></td><td className="py-3 px-4 text-xs text-slate-400">{scope || "—"}</td><td className="py-3 px-4"><span className={`text-[10px] px-2 py-1 rounded ${status.cls}`}>{status.label}</span></td><td className="py-3 px-4"><div className="flex items-center gap-1"><button onClick={() => resetAccess(user)} className="p-2 rounded hover:bg-yellow-500/10 text-yellow-300" title="Reset access and issue invitation"><RefreshCw size={14} /></button><button onClick={() => toggleActive(user)} className={`p-2 rounded ${user.active ? "hover:bg-rose-500/10 text-rose-300" : "hover:bg-emerald-500/10 text-emerald-300"}`} title={user.active ? "Disable" : "Activate"}>{user.active ? <UserX size={14} /> : <UserCheck size={14} />}</button></div></td></tr>;
          })}</tbody>
        </table>
      </div>

      {showForm && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}><div className="glass-card p-6 max-w-xl w-full" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between mb-5"><div><h2 className="font-heading text-xl font-bold">Invite institutional user</h2><p className="text-xs text-slate-500 mt-1">Role and scope become effective after account activation.</p></div><button onClick={() => setShowForm(false)} className="p-1 hover:bg-white/10 rounded"><X size={18} /></button></div><form onSubmit={submit} className="space-y-3"><div className="grid md:grid-cols-2 gap-3"><input required placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass}/><input required type="email" placeholder="Institutional email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={inputClass} dir="ltr"/></div><input placeholder="Job title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass}/><select value={form.access_role_id} onChange={(event) => setForm({ ...form, access_role_id: event.target.value })} className={inputClass}>{(access.roles || []).map((role) => <option key={role.id} value={role.id}>{role.name_ar} — {role.name_en}</option>)}</select><div className="grid md:grid-cols-2 gap-3"><select value={form.scope_type} onChange={(event) => setForm({ ...form, scope_type: event.target.value, scope_id: "" })} className={inputClass}><option value="global">Global</option><option value="organization">Organization</option><option value="unit">Organizational unit</option><option value="project">Project</option></select>{form.scope_type !== "global" ? <select required value={form.scope_id} onChange={(event) => setForm({ ...form, scope_id: event.target.value })} className={inputClass}><option value="">Select scope</option>{(scopeOptions || []).map((item) => <option key={item.id} value={item.id}>{item.name_ar || item.name}</option>)}</select> : <div className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5 text-xs text-slate-500">Applies across the platform</div>}</div><button disabled={submitting} type="submit" className="w-full py-3 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400 disabled:opacity-50">{submitting ? "Creating invitation..." : "Create Scoped Invitation"}</button></form></div></div>}

      {inviteResult?.activation_url && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setInviteResult(null)}><div className="glass-card p-6 max-w-xl w-full" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><CheckCircle2 className="text-emerald-300 mt-0.5" size={22} /><div><h2 className="font-heading text-xl font-bold">Secure invitation ready</h2><p className="text-xs text-slate-500 mt-1">Send this single-use link privately. It expires automatically.</p></div></div><button onClick={() => setInviteResult(null)} className="p-1 hover:bg-white/10 rounded"><X size={18} /></button></div><div className="mt-5 p-3 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-xs text-slate-300 break-all" dir="ltr">{inviteResult.activation_url}</div><div className="mt-4 flex gap-2"><button onClick={() => copyInvite(inviteResult.activation_url)} className="flex-1 py-3 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400 flex items-center justify-center gap-2"><Copy size={16} /> Copy Invitation Link</button><button onClick={() => setInviteResult(null)} className="px-5 py-3 rounded-lg border border-white/10 hover:bg-white/5">Done</button></div></div></div>}
    </div>
  );
}
