import React from "react";
import { X, Sparkles, AlertTriangle, TrendingUp } from "lucide-react";

function renderValue(value) {
  if (value == null || value === "") return "—";

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return (
            item.name ||
            item.title ||
            item.subject ||
            item.requester_name ||
            JSON.stringify(item, null, 2)
          );
        }
        return String(item);
      })
      .join("\n");
  }

  if (typeof value === "object") {
    return (
      value.name ||
      value.title ||
      value.subject ||
      value.requester_name ||
      JSON.stringify(value, null, 2)
    );
  }

  if (
    typeof value === "string" &&
    value.includes("T") &&
    !Number.isNaN(Date.parse(value))
  ) {
    return new Date(value).toLocaleString("en-US");
  }

  return String(value);
}

const LABELS = {
  title: "Title",
  subject: "Subject",
  name: "Name",
  description: "Description",
  status: "Status",
  priority: "Priority",
  urgency: "Urgency",
  progress: "Progress",
  requester_name: "Requester",
  proposed_date: "Proposed Date",
  duration_minutes: "Duration",
  date: "Date",
  location: "Location",
  organizer_name: "Organizer",
  meeting_type: "Meeting Type",
  sector: "Sector",
  budget: "Budget",
  due_date: "Due Date",
  assignee_id: "Assignee",
  decision_note: "Decision Note",
  created_at: "Created At",
  updated_at: "Updated At",
};

export default function DetailModal({
  item,
  title,
  type = "item",
  onClose,
  onGenerateBrief,
  brief,
  loadingBrief,
  actions,
}) {
  if (!item) return null;

  const entries = Object.entries(item).filter(
    ([k]) => !["id", "_id", "password_hash"].includes(k)
  );

  const isCriticalProjects =
    item?.critical_projects &&
    Array.isArray(item.critical_projects);

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-card max-w-5xl w-full max-h-[88vh] overflow-y-auto p-6 border-yellow-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-yellow-500/80">
              Interactive Executive Detail
            </div>

            <h2 className="font-heading text-2xl font-black mt-1 text-slate-50">
              {title ||
                item.title ||
                item.subject ||
                item.name ||
                "Details"}
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Click-to-insight executive view.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {onGenerateBrief && (
            <button
              onClick={() => onGenerateBrief(item)}
              disabled={loadingBrief}
              className="px-4 py-2 rounded-lg bg-yellow-500 text-black font-bold text-sm flex items-center gap-2 disabled:opacity-60"
            >
              <Sparkles size={15} />
              {loadingBrief
                ? "Generating..."
                : "Generate CEO Brief"}
            </button>
          )}

          {actions}
        </div>

        {/* Executive Project View */}
        {isCriticalProjects && (
          <div className="space-y-4 mb-6">
            {item.critical_projects.map((project) => (
              <div
                key={project.id}
                className="rounded-2xl border border-rose-500/20 bg-white/[0.03] p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-100">
                    {project.name}
                  </h3>

                  <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs">
                    Critical
                  </span>
                </div>

                <div className="grid md:grid-cols-3 gap-3 mt-4">
                  <Metric
                    label="Progress"
                    value={`${project.progress || 0}%`}
                  />
                  <Metric
                    label="Sector"
                    value={project.sector || "N/A"}
                  />
                  <Metric
                    label="Status"
                    value={project.status || "Critical"}
                  />
                </div>

                <div className="mt-4 rounded-xl bg-black/20 border border-white/5 p-4">
                  <div className="flex items-center gap-2 text-yellow-400 text-xs uppercase tracking-widest mb-2">
                    <AlertTriangle size={14} />
                    Executive Insight
                  </div>

                  <div className="text-sm text-slate-300">
                    This project requires executive attention due
                    to critical status and below-target progress.
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 p-4">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs uppercase tracking-widest mb-2">
                    <TrendingUp size={14} />
                    Recommended Action
                  </div>

                  <div className="text-sm text-slate-300">
                    Schedule executive review and validate
                    recovery plan within 48 hours.
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Generic Details */}
        {!isCriticalProjects && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            {entries.map(([key, value]) => (
              <div
                key={key}
                className="rounded-xl bg-white/[0.03] border border-white/5 p-3"
              >
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                  {LABELS[key] ||
                    key.replaceAll("_", " ")}
                </div>

                <div
                  className="text-sm text-slate-200 whitespace-pre-wrap break-words"
                  dir="auto"
                >
                  {renderValue(value)}
                </div>
              </div>
            ))}
          </div>
        )}

        {brief && (
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.04] p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-yellow-400 mb-2">
              AI Chief of Staff Output
            </div>

            <h3 className="font-heading text-xl font-bold mb-3">
              {brief.title}
            </h3>

            <BriefList
              title="Executive Summary"
              items={brief.executive_summary}
            />

            <BriefList
              title="Decisions Required"
              items={brief.decisions_required}
            />

            <div className="mb-4">
              <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                Risks
              </div>

              <div className="space-y-2">
                {(brief.risks || []).map((r, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-black/20 border border-white/5 p-3 text-sm"
                  >
                    <span className="text-rose-300 font-semibold">
                      {r.level}
                    </span>

                    <span className="text-slate-400">
                      {" "}
                      — {r.risk}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <BriefList
              title="Recommended Actions"
              items={brief.recommended_actions}
            />

            <div className="text-sm text-slate-300 mt-3">
              <span className="text-yellow-400">
                Strategic Impact:
              </span>{" "}
              {brief.strategic_impact}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">
        {label}
      </div>

      <div className="text-slate-100 font-semibold mt-1">
        {value}
      </div>
    </div>
  );
}

function BriefList({ title, items = [] }) {
  return (
    <div className="mb-4">
      <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
        {title}
      </div>

      <ul className="space-y-1.5 text-sm text-slate-300">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-yellow-500">•</span>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}