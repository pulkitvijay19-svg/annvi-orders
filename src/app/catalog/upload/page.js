"use client";

import { useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import MobileBottomNav from "@/components/MobileBottomNav";

const CATEGORIES = [
  "Ladies Ring",
  "Gents Ring",
  "Earrings",
  "Baby Tops",
  "Pendant",
  "Pendant Set",
  "Tanmaniya",
  "Har Set",
  "Bali",
  "Bangles",
  "Bracelet",
  "Kada",
  "Mangalsutra",
  "Nosepin",
  "Others",
];

export default function CatalogUploadPage() {
  const [category, setCategory] = useState("Tanmaniya");
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const { loading: authLoading } = useRequireAuth();

if (authLoading) {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <p className="text-gray-700">Checking login...</p>
        </main>
  );
}

  function getValue(row, possibleNames) {
    for (const name of possibleNames) {
      const key = Object.keys(row).find(
        (k) => k.trim().toLowerCase() === name.toLowerCase()
      );
      if (key && row[key] !== undefined && row[key] !== null) return row[key];
    }
    return "";
  }

  function getLastThree(value) {
    const text = String(value || "");
    const match = text.match(/(\d{3})$/);
    return match ? match[1] : "";
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonRows = XLSX.utils.sheet_to_json(sheet);

    const cleaned = jsonRows
      .map((row) => {
        const uniqueId = String(
          getValue(row, ["Design No", "Design No.", "Unique ID", "unique_id"])
        ).trim();

        const weight = getValue(row, [
          "18kt Weight",
          "18KT Weight",
          "18kt weight",
          "weight_18kt",
        ]);

        const dieNo = String(
          getValue(row, ["Die No", "Die No.", "die_no", "Die"])
        ).trim();

        const imageUrl = String(
          getValue(row, ["Image URL", "image_url", "Image Url", "Photo URL"])
        ).trim();

        return {
          unique_id: uniqueId,
          category,
          search_code: getLastThree(uniqueId),
          weight_18kt: weight === "" ? null : Number(weight),
          die_no: dieNo || null,
          image_url: imageUrl || null,
          is_active: true,
        };
      })
      .filter((r) => r.unique_id);

    setRows(cleaned);
  }

  async function importRows() {
    if (rows.length === 0) {
      alert("No rows to import");
      return;
    }

    setImporting(true);

    const { error } = await supabase
      .from("sample_items")
      .upsert(rows, { onConflict: "unique_id" });

    if (error) {
      console.error(error);
      alert(error.message || "Import failed");
    } else {
      alert(`${rows.length} sample items imported/updated successfully`);
      setRows([]);
    }

    setImporting(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Sample Catalog Upload
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Upload Excel and import sample unique IDs, weights, die numbers and image URLs.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm"
          >
            Dashboard
          </Link>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <select
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setRows([]);
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat}>{cat}</option>
              ))}
            </select>

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
              onChange={handleFileUpload}
            />
          </div>
        </section>

        {rows.length > 0 && (
          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Preview ({rows.length} items)
              </h2>

              <button
                onClick={importRows}
                disabled={importing}
                className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:bg-gray-400"
              >
                {importing ? "Importing..." : "Import / Update Catalog"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="p-3">Unique ID</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Search Code</th>
                    <th className="p-3">18KT Weight</th>
                    <th className="p-3">Die No</th>
                    <th className="p-3">Image URL</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.unique_id}-${index}`} className="border-b text-sm">
                      <td className="p-3 font-semibold text-gray-900">
                        {row.unique_id}
                      </td>
                      <td className="p-3 text-gray-700">{row.category}</td>
                      <td className="p-3 text-gray-700">{row.search_code}</td>
                      <td className="p-3 text-gray-700">
                        {row.weight_18kt ?? "-"}
                      </td>
                      <td className="p-3 text-gray-700">{row.die_no || "-"}</td>
                      <td className="p-3 text-gray-700">
                        {row.image_url ? "Yes" : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}