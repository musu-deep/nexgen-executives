import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Brain, Mic, Square, Send, Sparkles, Activity, ExternalLink, ShieldAlert, FileText, MessageSquare, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

const toneClass = {
  emerald: "border-emerald-500/20 text-emerald-300 bg-emerald-500/10",
  amber: "border-amber-500/20 text-amber-300 bg-amber-500/10",
  rose: "border-rose-500/20 text-rose-300 bg-rose-500/10",
};

export default function AgentLoungePage() {
  const [data, setData] = useState({ agents: [], activity: [] });
  const [command, setCommand] = useState("");
  const [result, setResult] = useState(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const load = () => api.get("/ai/agents").then((r) => setData(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const run = async (extra = {}) => {
    const text = (extra.text ?? command).trim();
    if (!text) return toast.error("Enter or dictate an executive command first");
    try {
      const res = await api.post("/ai/orchestrate", {
        source_type: extra.source_type || "free_text",
        command: text,
        text,
        create_task: extra.create_task || false,
        create_meeting: extra.create_meeting || false,
        notify: true,
      });
      setResult(res.data);
      toast.success("AI Orchestration completed");
      load();
    } catch (err) {
      console.error(err);
      toast.error("AI orchestration failed");
    }
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Browser speech recognition is not available. Use Chrome or type the command.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "ar-SA";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => { setListening(false); toast.error("Voice capture failed"); };
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setCommand(transcript);
      run({ text: transcript, source_type: "voice" });
    };
    recognitionRef.current = rec;
    rec.start();
  };

  const stopVoice = () => recognitionRef.current?.stop();

  return (
    <div data-testid="agent-lounge-page">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">Executive AI Lounge</div>
          <h1 className="font-heading text-4xl font-black mt-2 flex items-center gap-3"><Brain className="text-yellow-500"/> Agent Lounge</h1>
          <p className="text-slate-500 text-sm mt-1">The visible lobby for the local AI workforce operating across the platform.</p>
        </div>
        <Link to="/dashboard" className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-yellow-500/10 hover:text-yellow-300 text-sm">Back to Dashboard</Link>
      </div>

      <div className="glass-card p-5 mb-6 border-yellow-500/20">
        <div className="flex items-center gap-2 mb-3"><Bot className="text-yellow-500"/><div><div className="text-xs uppercase tracking-[0.25em] text-yellow-500/80">AI Orchestration Layer</div><div className="text-sm text-slate-400">Text and voice commands can generate tasks, suggest meetings, route documents, notify owners, and raise executive alerts.</div></div></div>
        <div className="flex flex-col md:flex-row gap-2">
          <input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="Type or dictate: analyze delayed tasks and create follow-up, route latest document, prepare CEO risk alert..." className="flex-1 px-4 py-3 rounded-xl bg-[#0a0d14]/80 border border-white/10 text-sm outline-none focus:border-yellow-500/40" dir="auto" />
          <button onClick={() => run()} className="px-5 py-3 rounded-xl bg-yellow-500 text-black font-bold flex items-center justify-center gap-2"><Send size={15}/> Orchestrate</button>
          <button onClick={listening ? stopVoice : startVoice} className={`px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${listening ? "bg-rose-500 text-white" : "bg-white/5 text-slate-200 hover:bg-white/10"}`}>{listening ? <Square size={15}/> : <Mic size={15}/>} {listening ? "Stop" : "Voice"}</button>
        </div>
        {result && <div className="mt-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 p-4"><div className="text-xs uppercase tracking-[0.25em] text-yellow-400 mb-2 flex items-center gap-2"><Sparkles size={14}/> AI Orchestration Output</div><ResultView result={result}/></div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {(data.agents || []).map((a) => (
          <div key={a.id} className="glass-card p-5 hover:border-yellow-500/30 transition-all">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-300 flex items-center justify-center"><AgentIcon id={a.id}/></div>
              <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${toneClass[a.tone] || toneClass.emerald}`}>{a.status}</span>
            </div>
            <h3 className="font-heading text-lg font-black text-slate-100">{a.name}</h3>
            <p className="text-sm text-slate-400 mt-2 min-h-[60px]">{a.role}</p>
            <div className="mt-4 rounded-xl bg-black/20 border border-white/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Last Action</div>
              <div className="text-sm text-slate-300 mt-1">{a.last_action}</div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{a.recommendations} recommendations</span>
              <Link to={a.route || "/dashboard"} className="text-yellow-400 hover:text-yellow-300 flex items-center gap-1">Open Agent <ExternalLink size={12}/></Link>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4"><Activity className="text-yellow-500"/><h3 className="font-heading text-xl font-black">Agent Activity Feed</h3></div>
        <div className="space-y-2">
          {(data.activity || []).map((x, i) => (
            <div key={i} className="rounded-xl bg-white/[0.03] border border-white/5 p-3 flex gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></div>
              <div className="flex-1"><div className="text-sm text-slate-100">{x.agent}</div><div className="text-sm text-slate-400 mt-1">{x.action}</div><div className="text-[10px] text-slate-600 mt-1" dir="ltr">{x.time}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentIcon({ id }) {
  if (id?.includes("risk")) return <ShieldAlert size={22}/>;
  if (id?.includes("document")) return <FileText size={22}/>;
  if (id?.includes("communication")) return <MessageSquare size={22}/>;
  if (id?.includes("meeting")) return <CalendarClock size={22}/>;
  return <Bot size={22}/>;
}

function ResultView({ result }) {
  return <div className="text-sm text-slate-300 space-y-3">
    <p>{result.summary}</p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <Badge label="Risk" value={result.risk_level}/>
      <Badge label="Owner" value={result.recommended_owner}/>
      <Badge label="Generated By" value={result.generated_by}/>
    </div>
    {result.suggested_tasks?.length > 0 && <div><div className="text-xs text-yellow-400 uppercase tracking-widest mb-2">Suggested Tasks</div>{result.suggested_tasks.map((t, i) => <div key={i} className="rounded-lg bg-black/20 border border-white/5 p-3 mb-2"><div className="font-bold text-slate-100">{t.title}</div><div className="text-xs text-slate-500 mt-1">Priority: {t.priority}</div></div>)}</div>}
    {result.suggested_meetings?.length > 0 && <div><div className="text-xs text-yellow-400 uppercase tracking-widest mb-2">Suggested Meetings</div>{result.suggested_meetings.map((m, i) => <div key={i} className="rounded-lg bg-black/20 border border-white/5 p-3 mb-2"><div className="font-bold text-slate-100">{m.title}</div><div className="text-xs text-slate-500 mt-1">{m.reason}</div></div>)}</div>}
  </div>;
}

function Badge({ label, value }) {
  return <div className="rounded-lg bg-black/20 border border-white/5 p-3"><div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div><div className="text-sm text-slate-200 mt-1">{value || "—"}</div></div>;
}
