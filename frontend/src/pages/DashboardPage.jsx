import React, { useEffect, useState } from "react";
import api, { SECTOR_LABELS, STATUS_LABELS } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import KPICard from "../components/KPICard";
import RAGBadge from "../components/RAGBadge";
import AICommandBar from "../components/AICommandBar";
import ExecutiveIntelligenceCenter from "../components/ExecutiveIntelligenceCenter";
import AIWorkforceStatus from "../components/AIWorkforceStatus";
import DetailModal from "../components/DetailModal";
import { Link } from "react-router-dom";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, RadialBarChart, RadialBar, AreaChart, Area,
} from "recharts";
import { FolderKanban, ListChecks, AlertTriangle, TrendingUp, DollarSign, Layers, ArrowRight } from "lucide-react";

const RAG_COLORS = { red: "#fb7185", amber: "#fbbf24", green: "#34d399", gray: "#64748b" };
const SECTOR_COLORS = ["#D4AF37", "#34d399", "#60a5fa", "#fbbf24", "#a78bfa", "#fb7185"];

function fmt(n) { return new Intl.NumberFormat("en-US").format(n || 0); }

function Header({ user }) {
  return (
    <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80 font-semibold">Executive Dashboard</div>
        <h1 className="font-heading text-4xl font-black text-slate-50 mt-2">Welcome, {user?.name}</h1>
        <p className="text-slate-500 mt-1">Real-time visibility across group performance</p>
      </div>
      <div className="text-xs text-slate-500 tabular-nums" dir="ltr">
        {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="h-24 shimmer rounded-lg mb-6"></div>
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-32 shimmer rounded-lg"></div>)}</div>
      </div>
    );
  }
  if (!data) return null;

  const openDetail = (type, item, title) => { setSelected({ type, item, title }); setBrief(null); };
  const generateBrief = async (item) => {
    setBriefLoading(true);
    try {
      const res = await api.post("/ai/executive-brief", { source_type: selected?.type || "dashboard", item });
      setBrief(res.data);
    } finally { setBriefLoading(false); }
  };

  const ragData = Object.entries(data.rag).map(([k, v]) => ({ name: k, value: v, color: RAG_COLORS[k] }));
  const sectorData = data.by_sector.map((s, i) => ({
    name: SECTOR_LABELS[s.sector] || s.sector,
    value: s.count,
    progress: s.avg_progress,
    fill: SECTOR_COLORS[i % SECTOR_COLORS.length],
  }));
  const taskStatusData = Object.entries(data.task_status).map(([k, v]) => ({
    name: STATUS_LABELS[k] || k, value: v,
  }));

  return (
    <div data-testid="dashboard-page">
      <Header user={user} />
      <AICommandBar />
      <ExecutiveIntelligenceCenter onSelectRisk={(risk) => openDetail("risk", risk, risk.title)} />
      <AIWorkforceStatus />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KPICard testId="kpi-total-projects" label="Total Projects" value={fmt(data.totals.projects)} sublabel={`${fmt(data.totals.active_projects)} active`} icon={<FolderKanban size={20}/>} accent="gold" onClick={() => openDetail("dashboard", data.totals, "Dashboard Totals")} />
        <KPICard testId="kpi-active-projects" label="Active Projects" value={fmt(data.totals.active_projects)} icon={<Layers size={20}/>} accent="green" onClick={() => openDetail("dashboard", { active_projects: data.totals.active_projects, recent_projects: data.recent_projects }, "Active Projects")} />
        <KPICard testId="kpi-tasks" label="Total Tasks" value={fmt(data.totals.tasks)} icon={<ListChecks size={20}/>} onClick={() => openDetail("dashboard", { tasks: data.totals.tasks, task_status: data.task_status }, "Task Status Overview")} />
        <KPICard testId="kpi-overdue" label="Overdue Tasks" value={fmt(data.totals.overdue_tasks)} accent="red" icon={<AlertTriangle size={20}/>} onClick={() => openDetail("risk", { overdue_tasks: data.totals.overdue_tasks, recommendation: "Review delayed execution loops immediately." }, "Overdue Tasks Risk")} />
        <KPICard testId="kpi-progress" label="Average Progress" value={`${data.totals.avg_progress}%`} accent="amber" icon={<TrendingUp size={20}/>} onClick={() => openDetail("dashboard", { avg_progress: data.totals.avg_progress, by_sector: data.by_sector }, "Average Progress Intelligence")} />
        <KPICard testId="kpi-budget" label="Total Budget" value={fmt(Math.round(data.totals.total_budget))} sublabel="EGP/AED" icon={<DollarSign size={20}/>} onClick={() => openDetail("dashboard", { total_budget: data.totals.total_budget }, "Budget Overview")} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* RAG status */}
        <div className="glass-card p-6" data-testid="chart-rag">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Project Health</div>
              <h3 className="font-heading text-lg font-bold mt-1">RAG Indicator</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={ragData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {ragData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#111622", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-around mt-3 text-xs">
            {[
              { k: "green", l: "Healthy" },
              { k: "amber", l: "Watch" },
              { k: "red", l: "Critical" },
            ].map(x => (
              <div key={x.k} className="text-center">
                <div className="text-2xl font-heading font-bold tabular-nums" style={{color: RAG_COLORS[x.k]}}>{data.rag[x.k] || 0}</div>
                <div className="text-slate-500">{x.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sectors */}
        <div className="glass-card p-6 lg:col-span-2" data-testid="chart-sectors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Sectors</div>
              <h3 className="font-heading text-lg font-bold mt-1">Projects by Sector</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={sectorData} margin={{ right: 20, left: 0, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#111622", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Project Count">
                {sectorData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Task status */}
        <div className="glass-card p-6">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Tasks</div>
          <h3 className="font-heading text-lg font-bold mb-4">Task Status</h3>
          <div className="space-y-3">
            {taskStatusData.map((s, i) => {
              const total = taskStatusData.reduce((a, b) => a + b.value, 0) || 1;
              const pct = Math.round((s.value / total) * 100);
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-300">{s.name}</span>
                    <span className="text-slate-500 tabular-nums">{s.value} • {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-l from-yellow-400 to-yellow-600" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sector avg progress */}
        <div className="glass-card p-6 lg:col-span-2">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Average Progress</div>
          <h3 className="font-heading text-lg font-bold mb-4">Sector Completion Rate</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={sectorData}>
              <defs>
                <linearGradient id="gradGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }}/>
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 100]}/>
              <Tooltip contentStyle={{ background: "#111622", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} formatter={(v) => `${v}%`} />
              <Area type="monotone" dataKey="progress" stroke="#D4AF37" fill="url(#gradGold)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="glass-card p-6" data-testid="recent-projects">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-500">Latest Updates</div>
            <h3 className="font-heading text-lg font-bold mt-1">Active Projects</h3>
          </div>
          <Link to="/projects" className="text-xs text-yellow-500 hover:text-yellow-400 flex items-center gap-1">
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-slate-500 border-b border-white/5">
                <th className="py-3 font-semibold">Project</th>
                <th className="py-3 font-semibold">Sector</th>
                <th className="py-3 font-semibold">Status</th>
                <th className="py-3 font-semibold">Progress</th>
                <th className="py-3 font-semibold">Indicator</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_projects.map((p) => (
                <tr key={p.id} onClick={() => openDetail("project", p, p.name)} className="border-b border-white/5 hover:bg-white/[0.04] cursor-pointer">
                  <td className="py-4">
                    <Link to={`/projects/${p.id}`} className="text-slate-100 hover:text-yellow-400 font-medium">{p.name}</Link>
                  </td>
                  <td className="py-4 text-slate-400 text-xs">{SECTOR_LABELS[p.sector]}</td>
                  <td className="py-4 text-slate-400 text-xs">{STATUS_LABELS[p.status]}</td>
                  <td className="py-4 w-40">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-l from-yellow-400 to-yellow-600" style={{width: `${p.progress}%`}}></div>
                      </div>
                      <span className="text-xs tabular-nums text-slate-300">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="py-4"><RAGBadge rag={p.rag} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selected && <DetailModal item={selected.item} title={selected.title} type={selected.type} onClose={() => setSelected(null)} onGenerateBrief={generateBrief} brief={brief} loadingBrief={briefLoading} />}
    </div>
  );
}
