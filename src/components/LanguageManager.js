"use client";

import { useEffect, useState } from "react";

const DICT = {
  Dashboard: "ড্যাশবোর্ড",
  Refresh: "রিফ্রেশ",
  Start: "চালু",
  Stop: "বন্ধ",
  Connected: "সংযুক্ত",
  Disconnected: "বিচ্ছিন্ন",

  "Add New Order": "নতুন অর্ডার যোগ করুন",
  "Customer Details": "কাস্টমার ডিটেইলস",
  "Order Items": "অর্ডার আইটেম",
  "Design Images": "ডিজাইন ছবি",
  "Save Order": "অর্ডার সেভ",
  "Customer Name *": "কাস্টমার নাম *",
  "Mobile Number": "মোবাইল নম্বর",
  "Delivery Date": "ডেলিভারি তারিখ",
  "Order remarks": "অর্ডার মন্তব্য",
  "Item Remarks": "আইটেম মন্তব্য",
  "Approx Weight": "আনুমানিক ওজন",
  Size: "সাইজ",
  "Choose Files": "ফাইল বেছে নিন",
  "No file chosen": "কোনো ফাইল নেই",

  Brand: "ব্র্যান্ড",
  Karat: "ক্যারেট",
  "Gross Weight": "মোট ওজন",
  "Less Weight": "কম ওজন",
  "Net Weight": "নেট ওজন",
  "Stone Charges": "পাথর চার্জ",
  "Tag ID / QR": "ট্যাগ নম্বর / QR",
  "Print Tag": "ট্যাগ প্রিন্ট",
  Reset: "রিসেট",
  "Live Scale": "লাইভ ওজন",
  "Use Scale Weight": "স্কেলের ওজন নিন",
};

function convert(text, lang) {
  if (!text) return text;
  const clean = text.trim();
  const bn = DICT[clean];
  if (!bn) return text;

  if (lang === "EN") return clean;
  if (lang === "BN") return bn;
  return `${clean} / ${bn}`;
}

function translatePage(lang) {
  const nodes = document.querySelectorAll(
    "h1,h2,h3,h4,p,label,button,a,span,th,option"
  );

  nodes.forEach((el) => {
    if (el.closest("[data-no-translate]")) return;
    if (el.children.length > 0) return;

    if (!el.dataset.originalText) {
      const txt = el.textContent?.trim();
      if (txt) el.dataset.originalText = txt;
    }

    const original = el.dataset.originalText;
    if (!original) return;

    el.textContent = convert(original, lang);
  });

  const inputs = document.querySelectorAll("input, textarea");

  inputs.forEach((el) => {
    if (!el.dataset.originalPlaceholder && el.placeholder) {
      el.dataset.originalPlaceholder = el.placeholder;
    }

    const original = el.dataset.originalPlaceholder;
    if (!original) return;

    el.placeholder = convert(original, lang);
  });
}

export default function LanguageManager() {
  const [lang, setLang] = useState("EN");

useEffect(() => {
  localStorage.setItem("annvi_lang", lang);

  const timer1 = setTimeout(() => translatePage(lang), 300);
  const timer2 = setTimeout(() => translatePage(lang), 1000);

  return () => {
    clearTimeout(timer1);
    clearTimeout(timer2);
  };
}, [lang]);

  return (
    <select
      data-no-translate
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