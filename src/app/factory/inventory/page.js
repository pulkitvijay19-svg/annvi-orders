"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import MobileBottomNav from "@/components/MobileBottomNav";

const KARATS = ["9KT", "14KT", "18KT", "20KT", "22KT", "24KT", "999"];

const TRANSACTION_TYPES = ["Stock In", "Stock Out"];

const PURPOSES = [
  "Opening Stock",
  "Casting",
  "Repairing",
  "Manual Adjustment",
  "Finding Issue",
  "Other",
];

export default function InventoryPage() {
  const { user, loading: authLoading } = useRequireAuth();

  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [inventoryItemId, setInventoryItemId] = useState("");
  const [kt, setKt] = useState("18KT");
  const [transactionType, setTransactionType] = useState("Stock In");
  const [purpose, setPurpose] = useState("Opening Stock");
  const [weight, setWeight] = useState("");
  const [quantity, setQuantity] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchData() {
    setLoading(true);

    const { data: itemData, error: itemError } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("is_active", true)
      .order("item_type", { ascending: true })
      .order("item_name", { ascending: true });

    const { data: txData, error: txError } = await supabase
      .from("inventory_transactions")
      .select("*, inventory_items(*)")
      .order("created_at", { ascending: false });

    if (itemError) {
      console.error(itemError);
      alert(itemError.message || "Inventory items fetch failed");
    }

    if (txError) {
      console.error(txError);
      alert(txError.message || "Inventory transactions fetch failed");
    }

    setItems(itemData || []);
    setTransactions(txData || []);

    if (!inventoryItemId && itemData?.length > 0) {
      setInventoryItemId(itemData[0].id);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const balances = useMemo(() => {
    const map = {};

    transactions.forEach((tx) => {
      const item = tx.inventory_items;
      if (!item) return;

      const key = `${tx.inventory_item_id}_${tx.kt || "NA"}`;

      if (!map[key]) {
        map[key] = {
          item,
          kt: tx.kt || "-",
          weight: 0,
          quantity: 0,
        };
      }

      const sign = tx.transaction_type === "Stock Out" ? -1 : 1;

      map[key].weight += sign * Number(tx.weight || 0);
      map[key].quantity += sign * Number(tx.quantity || 0);
    });

    return Object.values(map).sort((a, b) => {
      const typeCompare = String(a.item.item_type).localeCompare(
        String(b.item.item_type)
      );
      if (typeCompare !== 0) return typeCompare;

      const nameCompare = String(a.item.item_name).localeCompare(
        String(b.item.item_name)
      );
      if (nameCompare !== 0) return nameCompare;

      return String(a.kt).localeCompare(String(b.kt));
    });
  }, [transactions]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!inventoryItemId) {
      alert("Select inventory item");
      return;
    }

    if (!kt) {
      alert("Select KT");
      return;
    }

    if (!weight && !quantity) {
      alert("Enter weight or quantity");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("inventory_transactions").insert([
      {
        inventory_item_id: inventoryItemId,
        kt,
        transaction_type: transactionType,
        purpose,
        reference_no: referenceNo.trim() || null,
        weight: weight ? Number(weight) : 0,
        quantity: quantity ? Number(quantity) : 0,
        weight_source: "manual",
        remarks: remarks.trim() || null,
        created_by: user?.id || null,
      },
    ]);

    if (error) {
      console.error(error);
      alert(error.message || "Stock entry failed");
    } else {
      alert("Stock entry saved");
      setWeight("");
      setQuantity("");
      setReferenceNo("");
      setRemarks("");
      fetchData();
    }

    setSaving(false);
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <p className="text-gray-700">Loading inventory...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overscroll-y-contain bg-slate-100 p-3 pb-24 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Factory Inventory
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Stock in / stock out for gold, alloy, findings, stones and metals.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm"
            >
              Dashboard
            </Link>

            <Link
              href="/orders"
              className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white"
            >
              Orders
            </Link>
          </div>
        </div>

        <section className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Stock Entry
          </h2>

          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-3">
            <select
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
              value={inventoryItemId}
              onChange={(e) => setInventoryItemId(e.target.value)}
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.item_type} - {item.item_name}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
              value={kt}
              onChange={(e) => setKt(e.target.value)}
            >
              {KARATS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>

            <select
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
            >
              {TRANSACTION_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>

            <select
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            >
              {PURPOSES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>

            <input
              type="number"
              step="0.001"
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
              placeholder="Weight"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />

            <input
              type="number"
              step="1"
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />

            <input
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
              placeholder="Reference No"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
            />

            <input
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 md:col-span-2"
              placeholder="Remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />

            <button
              disabled={saving}
              className="rounded-xl bg-black p-3 font-semibold text-white disabled:bg-gray-400"
            >
              {saving ? "Saving..." : "Save Stock Entry"}
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm md:p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Current Stock Balance
          </h2>

          {balances.length === 0 ? (
            <p className="text-gray-600">No stock balance yet.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {balances.map(({ item, kt, weight, quantity }) => (
                  <div
                    key={`${item.id}_${kt}`}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <p className="font-bold text-gray-900">
                      {item.item_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.item_type} · {kt}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-gray-500">
                          Weight
                        </p>
                        <p className="font-semibold text-gray-900">
                          {weight.toFixed(3)} g
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-gray-500">
                          Qty
                        </p>
                        <p className="font-semibold text-gray-900">
                          {quantity}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[800px] border-collapse">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="p-3">Type</th>
                      <th className="p-3">Item</th>
                      <th className="p-3">KT</th>
                      <th className="p-3">Weight Balance</th>
                      <th className="p-3">Qty Balance</th>
                    </tr>
                  </thead>

                  <tbody>
                    {balances.map(({ item, kt, weight, quantity }) => (
                      <tr key={`${item.id}_${kt}`} className="border-b text-sm">
                        <td className="p-3 text-gray-700">
                          {item.item_type}
                        </td>

                        <td className="p-3 font-semibold text-gray-900">
                          {item.item_name}
                        </td>

                        <td className="p-3 text-gray-700">{kt}</td>

                        <td className="p-3 text-gray-700">
                          {weight.toFixed(3)} g
                        </td>

                        <td className="p-3 text-gray-700">{quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm md:p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Transactions
          </h2>

          {transactions.length === 0 ? (
            <p className="text-gray-600">No transactions yet.</p>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 20).map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-xl border border-gray-200 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {tx.inventory_items?.item_name || "-"}{" "}
                        {tx.kt ? `(${tx.kt})` : ""}
                      </p>
                      <p className="text-xs text-gray-500">
                        {tx.inventory_items?.item_type || "-"} ·{" "}
                        {tx.purpose || "-"} · {tx.reference_no || "-"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        tx.transaction_type === "Stock In"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {tx.transaction_type}
                    </span>
                  </div>

                  <p className="mt-2 text-gray-700">
                    Weight: {Number(tx.weight || 0).toFixed(3)} g · Qty:{" "}
                    {tx.quantity || 0}
                  </p>

                  {tx.remarks && (
                    <p className="mt-1 text-xs text-gray-500">{tx.remarks}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <MobileBottomNav />
    </main>
  );
}