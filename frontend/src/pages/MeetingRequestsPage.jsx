import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Plus, X, Check, Calendar as CalIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import DetailModal from "../components/DetailModal";
import AICommandBar from "../components/AICommandBar";

const STATUS_COLOR = {
  pending: "bg-amber-500/15 text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-rose-500/15 text-rose-300",
  rescheduled: "bg-sky-500/15 text-sky-300",
};
const STATUS_LABEL = { pending: "Pending Review", approved: "Approved", rejected: "Rejected", rescheduled: "Rescheduled" };

export default function MeetingRequestsPage() {
  const { user } = useAuth();
  const isExec = ["ceo", "admin", "tracker"].includes(user?.role);
  const [reqs, setReqs] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", proposed_date: "", duration_minutes: 30, urgency: "medium" });
  const [selected, setSelected] = useState(null);
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);

  const load = () => api.get("/meeting-requests").then(r => setReqs(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/meeting-requests", { ...form, proposed_date: new Date(form.proposed_date).toISOString() });
      toast.success("Meeting request submitted"); setShow(false); load();
    } catch { toast.error("Unable to submit"); }
  };

  const generateBrief = async (item) => {
    setBriefLoading(true);
    try {
      const res = await api.post("/ai/executive-brief", { source_type: "meeting_request", item });
      setBrief(res.data);
    } finally { setBriefLoading(false); }
  };

  const openDetail = (item) => { setSelected(item); setBrief(null); };

  const decide = async (rid, decision, newDate) => {
    const note = decision === "rejected" ? prompt("Rejection reason (optional):") || "" : "";
    try {
      const payload = { decision, note };
      if (decision === "rescheduled") {
        const nd = newDate || prompt("Date والوقت الجminيmin (YYYY-MM-DD HH:MM):");
        if (!nd) return;
        payload.new_date = new Date(nd).toISOString();
      }
      await api.post(`/meeting-requests/${rid}/decision`, payload);
      toast.success("Decision submitted"); load();
    } catch { toast.error("Unable to complete action"); }
  };

  return (
    <div data-testid="meeting-requests-page">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">Meeting Requests</div>
          <h1 className="font-heading text-4xl font-black mt-2">Schedule a Meeting with the CEO</h1>
          <p className="text-slate-500 text-sm mt-1">{reqs.length} request</p>
        </div>
        {!isExec && <button onClick={() => setShow(true)} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold flex items-center gap-2"><Plus size={18}/> request لقاء جminيmin</button>}
      </div>

      <AICommandBar />

      <div className="space-y-3">
        {reqs.length === 0 ? <div className="glass-card p-10 text-center text-slate-500">لا توجmin requestات</div> :
        reqs.map(r => (
          <div key={r.id} onClick={() => openDetail(r)} className="glass-card p-5 cursor-pointer hover:border-yellow-500/25 hover:bg-white/[0.03] transition-colors">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-[10px] px-2 py-1 rounded ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  {r.urgency === "high" && <span className="text-[10px] px-2 py-1 rounded bg-rose-500/15 text-rose-300 flex items-center gap-1"><AlertCircle size={10}/> Urgent</span>}
                </div>
                <h3 className="font-heading font-bold text-slate-100">{r.subject}</h3>
                <p className="text-sm text-slate-400 mt-1">{r.description}</p>
                <div className="mt-3 text-xs text-slate-500 flex flex-wrap gap-4">
                  <span>From: {r.requester_name}</span>
                  <span>Date الProposed: {new Date(r.proposed_date).toLocaleString("ar-EG")}</span>
                  <span>Duration: {r.duration_minutes} min</span>
                </div>
                {r.decision_note && <div className="mt-2 text-xs text-slate-400 bg-white/[0.02] rounded p-2">Note: {r.decision_note}</div>}
              </div>
              {isExec && r.status === "pending" && (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={(e) => { e.stopPropagation(); decide(r.id, "approved"); }} className="px-3 py-2 rounded bg-emerald-500/15 text-emerald-300 text-xs hover:bg-emerald-500/25 flex items-center gap-1"><Check size={12}/> Approve</button>
                  <button onClick={(e) => { e.stopPropagation(); decide(r.id, "rescheduled"); }} className="px-3 py-2 rounded bg-sky-500/15 text-sky-300 text-xs hover:bg-sky-500/25 flex items-center gap-1"><CalIcon size={12}/> Reschedule</button>
                  <button onClick={(e) => { e.stopPropagation(); decide(r.id, "rejected"); }} className="px-3 py-2 rounded bg-rose-500/15 text-rose-300 text-xs hover:bg-rose-500/25"><X size={12}/> Decline</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShow(false)}>
          <div className="glass-card p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="font-heading text-xl font-bold mb-5">Request a CEO Meeting</h2>
            <form onSubmit={submit} className="space-y-3">
              <input required placeholder="Meeting subject" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"/>
              <textarea placeholder="Description and importance" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm min-h-[80px]"/>
              <input required type="datetime-local" value={form.proposed_date} onChange={e => setForm({...form, proposed_date: e.target.value})} className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"/>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Duration (min)" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: Number(e.target.value)})} className="px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"/>
                <select value={form.urgency} onChange={e => setForm({...form, urgency: e.target.value})} className="px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm">
                  <option value="low">Normal</option><option value="medium">Important</option><option value="high">Urgent</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3 rounded-lg bg-yellow-500 text-black font-bold">Submit Request</button>
            </form>
          </div>
        </div>
      )}
      {selected && <DetailModal item={selected} title={selected.subject} type="meeting_request" onClose={() => setSelected(null)} onGenerateBrief={generateBrief} brief={brief} loadingBrief={briefLoading} actions={isExec && selected.status === "pending" ? (<div className="flex gap-2"><button onClick={() => decide(selected.id, "approved")} className="px-3 py-2 rounded bg-emerald-500/15 text-emerald-300 text-xs">Approve</button><button onClick={() => decide(selected.id, "rescheduled")} className="px-3 py-2 rounded bg-sky-500/15 text-sky-300 text-xs">Reschedule</button><button onClick={() => decide(selected.id, "rejected")} className="px-3 py-2 rounded bg-rose-500/15 text-rose-300 text-xs">Reject</button></div>) : null} />}
    </div>
  );
}
