"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import MobileBottomNav from "@/components/MobileBottomNav";

const KTS = ["9KT", "14KT", "18KT", "20KT", "22KT", "24KT"];
const LOSS_TYPES = ["Ghis", "Buff Loss", "Electropolishing Loss", "Scrap"];

export default function FinalRepairDashboardPage() {
  const { loading: authLoading } = useRequireAuth();
  const searchParams = useSearchParams();
  const [queues, setQueues] = useState([]);
  const [findings, setFindings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);

    const { data: queueData, error } = await supabase
      .from("repair_queue")
      .select(`
        *,
        casting_batches(
          *,
          casting_batch_items(*, orders(order_no, customer_name))
        )
      `)
      .eq("status", "Pending")
      .order("created_at", { ascending: false });

    const { data: findingData } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("is_active", true)
      .eq("item_type", "Finding")
      .order("item_name", { ascending: true });

    const { data: txData } = await supabase.from("inventory_transactions").select("*");

    const { data: noRepairBatches } = await supabase
  .from("casting_batches")
  .select(`
    *,
    casting_batch_items(*, orders(order_no, customer_name))
  `)
  .eq("status", "Final Repair");

    if (error) alert(error.message);

    const realQueues = queueData || [];

const queuedBatchIds = new Set(
  realQueues.map((q) => q.casting_batch_id).filter(Boolean)
);

const dummyNoRepairQueues = (noRepairBatches || [])
  .filter((b) => !queuedBatchIds.has(b.id))
  .map((b) => ({
    id: `no-repair-${b.id}`,
    no_repair: true,
    casting_batch_id: b.id,
    casting_batches: b,
    source_process: "No Repair Required",
    pending_pieces: Number(b.current_pieces || 0),
    pending_weight: Number(b.current_weight || 0),
    status: "Pending",
  }));

setQueues([...realQueues, ...dummyNoRepairQueues]);
    setFindings(findingData || []);
    setTransactions(txData || []);
    setLoading(false);
  }

  
  useEffect(() => {
    fetchData();
  }, []);

useEffect(() => {
  const batchId = searchParams.get("batch");
  if (batchId) {
    setOpenId(batchId);
  }
}, [searchParams]);

  const groupedBatches = useMemo(() => {
    const map = {};
    queues.forEach((q) => {
      const cb = q.casting_batches;
      if (!cb) return;
      if (!map[cb.id]) {
        map[cb.id] = {
          batch: cb,
          queues: [],
          pendingPieces: 0,
          pendingWeight: 0,
          sources: [],
        };
      }
      map[cb.id].queues.push(q);
      map[cb.id].pendingPieces += Number(q.pending_pieces || 0);
      map[cb.id].pendingWeight += Number(q.pending_weight || 0);
      if (q.source_process) map[cb.id].sources.push(q.source_process);
    });
    return Object.values(map);
  }, [queues]);

  if (authLoading || loading) {
    return <main className="min-h-screen bg-slate-100 p-6 text-sm text-gray-700">Loading final repair...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <Header />

        {groupedBatches.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
            No pending final repair.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {groupedBatches.map((group) => (
              <RepairCard
                key={group.batch.id}
                group={group}
                findings={findings}
                transactions={transactions}
                isOpen={openId === group.batch.id}
                onOpen={() => setOpenId(openId === group.batch.id ? null : group.batch.id)}
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

function RepairCard({ group, findings, transactions, isOpen, onOpen, onRefresh }) {
  const router = useRouter();
  const batch = group.batch;
  const items = batch.casting_batch_items || [];

  const [karigar, setKarigar] = useState("");
  const [issuedBy, setIssuedBy] = useState("");

  const [issuedPieces, setIssuedPieces] = useState(group.pendingPieces);
  const [issuedWeight, setIssuedWeight] = useState(group.pendingWeight);

  const [receivedPieces, setReceivedPieces] = useState("");
  const [receivedWeight, setReceivedWeight] = useState("");
  const [rejectedPieces, setRejectedPieces] = useState("");
  const [rejectedWeight, setRejectedWeight] = useState("");
  const [remarks, setRemarks] = useState("");

  const [findingRows, setFindingRows] = useState([]);
  const [lossRows, setLossRows] = useState([
    { loss_type: "Ghis", weight: "", remarks: "" },
  ]);

  const [saving, setSaving] = useState(false);

  const parties = [...new Set(items.map((i) => i.orders?.customer_name).filter(Boolean))];
  const orders = [...new Set(items.map((i) => i.orders?.order_no).filter(Boolean))];

  const findingsIssuedWeight = findingRows.reduce((s, r) => s + Number(r.issued_weight || 0), 0);
  const findingsReceivedWeight = findingRows.reduce((s, r) => s + Number(r.received_weight || 0), 0);
  const lossBreakupWeight = lossRows.reduce((s, r) => s + Number(r.weight || 0), 0);

  const calculatedRepairLoss =
    Number(issuedWeight || 0) +
    findingsIssuedWeight -
    Number(receivedWeight || 0) -
    findingsReceivedWeight -
    Number(rejectedWeight || 0);

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
        finding_item_id: "",
        finding_name: "",
        kt: batch.kt,
        issued_by: issuedBy,
        issued_weight: "",
        issued_qty: "",
        received_weight: "",
        received_qty: "",
        remarks: "",
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

  function addLossRow() {
    setLossRows((prev) => [...prev, { loss_type: "Ghis", weight: "", remarks: "" }]);
  }

  function updateLoss(index, field, value) {
    setLossRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  async function stockInScrap(weight, qty, purpose, note) {
    if (Number(weight || 0) <= 0) return true;

    const { data: scrapItem } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("item_type", "Scrap")
      .eq("item_name", "Casting Scrap")
      .maybeSingle();

    if (!scrapItem?.id) {
      alert("Scrap item not found: Scrap / Casting Scrap");
      return false;
    }

    const { error } = await supabase.from("inventory_transactions").insert([
      {
        inventory_item_id: scrapItem.id,
        kt: batch.kt,
        transaction_type: "Stock In",
        purpose,
        reference_no: batch.batch_no,
        weight: Number(weight || 0),
        quantity: Number(qty || 0),
        weight_source: "manual",
        remarks: note,
      },
    ]);

    if (error) {
      alert(error.message);
      return false;
    }

    return true;
  }

  async function saveFinalRepair() {
    if (!receivedWeight) return alert("Received weight required");

    setSaving(true);

    for (const row of findingRows) {
      if (!row.finding_item_id) continue;
      const issueWt = Number(row.issued_weight || 0);
      if (issueWt > 0) {
        const available = stockBalance(row.finding_item_id, row.kt);
        if (available < issueWt) {
          setSaving(false);
          alert(`${row.finding_name} ${row.kt} stock कम है. Required ${issueWt.toFixed(3)}g, Available ${available.toFixed(3)}g`);
          return;
        }
      }
    }

    const { data: result, error } = await supabase
      .from("final_repair_results")
      .insert([
        {
          casting_batch_id: batch.id,
          karigar_name: karigar,
          issued_by: issuedBy,
          issued_pieces: Number(issuedPieces || 0),
          issued_weight: Number(issuedWeight || 0),
          findings_issued_weight: findingsIssuedWeight,
          findings_received_weight: findingsReceivedWeight,
          received_pieces: Number(receivedPieces || 0),
          received_weight: Number(receivedWeight || 0),
          rejected_pieces: Number(rejectedPieces || 0),
          rejected_weight: Number(rejectedWeight || 0),
          repair_loss_weight: calculatedRepairLoss,
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

    for (const row of findingRows) {
      if (!row.finding_item_id) continue;

      const issueWt = Number(row.issued_weight || 0);

      await supabase.from("final_repair_findings").insert([
        {
          casting_batch_id: batch.id,
          final_repair_result_id: result.id,
          finding_item_id: row.finding_item_id,
          finding_name: row.finding_name,
          kt: row.kt,
          issued_by: row.issued_by || issuedBy,
          issued_weight: issueWt,
          issued_qty: Number(row.issued_qty || 0),
          received_weight: Number(row.received_weight || 0),
          received_qty: Number(row.received_qty || 0),
          remarks: row.remarks || "",
        },
      ]);

      if (issueWt > 0) {
        await supabase.from("inventory_transactions").insert([
          {
            inventory_item_id: row.finding_item_id,
            kt: row.kt,
            transaction_type: "Stock Out",
            purpose: "Final Repair Finding Issue",
            reference_no: batch.batch_no,
            weight: issueWt,
            quantity: Number(row.issued_qty || 0),
            weight_source: "manual",
            remarks: `${row.finding_name} issued in final repair`,
          },
          
        ]);

      }
      const receiveWt = Number(row.received_weight || 0);

if (receiveWt > 0) {
  await supabase.from("inventory_transactions").insert([
    {
      inventory_item_id: row.finding_item_id,
      kt: row.kt,
      transaction_type: "Stock In",
      purpose: "Final Repair Finding Return",
      reference_no: batch.batch_no,
      weight: receiveWt,
      quantity: Number(row.received_qty || 0),
      weight_source: "manual",
      remarks: `${row.finding_name} received back from final repair`,
    },
  ]);
}
    }
    


    for (const row of lossRows) {
      const wt = Number(row.weight || 0);
      if (wt <= 0) continue;

      await supabase.from("final_repair_loss_breakup").insert([
        {
          final_repair_result_id: result.id,
          casting_batch_id: batch.id,
          loss_type: row.loss_type,
          kt: batch.kt,
          weight: wt,
          remarks: row.remarks || "",
        },
      ]);

      if (row.loss_type === "Ghis") {
        await supabase.from("ghis_records").insert([
          {
            casting_batch_id: batch.id,
            kt: batch.kt,
            source_process: "Final Repair",
            ghis_weight: wt,
            recovery_status: "Pending",
            remarks: row.remarks || `Final repair ghis from ${batch.batch_no}`,
          },
        ]);
      }

      if (row.loss_type === "Buff Loss") {
        await supabase.from("buff_loss_records").insert([
          {
            casting_batch_id: batch.id,
            kt: batch.kt,
            loss_weight: wt,
            recovery_status: "Pending",
            remarks: row.remarks || `Final repair buff loss from ${batch.batch_no}`,
          },
        ]);
      }

      if (row.loss_type === "Electropolishing Loss") {
        await supabase.from("electro_polish_loss_records").insert([
          {
            casting_batch_id: batch.id,
            kt: batch.kt,
            loss_weight: wt,
            recovery_status: "Pending",
            remarks: row.remarks || `Final repair electropolish loss from ${batch.batch_no}`,
          },
        ]);
      }

      if (row.loss_type === "Scrap") {
        const ok = await stockInScrap(wt, 0, "Final Repair Loss Scrap", row.remarks || "Final repair loss moved to scrap");
        if (!ok) {
          setSaving(false);
          return;
        }
      }
    }

    const rejectedOk = await stockInScrap(
      rejectedWeight,
      rejectedPieces,
      "Final Repair Rejection",
      "Rejected pieces from final repair moved to same KT scrap"
    );

    if (!rejectedOk) {
      setSaving(false);
      return;
    }

const realQueueIds = group.queues
  .filter((q) => !q.no_repair)
  .map((q) => q.id);

if (realQueueIds.length > 0) {
  await supabase
    .from("repair_queue")
    .update({
      status: "Completed",
      repaired_pieces: Number(receivedPieces || 0),
      repaired_weight: Number(receivedWeight || 0),
      rejected_pieces: Number(rejectedPieces || 0),
      rejected_weight: Number(rejectedWeight || 0),
    })
    .in("id", realQueueIds);
}

 const isNoRepair = group.queues.some((q) => q.no_repair);

const nextPieces = isNoRepair
  ? Number(receivedPieces || batch.current_pieces || 0)
  : Number(batch.current_pieces || 0) + Number(receivedPieces || 0);

const nextWeight = isNoRepair
  ? Number(receivedWeight || batch.current_weight || 0)
  : Number(batch.current_weight || 0) + Number(receivedWeight || 0);

const { error: updateError } = await supabase
  .from("casting_batches")
  .update({
    status: "Stone Setting",
    current_process: "stone-setting",
    current_pieces: nextPieces,
    current_weight: nextWeight,
  })
  .eq("id", batch.id);

    if (updateError) {
      setSaving(false);
      alert(updateError.message);
      return;
    }

setSaving(false);
router.push(`/factory/stone-setting/dashboard?batch=${batch.id}`);
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{batch.batch_no}</h3>
            <Badge>{batch.kt}</Badge>
            <Badge blue>Final Repair</Badge>
          </div>
          <p className="mt-2 text-xs font-semibold text-gray-500">Party: {parties.join(", ") || "-"}</p>
          <p className="text-xs text-gray-500">Order: {orders.join(", ") || "-"}</p>
        </div>
        <button onClick={onOpen} className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white">
          {isOpen ? "Close" : "Open"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="Pending Pcs" value={group.pendingPieces} />
        <MiniStat label="Pending Wt" value={`${group.pendingWeight.toFixed(3)}g`} />
        <MiniStat label="Sources" value={[...new Set(group.sources)].join(", ") || "-"} />
      </div>

      {isOpen && (
        <div className="mt-5 space-y-4">
          <ItemsSummary items={items} />

          <Panel title="Findings Issue / Receive">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Issued By">
                <input value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} className="input" />
              </Field>
              <div className="flex items-end">
                <button onClick={addFindingRow} className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white">
                  + Add Finding
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {findingRows.map((row, index) => (
                <div key={index} className="rounded-2xl border border-gray-200 bg-white p-3">
                  <div className="grid gap-2 md:grid-cols-4">
                    <Field label="Finding">
                      <select value={row.finding_item_id} onChange={(e) => updateFinding(index, "finding_item_id", e.target.value)} className="input">
                        <option value="">Select</option>
                        {findings.map((f) => <option key={f.id} value={f.id}>{f.item_name}</option>)}
                      </select>
                    </Field>
                    <Field label="KT">
                      <select value={row.kt} onChange={(e) => updateFinding(index, "kt", e.target.value)} className="input">
                        {KTS.map((k) => <option key={k}>{k}</option>)}
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
                      <button onClick={() => setFindingRows((p) => p.filter((_, i) => i !== index))} className="w-full rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <GreenStat label="Findings Issued" value={`${findingsIssuedWeight.toFixed(3)}g`} />
              <GreenStat label="Findings Received" value={`${findingsReceivedWeight.toFixed(3)}g`} />
            </div>
          </Panel>

          <Panel title="Repair Result">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Karigar Name"><input value={karigar} onChange={(e) => setKarigar(e.target.value)} className="input" /></Field>
              <Field label="Issued Pieces"><input type="number" value={issuedPieces} onChange={(e) => setIssuedPieces(e.target.value)} className="input" /></Field>
              <Field label="Issued Weight"><input type="number" step="0.001" value={issuedWeight} onChange={(e) => setIssuedWeight(e.target.value)} className="input" /></Field>
              <Field label="Received Pieces"><input type="number" value={receivedPieces} onChange={(e) => setReceivedPieces(e.target.value)} className="input" /></Field>
              <Field label="Received Weight"><input type="number" step="0.001" value={receivedWeight} onChange={(e) => setReceivedWeight(e.target.value)} className="input" /></Field>
              <Field label="Rejected Pieces"><input type="number" value={rejectedPieces} onChange={(e) => setRejectedPieces(e.target.value)} className="input" /></Field>
              <Field label="Rejected Weight"><input type="number" step="0.001" value={rejectedWeight} onChange={(e) => setRejectedWeight(e.target.value)} className="input" /></Field>
              <Field label="Calculated Loss"><div className="rounded-xl bg-orange-50 p-3 text-sm font-bold text-orange-700">{calculatedRepairLoss.toFixed(3)} g</div></Field>
              <Field label="Loss Breakup Total"><div className="rounded-xl bg-green-50 p-3 text-sm font-bold text-green-800">{lossBreakupWeight.toFixed(3)} g</div></Field>
            </div>
          </Panel>

          <Panel title="Loss Type Breakup">
            <button onClick={addLossRow} className="mb-3 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white">+ Add Loss Type</button>
            <div className="space-y-2">
              {lossRows.map((row, index) => (
                <div key={index} className="grid gap-2 rounded-2xl bg-slate-50 p-3 md:grid-cols-4">
                  <select value={row.loss_type} onChange={(e) => updateLoss(index, "loss_type", e.target.value)} className="input">
                    {LOSS_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <input type="number" step="0.001" placeholder="Weight" value={row.weight} onChange={(e) => updateLoss(index, "weight", e.target.value)} className="input" />
                  <input placeholder="Remarks" value={row.remarks} onChange={(e) => updateLoss(index, "remarks", e.target.value)} className="input" />
                  <button onClick={() => setLossRows((p) => p.filter((_, i) => i !== index))} className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">Remove</button>
                </div>
              ))}
            </div>
          </Panel>

          <Field label="Remarks">
            <textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="input" />
          </Field>

          <p className="text-xs text-gray-500">
            Repair Loss = (Issued Weight + Findings Issued) - (Received Weight + Findings Received + Rejected Weight)
          </p>

          <button disabled={saving} onClick={saveFinalRepair} className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:bg-gray-400">
            {saving ? "Saving..." : "Save & Move To Stone Setting"}
          </button>
        </div>
      )}
    </section>
  );
}

function Header() {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Final Repair</h1>
        <p className="text-sm text-gray-600">Combined repair queue, findings issue/receive and loss breakup.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/factory/pre-polish/dashboard" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm">Pre Polish</Link>
        <Link href="/dashboard" className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white">Dashboard</Link>
      </div>
    </div>
  );
}

function ItemsSummary({ items }) {
  return (
    <Panel title="Items Summary">
      <div className="grid max-h-[230px] gap-2 overflow-y-auto md:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs font-semibold text-gray-500">{item.orders?.order_no || "-"} · {item.orders?.customer_name || "-"}</p>
            <p className="mt-1 text-sm font-bold">{item.category}</p>
            <p className="text-xs text-gray-500">{item.sample_unique_id} · Die {item.die_no}</p>
            <p className="mt-2 text-xs font-bold">Qty: {item.selected_quantity}</p>
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
  return <label className="block"><p className="mb-1 text-xs font-semibold text-gray-500">{label}</p>{children}</label>;
}

function MiniStat({ label, value }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-gray-500">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>;
}

function GreenStat({ label, value }) {
  return <div className="rounded-xl bg-green-50 p-3"><p className="text-xs font-semibold text-green-700">{label}</p><p className="mt-1 text-sm font-bold text-green-800">{value}</p></div>;
}

function Badge({ children, blue }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-bold ${blue ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-gray-700"}`}>{children}</span>;
}