import React, { useEffect, useState } from "react";
import api, { SECTOR_LABELS, STATUS_LABELS } from "../lib/api";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

const COLORS = [
  "#D4AF37",
  "#34d399",
  "#60a5fa",
  "#fbbf24",
  "#a78bfa",
  "#fb7185",
];

const formatNumber = (value) =>
  new Intl.NumberFormat("en-US").format(value || 0);

export default function ReportsPage() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    Promise.all([api.get("/projects"), api.get("/tasks")]).then(([p, t]) => {
      setProjects(p.data);
      setTasks(t.data);
    });
  }, []);

  const sectorAgg = {};

  projects.forEach((p) => {
    const s = p.sector;

    sectorAgg[s] = sectorAgg[s] || {
      sector: s,
      count: 0,
      progress: 0,
      budget: 0,
      completed: 0,
    };

    sectorAgg[s].count += 1;
    sectorAgg[s].progress += p.progress || 0;
    sectorAgg[s].budget += p.budget || 0;

    if (p.status === "completed") {
      sectorAgg[s].completed += 1;
    }
  });

  const sectorData = Object.values(sectorAgg).map((s) => ({
    ...s,
    name: SECTOR_LABELS[s.sector] || s.sector,
    avgProgress: Math.round(s.progress / Math.max(s.count, 1)),
    completionRate: Math.round(
      (s.completed / Math.max(s.count, 1)) * 100
    ),
  }));

  const radarData = sectorData.map((s) => ({
    subject: s.name,
    Progress: s.avgProgress,
    Completion: s.completionRate,
  }));

  const statusData = [
    "planning",
    "active",
    "on_hold",
    "completed",
    "cancelled",
  ].map((s) => ({
    name: STATUS_LABELS[s] || s,
    value: projects.filter((p) => p.status === s).length,
  }));

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const avgProgress =
    totalProjects === 0
      ? 0
      : Math.round(
          projects.reduce((sum, p) => sum + (p.progress || 0), 0) /
            totalProjects
        );

  const totalBudget = projects.reduce(
    (sum, p) => sum + (p.budget || 0),
    0
  );

  const criticalProjects = projects.filter(
    (p) => p.priority === "critical" || p.rag === "red"
  ).length;

  return (
    <div data-testid="reports-page">
      <div className="mb-7">
        <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">
          Reports & Analytics
        </div>

        <h1 className="font-heading text-4xl font-black mt-2">
          Executive Analytics
        </h1>

        <p className="text-slate-500 text-sm mt-1">
          Actionable insights for strategic executive decisions
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KPI label="Total Projects" value={totalProjects} />
        <KPI label="Active Projects" value={activeProjects} />
        <KPI label="Average Progress" value={`${avgProgress}%`} />
        <KPI label="Total Budget" value={formatNumber(totalBudget)} />
      </div>

      <div className="glass-card p-5 mb-5 border-yellow-500/20">
        <div className="text-[10px] uppercase tracking-[0.25em] text-yellow-400 mb-2">
          AI Executive Insight
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          Portfolio analytics show {activeProjects} active projects with an
          average progress of {avgProgress}%. {criticalProjects} critical
          project{criticalProjects === 1 ? "" : "s"} require executive
          attention. Budget distribution and sector performance should be
          reviewed before the next executive decision cycle.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="glass-card p-6">
          <h3 className="font-heading text-lg font-bold mb-1">
            Sector Performance Matrix
          </h3>

          <p className="text-xs text-slate-500 mb-4">
            Progress and completion rate across strategic sectors
          </p>

          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
              />
              <PolarRadiusAxis
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                domain={[0, 100]}
              />
              <Radar
                name="Progress"
                dataKey="Progress"
                stroke="#D4AF37"
                fill="#D4AF37"
                fillOpacity={0.3}
              />
              <Radar
                name="Completion"
                dataKey="Completion"
                stroke="#34d399"
                fill="#34d399"
                fillOpacity={0.2}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#111622",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-heading text-lg font-bold mb-1">
            Budget by Sector
          </h3>

          <p className="text-xs text-slate-500 mb-4">
            Total budget distribution across sectors
          </p>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sectorData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={2}
                dataKey="budget"
                nameKey="name"
                label={(e) => `${e.name}`}
                labelLine={false}
              >
                {sectorData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={COLORS[i % COLORS.length]}
                    stroke="none"
                  />
                ))}
              </Pie>

              <Tooltip
                contentStyle={{
                  background: "#111622",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                }}
                formatter={(v) => formatNumber(v)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="font-heading text-lg font-bold mb-1">
            Progress vs Completion
          </h3>

          <p className="text-xs text-slate-500 mb-4">
            Sector comparison by average progress and completion rate
          </p>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sectorData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  background: "#111622",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                }}
                formatter={(v) => `${v}%`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="avgProgress"
                name="Progress %"
                fill="#D4AF37"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="completionRate"
                name="Completion %"
                fill="#34d399"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-heading text-lg font-bold mb-1">
            Project Status
          </h3>

          <p className="text-xs text-slate-500 mb-4">
            Current distribution by lifecycle status
          </p>

          <div className="space-y-3 mt-6">
            {statusData.map((s, i) => {
              const total =
                statusData.reduce((a, b) => a + b.value, 0) || 1;

              const pct = Math.round((s.value / total) * 100);

              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-300">{s.name}</span>
                    <span className="text-slate-500 tabular-nums">
                      {s.value}
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: COLORS[i],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-heading text-lg font-bold mb-4">
          Sector Performance Summary
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-slate-500 border-b border-white/5">
                <th className="py-3 font-semibold">Sector</th>
                <th className="py-3 font-semibold">Project Count</th>
                <th className="py-3 font-semibold">Average Progress</th>
                <th className="py-3 font-semibold">Budget</th>
                <th className="py-3 font-semibold">Completion Rate</th>
              </tr>
            </thead>

            <tbody>
              {sectorData.map((s) => (
                <tr key={s.sector} className="border-b border-white/5">
                  <td className="py-4 text-slate-100 font-medium">
                    {s.name}
                  </td>

                  <td className="py-4 tabular-nums text-slate-300">
                    {s.count}
                  </td>

                  <td className="py-4 tabular-nums text-yellow-400">
                    {s.avgProgress}%
                  </td>

                  <td className="py-4 tabular-nums text-slate-300">
                    {formatNumber(s.budget)}
                  </td>

                  <td className="py-4 tabular-nums text-emerald-400">
                    {s.completionRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div className="glass-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-2xl font-heading font-bold text-slate-100 tabular-nums">
        {value}
      </div>
    </div>
  );
}