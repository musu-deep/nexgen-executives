import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Plus, X, FileText, ExternalLink, Trash2, Brain, Sparkles, Link2, CalendarClock, ListChecks, ShieldAlert, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const CAT_LABEL = { meeting_notes: "Meeting Notes", correspondence: "Correspondence", report: "Reports", memo: "Memos", presentation: "Presentations", other: "Other" };
const CAT_COLOR = { meeting_notes: "bg-sky-500/15 text-sky-300", correspondence: "bg-emerald-500/15 text-emerald-300", report: "bg-amber-500/15 text-amber-300", memo: "bg-violet-500/15 text-violet-300", presentation: "bg-rose-500/15 text-rose-300", other: "bg-slate-500/15 text-slate-300" };

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "report", url: "", file_type: "PDF", is_public: true });

  const load = () => api.get("/documents").then(r => setDocs(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/documents", form);
      toast.success("Document uploaded and analyzed by Document Intelligence Agent");
      setShow(false);
      setForm({ title: "", description: "", category: "report", url: "", file_type: "PDF", is_public: true });
      load();
    } catch { toast.error("Unable to upload"); }
  };

  const del = async (id) => { if (!confirm("Delete document?")) return; await api.delete(`/documents/${id}`); load(); toast.success("Deleted"); };

  const openIntelligence = async (d) => {
    setSelected(d);
    setIntelligence(d.intelligence ? { analysis: d.intelligence, created_task_id: d.intelligence?.created_task_id } : null);
    setLoadingIntel(true);
    try {
      const res = await api.get(`/documents/${d.id}/intelligence`);
      setIntelligence(res.data);
    } catch (err) {
      toast.error("Unable to load document intelligence");
    } finally { setLoadingIntel(false); }
  };

  const rerun = async () => {
    if (!selected) return;
    setLoadingIntel(true);
    try {
      const res = await api.post(`/documents/${selected.id}/intelligence`);
      setIntelligence(res.data);
      toast.success("Document Intelligence refreshed and routed");
      load();
    } catch { toast.error("Unable to refresh intelligence"); }
    finally { setLoadingIntel(false); }
  };

  const filtered = filter === "all" ? docs : docs.filter(d => d.category === filter);

  return (
    <div data-testid="documents-page">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">Document Intelligence Station</div>
          <h1 className="font-heading text-4xl font-black mt-2 flex items-center gap-3"><Brain className="text-yellow-500"/> Institutional Memory Station</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} document · auto-classified, routed, linked, and converted into institutional actions</p>
        </div>
        <button onClick={() => setShow(true)} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold flex items-center gap-2"><Plus size={18}/> Upload & Analyze</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <IntelMetric icon={<FileText size={15}/>} label="Documents" value={docs.length}/>
        <IntelMetric icon={<Sparkles size={15}/>} label="Processed" value={docs.filter(d => d.intelligence_status === "processed" || d.intelligence).length}/>
        <IntelMetric icon={<ShieldAlert size={15}/>} label="High/Medium Risk" value={docs.filter(d => ["high", "medium"].includes(d.intelligence?.risk_level)).length}/>
        <IntelMetric icon={<ListChecks size={15}/>} label="AI Tasks" value={docs.filter(d => d.intelligence?.created_task_id).length}/>
      </div>

      <div className="glass-card p-4 mb-5 border-yellow-500/20">
        <div className="text-xs uppercase tracking-[0.25em] text-yellow-500/80 mb-2">How the station works</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs text-slate-400">
          <Step icon={<FileText size={13}/>} text="Read" />
          <Step icon={<Brain size={13}/>} text="Analyze" />
          <Step icon={<Link2 size={13}/>} text="Route & Link" />
          <Step icon={<ListChecks size={13}/>} text="Create Tasks" />
          <Step icon={<CalendarClock size={13}/>} text="Suggest Meetings" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter==="all"?"bg-yellow-500/15 text-yellow-300 border border-yellow-500/30":"bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5"}`}>All</button>
        {Object.entries(CAT_LABEL).map(([k, v]) => <button key={k} onClick={() => setFilter(k)} className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter===k?"bg-yellow-500/15 text-yellow-300 border border-yellow-500/30":"bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5"}`}>{v}</button>)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? <div className="glass-card p-10 text-center text-slate-500 col-span-3">No documents found</div> :
        filtered.map(d => (
          <div key={d.id} className="glass-card p-5 hover:border-yellow-500/30 group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400"><FileText size={20}/></div>
              <span className={`text-[10px] px-2 py-1 rounded ${CAT_COLOR[d.category]}`}>{CAT_LABEL[d.category]}</span>
            </div>
            <h3 className="font-heading font-bold text-slate-100 line-clamp-1">{d.title}</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{d.description}</p>
            <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-yellow-400/80"><Sparkles size={12}/>{d.intelligence_status === "processed" || d.intelligence ? "AI Processed" : "Queued for AI"}</div>
            {d.intelligence?.risk_level && <div className="mt-2 text-xs text-slate-500">Risk Level: <span className="text-yellow-300">{d.intelligence.risk_level}</span></div>}
            <div className="mt-3 text-xs text-slate-500">Uploaded by: {d.uploaded_by_name}</div>
            <div className="text-[11px] text-slate-600">{new Date(d.created_at).toLocaleDateString("en-US")}</div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => openIntelligence(d)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded bg-yellow-500/15 text-yellow-300 text-xs hover:bg-yellow-500/25"><Brain size={12}/> Intelligence</button>
              <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded bg-white/5 text-slate-300 text-xs hover:bg-white/10"><ExternalLink size={12}/></a>
              <button onClick={() => del(d.id)} className="px-3 py-2 rounded bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"><Trash2 size={12}/></button>
            </div>
          </div>
        ))}
      </div>

      {selected && <IntelligenceModal doc={selected} item={intelligence} loading={loadingIntel} onClose={() => setSelected(null)} onRerun={rerun}/>} 

      {show && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShow(false)}>
          <div className="glass-card p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="font-heading text-xl font-bold">Upload to Document Intelligence Station</h2><button onClick={() => setShow(false)}><X size={18}/></button></div>
            <form onSubmit={submit} className="space-y-3">
              <input required placeholder="Document title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"/>
              <textarea placeholder="Paste summary, obligations, parties, dates, or risk notes here" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm min-h-[90px]"/>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm">
                {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input required placeholder="Document URL (Google Drive, OneDrive, local link, ... )" value={form.url} onChange={e => setForm({...form, url: e.target.value})} className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm" dir="ltr"/>
              <button type="submit" className="w-full py-3 rounded-lg bg-yellow-500 text-black font-bold">Save, Analyze & Route</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function IntelMetric({ icon, label, value }) { return <div className="glass-card p-4"><div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase tracking-widest">{icon}{label}</div><div className="text-2xl font-heading font-black text-slate-100 mt-1 tabular-nums">{value}</div></div>; }
function Step({ icon, text }) { return <div className="rounded-xl bg-black/20 border border-white/5 p-3 flex items-center gap-2">{icon}<span>{text}</span></div>; }

function IntelligenceModal({ doc, item, loading, onClose, onRerun }) {
  const a = item?.analysis || doc?.intelligence || {};
  return <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
    <div className="glass-card p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-4 mb-5"><div><div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">Document Intelligence Output</div><h2 className="font-heading text-2xl font-black mt-2">{doc.title}</h2></div><button onClick={onClose}><X size={18}/></button></div>
      {loading ? <div className="text-slate-500 py-8 text-center">Analyzing...</div> : <>
        <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 p-4 mb-4"><div className="text-xs uppercase tracking-[0.25em] text-yellow-400 mb-2">Summary</div><p className="text-sm text-slate-300">{a.summary || "No summary available."}</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Panel title="Parties" items={a.parties}/>
          <Panel title="Dates" items={a.dates}/>
          <Panel title="Obligations" items={a.obligations}/>
          <Panel title="Important Clauses" items={a.important_clauses}/>
        </div>
        <div className="rounded-xl bg-black/20 border border-white/5 p-4 mb-4"><div className="text-xs uppercase tracking-[0.25em] text-rose-300 mb-2">Risks</div>{a.risks?.length ? a.risks.map((r, i) => <div key={i} className="text-sm text-slate-300 mb-2"><span className="text-rose-300 uppercase text-xs mr-2">{r.level}</span>{r.risk}</div>) : <div className="text-sm text-slate-500">No major risk detected.</div>}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-black/20 border border-white/5 p-4"><div className="text-xs uppercase tracking-[0.25em] text-yellow-400 mb-2">Suggested Task</div><div className="font-bold text-slate-100">{a.suggested_task?.title}</div><div className="text-xs text-slate-500 mt-1">Priority: {a.suggested_task?.priority}</div><div className="text-xs text-emerald-300 mt-2">Created Task ID: {item?.created_task_id || a.created_task_id || "—"}</div></div>
          <div className="rounded-xl bg-black/20 border border-white/5 p-4"><div className="text-xs uppercase tracking-[0.25em] text-yellow-400 mb-2">Suggested Meeting</div><div className="font-bold text-slate-100">{a.suggested_meeting?.title}</div><div className="text-xs text-slate-500 mt-1">{a.suggested_meeting?.reason}</div></div>
        </div>
        <button onClick={onRerun} className="mt-5 px-4 py-2 rounded-lg bg-white/5 hover:bg-yellow-500/10 text-slate-300 hover:text-yellow-300 text-sm flex items-center gap-2"><RefreshCw size={14}/> Re-run Intelligence</button>
      </>}
    </div>
  </div>;
}

function Panel({ title, items = [] }) { return <div className="rounded-xl bg-black/20 border border-white/5 p-4"><div className="text-xs uppercase tracking-[0.25em] text-yellow-400 mb-2">{title}</div>{items?.length ? <ul className="space-y-2 text-sm text-slate-300">{items.map((x, i) => <li key={i} className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2"></span><span>{x}</span></li>)}</ul> : <div className="text-sm text-slate-500">No items extracted.</div>}</div>; }
