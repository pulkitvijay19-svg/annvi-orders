"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import MobileBottomNav from "@/components/MobileBottomNav";


const KTS = ["9KT", "14KT", "18KT", "20KT", "22KT", "24KT"];

export default function BenchDashboardPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-100 p-6">Loading...</main>}>
      <BenchDashboardContent />
    </Suspense>
  );
}

function BenchDashboardContent() {
  const { loading: authLoading } = useRequireAuth();
  const [targetBatchNo, setTargetBatchNo] = useState("");
  const [batches, setBatches] = useState([]);
  const [findings, setFindings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);

    const { data: batchData, error } = await supabase
      .from("casting_batches")
      .select(`
        *,
        casting_batch_items(*, orders(order_no, customer_name)),
        bench_findings(*)
      `)
      .eq("status", "Filing")
      .order("created_at", { ascending: false });

    const { data: findingData } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("is_active", true)
      .eq("item_type", "Finding")
      .order("item_name", { ascending: true });

    const { data: txData } = await supabase
      .from("inventory_transactions")
      .select("*");

    if (error) alert(error.message);

    setBatches(batchData || []);
    setFindings(findingData || []);
    setTransactions(txData || []);
    setLoading(false);
  }
useEffect(() => {
  fetchData();
}, []);
useEffect(() => {
  const batchId = targetBatchNo;
  if (batchId) {
    setOpenId(batchId);
  }
}, [targetBatchNo]);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  setTargetBatchNo(params.get("batch") || "");
}, []);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <p className="text-sm text-gray-700">Loading bench dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overscroll-y-contain bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <Header />

        {batches.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
            No batches in Filing + Assembly + Solder.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {batches.map((batch) => (
              <BenchCard
                key={batch.id}
                batch={batch}
                findings={findings}
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

function BenchCard({ batch, findings, transactions, isOpen, onOpen, onRefresh }) {
  const router = useRouter();
  const items = batch.casting_batch_items || [];
  const oldFindings = batch.bench_findings || [];

  const [karigar, setKarigar] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [issuedPieces, setIssuedPieces] = useState(batch.good_pieces || 0);
  const [issuedWeight, setIssuedWeight] = useState(batch.received_weight || 0);
  const [receivedPieces, setReceivedPieces] = useState("");
  const [receivedWeight, setReceivedWeight] = useState("");
  const [ghisWeight, setGhisWeight] = useState("");
  const [brokenPieces, setBrokenPieces] = useState("");
  const [repairPieces, setRepairPieces] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingFindings, setSavingFindings] = useState(false);

  const [findingRows, setFindingRows] = useState(() =>
    oldFindings.map((f) => ({
      id: f.id,
      finding_item_id: f.finding_item_id || "",
      finding_name: f.finding_name || "",
      kt: f.kt || batch.kt,
      issued_by: f.issued_by || "",
      issued_weight: f.issued_weight || "",
      issued_qty: f.issued_qty || "",
      received_weight: f.received_weight || "",
      received_qty: f.received_qty || "",
      remarks: f.remarks || "",
      old_issued_weight: Number(f.issued_weight || 0),
      stock_issued_done_weight: Number(f.stock_issued_done_weight || 0),
      stock_received_done_weight: Number(f.stock_received_done_weight || 0),
    }))
  );

  const parties = [...new Set(items.map((i) => i.orders?.customer_name).filter(Boolean))];
  const orders = [...new Set(items.map((i) => i.orders?.order_no).filter(Boolean))];

  const findingsIssuedWeight = findingRows.reduce((s, r) => s + Number(r.issued_weight || 0), 0);
  const findingsReceivedWeight = findingRows.reduce((s, r) => s + Number(r.received_weight || 0), 0);

  const filingLoss =
    Number(issuedWeight || 0) +
    findingsIssuedWeight -
    Number(receivedWeight || 0) -
    findingsReceivedWeight -
    Number(ghisWeight || 0);

  function stockBalance(itemId, kt) {
    return transactions.reduce((sum, tx) => {
      if (tx.inventory_item_id !== itemId || (tx.kt || "") !== kt) return sum;
      return sum + (tx.transaction_type === "Stock Out" ? -1 : 1) * Number(tx.weight || 0);
    }, 0);
  }

  function addFindingRow() {
    setFindingRows((prev) => [
      ...prev,
      {
        id: null,
        finding_item_id: "",
        finding_name: "",
        kt: batch.kt,
        issued_by: issuedBy,
        issued_weight: "",
        issued_qty: "",
        received_weight: "",
        received_qty: "",
        remarks: "",
        old_issued_weight: 0,
      },
    ]);
  }

  function updateFinding(index, field, value) {
    setFindingRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, [field]: value };
        if (field === "finding_item_id") {
          const item = findings.find((f) => f.id === value);
          next.finding_name = item?.item_name || "";
        }
        return next;
      })
    );
  }

  function removeFinding(index) {
    setFindingRows((prev) => prev.filter((_, i) => i !== index));
  }

async function saveFindingsOnly() {
  setSavingFindings(true);

  const updatedRows = [...findingRows];

  for (let index = 0; index < updatedRows.length; index++) {
    const row = updatedRows[index];
    if (!row.finding_item_id) continue;

    const issuedWt = Number(row.issued_weight || 0);
    const receivedWt = Number(row.received_weight || 0);

    const issueDone = Number(row.stock_issued_done_weight || 0);
    const receiveDone = Number(row.stock_received_done_weight || 0);

    const issueDelta = issuedWt - issueDone;
    const receiveDelta = receivedWt - receiveDone;

    if (issueDelta > 0) {
      const available = stockBalance(row.finding_item_id, row.kt);

      if (available < issueDelta) {
        setSavingFindings(false);
        alert(
          `${row.finding_name} ${row.kt} stock कम है.\nRequired ${issueDelta.toFixed(
            3
          )}g, Available ${available.toFixed(3)}g`
        );
        return false;
      }
    }

    const payload = {
      casting_batch_id: batch.id,
      finding_item_id: row.finding_item_id,
      finding_name: row.finding_name,
      kt: row.kt,
      issued_by: row.issued_by || issuedBy,
      issued_weight: issuedWt,
      issued_qty: Number(row.issued_qty || 0),
      received_weight: receivedWt,
      received_qty: Number(row.received_qty || 0),
      stock_issued_done_weight: issuedWt,
      stock_received_done_weight: receivedWt,
      remarks: row.remarks || "",
    };

    let savedId = row.id;

    if (row.id) {
      const { error } = await supabase
        .from("bench_findings")
        .update(payload)
        .eq("id", row.id);

      if (error) {
        setSavingFindings(false);
        alert(error.message);
        return false;
      }
    } else {
      const { data, error } = await supabase
        .from("bench_findings")
        .insert([payload])
        .select()
        .single();

      if (error) {
        setSavingFindings(false);
        alert(error.message);
        return false;
      }

      savedId = data.id;
    }

    if (issueDelta > 0) {
      const { error } = await supabase.from("inventory_transactions").insert([
        {
          inventory_item_id: row.finding_item_id,
          kt: row.kt,
          transaction_type: "Stock Out",
          purpose: "Bench Finding Issue",
          reference_no: batch.batch_no,
          weight: issueDelta,
          quantity: Number(row.issued_qty || 0),
          weight_source: "manual",
          remarks: `${row.finding_name} issued in bench process`,
        },
      ]);

      if (error) {
        setSavingFindings(false);
        alert(error.message);
        return false;
      }
    }

    if (receiveDelta > 0) {
      const { error } = await supabase.from("inventory_transactions").insert([
        {
          inventory_item_id: row.finding_item_id,
          kt: row.kt,
          transaction_type: "Stock In",
          purpose: "Bench Finding Return",
          reference_no: batch.batch_no,
          weight: receiveDelta,
          quantity: Number(row.received_qty || 0),
          weight_source: "manual",
          remarks: `${row.finding_name} returned from bench process`,
        },
      ]);

      if (error) {
        setSavingFindings(false);
        alert(error.message);
        return false;
      }
    }

    updatedRows[index] = {
      ...row,
      id: savedId,
      stock_issued_done_weight: issuedWt,
      stock_received_done_weight: receivedWt,
    };
  }

  setFindingRows(updatedRows);
  setSavingFindings(false);
  return true;
}

  async function saveBenchResult() {
    if (!receivedWeight) return alert("Received pieces weight required");

    setSaving(true);

    const findingsOk = await saveFindingsOnly();
    if (!findingsOk) {
      setSaving(false);
      return;
    }

    const resultPayload = {
      casting_batch_id: batch.id,
      karigar_name: karigar,
      issued_by: issuedBy,

      issued_pieces: Number(issuedPieces || 0),
      issued_weight: Number(issuedWeight || 0),

      findings_issued_weight: findingsIssuedWeight,
      findings_received_weight: findingsReceivedWeight,

      received_pieces: Number(receivedPieces || 0),
      received_weight: Number(receivedWeight || 0),

      scrap_weight: 0,
      ghis_weight: Number(ghisWeight || 0),
      loss_weight: filingLoss,

      broken_pieces: Number(brokenPieces || 0),
      repair_pieces: Number(repairPieces || 0),

      remarks,
    };

    const { data: benchResult, error } = await supabase
      .from("bench_results")
      .insert([resultPayload])
      .select()
      .single();

    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }

    if (Number(ghisWeight || 0) > 0) {
      const { error: ghisError } = await supabase.from("ghis_records").insert([
        {
          casting_batch_id: batch.id,
          bench_result_id: benchResult.id,
          kt: batch.kt,
          source_process: "Filing + Assembly + Solder",
          ghis_weight: Number(ghisWeight || 0),
          recovered_weight: 0,
          recovery_loss: 0,
          recovery_status: "Pending",
          remarks: `Ghis from ${batch.batch_no}`,
        },
      ]);

      if (ghisError) {
        setSaving(false);
        alert(ghisError.message);
        return;
      }
    }

    const { error: updateError } =await supabase
  .from("casting_batches")
  .update({
    status: "Pre Polish",

    current_pieces: Number(receivedPieces || 0),

    current_weight: Number(receivedWeight || 0),
  })
  .eq("id", batch.id);
  
    if (updateError) {
      setSaving(false);
      alert(updateError.message);
      return;
    }

  setSaving(false);
router.push(`/factory/pre-polish/dashboard?batch=${batch.id}`);
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{batch.batch_no}</h3>
            <Badge>{batch.kt}</Badge>
            <Badge blue>Filing</Badge>
          </div>
          <p className="mt-2 text-xs font-semibold text-gray-500">Party: {parties.join(", ") || "-"}</p>
          <p className="text-xs text-gray-500">Order: {orders.join(", ") || "-"}</p>
        </div>

        <button onClick={onOpen} className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white">
          {isOpen ? "Close" : "Open"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="Good Pcs" value={batch.good_pieces || 0} />
        <MiniStat label="Issue Wt" value={`${Number(batch.received_weight || 0).toFixed(3)}g`} />
        <MiniStat label="Casting Loss" value={`${Number(batch.casting_loss || 0).toFixed(3)}g`} />
      </div>

      {isOpen && (
        <div className="mt-5 space-y-4">
          <ItemsSummary items={items} />

          <div className="rounded-3xl bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold">Findings Issue / Receive</h4>
              <button onClick={addFindingRow} className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white">
                + Add Finding
              </button>
            </div>

            <div className="mb-3">
              <Field label="Issued By">
                <input value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} className="input" placeholder="Name" />
              </Field>
            </div>

            <div className="space-y-3">
              {findingRows.length === 0 ? (
                <p className="text-sm text-gray-500">No findings issued yet.</p>
              ) : (
                findingRows.map((row, index) => (
                  <div key={index} className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="grid gap-2 md:grid-cols-4">
                      <Field label="Finding">
                        <select
                          value={row.finding_item_id}
                          onChange={(e) => updateFinding(index, "finding_item_id", e.target.value)}
                          className="input"
                        >
                          <option value="">Select</option>
                          {findings.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.item_name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="KT">
                        <select value={row.kt} onChange={(e) => updateFinding(index, "kt", e.target.value)} className="input">
                          {KTS.map((k) => (
                            <option key={k}>{k}</option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Issued Wt">
                        <input type="number" step="0.001" value={row.issued_weight} onChange={(e) => updateFinding(index, "issued_weight", e.target.value)} className="input" />
                      </Field>

                      <Field label="Issued Qty">
                        <input type="number" value={row.issued_qty} onChange={(e) => updateFinding(index, "issued_qty", e.target.value)} className="input" />
                      </Field>

                      <Field label="Received Wt">
                        <input type="number" step="0.001" value={row.received_weight} onChange={(e) => updateFinding(index, "received_weight", e.target.value)} className="input" />
                      </Field>

                      <Field label="Received Qty">
                        <input type="number" value={row.received_qty} onChange={(e) => updateFinding(index, "received_qty", e.target.value)} className="input" />
                      </Field>

                      <Field label="Remarks">
                        <input value={row.remarks} onChange={(e) => updateFinding(index, "remarks", e.target.value)} className="input" />
                      </Field>

                      <div className="flex items-end">
                        <button onClick={() => removeFinding(index)} className="w-full rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <GreenStat label="Findings Issued" value={`${findingsIssuedWeight.toFixed(3)}g`} />
              <GreenStat label="Findings Received" value={`${findingsReceivedWeight.toFixed(3)}g`} />
            </div>

            <button disabled={savingFindings} onClick={saveFindingsOnly} className="mt-3 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:bg-gray-400">
              {savingFindings ? "Saving..." : "Save / Edit Findings"}
            </button>
          </div>

          <div className="rounded-3xl border border-gray-200 p-4">
            <h4 className="mb-3 text-sm font-bold">Filing + Assembly + Solder Result</h4>

            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Karigar Name">
                <input value={karigar} onChange={(e) => setKarigar(e.target.value)} className="input" />
              </Field>

              <Field label="Issued Pieces">
                <input type="number" value={issuedPieces} onChange={(e) => setIssuedPieces(e.target.value)} className="input" />
              </Field>

              <Field label="Issued Pieces Weight">
                <input type="number" step="0.001" value={issuedWeight} onChange={(e) => setIssuedWeight(e.target.value)} className="input" />
              </Field>

              <Field label="Received Pieces">
                <input type="number" value={receivedPieces} onChange={(e) => setReceivedPieces(e.target.value)} className="input" />
              </Field>

              <Field label="Received Pieces Weight">
                <input type="number" step="0.001" value={receivedWeight} onChange={(e) => setReceivedWeight(e.target.value)} className="input" />
              </Field>

              <Field label="Ghis Weight Received">
                <input type="number" step="0.001" value={ghisWeight} onChange={(e) => setGhisWeight(e.target.value)} className="input" />
              </Field>

              <Field label="Broken Pieces">
                <input type="number" value={brokenPieces} onChange={(e) => setBrokenPieces(e.target.value)} className="input" />
              </Field>

              <Field label="Repair Pieces">
                <input type="number" value={repairPieces} onChange={(e) => setRepairPieces(e.target.value)} className="input" />
              </Field>

              <Field label="Filing Loss">
                <div className="rounded-xl bg-orange-50 p-3 text-sm font-bold text-orange-700">
                  {filingLoss.toFixed(3)} g
                </div>
              </Field>
            </div>

            <div className="mt-3">
              <Field label="Remarks">
                <textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="input" />
              </Field>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Filing Loss = (Pieces Issued Wt + Findings Issued Wt) - (Pieces Received Wt + Findings Received Wt + Ghis Wt)
            </p>

            <button disabled={saving} onClick={saveBenchResult} className="mt-4 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:bg-gray-400">
              {saving ? "Saving..." : "Move To Pre Polish"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ItemsSummary({ items }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <h4 className="mb-2 text-sm font-bold">Items Summary</h4>
      <div className="grid max-h-[230px] gap-2 overflow-y-auto md:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs font-semibold text-gray-500">
              {item.orders?.order_no || "-"} · {item.orders?.customer_name || "-"}
            </p>
            <p className="mt-1 text-sm font-bold">{item.category}</p>
            <p className="text-xs text-gray-500">
              {item.sample_unique_id} · Die {item.die_no}
            </p>
            <p className="mt-2 text-xs font-bold">Qty: {item.selected_quantity}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Filing + Assembly + Solder</h1>
        <p className="text-sm text-gray-600">Findings issue, ghis recovery and bench loss tracking.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/factory/magnet/process" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm">
          Magnet
        </Link>
        <Link href="/dashboard" className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white">
          Dashboard
        </Link>
      </div>
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
    <span className={`rounded-full px-2 py-1 text-xs font-bold ${blue ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-gray-700"}`}>
      {children}
    </span>
  );
}