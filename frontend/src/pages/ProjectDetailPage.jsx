import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { SECTOR_LABELS, STATUS_LABELS, PRIORITY_LABELS } from "../lib/api";
import RAGBadge from "../components/RAGBadge";
import { ArrowRight, Calendar, DollarSign, Flag, Plus, FileText } from "lucide-react";
import { toast } from "sonner";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [tab, setTab] = useState("overview");
  const [newUpdate, setNewUpdate] = useState({ update_type: "progress", content: "", progress: "" });

  const load = async () => {
    const [p, t, u] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/tasks`, { params: { project_id: id } }),
      api.get(`/progress`, { params: { project_id: id } }),
    ]);
    setProject(p.data); setTasks(t.data); setUpdates(u.data);
  };
  useEffect(() => { load(); }, [id]);

  const submitUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = { project_id: id, update_type: newUpdate.update_type, content: newUpdate.content };
      if (newUpdate.progress !== "") payload.progress = Number(newUpdate.progress);
      await api.post("/progress", payload);
      toast.success("Update submitted successfully");
      setNewUpdate({ update_type: "progress", content: "", progress: "" });
      load();
    } catch { toast.error("Unable to complete action Add Update"); }
  };

  if (!project) return <div className="h-32 shimmer rounded-lg"></div>;

  return (
    <div data-testid="project-detail">
      <Link to="/projects" className="text-xs text-slate-400 hover:text-yellow-400 flex items-center gap-1 mb-4">
        <ArrowRight size={14}/> back to projects
      </Link>

      <div className="glass-card p-7 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <RAGBadge rag={project.rag} size="lg"/>
              <span className="text-[11px] uppercase tracking-widest text-yellow-500/80 px-2 py-1 bg-yellow-500/5 rounded">{SECTOR_LABELS[project.sector]}</span>
              <span className="text-[11px] uppercase tracking-widest text-slate-400 px-2 py-1 bg-white/5 rounded">{STATUS_LABELS[project.status]}</span>
            </div>
            <h1 className="font-heading text-3xl font-black text-slate-50">{project.name}</h1>
            <p className="text-slate-400 mt-2 leading-relaxed">{project.description}</p>
          </div>
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-2"> Project Progress </div>
            <div className="text-5xl font-heading font-black text-yellow-400 tabular-nums">{project.progress}٪</div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
          <Info icon={<Calendar size={14}/>} label="End Date" value={project.end_date ? new Date(project.end_date).toLocaleDateString("en-US") : "—"}/>
          <Info icon={<DollarSign size={14}/>} label="Budget" value={new Intl.NumberFormat("ar-EG").format(project.budget || 0)}/>
          <Info icon={<Flag size={14}/>} label="Priority" value={PRIORITY_LABELS[project.priority]}/>
          <Info icon={<FileText size={14}/>} label="Number of Tasks" value={tasks.length}/>
        </div>
      </div>

      <div className="flex gap-2 mb-5 border-b border-white/5">
        {["overview", "tasks", "updates"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            data-testid={`tab-${t}`}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-yellow-500 text-yellow-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
            {t === "overview" ? "Overview" : t === "tasks" ? `Tasks (${tasks.length})` : `Refresh (${updates.length})`}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="glass-card p-6">
          <h3 className="font-heading text-lg font-bold mb-4">Project Progress</h3>
          <div className="relative h-8 bg-white/5 rounded-lg overflow-hidden">
            <div className="absolute inset-y-0 right-0 rounded-lg bg-gradient-to-l from-yellow-400 via-yellow-500 to-yellow-700" style={{ width: `${project.progress}%` }}>
              <div className="h-full flex items-center justify-end px-3 text-xs font-bold text-black tabular-nums">{project.progress}٪</div>
            </div>
          </div>
        </div>
      )}

      {tab === "tasks" && (
        <div className="glass-card p-6">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No tasks available</div>
          ) : (
            <div className="space-y-2">
              {tasks.map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/5">
                  <div>
                    <div className="font-medium text-slate-100">{t.title}</div>
                    <div className="text-xs text-slate-500 mt-1 flex gap-3">
                      <span>{STATUS_LABELS[t.status]}</span>
                      <span>أولوية: {PRIORITY_LABELS[t.priority]}</span>
                      {t.due_date && <span>الDue: {new Date(t.due_date).toLocaleDateString("en-US")}</span>}
                    </div>
                  </div>
                  <div className="text-yellow-400 tabular-nums font-bold">{t.progress}٪</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "updates" && (
        <div className="grid lg:grid-cols-3 gap-5">
          <form onSubmit={submitUpdate} className="glass-card p-5 space-y-3">
            <h3 className="font-heading font-bold mb-2">Add Update</h3>
            <select value={newUpdate.update_type} onChange={e => setNewUpdate({...newUpdate, update_type: e.target.value})}
              className="w-full px-3 py-2 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm">
              <option value="progress">Progress</option>
              <option value="milestone">Milestone</option>
              <option value="issue">Issue</option>
              <option value="report">Report</option>
              <option value="note">Note</option>
            </select>
            <textarea required placeholder="Update content..." value={newUpdate.content} onChange={e => setNewUpdate({...newUpdate, content: e.target.value})}
              className="w-full px-3 py-2 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm min-h-[100px]"/>
            <input type="number" min={0} max={100} placeholder="New Progress Percentage (Optional)" value={newUpdate.progress} onChange={e => setNewUpdate({...newUpdate, progress: e.target.value})}
              className="w-full px-3 py-2 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"/>
            <button data-testid="submit-update" type="submit" className="w-full py-2.5 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400">Submit</button>
          </form>
          <div className="lg:col-span-2 space-y-2">
            {updates.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-500">No updates available</div>
            ) : updates.map(u => (
              <div key={u.id} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded">{u.update_type}</span>
                  <span className="text-xs text-slate-500">{new Date(u.created_at).toLocaleString("ar-EG")}</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{u.content}</p>
                <div className="text-xs text-slate-500 mt-2">— {u.user_name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ icon, label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-slate-500 flex items-center gap-1.5">{icon} {label}</div>
      <div className="mt-1 text-slate-100 font-medium tabular-nums">{value}</div>
    </div>
  );
}
