"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileBottomNav from "../../components/MobileBottomNav";
import { useLanguage } from "../../context/LanguageContext";


const SCALE_URL = "http://localhost:5056/weight";
const PRINT_URL = "http://localhost:5055/print";

export default function DirectTagPrintPage() {
  const [scaleWeight, setScaleWeight] = useState("0.000");

  const [brand, setBrand] = useState("Annvi Gold");
  const [karat, setKarat] = useState("18KT");
  const [grossWeight, setGrossWeight] = useState("");
  const [lessWeight, setLessWeight] = useState("0.000");
  const [stoneCharges, setStoneCharges] = useState("0");
  const [tagId, setTagId] = useState("");
  const [printing, setPrinting] = useState(false);
  const { t } = useLanguage();
  

  const netWeight = Math.max(
    Number(grossWeight || 0) - Number(lessWeight || 0),
    0
  ).toFixed(3);

useEffect(() => {
  setTagId(makeDirectTagId());

  let stopped = false;
  let timer = null;

  async function pollScale() {
    if (stopped) return;

    await fetchScaleWeight();

    if (!stopped) {
      timer = setTimeout(pollScale, 500);
    }
  }

  pollScale();

  return () => {
    stopped = true;

    if (timer) {
      clearTimeout(timer);
    }
  };
}, []);

async function fetchScaleWeight() {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 1500);

  try {
    const res = await fetch(`${SCALE_URL}?t=${Date.now()}`, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) return;

    const data = await res.json();

    if (data?.ok && data.weight !== undefined) {
      setScaleWeight(Number(data.weight || 0).toFixed(3));
    }
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.warn("Scale fetch error:", error);
    }
  } finally {
    clearTimeout(timeout);
  }
}
  function useScaleWeight() {
    setGrossWeight(Number(scaleWeight || 0).toFixed(3));
  }

  function resetForm() {
    setBrand("Annvi Gold");
    setKarat("18KT");
    setGrossWeight("");
    setLessWeight("0.000");
    setStoneCharges("0");
    setTagId(makeDirectTagId());
  }

  async function printTag() {
    if (!grossWeight) {
      alert("Gross weight required");
      return;
    }

    if (!karat) {
      alert("Karat required");
      return;
    }

    setPrinting(true);

    const payload = {
      qr: tagId,
      brand,
      karat,
      gw: Number(grossWeight || 0).toFixed(3),
      lw: Number(lessWeight || 0).toFixed(3),
      sc: Number(stoneCharges || 0),
      nw: Number(netWeight || 0).toFixed(3),
    };

    try {
      const res = await fetch(PRINT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.ok) {
        alert(data.error || "Print failed");
        setPrinting(false);
        return;
      }

      alert("Tag printed");
      resetForm();
    } catch {
      alert("Print bridge nahi chal raha. Hardware Manager se Print Bridge start karo.");
    }

    setPrinting(false);
  }

  const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none";

  return (
    <main className="min-h-screen bg-slate-100 p-4 pb-24 text-gray-900 md:p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">
              {t("printTag")}
            </h1>
            <p className="text-sm text-gray-600">
              Order process ke bina direct tag print.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            {t("dashboard")}
          </Link>
        </header>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">{t("liveScale")}</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-4xl font-bold text-green-700">
              {scaleWeight} g
            </p>

            <button
              onClick={useScaleWeight}
              className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white"
            >
              {t("useScaleWeight")}
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Tag Details</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("brand")}>
              <input
                className={inputClass}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </Field>

            <Field label={t("karat")}>
              <select
                className={inputClass}
                value={karat}
                onChange={(e) => setKarat(e.target.value)}
              >
                <option>9KT</option>
                <option>14KT</option>
                <option>18KT</option>
                <option>20KT</option>
                <option>22KT</option>
                <option>24KT</option>
              </select>
            </Field>

            <Field label={t("grossWeight")}>
              <input
                className={inputClass}
                type="number"
                step="0.001"
                value={grossWeight}
                onChange={(e) => setGrossWeight(e.target.value)}
              />
            </Field>

            <Field label={t("lessWeight")}>
              <input
                className={inputClass}
                type="number"
                step="0.001"
                value={lessWeight}
                onChange={(e) => setLessWeight(e.target.value)}
              />
            </Field>

            <Field label={t("stoneCharges")}>
              <input
                className={inputClass}
                type="number"
                value={stoneCharges}
                onChange={(e) => setStoneCharges(e.target.value)}
              />
            </Field>

            <Field label={t("netWeight")}>
              <input className={`${inputClass} bg-gray-100`} value={netWeight} readOnly />
            </Field>

            <Field label={t("tagId")}>
              <input
                className={inputClass}
                value={tagId}
                onChange={(e) => setTagId(e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={printTag}
              disabled={printing}
              className="rounded-xl bg-black px-6 py-3 text-sm font-bold text-white disabled:bg-gray-400"
            >
              {printing ? "Printing..." : t("printTag")}
            </button>

            <button
              onClick={resetForm}
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-gray-900 shadow-sm"
            >
              {t("reset")}
            </button>
          </div>
        </section>
      </div>

      <MobileBottomNav />

    </main>
  );
}

function makeDirectTagId() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const t = String(Date.now()).slice(-5);

  return `AGD${y}${m}${d}${t}`;
}

function Field({ label, children }) {
  return (
    <label className="block">
      <p className="mb-1 text-xs font-semibold text-gray-500">{label}</p>
      {children}
    </label>
  );
}