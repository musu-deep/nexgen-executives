import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Bell, Check } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotificationsPage() {
  const [items, setItems] = useState([]);

  const load = () => api.get("/notifications").then((r) => setItems(r.data));

  useEffect(() => {
    load();
  }, []);

  const readAll = async () => {
    await api.post("/notifications/read-all");
    load();
  };

  return (
    <div data-testid="notifications-page">
      <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">
            Notifications
          </div>

          <h1 className="font-heading text-4xl font-black mt-2 flex items-center gap-3">
            <Bell className="text-yellow-500" />
            Notifications Center
          </h1>
        </div>

        <button
          onClick={readAll}
          className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-yellow-500/10 hover:text-yellow-300 text-sm flex items-center gap-2"
        >
          <Check size={14} />
          Mark All as Read
        </button>
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="glass-card p-10 text-center text-slate-500">
            No notifications available
          </div>
        ) : (
          items.map((n) => (
            <Link
              key={n.id}
              to={n.link || "#"}
              onClick={() => api.post(`/notifications/${n.id}/read`)}
              className={`glass-card p-4 flex items-start gap-3 hover:border-yellow-500/30 ${
                !n.read ? "border-yellow-500/20" : ""
              }`}
            >
              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></span>
              )}

              <div className="flex-1">
                <div className="font-medium text-slate-100">{n.title}</div>

                <div className="text-sm text-slate-400 mt-1">{n.body}</div>

                <div className="text-xs text-slate-500 mt-2">
                  {new Date(n.created_at).toLocaleString("en-US")}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}