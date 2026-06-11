import React, { useEffect, useRef, useState } from "react";
import api from "../lib/api";
import { Mic, Square, Send, CheckCircle2, Wand2, Brain, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function VoiceInputPage() {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [directive, setDirective] = useState(null);
  const [orchestration, setOrchestration] = useState(null);
  const [selected, setSelected] = useState({});
  const [users, setUsers] = useState([]);
  const [text, setText] = useState("");
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);

  useEffect(() => { api.get("/users").then(r => setUsers(r.data)); }, []);

  const runOrchestration = async (transcript) => {
    if (!transcript?.trim()) return;
    setProcessing(true);
    try {
      const res = await api.post("/ai/orchestrate", {
        source_type: "voice",
        command: transcript,
        text: transcript,
        create_task: false,
        create_meeting: false,
        notify: true,
      });
      setOrchestration(res.data);
      toast.success("Voice command orchestrated by AI Layer");
    } catch (err) {
      console.error(err);
      toast.error("Voice orchestration failed");
    } finally { setProcessing(false); }
  };

  const startBrowserSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Live speech recognition is not available in this browser. Use Chrome, or use audio capture mode below.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "ar-SA";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onstart = () => setRecording(true);
    rec.onend = () => setRecording(false);
    rec.onerror = () => { setRecording(false); toast.error("Voice recognition failed"); };
    rec.onresult = (event) => {
      const transcript = Array.from(event.results).map((r) => r[0].transcript).join(" ");
      setText(transcript);
      runOrchestration(transcript);
    };
    recognitionRef.current = rec;
    rec.start();
  };

  const stopBrowserSpeech = () => recognitionRef.current?.stop();

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          setProcessing(true);
          try {
            const res = await api.post("/voice/transcribe", { audio_base64: reader.result, mime: "audio/webm" });
            setDirective(res.data);
            setText(res.data.transcript || "");
            const sel = {};
            (res.data.suggested_tasks || []).forEach((_, i) => sel[i] = true);
            setSelected(sel);
            toast.success("Audio directive captured and converted into task suggestions");
          } catch (e) { toast.error("Unable to complete action analysis: " + (e?.response?.data?.detail || "")); }
          finally { setProcessing(false); }
        };
        reader.readAsDataURL(blob);
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
    } catch { toast.error("Unable to access microphone"); }
  };

  const stop = () => { mediaRef.current?.stop(); setRecording(false); };

  const apply = async () => {
    const tasks = (directive.suggested_tasks || []).filter((_, i) => selected[i]);
    if (tasks.length === 0) return toast.error("Please select at least one task");
    try { const r = await api.post("/voice/apply", { directive_id: directive.id, selected_tasks: tasks }); toast.success(`Successfully created ${r.data.created} tasks`); setDirective(null); }
    catch { toast.error("Unable to complete action application"); }
  };

  return (
    <div data-testid="voice-page" className="max-w-5xl mx-auto">
      <div className="mb-7">
        <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">Voice-ready AI Orchestration</div>
        <h1 className="font-heading text-4xl font-black mt-2 flex items-center gap-3"><Wand2 className="text-yellow-500"/> AI Voice Agent</h1>
        <p className="text-slate-500 text-sm mt-1">Speak or record directives and let the AI Orchestration Layer convert them into tasks, meetings, notifications, and executive alerts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="glass-card p-8 text-center border-yellow-500/20">
          <div className="text-xs uppercase tracking-[0.25em] text-yellow-500/80 mb-4">Live Speech Command</div>
          <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all ${recording ? "bg-rose-500/20 border-2 border-rose-500 animate-pulse" : "bg-yellow-500/10 border-2 border-yellow-500/30 hover:bg-yellow-500/15"}`}>
            <button onClick={recording ? stopBrowserSpeech : startBrowserSpeech} disabled={processing} className="w-full h-full flex items-center justify-center">
              {recording ? <Square size={48} className="text-rose-400"/> : <Mic size={48} className="text-yellow-400"/>}
            </button>
          </div>
          <div className="mt-5 text-lg font-heading font-bold">{processing ? "Processing..." : recording ? "Listening... Click to stop" : "Click to dictate command"}</div>
          <div className="text-xs text-slate-500 mt-2">Uses browser speech recognition when available, then routes transcript to AI Orchestration Layer.</div>
        </div>

        <div className="glass-card p-8 text-center">
          <div className="text-xs uppercase tracking-[0.25em] text-yellow-500/80 mb-4">Audio Capture Fallback</div>
          <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all ${recording ? "bg-rose-500/20 border-2 border-rose-500 animate-pulse" : "bg-white/5 border-2 border-white/10 hover:bg-white/10"}`}>
            <button onClick={recording ? stop : start} disabled={processing} className="w-full h-full flex items-center justify-center">
              {recording ? <Square size={48} className="text-rose-400"/> : <Mic size={48} className="text-slate-300"/>}
            </button>
          </div>
          <div className="mt-5 text-lg font-heading font-bold">{recording ? "Recording audio..." : "Record audio directive"}</div>
          <div className="text-xs text-slate-500 mt-2">Backend is Google Cloud Speech-to-Text + Gemini ready and keeps safe fallback analysis for demos.</div>
        </div>
      </div>

      <div className="glass-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-3"><Brain className="text-yellow-500"/><div><div className="text-xs uppercase tracking-[0.25em] text-yellow-500/80">Text fallback / transcript refinement</div><div className="text-sm text-slate-500">You can edit the captured transcript before routing it.</div></div></div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste or edit the voice command transcript here..." className="w-full px-4 py-3 rounded-xl bg-[#0a0d14]/80 border border-white/10 text-sm min-h-[100px]" dir="auto" />
        <button onClick={() => runOrchestration(text)} className="mt-3 px-5 py-3 rounded-xl bg-yellow-500 text-black font-bold flex items-center justify-center gap-2"><Send size={15}/> Send to AI Orchestration Layer</button>
      </div>

      {orchestration && <div className="glass-card p-6 mb-6 border-yellow-500/20"><div className="flex items-center gap-2 text-yellow-400 text-xs uppercase tracking-[0.25em] mb-3"><Sparkles size={14}/> Orchestration Result</div><div className="text-sm text-slate-300 mb-3">{orchestration.summary}</div><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Box label="Risk" value={orchestration.risk_level}/><Box label="Owner" value={orchestration.recommended_owner}/><Box label="Generated By" value={orchestration.generated_by}/></div>{orchestration.suggested_tasks?.map((t, i) => <div key={i} className="mt-3 rounded-xl bg-black/20 border border-white/5 p-3"><div className="font-bold text-slate-100">{t.title}</div><div className="text-xs text-slate-500 mt-1">Priority: {t.priority}</div></div>)}</div>}

      {directive && (
        <div className="mt-6 glass-card p-6" data-testid="directive-result">
          <h3 className="font-heading text-xl font-bold mb-3">Audio Capture Analysis Result</h3>
          <div className="bg-white/[0.02] rounded-lg p-4 mb-4"><div className="text-xs text-slate-500 mb-1">Transcript:</div><p className="text-sm text-slate-200 leading-relaxed">{directive.transcript}</p></div>
          {directive.summary && <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4 mb-4"><div className="text-xs text-yellow-500 mb-1">Summary:</div><p className="text-sm text-slate-200">{directive.summary}</p></div>}
          {directive.suggested_tasks?.length > 0 ? <><h4 className="font-heading font-bold mb-3">Suggested Tasks ({directive.suggested_tasks.length}):</h4><div className="space-y-2 mb-4">{directive.suggested_tasks.map((t, i) => { const u = users.find(u => u.id === t.assignee_id); return <label key={i} className="flex items-start gap-3 p-4 rounded-lg bg-white/[0.02] border border-white/5 hover:border-yellow-500/30 cursor-pointer"><input type="checkbox" checked={!!selected[i]} onChange={e => setSelected({...selected, [i]: e.target.checked})} className="mt-1"/><div className="flex-1"><div className="font-medium text-slate-100">{t.title}</div><div className="text-xs text-slate-400 mt-1">{t.description}</div><div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-3"><span>Assignee: {u?.name || "Not specified"}</span><span>Priority: {t.priority}</span><span>Sector: {t.sector}</span></div></div></label>; })}</div><button onClick={apply} className="w-full py-3 rounded-lg bg-yellow-500 text-black font-bold flex items-center justify-center gap-2"><CheckCircle2 size={16}/> Apply Selected Tasks</button></> : <div className="text-center text-slate-500 py-4">No tasks were extracted from this recording.</div>}
        </div>
      )}
    </div>
  );
}

function Box({ label, value }) { return <div className="rounded-xl bg-black/20 border border-white/5 p-3"><div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div><div className="text-sm text-slate-200 mt-1">{value || "—"}</div></div>; }
