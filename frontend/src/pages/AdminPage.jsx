import React, { useEffect, useState } from "react";
import api, { ROLE_LABELS } from "../lib/api";
import { Plus, X, Shield, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "tracker", title: "" });

  const load = () => api.get("/users").then(r => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users", form);
      toast.success("User created successfully");
      setShowForm(false);
      setForm({ email: "", password: "", name: "", role: "tracker", title: "" });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Unable to create user");
    }
  };

  const toggleActive = async (u) => {
    try {
      await api.patch(`/users/${u.id}`, { active: !u.active });
      toast.success(u.active ? "Account disabled" : "Account activated");
      load();
    } catch { toast.error("Unable to update"); }
  };

  const changeRole = async (u, role) => {
    try {
      await api.patch(`/users/${u.id}`, { role });
      toast.success("Role updated");
      load();
    } catch { toast.error("Unable to update"); }
  };

  return (
    <div data-testid="admin-page">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">System Administration</div>
          <h1 className="font-heading text-4xl font-black mt-2 flex items-center gap-3"><Shield className="text-yellow-500"/> Admin Console</h1>
          <p className="text-slate-500 text-sm mt-1">Manage users and access roles</p>
        </div>
        <button data-testid="new-user-btn" onClick={() => setShowForm(true)}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold flex items-center gap-2">
          <Plus size={18}/> New User
        </button>
      </div>

      <div className="glass-card p-2">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-widest text-slate-500 border-b border-white/5">
              <th className="py-3 px-4 font-semibold">Name</th>
              <th className="py-3 px-4 font-semibold">Email</th>
              <th className="py-3 px-4 font-semibold">Role</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-100">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.title}</div>
                </td>
                <td className="py-3 px-4 text-slate-400 text-xs" dir="ltr">{u.email}</td>
                <td className="py-3 px-4">
                  <select value={u.role} onChange={e => changeRole(u, e.target.value)}
                    className="px-3 py-1.5 rounded bg-[#0a0d14] border border-white/10 text-xs">
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td className="py-3 px-4">
                  {u.active ? (
                    <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-300">Active</span>
                  ) : (
                    <span className="text-[10px] px-2 py-1 rounded bg-rose-500/15 text-rose-300">Disabled</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <button onClick={() => toggleActive(u)} title={u.active ? "Disable" : "Activate"}
                    className={`p-2 rounded transition-colors ${u.active ? "hover:bg-rose-500/10 text-rose-300" : "hover:bg-emerald-500/10 text-emerald-300"}`}>
                    {u.active ? <UserX size={14}/> : <UserCheck size={14}/>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-card p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-xl font-bold">New User</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-white/10 rounded"><X size={18}/></button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <input required placeholder="Full name" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"/>
              <input required type="email" placeholder="Email address" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm" dir="ltr"/>
              <input required type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"/>
              <input placeholder="Job title" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"/>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm">
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button type="submit" className="w-full py-3 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400">Create Account</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
