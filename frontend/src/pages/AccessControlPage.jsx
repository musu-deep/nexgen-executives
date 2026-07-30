import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { toast } from "sonner";
import {
  ShieldCheck, Network, KeyRound, Users, UserCog, GitBranch,
  TimerReset, Scale, SearchCheck, History, Plus, Trash2, Save, X,
  RefreshCw, LockKeyhole, CheckCircle2, XCircle,
} from "lucide-react";

const TABS = [
  ["overview", "Overview", ShieldCheck],
  ["structure", "Structure", Network],
  ["roles", "Role Templates", KeyRound],
  ["assignments", "Assignments", UserCog],
  ["groups", "Groups", Users],
  ["delegations", "Delegations", TimerReset],
  ["policies", "Policies", Scale],
  ["simulator", "Simulator", SearchCheck],
  ["audit", "Audit", History],
];

const inputClass = "w-full px-3 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm focus:outline-none focus:border-yellow-500/40";
const buttonPrimary = "px-4 py-2.5 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400 disabled:opacity-50 flex items-center justify-center gap-2";
const buttonSecondary = "px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 flex items-center justify-center gap-2";

function Panel({ title, description, action, children }) {
  return (
    <section className="glass-card p-5">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="font-heading text-xl font-bold">{title}</h2>
          {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-white/5 text-slate-300 border-white/10",
    green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    red: "bg-rose-500/10 text-rose-300 border-rose-500/20",
    blue: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  };
  return <span className={`inline-flex px-2 py-1 rounded-md border text-[10px] ${tones[tone]}`}>{children}</span>;
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className={`glass-card p-6 w-full max-h-[90vh] overflow-y-auto ${wide ? "max-w-5xl" : "max-w-xl"}`} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 rounded hover:bg-white/10"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AccessControlPage() {
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [audit, setAudit] = useState(null);
  const [simulation, setSimulation] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get("/access/bootstrap");
      setData(response.data);
    } catch (error) {
      toast.error(error?.response?.data?.detail?.message || error?.response?.data?.detail || "Unable to load Access Fabric");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (tab === "audit" && !audit) api.get("/access/audit").then((response) => setAudit(response.data)).catch(() => toast.error("Unable to load audit"));
  }, [tab, audit]);

  const maps = useMemo(() => {
    const index = (items = []) => Object.fromEntries(items.map((item) => [item.id, item]));
    return {
      users: index(data?.users), roles: index(data?.roles), units: index(data?.units),
      groups: index(data?.groups), organizations: index(data?.organizations), projects: index(data?.projects),
    };
  }, [data]);

  const mutate = async (method, url, body, success) => {
    try {
      await api({ method, url, data: body });
      toast.success(success);
      setModal(null);
      await load();
      return true;
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : detail?.message || "Unable to save changes");
      return false;
    }
  };

  if (loading && !data) {
    return <div className="min-h-[50vh] flex items-center justify-center text-slate-400"><RefreshCw className="animate-spin mr-2" /> Loading ARAAK Access Fabric...</div>;
  }

  return (
    <div data-testid="access-control-page">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">ARAAK Access Fabric v{data?.version}</div>
          <h1 className="font-heading text-4xl font-black mt-2 flex items-center gap-3"><ShieldCheck className="text-yellow-500" /> Identity & Authorization</h1>
          <p className="text-sm text-slate-500 mt-1">RBAC + attributes + relationships + organizational scopes + governance policies.</p>
        </div>
        <button onClick={load} className={buttonSecondary}><RefreshCw size={16} /> Refresh</button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`shrink-0 px-4 py-2.5 rounded-lg border text-sm flex items-center gap-2 ${tab === id ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/25" : "border-white/5 text-slate-400 hover:bg-white/5"}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview data={data} maps={maps} />}
      {tab === "structure" && <Structure data={data} maps={maps} setModal={setModal} />}
      {tab === "roles" && <Roles data={data} setModal={setModal} />}
      {tab === "assignments" && <Assignments data={data} maps={maps} setModal={setModal} mutate={mutate} />}
      {tab === "groups" && <Groups data={data} maps={maps} setModal={setModal} mutate={mutate} />}
      {tab === "delegations" && <Delegations data={data} maps={maps} setModal={setModal} mutate={mutate} />}
      {tab === "policies" && <Policies data={data} setModal={setModal} />}
      {tab === "simulator" && <Simulator data={data} result={simulation} setResult={setSimulation} />}
      {tab === "audit" && <Audit audit={audit} />}

      {modal?.type === "unit" && <UnitModal data={data} onClose={() => setModal(null)} onSave={(body) => mutate("post", "/access/units", body, "Organizational unit created")} />}
      {modal?.type === "role" && <RoleModal data={data} onClose={() => setModal(null)} onSave={(body) => mutate("post", "/access/roles", body, "Role template created")} />}
      {modal?.type === "permissions" && <PermissionsModal role={modal.role} permissions={data?.permissions || []} onClose={() => setModal(null)} onSave={(permissions) => mutate("put", `/access/roles/${modal.role.id}/permissions`, { permissions }, "Role permissions updated")} />}
      {modal?.type === "assignment" && <AssignmentModal data={data} onClose={() => setModal(null)} onSave={(body) => mutate("post", "/access/assignments", body, "Scoped role assignment created")} />}
      {modal?.type === "group" && <GroupModal onClose={() => setModal(null)} onSave={(body) => mutate("post", "/access/groups", body, "Group created")} />}
      {modal?.type === "membership" && <MembershipModal data={data} group={modal.group} onClose={() => setModal(null)} onSave={(body) => mutate("post", `/access/groups/${modal.group.id}/members`, body, "Group member added")} />}
      {modal?.type === "delegation" && <DelegationModal data={data} onClose={() => setModal(null)} onSave={(body) => mutate("post", "/access/delegations", body, "Temporary delegation created")} />}
      {modal?.type === "policy" && <PolicyModal onClose={() => setModal(null)} onSave={(body) => mutate("post", "/access/policies", body, "Policy created")} />}
      {modal?.type === "limit" && <LimitModal data={data} onClose={() => setModal(null)} onSave={(body) => mutate("post", "/access/approval-limits", body, "Approval limit created")} />}
    </div>
  );
}

function Overview({ data }) {
  const stats = [
    ["Users", data?.users?.length || 0, Users], ["Role templates", data?.roles?.length || 0, KeyRound],
    ["Active assignments", (data?.assignments || []).filter((x) => x.active !== false).length, UserCog],
    ["Organizational units", data?.units?.length || 0, Network],
    ["Groups & committees", data?.groups?.length || 0, GitBranch],
    ["Temporary delegations", (data?.delegations || []).filter((x) => x.active !== false).length, TimerReset],
  ];
  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-3 gap-4">
        {stats.map(([label, value, Icon]) => <div key={label} className="glass-card p-5"><div className="flex items-center justify-between"><Icon className="text-yellow-400" size={20} /><span className="text-3xl font-black tabular-nums">{value}</span></div><div className="text-xs text-slate-500 mt-4 uppercase tracking-wider">{label}</div></div>)}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Decision model" description="Every request is evaluated against five layers.">
          <div className="space-y-2 text-sm">
            {["Identity and group membership", "Role permission grant", "Organization / unit / project scope", "Resource relationship and data classification", "Approval limits, delegation and separation of duties"].map((text, index) => <div key={text} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.025] border border-white/5"><span className="w-7 h-7 rounded-full bg-yellow-500/10 text-yellow-300 flex items-center justify-center text-xs font-bold">{index + 1}</span><span className="text-slate-300">{text}</span></div>)}
          </div>
        </Panel>
        <Panel title="Governance defaults" description="Secure behavior is enabled from the first deployment.">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Default decision" value="DENY" tone="red" />
            <Metric label="Account creation" value="INVITE ONLY" tone="green" />
            <Metric label="Admin content access" value="NOT AUTOMATIC" tone="amber" />
            <Metric label="Approval controls" value="SoD + LIMITS" tone="blue" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }) {
  return <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]"><div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div><div className="mt-2"><Badge tone={tone}>{value}</Badge></div></div>;
}

function Structure({ data, maps, setModal }) {
  return <Panel title="Organizational structure" description="Companies, portfolios, departments, offices, branches and project units." action={<button onClick={() => setModal({ type: "unit" })} className={buttonPrimary}><Plus size={16} /> Add unit</button>}>
    <div className="space-y-2">{(data?.units || []).map((unit) => <div key={unit.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between gap-4"><div><div className="font-semibold">{unit.name_ar} <span className="text-slate-500 text-xs ml-2">{unit.name_en}</span></div><div className="text-xs text-slate-500 mt-1">Parent: {maps.units[unit.parent_id]?.name_ar || maps.organizations[unit.organization_id]?.name_ar || "Root"}</div></div><div className="flex gap-2"><Badge tone="blue">{unit.type}</Badge>{(unit.sector_keys || []).map((sector) => <Badge key={sector}>{sector}</Badge>)}</div></div>)}</div>
  </Panel>;
}

function Roles({ data, setModal }) {
  return <Panel title="Role templates" description="Roles are reusable permission bundles. Scope is assigned separately." action={<button onClick={() => setModal({ type: "role" })} className={buttonPrimary}><Plus size={16} /> New role</button>}>
    <div className="grid lg:grid-cols-2 gap-3">{(data?.roles || []).map((role) => <div key={role.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{role.name_ar}</div><div className="text-xs text-slate-500">{role.name_en}</div></div><div className="flex gap-2"><Badge tone={role.system ? "blue" : "green"}>{role.system ? "SYSTEM" : "CUSTOM"}</Badge><Badge>{role.compatibility_role}</Badge></div></div><p className="text-xs text-slate-400 mt-3 min-h-8">{role.description}</p><div className="flex items-center justify-between mt-4"><span className="text-xs text-slate-500">{role.permissions?.includes("*") ? "All permissions" : `${role.permissions?.length || 0} permissions`}</span><button onClick={() => setModal({ type: "permissions", role })} className="text-xs text-yellow-300 hover:text-yellow-200 flex items-center gap-1"><KeyRound size={13} /> Configure</button></div></div>)}</div>
  </Panel>;
}

function Assignments({ data, maps, setModal, mutate }) {
  return <Panel title="Scoped assignments" description="User or group ← role ← scope ← time window." action={<button onClick={() => setModal({ type: "assignment" })} className={buttonPrimary}><Plus size={16} /> Assign role</button>}>
    <div className="space-y-2">{(data?.assignments || []).filter((x) => x.active !== false).map((item) => {
      const subject = item.subject_type === "group" ? maps.groups[item.subject_id] : maps.users[item.subject_id];
      const role = maps.roles[item.role_id];
      const scopeName = item.scope_type === "unit" ? maps.units[item.scope_id]?.name_ar : item.scope_type === "organization" ? maps.organizations[item.scope_id]?.name_ar : item.scope_type === "project" ? maps.projects[item.scope_id]?.name : item.scope_id;
      return <div key={item.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between gap-4"><div><div className="font-semibold">{subject?.name || subject?.name_ar || item.subject_id} <span className="text-slate-500">→</span> {role?.name_ar || item.role_id}</div><div className="text-xs text-slate-500 mt-1">{item.scope_type}: {scopeName || "All"} {item.is_primary ? "• Primary" : ""}</div></div><button onClick={() => mutate("delete", `/access/assignments/${item.id}`, null, "Assignment revoked")} className="p-2 text-rose-300 hover:bg-rose-500/10 rounded"><Trash2 size={15} /></button></div>;
    })}</div>
  </Panel>;
}

function Groups({ data, maps, setModal, mutate }) {
  return <Panel title="Groups and committees" description="Assign roles once to a team, committee or working group." action={<button onClick={() => setModal({ type: "group" })} className={buttonPrimary}><Plus size={16} /> New group</button>}>
    <div className="grid lg:grid-cols-2 gap-3">{(data?.groups || []).map((group) => {
      const members = (data?.memberships || []).filter((m) => m.group_id === group.id && m.active !== false);
      return <div key={group.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]"><div className="flex justify-between"><div><div className="font-semibold">{group.name_ar}</div><div className="text-xs text-slate-500">{group.name_en}</div></div><Badge tone="blue">{group.type}</Badge></div><div className="mt-4 flex flex-wrap gap-2">{members.length ? members.map((m) => <Badge key={m.id}>{maps.users[m.user_id]?.name || m.user_id}</Badge>) : <span className="text-xs text-slate-600">No members</span>}</div><button onClick={() => setModal({ type: "membership", group })} className="mt-4 text-xs text-yellow-300 flex gap-1 items-center"><Plus size={13} /> Add member</button></div>;
    })}</div>
  </Panel>;
}

function Delegations({ data, maps, setModal, mutate }) {
  return <Panel title="Temporary delegations" description="Time-limited authority without changing permanent job roles." action={<button onClick={() => setModal({ type: "delegation" })} className={buttonPrimary}><Plus size={16} /> Delegate</button>}>
    <div className="space-y-2">{(data?.delegations || []).filter((x) => x.active !== false).map((item) => <div key={item.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex justify-between gap-4"><div><div className="font-semibold">{maps.users[item.grantor_user_id]?.name} <span className="text-slate-500">→</span> {maps.users[item.delegate_user_id]?.name}</div><div className="text-xs text-slate-500 mt-1">Until {item.expires_at} • {item.scope_type}: {item.scope_id || "All"}</div><div className="flex gap-1 flex-wrap mt-2">{(item.permissions || []).map((p) => <Badge key={p} tone="amber">{p}</Badge>)}</div></div><button onClick={() => mutate("delete", `/access/delegations/${item.id}`, null, "Delegation revoked")} className="p-2 text-rose-300 hover:bg-rose-500/10 rounded h-fit"><Trash2 size={15} /></button></div>)}</div>
  </Panel>;
}

function Policies({ data, setModal }) {
  return <div className="space-y-5"><Panel title="Policy rules" description="Context-aware deny/allow rules evaluated after role and scope grants." action={<button onClick={() => setModal({ type: "policy" })} className={buttonPrimary}><Plus size={16} /> Add policy</button>}><div className="space-y-2">{(data?.policies || []).map((policy) => <div key={policy.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex justify-between gap-3"><div><div className="font-semibold">{policy.name}</div><p className="text-xs text-slate-500 mt-1">{policy.description}</p></div><div className="flex gap-2 h-fit"><Badge tone={policy.effect === "deny" ? "red" : "green"}>{policy.effect}</Badge><Badge>{policy.type}</Badge></div></div>)}</div></Panel><div className="grid lg:grid-cols-2 gap-5"><Panel title="Data classifications" description="Classification rank adds an attribute-based protection layer."><div className="space-y-2">{(data?.classifications || []).sort((a,b) => a.rank-b.rank).map((c) => <div key={c.id} className="flex justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5"><span>{c.name_ar} <span className="text-xs text-slate-500">{c.name_en}</span></span><Badge tone={c.rank >= 50 ? "red" : c.rank >= 30 ? "amber" : "blue"}>Rank {c.rank}</Badge></div>)}</div></Panel><Panel title="Approval limits" description="Financial or operational thresholds by user or role." action={<button onClick={() => setModal({ type: "limit" })} className={buttonSecondary}><Plus size={15} /> Add limit</button>}><div className="space-y-2">{(data?.approval_limits || []).length ? data.approval_limits.map((limit) => <div key={limit.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/5"><div className="font-semibold text-sm">{limit.permission}: {limit.max_amount?.toLocaleString()} {limit.currency}</div><div className="text-xs text-slate-500">{limit.subject_type}: {limit.subject_id} • {limit.scope_type}</div></div>) : <p className="text-xs text-slate-600">No explicit limits yet. Amount-bearing approvals require a configured limit unless the role has override authority.</p>}</div></Panel></div></div>;
}

function Simulator({ data, result, setResult }) {
  const [form, setForm] = useState({ user_id: data?.users?.[0]?.id || "", permission: data?.permissions?.[0]?.code || "platform.access", resource_type: "", resource_id: "", amount: "", classification: "" });
  const run = async (event) => {
    event.preventDefault();
    try {
      const context = {};
      if (form.amount) context.amount = Number(form.amount);
      if (form.classification) context.classification = form.classification;
      const response = await api.post("/access/simulator", { user_id: form.user_id, permission: form.permission, resource_type: form.resource_type || null, resource_id: form.resource_id || null, context });
      setResult(response.data);
    } catch (error) { toast.error(error?.response?.data?.detail || "Simulation failed"); }
  };
  return <div className="grid lg:grid-cols-2 gap-5"><Panel title="Permission simulator" description="Explain exactly why a real request would be allowed or denied."><form onSubmit={run} className="space-y-3"><select className={inputClass} value={form.user_id} onChange={(e) => setForm({...form,user_id:e.target.value})}>{(data?.users || []).map((u) => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}</select><select className={inputClass} value={form.permission} onChange={(e) => setForm({...form,permission:e.target.value})}>{(data?.permissions || []).map((p) => <option key={p.code} value={p.code}>{p.code} — {p.description}</option>)}</select><div className="grid grid-cols-2 gap-3"><select className={inputClass} value={form.resource_type} onChange={(e) => setForm({...form,resource_type:e.target.value})}><option value="">No resource</option><option value="project">Project</option><option value="task">Task</option><option value="document">Document</option><option value="meeting">Meeting</option><option value="user">User</option></select><input className={inputClass} placeholder="Resource ID" value={form.resource_id} onChange={(e) => setForm({...form,resource_id:e.target.value})} /></div><div className="grid grid-cols-2 gap-3"><input className={inputClass} type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({...form,amount:e.target.value})} /><select className={inputClass} value={form.classification} onChange={(e) => setForm({...form,classification:e.target.value})}><option value="">Default classification</option>{(data?.classifications || []).map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}</select></div><button className={buttonPrimary}><SearchCheck size={16} /> Evaluate access</button></form></Panel><Panel title="Decision explanation" description="The simulator uses the same evaluator as production API requests.">{result ? <div className={`p-5 rounded-xl border ${result.allowed ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"}`}><div className="flex items-center gap-3">{result.allowed ? <CheckCircle2 className="text-emerald-300" /> : <XCircle className="text-rose-300" />}<div><div className="font-bold text-lg">{result.allowed ? "ALLOWED" : "DENIED"}</div><div className="text-xs text-slate-500">{result.permission}</div></div></div><div className="mt-5 space-y-2">{(result.reason || []).map((reason, i) => <div key={i} className="p-3 rounded-lg bg-black/15 text-sm text-slate-300">{reason}</div>)}</div></div> : <div className="min-h-60 flex items-center justify-center text-slate-600"><LockKeyhole size={28} /></div>}</Panel></div>;
}

function Audit({ audit }) {
  if (!audit) return <div className="glass-card p-10 text-center text-slate-500">Loading audit...</div>;
  return <div className="space-y-5"><Panel title="Authorization decisions" description="Denied and sensitive decisions are recorded automatically."><div className="space-y-2 max-h-[520px] overflow-y-auto">{audit.decisions.map((d) => <div key={d.id} className="p-3 rounded-lg border border-white/5 bg-white/[0.02] flex justify-between gap-4"><div><div className="text-sm font-semibold">{d.user_email} — {d.permission}</div><div className="text-xs text-slate-500 mt-1">{d.resource_type || "platform"} {d.resource_id || ""} • {d.created_at}</div></div><Badge tone={d.allowed ? "green" : "red"}>{d.allowed ? "ALLOW" : "DENY"}</Badge></div>)}</div></Panel><Panel title="Security events"><div className="space-y-2 max-h-[420px] overflow-y-auto">{audit.events.map((e) => <div key={e.id} className="p-3 rounded-lg border border-white/5 bg-white/[0.02]"><div className="text-sm font-semibold">{e.event}</div><div className="text-xs text-slate-500">{e.actor_email || "system"} → {e.target_email || "platform"} • {e.created_at}</div></div>)}</div></Panel></div>;
}

function UnitModal({ data, onClose, onSave }) {
  const [form, setForm] = useState({ organization_id: data?.organizations?.[0]?.id || "org_araak", parent_id: "unit_ceo_office", name_ar: "", name_en: "", type: "department", sector_keys: "" });
  return <Modal title="Create organizational unit" onClose={onClose}><form onSubmit={(e) => {e.preventDefault(); onSave({...form, sector_keys: form.sector_keys.split(",").map(x=>x.trim()).filter(Boolean)});}} className="space-y-3"><input required className={inputClass} placeholder="Arabic name" value={form.name_ar} onChange={(e)=>setForm({...form,name_ar:e.target.value})}/><input className={inputClass} placeholder="English name" value={form.name_en} onChange={(e)=>setForm({...form,name_en:e.target.value})}/><select className={inputClass} value={form.parent_id} onChange={(e)=>setForm({...form,parent_id:e.target.value})}><option value="">Root</option>{(data?.units || []).map((u)=><option key={u.id} value={u.id}>{u.name_ar}</option>)}</select><select className={inputClass} value={form.type} onChange={(e)=>setForm({...form,type:e.target.value})}><option>department</option><option>office</option><option>portfolio</option><option>business_unit</option><option>branch</option><option>project_unit</option></select><input className={inputClass} placeholder="Sector keys, comma separated" value={form.sector_keys} onChange={(e)=>setForm({...form,sector_keys:e.target.value})}/><button className={buttonPrimary}><Save size={16}/> Save unit</button></form></Modal>;
}

function RoleModal({ data, onClose, onSave }) {
  const [form, setForm] = useState({ name_ar: "", name_en: "", description: "", compatibility_role: "tracker", permissions: ["platform.access"] });
  return <Modal title="Create role template" onClose={onClose} wide><form onSubmit={(e)=>{e.preventDefault();onSave(form);}} className="space-y-4"><div className="grid md:grid-cols-2 gap-3"><input required className={inputClass} placeholder="Arabic role name" value={form.name_ar} onChange={(e)=>setForm({...form,name_ar:e.target.value})}/><input className={inputClass} placeholder="English role name" value={form.name_en} onChange={(e)=>setForm({...form,name_en:e.target.value})}/></div><textarea className={inputClass} placeholder="Role purpose and limits" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/><select className={inputClass} value={form.compatibility_role} onChange={(e)=>setForm({...form,compatibility_role:e.target.value})}>{["tracker","dev_manager","vp_development","vp_investment","ceo","admin"].map(r=><option key={r}>{r}</option>)}</select><PermissionGrid permissions={data?.permissions || []} selected={form.permissions} onChange={(permissions)=>setForm({...form,permissions})}/><button className={buttonPrimary}><Save size={16}/> Create role</button></form></Modal>;
}

function PermissionsModal({ role, permissions, onClose, onSave }) {
  const [selected, setSelected] = useState(role.permissions?.includes("*") ? permissions.map((p)=>p.code) : role.permissions || []);
  return <Modal title={`Permissions — ${role.name_ar}`} onClose={onClose} wide><PermissionGrid permissions={permissions} selected={selected} onChange={setSelected}/><div className="mt-5 flex justify-end"><button onClick={()=>onSave(selected)} className={buttonPrimary}><Save size={16}/> Save permissions</button></div></Modal>;
}

function PermissionGrid({ permissions, selected, onChange }) {
  const groups = Object.groupBy ? Object.groupBy(permissions, (p)=>p.module) : permissions.reduce((acc,p)=>{(acc[p.module] ||= []).push(p);return acc;},{});
  const toggle = (code) => onChange(selected.includes(code) ? selected.filter((x)=>x!==code) : [...selected,code]);
  return <div className="grid md:grid-cols-2 gap-4">{Object.entries(groups).map(([module, items])=><div key={module} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]"><div className="font-semibold text-sm mb-3">{module}</div><div className="space-y-2">{items.map((p)=><label key={p.code} className="flex items-start gap-2 text-xs cursor-pointer"><input type="checkbox" checked={selected.includes(p.code)} onChange={()=>toggle(p.code)} className="mt-0.5"/><span><span className="text-slate-200">{p.code}</span><span className="block text-slate-500">{p.description}</span></span></label>)}</div></div>)}</div>;
}

function AssignmentModal({ data, onClose, onSave }) {
  const [form,setForm]=useState({subject_type:"user",subject_id:data?.users?.[0]?.id||"",role_id:data?.roles?.[0]?.id||"",scope_type:"global",scope_id:"",starts_at:"",expires_at:"",is_primary:false});
  const targets=form.subject_type==="user"?data.users:data.groups;
  const scopes=form.scope_type==="unit"?data.units:form.scope_type==="organization"?data.organizations:form.scope_type==="project"?data.projects:[];
  return <Modal title="Assign role and scope" onClose={onClose}><form onSubmit={(e)=>{e.preventDefault();onSave({...form,scope_id:form.scope_id||null,starts_at:form.starts_at||null,expires_at:form.expires_at||null});}} className="space-y-3"><div className="grid grid-cols-2 gap-3"><select className={inputClass} value={form.subject_type} onChange={(e)=>setForm({...form,subject_type:e.target.value,subject_id:(e.target.value==="user"?data.users:data.groups)?.[0]?.id||""})}><option value="user">User</option><option value="group">Group</option></select><select className={inputClass} value={form.subject_id} onChange={(e)=>setForm({...form,subject_id:e.target.value})}>{(targets||[]).map((x)=><option key={x.id} value={x.id}>{x.name||x.name_ar}</option>)}</select></div><select className={inputClass} value={form.role_id} onChange={(e)=>setForm({...form,role_id:e.target.value})}>{data.roles.map((r)=><option key={r.id} value={r.id}>{r.name_ar}</option>)}</select><div className="grid grid-cols-2 gap-3"><select className={inputClass} value={form.scope_type} onChange={(e)=>setForm({...form,scope_type:e.target.value,scope_id:""})}>{["global","organization","unit","project","resource"].map(x=><option key={x}>{x}</option>)}</select>{form.scope_type==="resource"?<input className={inputClass} placeholder="Resource ID" value={form.scope_id} onChange={(e)=>setForm({...form,scope_id:e.target.value})}/>:form.scope_type!=="global"?<select className={inputClass} value={form.scope_id} onChange={(e)=>setForm({...form,scope_id:e.target.value})}><option value="">Select scope</option>{(scopes||[]).map(x=><option key={x.id} value={x.id}>{x.name||x.name_ar}</option>)}</select>:<div/>}</div><div className="grid grid-cols-2 gap-3"><input className={inputClass} type="datetime-local" value={form.starts_at} onChange={(e)=>setForm({...form,starts_at:e.target.value})}/><input className={inputClass} type="datetime-local" value={form.expires_at} onChange={(e)=>setForm({...form,expires_at:e.target.value})}/></div>{form.subject_type==="user"&&<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_primary} onChange={(e)=>setForm({...form,is_primary:e.target.checked})}/> Make this the primary role and compatibility profile</label>}<button className={buttonPrimary}><Save size={16}/> Create assignment</button></form></Modal>;
}

function GroupModal({ onClose,onSave }) {const [form,setForm]=useState({organization_id:"org_araak",name_ar:"",name_en:"",type:"team"});return <Modal title="Create group or committee" onClose={onClose}><form onSubmit={(e)=>{e.preventDefault();onSave(form);}} className="space-y-3"><input required className={inputClass} placeholder="Arabic name" value={form.name_ar} onChange={(e)=>setForm({...form,name_ar:e.target.value})}/><input className={inputClass} placeholder="English name" value={form.name_en} onChange={(e)=>setForm({...form,name_en:e.target.value})}/><select className={inputClass} value={form.type} onChange={(e)=>setForm({...form,type:e.target.value})}><option>team</option><option>committee</option><option>working_group</option><option>project_team</option></select><button className={buttonPrimary}><Save size={16}/> Create group</button></form></Modal>}
function MembershipModal({ data,group,onClose,onSave }) {const [user_id,setUser]=useState(data?.users?.[0]?.id||"");return <Modal title={`Add member — ${group.name_ar}`} onClose={onClose}><form onSubmit={(e)=>{e.preventDefault();onSave({user_id});}} className="space-y-3"><select className={inputClass} value={user_id} onChange={(e)=>setUser(e.target.value)}>{data.users.map(u=><option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}</select><button className={buttonPrimary}><Plus size={16}/> Add member</button></form></Modal>}
function DelegationModal({ data,onClose,onSave }) {const [form,setForm]=useState({grantor_user_id:data?.users?.[0]?.id||"",delegate_user_id:data?.users?.[1]?.id||data?.users?.[0]?.id||"",permissions:["task.approve"],scope_type:"global",scope_id:"",starts_at:"",expires_at:"",reason:""});const toggle=(p)=>setForm({...form,permissions:form.permissions.includes(p)?form.permissions.filter(x=>x!==p):[...form.permissions,p]});return <Modal title="Create temporary delegation" onClose={onClose} wide><form onSubmit={(e)=>{e.preventDefault();onSave({...form,scope_id:form.scope_id||null,starts_at:form.starts_at||null});}} className="space-y-4"><div className="grid md:grid-cols-2 gap-3"><select className={inputClass} value={form.grantor_user_id} onChange={(e)=>setForm({...form,grantor_user_id:e.target.value})}>{data.users.map(u=><option key={u.id} value={u.id}>From: {u.name}</option>)}</select><select className={inputClass} value={form.delegate_user_id} onChange={(e)=>setForm({...form,delegate_user_id:e.target.value})}>{data.users.map(u=><option key={u.id} value={u.id}>To: {u.name}</option>)}</select></div><div className="grid md:grid-cols-2 gap-3"><select className={inputClass} value={form.scope_type} onChange={(e)=>setForm({...form,scope_type:e.target.value})}>{["global","organization","unit","project","resource"].map(x=><option key={x}>{x}</option>)}</select><input className={inputClass} placeholder="Scope ID (optional for global)" value={form.scope_id} onChange={(e)=>setForm({...form,scope_id:e.target.value})}/></div><div className="grid md:grid-cols-2 gap-3"><input className={inputClass} type="datetime-local" value={form.starts_at} onChange={(e)=>setForm({...form,starts_at:e.target.value})}/><input required className={inputClass} type="datetime-local" value={form.expires_at} onChange={(e)=>setForm({...form,expires_at:e.target.value})}/></div><input className={inputClass} placeholder="Reason" value={form.reason} onChange={(e)=>setForm({...form,reason:e.target.value})}/><div className="grid md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">{data.permissions.map(p=><label key={p.code} className="text-xs flex gap-2 p-2 border border-white/5 rounded"><input type="checkbox" checked={form.permissions.includes(p.code)} onChange={()=>toggle(p.code)}/>{p.code}</label>)}</div><button className={buttonPrimary}><Save size={16}/> Create delegation</button></form></Modal>}
function PolicyModal({ onClose,onSave }) {const [form,setForm]=useState({name:"",type:"context",effect:"deny",permission:"",enabled:true,description:"",conditionText:'{"context_equals":{"classification":"confidential"}}'});return <Modal title="Create contextual policy" onClose={onClose}><form onSubmit={(e)=>{e.preventDefault();try{onSave({...form,permission:form.permission||null,condition:JSON.parse(form.conditionText)});}catch{toast.error("Condition must be valid JSON");}}} className="space-y-3"><input required className={inputClass} placeholder="Policy name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/><div className="grid grid-cols-2 gap-3"><select className={inputClass} value={form.effect} onChange={(e)=>setForm({...form,effect:e.target.value})}><option>deny</option><option>allow</option></select><input className={inputClass} placeholder="Permission code (optional)" value={form.permission} onChange={(e)=>setForm({...form,permission:e.target.value})}/></div><textarea className={inputClass} rows={5} value={form.conditionText} onChange={(e)=>setForm({...form,conditionText:e.target.value})}/><input className={inputClass} placeholder="Description" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/><button className={buttonPrimary}><Save size={16}/> Create policy</button></form></Modal>}
function LimitModal({ data,onClose,onSave }) {const [form,setForm]=useState({subject_type:"role",subject_id:data?.roles?.[0]?.id||"",permission:"task.approve",currency:"SAR",max_amount:"",scope_type:"global",scope_id:""});const subjects=form.subject_type==="role"?data.roles:data.users;return <Modal title="Create approval limit" onClose={onClose}><form onSubmit={(e)=>{e.preventDefault();onSave({...form,max_amount:Number(form.max_amount),scope_id:form.scope_id||null});}} className="space-y-3"><div className="grid grid-cols-2 gap-3"><select className={inputClass} value={form.subject_type} onChange={(e)=>setForm({...form,subject_type:e.target.value,subject_id:(e.target.value==="role"?data.roles:data.users)?.[0]?.id||""})}><option>role</option><option>user</option></select><select className={inputClass} value={form.subject_id} onChange={(e)=>setForm({...form,subject_id:e.target.value})}>{subjects.map(x=><option key={x.id} value={x.id}>{x.name_ar||x.name}</option>)}</select></div><input className={inputClass} value={form.permission} onChange={(e)=>setForm({...form,permission:e.target.value})}/><div className="grid grid-cols-2 gap-3"><input required type="number" className={inputClass} placeholder="Maximum amount" value={form.max_amount} onChange={(e)=>setForm({...form,max_amount:e.target.value})}/><input className={inputClass} value={form.currency} onChange={(e)=>setForm({...form,currency:e.target.value})}/></div><button className={buttonPrimary}><Save size={16}/> Save limit</button></form></Modal>}
