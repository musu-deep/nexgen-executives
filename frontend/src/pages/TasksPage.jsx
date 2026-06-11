import React, { useEffect, useState } from "react";
import api, { PRIORITY_LABELS, SECTOR_LABELS } from "../lib/api";
import { Plus, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const COLUMNS = [
  { key: "pending", label: "Pending", color: "bg-slate-500/10 border-slate-500/30 text-slate-300" },
  { key: "in_progress", label: "In Progress", color: "bg-sky-500/10 border-sky-500/30 text-sky-300" },
  { key: "awaiting_approval", label: "Awaiting Approval", color: "bg-amber-500/10 border-amber-500/30 text-amber-300" },
  { key: "delayed", label: "Overdue", color: "bg-rose-500/10 border-rose-500/30 text-rose-300" },
  { key: "completed", label: "Completed", color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" },
];

const PRIO_DOT = {
  critical: "bg-rose-500",
  high: "bg-amber-500",
  medium: "bg-yellow-500",
  low: "bg-slate-500",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    project_id: "",
    sector: "arak_development",
    priority: "medium",
    status: "pending",
    due_date: "",
    progress: 0,
  });

  const load = async () => {
    const [t, p] = await Promise.all([
      api.get("/tasks"),
      api.get("/projects"),
    ]);

    setTasks(t.data);
    setProjects(p.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (taskId, newStatus) => {
    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
      load();
      toast.success("Task status updated");
    } catch {
      toast.error("Unable to update task");
    }
  };

  const approveTask = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/approve`);
      load();
      toast.success("Task approved successfully");
    } catch {
      toast.error("You do not have permission to approve this task");
    }
  };

  const submit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        progress: Number(form.progress),
      };

      if (!payload.project_id) {
        delete payload.project_id;
      }

      await api.post("/tasks", payload);

      toast.success("Task created successfully");

      setShowForm(false);

      setForm({
        title: "",
        description: "",
        project_id: "",
        sector: "arak_development",
        priority: "medium",
        status: "pending",
        due_date: "",
        progress: 0,
      });

      load();
    } catch {
      toast.error("Unable to create task");
    }
  };

  return (
    <div data-testid="tasks-page">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">
            Task Management
          </div>

          <h1 className="font-heading text-4xl font-black mt-2">
            Executive Task Board
          </h1>

          <p className="text-slate-500 mt-1 text-sm">
            {tasks.length} Important Tasks • {COLUMNS.length} Status Columns
          </p>
        </div>

        <button
          data-testid="new-task-btn"
          onClick={() => setShowForm(true)}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold flex items-center gap-2"
        >
          <Plus size={18} />
          New Task
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-5 gap-3">
          {COLUMNS.map((c) => (
            <div key={c.key} className="h-80 shimmer rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);

            return (
              <div
                key={col.key}
                className="glass-card p-3"
                data-testid={`column-${col.key}`}
              >
                <div
                  className={`text-xs font-bold rounded px-3 py-2 mb-3 ${col.color} border flex items-center justify-between`}
                >
                  <span>{col.label}</span>
                  <span className="tabular-nums">{colTasks.length}</span>
                </div>

                <div className="space-y-2 min-h-[200px]">
                  {colTasks.map((t) => (
                    <div
                      key={t.id}
                      className="bg-[#0a0d14]/80 border border-white/5 rounded-lg p-3 hover:border-yellow-500/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div
                          className={`w-2 h-2 rounded-full ${PRIO_DOT[t.priority]} mt-1.5`}
                        />

                        <div className="text-xs text-slate-500">
                          {SECTOR_LABELS[t.sector]?.slice(0, 12)}
                        </div>
                      </div>

                      <div className="text-sm font-medium text-slate-100 line-clamp-2">
                        {t.title}
                      </div>

                      {t.due_date && (
                        <div className="text-[11px] text-slate-500 mt-1.5">
                          Due:{" "}
                          {new Date(t.due_date).toLocaleDateString("en-US")}
                        </div>
                      )}

                      <div className="mt-2.5 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-yellow-500"
                          style={{ width: `${t.progress}%` }}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {col.key === "awaiting_approval" && (
                          <button
                            onClick={() => approveTask(t.id)}
                            className="text-[10px] px-2 py-1 bg-emerald-500/15 text-emerald-300 rounded hover:bg-emerald-500/25 flex items-center gap-1"
                          >
                            <CheckCircle2 size={10} />
                            Approve
                          </button>
                        )}

                        {COLUMNS.filter((c) => c.key !== t.status)
                          .slice(0, 2)
                          .map((c) => (
                            <button
                              key={c.key}
                              onClick={() => updateStatus(t.id, c.key)}
                              className="text-[10px] px-2 py-1 bg-white/5 text-slate-400 rounded hover:bg-yellow-500/10 hover:text-yellow-300"
                            >
                              → {c.label}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="text-xs text-slate-600 text-center py-6">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="glass-card p-6 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-xl font-bold">
                New Executive Task
              </h2>

              <button
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <input
                required
                placeholder="Task title"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"
              />

              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm min-h-[70px]"
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.project_id}
                  onChange={(e) => {
                    const p = projects.find(
                      (pp) => pp.id === e.target.value
                    );

                    setForm({
                      ...form,
                      project_id: e.target.value,
                      sector: p ? p.sector : form.sector,
                    });
                  }}
                  className="px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"
                >
                  <option value="">No project</option>

                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <select
                  value={form.sector}
                  onChange={(e) =>
                    setForm({ ...form, sector: e.target.value })
                  }
                  className="px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"
                >
                  {Object.entries(SECTOR_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>

                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                  className="px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"
                >
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      Priority: {v}
                    </option>
                  ))}
                </select>

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                  className="px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"
                >
                  {COLUMNS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm({ ...form, due_date: e.target.value })
                  }
                  className="col-span-2 px-4 py-2.5 rounded-lg bg-[#0a0d14]/80 border border-white/10 text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400"
              >
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}