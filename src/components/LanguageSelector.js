"use client";

import { useLanguage } from "../context/LanguageContext";

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage();

  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      className="rounded-xl border-2 border-black bg-white px-3 py-2 text-sm font-bold text-gray-900"
    >
      <option value="EN">🌐 English</option>
      <option value="BOTH">🌐 English + বাংলা</option>
      <option value="BN">🌐 বাংলা</option>
    </select>
  );
}