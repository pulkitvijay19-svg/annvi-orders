"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileBottomNav from "../../components/MobileBottomNav";

const SCALE_URL = "http://localhost:5056/weight";
const PRINT_URL = "http://localhost:5055/print";

export default function DirectTagPrintPage() {
  const [scaleWeight, setScaleWeight] = useState("0.000");

  const [brand, setBrand] = useState("Annvi Gold");
  const [karat, setKarat] = useState("18KT");
  const [grossWeight, setGrossWeight] = useState("");
  const [lessWeight, setLessWeight] = useState("0.000");
  const [stoneCharges, setStoneCharges] = useState("0");
  const [tagId, setTagId] = useState(makeDirectTagId());
  const [printing, setPrinting] = useState(false);
  

  const netWeight = Math.max(
    Number(grossWeight || 0) - Number(lessWeight || 0),
    0
  ).toFixed(3);

  useEffect(() => {
    fetchScaleWeight();
    const timer = setInterval(fetchScaleWeight, 700);
    return () => clearInterval(timer);
  }, []);

  async function fetchScaleWeight() {
    try {
      const res = await fetch(SCALE_URL);
      const data = await res.json();
      if (data?.ok) setScaleWeight(data.weight || "0.000");
    } catch {}
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

  return (
    <main className="min-h-screen bg-slate-100 p-4 pb-24 text-gray-900 md:p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">
              Direct Tag Print
            </h1>
            <p className="text-sm text-gray-600">
              Order process ke bina direct tag print.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            Dashboard
          </Link>
        </header>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Live Scale</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-4xl font-bold text-green-700">
              {scaleWeight} g
            </p>

            <button
              onClick={useScaleWeight}
              className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white"
            >
              Use Scale Weight
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Tag Details</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Brand">
              <input
                className="input"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </Field>

            <Field label="Karat">
              <select
                className="input"
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

            <Field label="Gross Weight">
              <input
                className="input"
                type="number"
                step="0.001"
                value={grossWeight}
                onChange={(e) => setGrossWeight(e.target.value)}
              />
            </Field>

            <Field label="Less Weight">
              <input
                className="input"
                type="number"
                step="0.001"
                value={lessWeight}
                onChange={(e) => setLessWeight(e.target.value)}
              />
            </Field>

            <Field label="Stone Charges">
              <input
                className="input"
                type="number"
                value={stoneCharges}
                onChange={(e) => setStoneCharges(e.target.value)}
              />
            </Field>

            <Field label="Net Weight">
              <input className="input bg-gray-100" value={netWeight} readOnly />
            </Field>

            <Field label="Tag ID / QR">
              <input
                className="input"
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
              {printing ? "Printing..." : "Print Tag"}
            </button>

            <button
              onClick={resetForm}
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-gray-900 shadow-sm"
            >
              Reset
            </button>
          </div>
        </section>
      </div>

      <MobileBottomNav />

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.8rem;
          border: 1px solid #d1d5db;
          background: white;
          padding: 0.75rem;
          font-size: 0.875rem;
          color: #111827;
          outline: none;
        }
      `}</style>
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