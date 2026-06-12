import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import {
  Bell,
  Brain,
  Eye,
  Gauge,
  Layers,
  Lock,
  Radar,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { change } = useTheme();
  const { user } = useAuth();

  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    api.get("/notification-settings").then((r) => setSettings(r.data));
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      setLoadingUsers(true);
      api
        .get("/users")
        .then((r) => setUsers(Array.isArray(r.data) ? r.data : []))
        .catch(() => toast.error("Unable to load users database"))
        .finally(() => setLoadingUsers(false));
    }
  }, [user]);

  const roleLabel = useMemo(() => {
    const roles = {
      admin: "Platform Administrator",
      ceo: "Chief Executive Officer",
      vp_development: "EVP – Development Portfolio",
      vp_investment: "EVP – Investment Portfolio",
      dev_manager: "Business Unit Manager",
      tracker: "Executive Tracker",
    };
    return roles[user?.role] || user?.title || "Executive User";
  }, [user]);

  const recommendedConfig = useMemo(() => {
    if (user?.role === "vp_investment") {
      return {
        focus: "Investment Risk & Portfolio Intelligence",
        priority: "Capital exposure, portfolio performance, and strategic opportunities.",
        theme: "vision2030",
      };
    }

    if (user?.role === "vp_development") {
      return {
        focus: "Development Execution Intelligence",
        priority: "Delivery risks, delayed milestones, and initiative performance.",
        theme: "executiveGold",
      };
    }

    if (user?.role === "ceo") {
      return {
        focus: "Group-Wide Executive Command",
        priority: "Strategic risks, approvals, performance, and cross-functional coordination.",
        theme: "executiveGold",
      };
    }

    return {
      focus: "Operational Monitoring Intelligence",
      priority: "Tasks, projects, meetings, and execution follow-up.",
      theme: "executiveGold",
    };
  }, [user]);

  const userInsights = useMemo(() => {
    return users.map((u) => {
      if (u.role === "admin") {
        return {
          user: u,
          action: "Protect",
          severity: "High",
          reason:
            "Administrator account has elevated control and should remain protected with periodic review.",
        };
      }

      if (u.role === "tracker") {
        return {
          user: u,
          action: "Review Access",
          severity: "Medium",
          reason:
            "Tracker role may have broad visibility and should be validated before production use.",
        };
      }

      if (u.role === "vp_investment" || u.role === "vp_development" || u.role === "ceo") {
        return {
          user: u,
          action: "Approve",
          severity: "Low",
          reason:
            "Executive access appears aligned with role-based portfolio visibility.",
        };
      }

      return {
        user: u,
        action: "Review",
        severity: "Medium",
        reason: "User profile requires administrative validation.",
      };
    });
  }, [users]);

  const save = async () => {
    try {
      await api.put("/notification-settings", settings);
      toast.success("Executive settings saved successfully");
    } catch {
      toast.error("Unable to complete action");
    }
  };

  const applyRecommended = () => {
    try {
      change(recommendedConfig.theme);
      toast.success("AI recommended configuration applied");
    } catch {
      toast.error("Unable to apply recommended configuration");
    }
  };

  const toggle = (k, v) => setSettings({ ...settings, [k]: v });

  const toggleEvent = (e) =>
    setSettings({
      ...settings,
      events: { ...settings.events, [e]: !settings.events[e] },
    });

  return (
    <div data-testid="settings-page" dir="ltr" className="pb-10">
      <div className="mb-7">
        <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">
          Executive Settings
        </div>
        <h1 className="font-heading text-4xl font-black mt-2">
          AI Operating Preferences
        </h1>
        <p className="text-slate-400 mt-2 max-w-3xl">
          Configure how NEXGEN adapts executive intelligence, alerts, priorities,
          access governance, and monitoring logic for each leadership role.
        </p>
      </div>

      <div className="glass-card p-6 mb-5 overflow-hidden relative">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-yellow-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-sky-500/10 blur-3xl rounded-full" />

        <div className="relative flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-yellow-500/80">
              AI-Driven Experience
            </div>
            <h2 className="font-heading text-2xl font-black mt-2 flex items-center gap-2">
              <Brain className="text-yellow-500" />
              Executive Intelligence Configuration
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              NEXGEN adapts the executive workspace based on leadership role,
              portfolio exposure, risk level, and decision urgency.
            </p>
          </div>

          <div className="hidden md:flex px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold items-center gap-2">
            <Sparkles size={14} />
            AI Adaptive Mode: Active
          </div>
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-4">
          <InfoCard
            icon={<Layers className="text-yellow-500" size={20} />}
            label="Role-Aware Interface"
            title="Personalized Executive View"
            text="Dashboards, alerts, and recommendations adjust automatically based on the user’s executive responsibility."
          />
          <InfoCard
            icon={<Radar className="text-rose-400" size={20} />}
            label="Risk-Sensitive Briefing"
            title="Priority Intelligence Layer"
            text="Critical risks, pending approvals, and delayed actions are elevated before routine information."
          />
          <InfoCard
            icon={<Zap className="text-sky-400" size={20} />}
            label="Decision Context Engine"
            title="Action-Oriented Settings"
            text="The platform recommends what to monitor, escalate, or brief based on organizational signals."
          />
        </div>

        <div className="relative mt-6 p-5 rounded-xl bg-black/20 border border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Current AI Recommendation
              </div>
              <div className="font-heading font-black text-xl mt-2">
                {recommendedConfig.focus}
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {recommendedConfig.priority}
              </p>
              <div className="mt-3 text-xs text-slate-500">
                Active profile:{" "}
                <span className="text-slate-300 font-bold">{roleLabel}</span>
              </div>
            </div>

            <button
              onClick={applyRecommended}
              className="px-5 py-3 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition"
            >
              Generate Recommended Configuration
            </button>
          </div>
        </div>
      </div>

      {settings && (
        <div className="glass-card p-6 mb-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="font-heading text-xl font-bold mb-1 flex items-center gap-2">
                <Bell className="text-yellow-500" />
                Intelligence Watchlist
              </h2>
              <p className="text-sm text-slate-500">
                {user?.role === "admin"
                  ? "Control executive notification channels and monitored events across the platform."
                  : "View monitored events and notification channels. Editing is restricted to administrators."}
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-white/[0.03] border border-white/10 px-3 py-2 rounded-full">
              {user?.role === "admin" ? (
                <>
                  <Shield size={14} className="text-yellow-500" />
                  Admin control
                </>
              ) : (
                <>
                  <Eye size={14} className="text-yellow-500" />
                  Read-only mode
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {[
              {
                k: "in_app_enabled",
                l: "In-App Executive Alerts",
                d: "Alerts appear in the executive notification center.",
                icon: Bell,
              },
              {
                k: "email_enabled",
                l: "Email Notifications",
                d: "Requires Resend or SendGrid API integration.",
                icon: Gauge,
              },
              {
                k: "whatsapp_enabled",
                l: "WhatsApp Notifications",
                d: "Requires Twilio WhatsApp API integration.",
                icon: Lock,
              },
            ].map((c) => {
              const Icon = c.icon;
              const enabled = !!settings[c.k];

              return (
                <label
                  key={c.k}
                  className="p-5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                      <Icon size={18} className="text-yellow-500" />
                    </div>

                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={user?.role !== "admin"}
                      onChange={(e) => toggle(c.k, e.target.checked)}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="font-medium text-slate-100 mt-4">{c.l}</div>
                  <div className="text-xs text-slate-500 mt-1">{c.d}</div>

                  <div
                    className={`mt-4 inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full ${
                      enabled
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                        : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        enabled ? "bg-emerald-400" : "bg-slate-500"
                      }`}
                    />
                    {enabled ? "Enabled" : "Disabled"}
                  </div>
                </label>
              );
            })}
          </div>

          <div className="border-t border-white/5 pt-5">
            <h3 className="font-heading font-bold">Monitored Intelligence Events</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">
              Select which operational signals should enter the executive watchlist.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { k: "meeting", l: "Meetings" },
                { k: "meeting_request", l: "Requests" },
                { k: "task", l: "Tasks" },
                { k: "project", l: "Projects" },
                { k: "message", l: "Messages" },
              ].map((e) => {
                const enabled = settings.events?.[e.k] !== false;

                return (
                  <label
                    key={e.k}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition ${
                      enabled
                        ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-100"
                        : "bg-white/[0.02] border-white/5 text-slate-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={user?.role !== "admin"}
                      onChange={() => toggleEvent(e.k)}
                    />
                    <span className="text-sm">{e.l}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {user?.role === "admin" && (
            <button
              onClick={save}
              className="mt-6 w-full py-3 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition"
            >
              Save Executive Intelligence Settings
            </button>
          )}
        </div>
      )}

      {user?.role === "admin" && (
        <div className="glass-card p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-yellow-500/80">
                AI Governance Agent
              </div>
              <h2 className="font-heading text-2xl font-black mt-2 flex items-center gap-2">
                <Users className="text-yellow-500" />
                User Access Intelligence
              </h2>
              <p className="text-sm text-slate-400 mt-2 max-w-2xl">
                The agent reviews user roles, access scope, and executive
                privileges, then recommends administrative actions.
              </p>
            </div>

            <div className="hidden md:flex px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-bold">
              Connected to Users Database
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <Metric title="Total Users" value={users.length} />
            <Metric
              title="Executives"
              value={
                users.filter((u) =>
                  ["ceo", "vp_development", "vp_investment"].includes(u.role)
                ).length
              }
            />
            <Metric
              title="Admin Accounts"
              value={users.filter((u) => u.role === "admin").length}
            />
            <Metric
              title="Needs Review"
              value={userInsights.filter((i) => i.action.includes("Review")).length}
            />
          </div>

          {loadingUsers ? (
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 text-slate-400">
              Loading users intelligence...
            </div>
          ) : (
            <div className="space-y-3">
              {userInsights.map((insight) => (
                <div
                  key={insight.user.id || insight.user.email}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-bold text-slate-100">
                      {insight.user.name || "Unnamed User"}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {insight.user.email} · {insight.user.role}
                    </div>
                    <div className="text-sm text-slate-400 mt-2">
                      {insight.reason}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-3 py-1 rounded-full border ${
                        insight.severity === "High"
                          ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                          : insight.severity === "Medium"
                          ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
                          : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                      }`}
                    >
                      {insight.severity}
                    </span>

                    <button className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm">
                      {insight.action}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, label, title, text }) {
  return (
    <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4">
        {icon}
      </div>
      <div className="text-yellow-400 text-sm font-bold mb-2">{label}</div>
      <div className="text-slate-100 font-heading font-bold text-lg">{title}</div>
      <p className="text-sm text-slate-500 mt-2">{text}</p>
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-2xl font-black mt-1">{value}</div>
    </div>
  );
}