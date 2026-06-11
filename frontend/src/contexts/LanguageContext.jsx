import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("arak_lang") || "en");
  useEffect(() => {
    localStorage.setItem("arak_lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang, isArabic: lang === "ar" }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext) || { lang: "en", setLang: () => {}, isArabic: false };
}

export function LanguageToggle({ compact = false }) {
  const { lang, setLang } = useLanguage();
  return (
    <div className={`inline-flex rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden ${compact ? "text-[10px]" : "text-xs"}`}>
      <button type="button" onClick={() => setLang("en")} className={`px-3 py-1.5 ${lang === "en" ? "bg-yellow-500 text-black font-bold" : "text-slate-400 hover:text-slate-100"}`}>EN</button>
      <button type="button" onClick={() => setLang("ar")} className={`px-3 py-1.5 ${lang === "ar" ? "bg-yellow-500 text-black font-bold" : "text-slate-400 hover:text-slate-100"}`}>AR</button>
    </div>
  );
}
