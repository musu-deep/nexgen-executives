import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, ChevronRight, Activity, ShieldAlert, FileText, ListChecks } from "lucide-react";
import api from "../lib/api";

const dot = {
  emerald: "bg-emerald-400 shadow-emerald-400/40",
  amber: "bg-amber-400 shadow-amber-400/40",
  rose: "bg-rose-400 shadow-rose-400/40",
};

export default function AIWorkforceStatus() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/ai/workforce-status").then((r) => setData(r.data)).catch(() => {});
  }, []);

  const agents = data?.agents || [
    { name: "Chief of Staff Agent", tone: "emerald", status: "Active" },
    { name: "Project Intelligence Agent", tone: "emerald", status: "Monitoring" },
    { name: "Meeting Intelligence Agent", tone: "emerald", status: "Monitoring" },
    { name: "Risk Monitoring Agent", tone: "amber", status: "Needs Attention" },
    { name: "Document Intelligence Agent", tone: "emerald", status: "Active" },
    { name: "Reporting Agent", tone: "emerald", status: "Active" },
    { name: "Executive Briefing Agent", tone: "emerald", status: "Active" },
  ];

  return (
    <Link to="/ai-lounge" className="glass-card p-6 block hover:border-yellow-500/30 transition-all mb-6 border-yellow-500/20">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80 flex items-center gap-2">
            <Bot size={15} /> AI Workforce Status
          </div>
          <h3 className="font-heading text-2xl font-black mt-2">Executive AI Agents are operating behind the system</h3>
          <p className="text-sm text-slate-500 mt-1">Click to enter the Agent Lounge and inspect the active institutional workforce.</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-300 flex items-center justify-center"><ChevronRight size={20} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <Metric icon={<Activity size={15}/>} label="Agents" value={data?.metrics?.agents || agents.length} />
        <Metric icon={<FileText size={15}/>} label="Documents" value={data?.metrics?.documents || 0} />
        <Metric icon={<ListChecks size={15}/>} label="Tasks" value={data?.metrics?.tasks || 0} />
        <Metric icon={<ShieldAlert size={15}/>} label="Critical Risks" value={data?.metrics?.critical_risks || 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {agents.slice(0, 7).map((a) => (
          <div key={a.id || a.name} className="rounded-xl bg-white/[0.03] border border-white/5 p-3 flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full shadow-lg ${dot[a.tone] || dot.emerald}`}></span>
            <div className="min-w-0">
              <div className="text-sm text-slate-100 font-medium truncate">{a.name}</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{a.status}</div>
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/5 p-3">
      <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase tracking-widest">{icon}{label}</div>
      <div className="text-2xl font-heading font-black text-slate-100 mt-1 tabular-nums">{value}</div>
    </div>
  );
}
