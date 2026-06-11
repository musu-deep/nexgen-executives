import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useTheme, THEMES } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { Palette, Bell, Check } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { active, change } = useTheme();
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);

  useEffect(() => { api.get("/notification-settings").then(r => setSettings(r.data)); }, []);

  const save = async () => { try { await api.put("/notification-settings", settings); toast.success("تم الحفظ"); } catch { toast.error("Unable to complete action"); } };
  const toggle = (k, v) => setSettings({ ...settings, [k]: v });
  const toggleEvent = (e) => setSettings({ ...settings, events: { ...settings.events, [e]: !settings.events[e] } });

  return (
    <div data-testid="settings-page">
      <div className="mb-7">
        <div className="text-xs uppercase tracking-[0.3em] text-yellow-500/80">الإعدادات</div>
        <h1 className="font-heading text-4xl font-black mt-2">هوية الFromصة والWatchات</h1>
      </div>

      {/* Themes */}
      <div className="glass-card p-6 mb-5">
        <h2 className="font-heading text-xl font-bold mb-1 flex items-center gap-2"><Palette className="text-yellow-500"/> هوية الFromصة</h2>
        <p className="text-sm text-slate-500 mb-5">اختر الثيم الFromاسب — التغيير يطبق على جميع المستخدمين</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(THEMES).map(([k, t]) => (
            <button key={k} onClick={() => { change(k); toast.success(`تم تطبيق: ${t.name}`); }} data-testid={`theme-${k}`}
              className={`text-left p-1 rounded-xl transition-all ${active === k ? "ring-2 ring-yellow-500" : "ring-1 ring-white/10 hover:ring-white/20"}`}>
              <div className="rounded-lg h-28 relative overflow-hidden" style={{ background: t.banner }}>
                <div className="absolute bottom-2 left-2 flex gap-1.5">
                  <span className="w-5 h-5 rounded-full border border-white/30" style={{ background: t.accent }}></span>
                  <span className="w-5 h-5 rounded-full border border-white/30" style={{ background: t.accent2 }}></span>
                  <span className="w-5 h-5 rounded-full border border-white/30" style={{ background: t.surface }}></span>
                </div>
                {active === k && <div className="absolute top-2 right-2 bg-yellow-500 text-black rounded-full p-1"><Check size={12}/></div>}
              </div>
              <div className="mt-3 px-2 pb-2">
                <div className="font-heading font-bold text-slate-100 text-sm">{t.name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {settings && (
        <div className="glass-card p-6">
          <h2 className="font-heading text-xl font-bold mb-1 flex items-center gap-2"><Bell className="text-yellow-500"/> إدارة الWatchات</h2>
          <p className="text-sm text-slate-500 mb-5">{user?.role === "admin" ? "تحكم بقنوات الإشعارات للنظام بالكامل" : "(للعرض فقط — التحكم متاح للمدير)"}</p>

          <div className="space-y-4 mb-6">
            {[
              { k: "in_app_enabled", l: "إشعارات داخل الFromصة", d: "تظهر في جرس الإشعارات" },
              { k: "email_enabled", l: "إشعارات Email الإلكتروني", d: "يتrequest ربط Resend/SendGrid (مفاتيح API)" },
              { k: "whatsapp_enabled", l: "إشعارات واتساب", d: "يتrequest ربط Twilio WhatsApp (مفاتيح API)" },
            ].map(c => (
              <label key={c.k} className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/5">
                <div>
                  <div className="font-medium text-slate-100">{c.l}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{c.d}</div>
                </div>
                <input type="checkbox" checked={!!settings[c.k]} disabled={user?.role !== "admin"} onChange={e => toggle(c.k, e.target.checked)} className="w-5 h-5"/>
              </label>
            ))}
          </div>

          <div className="border-t border-white/5 pt-5">
            <h3 className="font-heading font-bold mb-3">أنواع Sunاث</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { k: "meeting", l: "اجتماعات" }, { k: "meeting_request", l: "requestات اجتماع" },
                { k: "task", l: "مهام" }, { k: "project", l: "مشاريع" }, { k: "message", l: "رسائل" },
              ].map(e => (
                <label key={e.k} className="flex items-center gap-2 p-3 rounded bg-white/[0.02] border border-white/5">
                  <input type="checkbox" checked={settings.events?.[e.k] !== false} disabled={user?.role !== "admin"} onChange={() => toggleEvent(e.k)}/>
                  <span className="text-sm">{e.l}</span>
                </label>
              ))}
            </div>
          </div>

          {user?.role === "admin" && <button onClick={save} className="mt-5 w-full py-3 rounded-lg bg-yellow-500 text-black font-bold">حفظ الإعدادات</button>}
        </div>
      )}
    </div>
  );
}
