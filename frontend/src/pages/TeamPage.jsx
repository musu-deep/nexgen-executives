import React, { useEffect, useState } from "react";
import api, { ROLE_LABELS } from "../lib/api";
import { Mail, Briefcase } from "lucide-react";

const ROLE_COLORS = {
  ceo: "from-yellow-500 to-yellow-700",
  admin: "from-rose-500 to-rose-700",
  vp_development: "from-emerald-500 to-emerald-700",
  vp_investment: "from-sky-500 to-sky-700",
  dev_manager: "from-violet-500 to-violet-700",
  tracker: "from-amber-500 to-amber-700",
};

export default function TeamPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get("/users").then((r) => setUsers(r.data));
  }, []);

  return (
    <div data-testid="team-page">
      <div className="mb-7">
        <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">
          Executive Office
        </div>

        <h1 className="font-heading text-4xl font-black mt-2">
          Team Members
        </h1>

        <p className="text-slate-500 text-sm mt-1">
          {users.length} Members in the System
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <div
            key={u.id}
            className="glass-card p-6 hover:border-yellow-500/30 transition-all"
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-xl bg-gradient-to-br ${
                  ROLE_COLORS[u.role] || "from-slate-500 to-slate-700"
                } flex items-center justify-center text-2xl font-heading font-bold text-white shadow-lg`}
              >
                {u.name?.[0]}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-heading text-lg font-bold text-slate-100 truncate">
                  {u.name}
                </h3>

                <div className="text-xs text-yellow-400/80 mt-0.5">
                  {ROLE_LABELS[u.role]}
                </div>
              </div>

              {!u.active && (
                <span className="text-[10px] px-2 py-1 rounded bg-rose-500/15 text-rose-300">
                  Disabled
                </span>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-xs text-slate-400">
              {u.title && (
                <div className="flex items-center gap-2">
                  <Briefcase size={12} />
                  {u.title}
                </div>
              )}

              <div className="flex items-center gap-2" dir="ltr">
                <Mail size={12} />
                {u.email}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}