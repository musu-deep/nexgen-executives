import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import {
  Send,
  Plus,
  X,
  Sparkles,
  MessageSquare,
  Users,
  AlertCircle,
  CheckCircle2,
  Forward,
  ListChecks,
  Route,
  Bot,
} from "lucide-react";
import { toast } from "sonner";

export default function MessagesPage() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState([]);
  const [users, setUsers] = useState([]);
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(null);
  const [aiResult, setAiResult] = useState(null);

  const [form, setForm] = useState({
    recipient_id: "",
    subject: "",
    body: "",
    priority: "normal",
    category: "internal_coordination",
  });

  const load = () =>
    Promise.all([api.get("/messages"), api.get("/users")]).then(([m, u]) => {
      setMsgs(m.data);
      setUsers(u.data.filter((x) => x.id !== user.id));
    });

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  const submit = async (e) => {
    e.preventDefault();

    try {
      await api.post("/messages", form);
      toast.success("Communication sent successfully");
      setShow(false);
      setForm({
        recipient_id: "",
        subject: "",
        body: "",
        priority: "normal",
        category: "internal_coordination",
      });
      load();
    } catch {
      toast.error("Unable to complete action");
    }
  };

const openMessage = async (m) => {
  setSelected(m);
  setAiResult(null);

  if (m.recipient_id === user?.id && !m.read) {
    await api.patch(`/messages/${m.id}/read`);
    load();
  }
};

const aiAction = async (action) => {
  if (!selected) return;

  try {
    const endpoints = {
      summary: `/messages/${selected.id}/ai-summary`,
      actions: `/messages/${selected.id}/extract-actions`,
      routing: `/messages/${selected.id}/route`,
      followup: `/messages/${selected.id}/create-followup`,
    };

    const endpoint = endpoints[action];

    if (!endpoint) {
      toast.error(`Unknown AI action: ${action}`);
      return;
    }

    const res = await api.post(endpoint);

    setAiResult({
      title:
        action === "summary"
          ? "AI Summary"
          : action === "actions"
          ? "Extracted Action Items"
          : action === "routing"
          ? "AI Routing Recommendation"
          : "Follow-up Created",
      content: JSON.stringify(res.data, null, 2),
    });

    toast.success("AI result generated");
    load();
  } catch (err) {
    console.error(err);
    toast.error("AI action failed");
  }
};

  const unreadCount = msgs.filter(
    (m) => m.recipient_id === user?.id && !m.read
  ).length;

  return (
    <div data-testid="messages-page">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">
            AI Communication Hub
          </div>

          <h1 className="font-heading text-4xl font-black mt-2 flex items-center gap-3">
            <MessageSquare className="text-yellow-500" />
            Intelligent Communication Center
          </h1>

          <p className="text-slate-500 text-sm mt-1">
            {msgs.length} communications · {unreadCount} unread · AI-led
            institutional orchestration
          </p>
        </div>

        <button
          onClick={() => setShow(true)}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold flex items-center gap-2"
        >
          <Plus size={18} />
          New Communication
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-yellow-400 text-xs uppercase tracking-widest">
            <Bot size={14} />
            AI Orchestrator
          </div>
          <div className="text-sm text-slate-300 mt-2">
            Guides, routes, summarizes, escalates, and aligns all internal
            institutional interactions.
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-sky-400 text-xs uppercase tracking-widest">
            <Users size={14} />
            Interaction Map
          </div>
          <div className="text-2xl font-black mt-2">{users.length}</div>
          <div className="text-xs text-slate-500">Active internal users</div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-amber-400 text-xs uppercase tracking-widest">
            <AlertCircle size={14} />
            Pending
          </div>
          <div className="text-2xl font-black mt-2">{unreadCount}</div>
          <div className="text-xs text-slate-500">Unread communications</div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs uppercase tracking-widest">
            <CheckCircle2 size={14} />
            Status
          </div>
          <div className="text-sm text-slate-300 mt-2">
            Communication flow is monitored and ready for AI routing.
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {msgs.length === 0 ? (
          <div className="glass-card p-10 text-center text-slate-500">
            No communications available
          </div>
        ) : (
          msgs.map((m) => {
            const incoming = m.recipient_id === user.id;

            return (
              <button
                key={m.id}
                onClick={() => openMessage(m)}
                className={`glass-card p-4 w-full text-left hover:border-yellow-500/40 transition-all ${
                  incoming && !m.read ? "border-yellow-500/30" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2 gap-3">
                  <span className="text-xs text-slate-400">
                    {incoming
                      ? `From: ${m.sender_name}`
                      : `To: ${
                          users.find((u) => u.id === m.recipient_id)?.name ||
                          "—"
                        }`}
                  </span>

                  <span className="text-xs text-slate-500">
                    {new Date(m.created_at).toLocaleString("en-US")}
                  </span>
                </div>

                {m.subject && (
                  <div className="font-bold text-slate-100">{m.subject}</div>
                )}

                <div className="text-sm text-slate-300 mt-1 line-clamp-2">
                  {m.body}
                </div>

                <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-yellow-400/70">
                  <Sparkles size={12} />
                  AI-ready for routing, summarization, escalation, and
                  follow-up extraction
                </div>
              </button>
            );
          })
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="glass-card p-6 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">
                  Communication Details
                </div>
                <h2 className="font-heading text-2xl font-black mt-2">
                  {selected.subject || "Untitled Communication"}
                </h2>
              </div>

              <button onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-slate-500 mb-4">
              {new Date(selected.created_at).toLocaleString("en-US")}
            </div>

            <div className="rounded-xl bg-black/20 border border-white/10 p-4 text-sm text-slate-300 whitespace-pre-wrap">
              {selected.body}
            </div>

          {aiResult && (
            <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
            <div className="text-xs uppercase tracking-[0.25em] text-yellow-400 mb-2">
            {aiResult.title}
            </div>

<div className="text-sm text-slate-300 space-y-2">
  {(() => {
    try {
      const data = JSON.parse(aiResult.content);

      if (data.ai_summary) {
        return <p>{data.ai_summary}</p>;
      }

      if (data.action_items) {
        return (
          <ul className="space-y-2">
            {data.action_items.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        );
      }

      if (data.ai_route) {
        return (
          <div>
            <div className="font-bold text-yellow-300">{data.ai_route}</div>
            <div className="text-xs text-slate-500 mt-1">
              Escalation Level: {data.escalation_level}
            </div>
          </div>
        );
      }

      if (data.task) {
        return (
          <div>
            <div className="font-bold text-yellow-300">
              {data.message}
            </div>
            <div className="text-xs text-slate-400 mt-2">
              Task: {data.task.title}
            </div>
          </div>
        );
        }

          return <pre>{aiResult.content}</pre>;
          } catch {
            return <pre>{aiResult.content}</pre>;
          }
          })()}
          </div>
            </div>
            )}

          <div className="mt-4 text-[10px] uppercase tracking-[0.25em] text-slate-500">
          AI Communication Engine · Routing · Summarization · Follow-up · Institutional Memory
          </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-5">
              <button
                onClick={() => aiAction("summary")}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-yellow-500/10 text-xs flex items-center justify-center gap-2"
              >
                <Sparkles size={13} />
                Summarize
              </button>

              <button
                onClick={() => aiAction("actions")}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-yellow-500/10 text-xs flex items-center justify-center gap-2"
              >
                <ListChecks size={13} />
                Actions
              </button>

              <button
                onClick={() => aiAction("routing")}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-yellow-500/10 text-xs flex items-center justify-center gap-2"
              >
                <Route size={13} />
                Route
              </button>

              <button
                onClick={() => toast.info("Forwarding will be enabled in the next build")}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-yellow-500/10 text-xs flex items-center justify-center gap-2"
            >
                <Forward size={13} />
                Forward
              </button>

              <button
                onClick={() => aiAction("followup")}
                className="px-3 py-2 rounded-lg bg-yellow-500 text-black font-bold text-xs flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={13} />
                Follow-up
              </button>
            </div>
          </div>
        </div>
      )}

      {show && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShow(false)}
        >
          <div
            className="glass-card p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-xl font-bold">
                New Intelligent Communication
              </h2>
              <button onClick={() => setShow(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <select
                required
                value={form.recipient_id}
                onChange={(e) =>
                  setForm({ ...form, recipient_id: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"
              >
                <option value="">— Select recipient —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>

              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"
              >
                <option value="internal_coordination">
                  Internal Coordination
                </option>
                <option value="executive_decision">Executive Decision</option>
                <option value="follow_up">Follow-up</option>
                <option value="risk_alert">Risk Alert</option>
                <option value="opportunity">Opportunity</option>
              </select>

              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"
              >
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical</option>
              </select>

              <input
                placeholder="Subject"
                value={form.subject}
                onChange={(e) =>
                  setForm({ ...form, subject: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"
              />

              <textarea
                required
                placeholder="Communication body"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm min-h-[120px]"
              />

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-yellow-500 text-black font-bold flex items-center justify-center gap-2"
              >
                <Send size={14} />
                Send Communication
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}