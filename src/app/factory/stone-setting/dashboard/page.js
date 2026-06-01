"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function StoneSettingDashboardPage() {
  const { loading: authLoading } = useRequireAuth();
  const [batches, setBatches] = useState([]);
  const [stones, setStones] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);

    const { data: batchData, error: batchError } = await supabase
      .from("casting_batches")
      .select(`
        *,
        casting_batch_items(*, orders(order_no, customer_name)),
        stone_setting_results(*)
      `)
      .eq("status", "Stone Setting")
      .order("created_at", { ascending: false });

    const { data: stoneData } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("is_active", true)
      .eq("item_type", "Stone")
      .order("item_name", { ascending: true });

    const { data: txData } = await supabase
      .from("inventory_transactions")
      .select("*");

    if (batchError) alert(batchError.message);

    setBatches(batchData || []);
    setStones(stoneData || []);
    setTransactions(txData || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-sm text-gray-700">
        Loading stone setting...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <Header />

        {batches.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
            No batches in Stone Setting.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {batches.map((batch) => (
              <StoneSettingCard
                key={batch.id}
                batch={batch}
                stones={stones}
                transactions={transactions}
                isOpen={openId === batch.id}
                onOpen={() => setOpenId(openId === batch.id ? null : batch.id)}
                onRefresh={fetchData}
              />
            ))}
          </div>
        )}
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

function StoneSettingCard({
  batch,
  stones,
  transactions,
  isOpen,
  onOpen,
  onRefresh,
}) {
  const items = batch.casting_batch_items || [];

  const [setterName, setSetterName] = useState("");
  const [issuedBy, setIssuedBy] = useState("");

  const [issuedPieces, setIssuedPieces] = useState(
    Number(batch.current_pieces || batch.good_pieces || 0)
  );
  const [issuedGoldWeight, setIssuedGoldWeight] = useState(
    Number(batch.current_weight || batch.received_weight || 0)
  );

  const [receivedPieces, setReceivedPieces] = useState("");
  const [receivedGoldWeight, setReceivedGoldWeight] = useState("");

  const [repairPieces, setRepairPieces] = useState("");
  const [repairWeight, setRepairWeight] = useState("");

  const [rejectedPieces, setRejectedPieces] = useState("");
  const [rejectedWeight, setRejectedWeight] = useState("");

  const [remarks, setRemarks] = useState("");
  const [stoneRows, setStoneRows] = useState([]);
  const [saving, setSaving] = useState(false);

  const parties = [
    ...new Set(items.map((i) => i.orders?.customer_name).filter(Boolean)),
  ];

  const orders = [
    ...new Set(items.map((i) => i.orders?.order_no).filter(Boolean)),
  ];

  const totalStoneIssued = stoneRows.reduce(
    (sum, row) => sum + Number(row.issued_weight || 0),
    0
  );

  const totalStoneReceived = stoneRows.reduce(
    (sum, row) => sum + Number(row.returned_weight || 0),
    0
  );

  const stoneIncreased = totalStoneIssued - totalStoneReceived;

const stoneChallan =
  Number(issuedGoldWeight || 0) +
  totalStoneIssued -
  (
    Number(receivedGoldWeight || 0) +
    totalStoneReceived +
    Number(repairWeight || 0) +
    Number(rejectedWeight || 0)
  );

  function stockBalance(itemId) {
    return transactions.reduce((sum, tx) => {
      if (tx.inventory_item_id !== itemId) return sum;

      return (
        sum +
        (tx.transaction_type === "Stock Out" ? -1 : 1) *
          Number(tx.weight || 0)
      );
    }, 0);
  }

  function addStoneRow() {
    setStoneRows((prev) => [
      ...prev,
      {
        stone_item_id: "",
        stone_name: "",
        stone_type: "",
        stone_size: "",
        issued_weight: "",
        returned_weight: "",
        remarks: "",
      },
    ]);
  }

  function updateStone(index, field, value) {
    setStoneRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;

        const next = { ...row, [field]: value };

        if (field === "stone_item_id") {
          const item = stones.find((s) => s.id === value);
          next.stone_name = item?.item_name || "";
          next.stone_type = item?.item_category || "";
          next.stone_size = item?.size || "";
        }

        return next;
      })
    );
  }

  function removeStone(index) {
    setStoneRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function stockInRejectedScrap() {
    if (Number(rejectedWeight || 0) <= 0) return true;

    const { data: scrapItem, error: itemError } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("item_type", "Scrap")
      .eq("item_name", "Casting Scrap")
      .maybeSingle();

    if (itemError) {
      alert(itemError.message);
      return false;
    }

    if (!scrapItem?.id) {
      alert("Scrap item not found: Scrap / Casting Scrap");
      return false;
    }

    const { error } = await supabase.from("inventory_transactions").insert([
      {
        inventory_item_id: scrapItem.id,
        kt: batch.kt,
        transaction_type: "Stock In",
        purpose: "Stone Setting Rejection",
        reference_no: batch.batch_no,
        weight: Number(rejectedWeight || 0),
        quantity: Number(rejectedPieces || 0),
        weight_source: "manual",
        remarks: "Rejected pieces from stone setting moved to same KT scrap",
      },
    ]);

    if (error) {
      alert(error.message);
      return false;
    }

    return true;
  }

  async function saveStoneSetting() {
    if (!receivedGoldWeight && !repairWeight && !rejectedWeight) {
      alert("Received / repair / rejected weight me se kuch enter karo");
      return;
    }

    setSaving(true);

    for (const row of stoneRows) {
      if (!row.stone_item_id) continue;

      const issuedWeight = Number(row.issued_weight || 0);
      const available = stockBalance(row.stone_item_id);

      if (issuedWeight > 0 && available < issuedWeight) {
        setSaving(false);
        alert(
          `${row.stone_name} stock कम hai. Required ${issuedWeight.toFixed(
            3
          )}g, Available ${available.toFixed(3)}g`
        );
        return;
      }
    }

    const { data: result, error } = await supabase
      .from("stone_setting_results")
      .insert([
        {
          casting_batch_id: batch.id,
          setter_name: setterName,
          issued_by: issuedBy,

          issued_pieces: Number(issuedPieces || 0),
          issued_weight: Number(issuedGoldWeight || 0),

          received_pieces: Number(receivedPieces || 0),
          received_weight: Number(receivedGoldWeight || 0),

          repair_pieces: Number(repairPieces || 0),
          repair_weight: Number(repairWeight || 0),

          rejected_pieces: Number(rejectedPieces || 0),
          rejected_weight: Number(rejectedWeight || 0),

          stone_issued_weight: totalStoneIssued,
          stone_received_weight: totalStoneReceived,
          stone_increased_weight: stoneIncreased,
          stone_challan_weight: stoneChallan,

          stone_setting_loss: stoneChallan,
          remarks,
        },
      ])
      .select()
      .single();

    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }

    for (const row of stoneRows) {
      if (!row.stone_item_id) continue;

      const issuedWeight = Number(row.issued_weight || 0);
      const returnedWeight = Number(row.returned_weight || 0);
      const increasedWeight = issuedWeight - returnedWeight;

      const { error: stoneError } = await supabase
        .from("stone_setting_stones")
        .insert([
          {
            casting_batch_id: batch.id,
            stone_setting_result_id: result.id,

            stone_item_id: row.stone_item_id,
            stone_name: row.stone_name,
            stone_type: row.stone_type,
            stone_size: row.stone_size,

            issued_weight: issuedWeight,
            returned_weight: returnedWeight,
            stone_increased_weight: increasedWeight,

            issued_qty: 0,
            used_qty: 0,
            returned_qty: 0,
            broken_qty: 0,
            missing_qty: 0,

            remarks: row.remarks || "",
          },
        ]);

      if (stoneError) {
        setSaving(false);
        alert(stoneError.message);
        return;
      }

      if (issuedWeight > 0) {
        const { error: outError } = await supabase
          .from("inventory_transactions")
          .insert([
            {
              inventory_item_id: row.stone_item_id,
              kt: "Stone",
              transaction_type: "Stock Out",
              purpose: "Stone Setting Issue",
              reference_no: batch.batch_no,
              weight: issuedWeight,
              quantity: 0,
              weight_source: "manual",
              remarks: `${row.stone_name} issued for stone setting`,
            },
          ]);

        if (outError) {
          setSaving(false);
          alert(outError.message);
          return;
        }
      }

      if (returnedWeight > 0) {
        const { error: inError } = await supabase
          .from("inventory_transactions")
          .insert([
            {
              inventory_item_id: row.stone_item_id,
              kt: "Stone",
              transaction_type: "Stock In",
              purpose: "Stone Setting Return",
              reference_no: batch.batch_no,
              weight: returnedWeight,
              quantity: 0,
              weight_source: "manual",
              remarks: `${row.stone_name} returned from stone setting`,
            },
          ]);

        if (inError) {
          setSaving(false);
          alert(inError.message);
          return;
        }
      }
    }

    if (Number(repairPieces || 0) > 0 || Number(repairWeight || 0) > 0) {
      const { error: repairError } = await supabase.from("repair_queue").insert([
        {
          casting_batch_id: batch.id,
          source_process: "Stone Setting",
          kt: batch.kt,
          pending_pieces: Number(repairPieces || 0),
          pending_weight: Number(repairWeight || 0),
          status: "Pending",
          remarks: `Repair from Stone Setting - ${batch.batch_no}`,
        },
      ]);

      if (repairError) {
        setSaving(false);
        alert(repairError.message);
        return;
      }
    }

    const scrapOk = await stockInRejectedScrap();

    if (!scrapOk) {
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("casting_batches")
      .update({
        status: "Buff",
        current_pieces: Number(receivedPieces || 0),
        current_weight: Number(receivedGoldWeight || 0),
      })
      .eq("id", batch.id);

    if (updateError) {
      setSaving(false);
      alert(updateError.message);
      return;
    }

    setSaving(false);
    alert("Stone setting saved. Batch moved to Buff.");
    onRefresh();
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{batch.batch_no}</h3>
            <Badge>{batch.kt}</Badge>
            <Badge blue>Stone Setting</Badge>
          </div>

          <p className="mt-2 text-xs font-semibold text-gray-500">
            Party: {parties.join(", ") || "-"}
          </p>

          <p className="text-xs text-gray-500">
            Order: {orders.join(", ") || "-"}
          </p>
        </div>

        <button
          onClick={onOpen}
          className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white"
        >
          {isOpen ? "Close" : "Open"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="Current Pcs" value={issuedPieces} />
        <MiniStat
          label="Gold Wt"
          value={`${Number(issuedGoldWeight || 0).toFixed(3)}g`}
        />
        <MiniStat
          label="Entries"
          value={batch.stone_setting_results?.length || 0}
        />
      </div>

      {isOpen && (
        <div className="mt-5 space-y-4">
          <ItemsSummary items={items} />

          <Panel title="Stone Issue / Receive">
            <div className="mb-3 grid gap-3 md:grid-cols-2">
              <Field label="Issued By">
                <input
                  value={issuedBy}
                  onChange={(e) => setIssuedBy(e.target.value)}
                  className="input"
                />
              </Field>

              <div className="flex items-end">
                <button
                  onClick={addStoneRow}
                  className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
                >
                  + Add Stone
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {stoneRows.length === 0 ? (
                <p className="text-sm text-gray-500">No stones issued yet.</p>
              ) : (
                stoneRows.map((row, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-gray-200 bg-white p-3"
                  >
                    <div className="grid gap-2 md:grid-cols-3">
                      <Field label="Stone">
                        <select
                          value={row.stone_item_id}
                          onChange={(e) =>
                            updateStone(index, "stone_item_id", e.target.value)
                          }
                          className="input"
                        >
                          <option value="">Select stone</option>
                          {stones.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.item_name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Stone Type">
                        <input
                          value={row.stone_type}
                          onChange={(e) =>
                            updateStone(index, "stone_type", e.target.value)
                          }
                          className="input"
                        />
                      </Field>

                      <Field label="Stone Size">
                        <input
                          value={row.stone_size}
                          onChange={(e) =>
                            updateStone(index, "stone_size", e.target.value)
                          }
                          className="input"
                        />
                      </Field>

                      <Field label="Stone Issued Weight">
                        <input
                          type="number"
                          step="0.001"
                          value={row.issued_weight}
                          onChange={(e) =>
                            updateStone(index, "issued_weight", e.target.value)
                          }
                          className="input"
                        />
                      </Field>

                      <Field label="Stone Received Weight">
                        <input
                          type="number"
                          step="0.001"
                          value={row.returned_weight}
                          onChange={(e) =>
                            updateStone(index, "returned_weight", e.target.value)
                          }
                          className="input"
                        />
                      </Field>

                      <Field label="Stone Increased">
                        <div className="rounded-xl bg-green-50 p-3 text-sm font-bold text-green-800">
                          {(
                            Number(row.issued_weight || 0) -
                            Number(row.returned_weight || 0)
                          ).toFixed(3)}
                          g
                        </div>
                      </Field>

                      <Field label="Remarks">
                        <input
                          value={row.remarks}
                          onChange={(e) =>
                            updateStone(index, "remarks", e.target.value)
                          }
                          className="input"
                        />
                      </Field>

                      <div className="flex items-end">
                        <button
                          onClick={() => removeStone(index)}
                          className="w-full rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <GreenStat
                label="Stone Issued"
                value={`${totalStoneIssued.toFixed(3)}g`}
              />
              <GreenStat
                label="Stone Received"
                value={`${totalStoneReceived.toFixed(3)}g`}
              />
              <GreenStat
                label="Stone Increased"
                value={`${stoneIncreased.toFixed(3)}g`}
              />
            </div>
          </Panel>

          <Panel title="Stone Setting Challan">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Setter Name">
                <input
                  value={setterName}
                  onChange={(e) => setSetterName(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Issued Pieces">
                <input
                  type="number"
                  value={issuedPieces}
                  onChange={(e) => setIssuedPieces(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Gold Pieces Issued Weight">
                <input
                  type="number"
                  step="0.001"
                  value={issuedGoldWeight}
                  onChange={(e) => setIssuedGoldWeight(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Received Pieces">
                <input
                  type="number"
                  value={receivedPieces}
                  onChange={(e) => setReceivedPieces(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Gold Pieces Received Weight">
                <input
                  type="number"
                  step="0.001"
                  value={receivedGoldWeight}
                  onChange={(e) => setReceivedGoldWeight(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Repair Pieces">
                <input
                  type="number"
                  value={repairPieces}
                  onChange={(e) => setRepairPieces(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Repair Weight">
                <input
                  type="number"
                  step="0.001"
                  value={repairWeight}
                  onChange={(e) => setRepairWeight(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Rejected Pieces">
                <input
                  type="number"
                  value={rejectedPieces}
                  onChange={(e) => setRejectedPieces(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Rejected Weight">
                <input
                  type="number"
                  step="0.001"
                  value={rejectedWeight}
                  onChange={(e) => setRejectedWeight(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Stone Setting Challan">
                <div className="rounded-xl bg-orange-50 p-3 text-sm font-bold text-orange-700">
                  {stoneChallan.toFixed(3)} g
                </div>
              </Field>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <GreenStat
                label="Good To Buff"
                value={`${Number(receivedPieces || 0)} pcs`}
              />
              <GreenStat
                label="Repair Queue"
                value={`${Number(repairPieces || 0)} pcs`}
              />
              <GreenStat
                label="Rejected Scrap"
                value={`${Number(rejectedWeight || 0).toFixed(3)}g`}
              />
            </div>

            <div className="mt-3">
              <Field label="Remarks">
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Stone Setting Challan = (Gold Pieces Issued Weight + Stone Issued
              Weight) - (Gold Pieces Received Weight + Stone Received Weight)
            </p>

            <button
              disabled={saving}
              onClick={saveStoneSetting}
              className="mt-4 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:bg-gray-400"
            >
              {saving ? "Saving..." : "Save & Move To Buff"}
            </button>
          </Panel>
        </div>
      )}
    </section>
  );
}

function Header() {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Stone Setting</h1>
        <p className="text-sm text-gray-600">
          Stone issue, receive, stone increased and challan tracking.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/factory/final-repair/dashboard"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"
        >
          Final Repair
        </Link>

        <Link
          href="/dashboard"
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}

function ItemsSummary({ items }) {
  return (
    <Panel title="Items Summary">
      <div className="grid max-h-[230px] gap-2 overflow-y-auto md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-gray-200 bg-white p-3"
          >
            <p className="text-xs font-semibold text-gray-500">
              {item.orders?.order_no || "-"} ·{" "}
              {item.orders?.customer_name || "-"}
            </p>

            <p className="mt-1 text-sm font-bold">{item.category}</p>

            <p className="text-xs text-gray-500">
              {item.sample_unique_id} · Die {item.die_no}
            </p>

            <p className="mt-2 text-xs font-bold">
              Qty: {item.selected_quantity}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <h4 className="mb-3 text-sm font-bold">{title}</h4>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <p className="mb-1 text-xs font-semibold text-gray-500">{label}</p>
      {children}
    </label>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

function GreenStat({ label, value }) {
  return (
    <div className="rounded-xl bg-green-50 p-3">
      <p className="text-xs font-semibold text-green-700">{label}</p>
      <p className="mt-1 text-sm font-bold text-green-800">{value}</p>
    </div>
  );
}

function Badge({ children, blue }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-bold ${
        blue ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-gray-700"
      }`}
    >
      {children}
    </span>
  );
}