import React, { useEffect, useState } from "react";
import api, { SECTOR_LABELS, PRIORITY_LABELS } from "../lib/api";
import RAGBadge from "../components/RAGBadge";
import DetailModal from "../components/DetailModal";
import AICommandBar from "../components/AICommandBar";
import { FileText, Printer, RefreshCw, AlertTriangle, Calendar as CalIcon, Mic, ClipboardList, TrendingUp } from "lucide-react";

export default function DailyReportPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);

  const load = () => { setLoading(true); api.get("/reports/daily-executive").then(r => setReport(r.data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const print = () => window.print();
  const openDetail = (type, item, title) => { setSelected({ type, item, title }); setBrief(null); };
  const generateBrief = async (item) => {
    setBriefLoading(true);
    try {
      const res = await api.post("/ai/executive-brief", { source_type: selected?.type || "daily", item });
      setBrief(res.data);
    } finally { setBriefLoading(false); }
  };

  if (!report) {
    return <div className="h-64 shimmer rounded-lg"></div>;
  }

  const m = report.metrics;
  const today = new Date(report.generated_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div data-testid="daily-report-page" className="print:p-0">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4 print:hidden">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">Daily Executive Report</div>
          <h1 className="font-heading text-4xl font-black mt-2 flex items-center gap-3"><FileText className="text-yellow-500"/> Daily AI Brief</h1>
          <p className="text-slate-500 text-sm mt-1">{today}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-yellow-500/10 text-slate-300 hover:text-yellow-300 text-sm flex items-center gap-2"><RefreshCw size={14} className={loading?"animate-spin":""}/> Refresh</button>
          <button onClick={print} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold text-sm flex items-center gap-2"><Printer size={14}/> Print / PDF</button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6 text-center border-b pb-4">
        <div className="text-2xl font-bold">مجموعة أراك — Daily Executive Report</div>
        <div className="text-sm text-slate-500 mt-1">{today}</div>
        <div className="text-sm mt-1">To: {report.user.name}</div>
      </div>

      <AICommandBar />

      {/* AI Summary */}
      <div className="glass-card p-6 mb-5 border-yellow-500/30">
        <div className="flex items-center gap-2 mb-3">
          <div className="px-2 py-1 rounded bg-yellow-500/15 text-yellow-300 text-[10px] uppercase tracking-widest">AI Briefing</div>
          <span className="text-sm text-slate-400">Gemini-ready AI Briefing</span>
        </div>
        <p className="text-lg text-slate-100 leading-loose font-heading whitespace-pre-wrap">{report.ai_summary}</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat icon={<TrendingUp/>} label="Total Projects" value={m.total_projects} sub={`${m.active_projects} active`} onClick={() => openDetail("daily", report.metrics, "Daily Metrics")} />
        <Stat icon={<AlertTriangle/>} label="Critical Projects" value={m.critical_projects} accent="red" onClick={() => openDetail("project", { critical_projects: report.critical_projects }, "Critical Projects")} />
        <Stat icon={<ClipboardList/>} label="Overdue Tasks" value={m.overdue_tasks} accent="amber" onClick={() => openDetail("task", { overdue_tasks: report.overdue_tasks }, "Overdue Tasks")} />
        <Stat icon={<CalIcon/>} label="Today Meetings" value={m.today_meetings} onClick={() => openDetail("meeting", { today_meetings: report.today_meetings }, "Today Meetings")} />
        <Stat icon={<CalIcon/>} label="Pending Requests" value={m.pending_requests} onClick={() => openDetail("meeting_request", { pending_requests: report.pending_requests }, "Pending Meeting Requests")} />
        <Stat icon={<Mic/>} label="Voice Directives" value={m.pending_voice_directives} onClick={() => openDetail("daily", { pending_voice_directives: report.pending_voice_directives }, "Voice Directives")} />
        <Stat icon={<TrendingUp/>} label="Avg Progress" value={`${m.avg_progress}%`} accent="green" onClick={() => openDetail("daily", { avg_progress: m.avg_progress }, "Average Progress")} />
      </div>

      {/* Critical Projects */}
      {report.critical_projects.length > 0 && (
        <Section title="Critical Projects Requiring Immediate Attention" icon={<AlertTriangle className="text-rose-400"/>}>
          {report.critical_projects.map(p => (
            <div key={p.id} onClick={() => openDetail("project", p, p.name)} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-rose-500/10 cursor-pointer hover:bg-white/[0.05]">
              <div>
                <div className="font-medium text-slate-100">{p.name}</div>
                <div className="text-xs text-slate-500">{SECTOR_LABELS[p.sector]} • Progress {p.progress}%</div>
              </div>
              <RAGBadge rag={p.rag}/>
            </div>
          ))}
        </Section>
      )}

      {/* Today Meetings */}
      {report.today_meetings.length > 0 && (
        <Section title="Today's Meetings" icon={<CalIcon className="text-yellow-400"/>}>
          {report.today_meetings.map(m => (
            <div key={m.id} onClick={() => openDetail("meeting", m, m.title)} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.05]">
              <div className="font-medium text-slate-100">{m.title}</div>
              <div className="text-xs text-slate-500 mt-1">{new Date(m.date).toLocaleTimeString("en-US", {timeStyle: "short"})} • {m.duration_minutes} min</div>
            </div>
          ))}
        </Section>
      )}

      {/* Overdue Tasks */}
      {report.overdue_tasks.length > 0 && (
        <Section title="Overdue Tasks" icon={<ClipboardList className="text-amber-400"/>}>
          {report.overdue_tasks.map(t => (
            <div key={t.id} onClick={() => openDetail("task", t, t.title)} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-amber-500/10 cursor-pointer hover:bg-white/[0.05]">
              <div>
                <div className="font-medium text-slate-100">{t.title}</div>
                <div className="text-xs text-slate-500">Due: {new Date(t.due_date).toLocaleDateString("en-US")} • {PRIORITY_LABELS[t.priority]}</div>
              </div>
              <span className="text-amber-400 tabular-nums text-sm">{t.progress}%</span>
            </div>
          ))}
        </Section>
      )}

      {/* Pending Meeting Requests */}
      {report.pending_requests.length > 0 && (
        <Section title="Meeting Requests Awaiting Decision" icon={<CalIcon className="text-sky-400"/>}>
          {report.pending_requests.map(r => (
            <div key={r.id} onClick={() => openDetail("meeting_request", r, r.subject)} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.05]">
              <div className="font-medium text-slate-100">{r.subject}</div>
              <div className="text-xs text-slate-500 mt-1">From: {r.requester_name} • Proposed: {new Date(r.proposed_date).toLocaleDateString("en-US")}</div>
            </div>
          ))}
        </Section>
      )}

      {/* Pending Voice Directives */}
      {report.pending_voice_directives.length > 0 && (
        <Section title="Pending Voice Directives" icon={<Mic className="text-violet-400"/>}>
          {report.pending_voice_directives.map(v => (
            <div key={v.id} onClick={() => openDetail("daily", v, "Voice Directive")} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.05]">
              <div className="text-sm text-slate-100">{v.summary || (v.transcript || "").slice(0, 100)}</div>
              <div className="text-xs text-slate-500 mt-1">{(v.suggested_tasks || []).length} suggested task • {new Date(v.created_at).toLocaleDateString("en-US")}</div>
            </div>
          ))}
        </Section>
      )}
      {selected && <DetailModal item={selected.item} title={selected.title} type={selected.type} onClose={() => setSelected(null)} onGenerateBrief={generateBrief} brief={brief} loadingBrief={briefLoading} />}
    </div>
  );
}

function Stat({ icon, label, value, sub, accent, onClick }) {
  const colors = { red: "text-rose-400", amber: "text-amber-400", green: "text-emerald-400" };
  return (
    <div onClick={onClick} role={onClick ? "button" : undefined} className={`glass-card p-4 ${onClick ? "cursor-pointer hover:border-yellow-500/25 hover:bg-white/[0.03]" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
        <div className={`text-slate-500 ${colors[accent] || ""}`}>{icon}</div>
      </div>
      <div className={`mt-2 text-2xl font-heading font-bold tabular-nums ${colors[accent] || "text-slate-100"}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="glass-card p-5 mb-4">
      <h3 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">{icon} {title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
