"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import { useRequireAuth } from "../../../lib/useRequireAuth";
import MobileBottomNav from "../../../components/MobileBottomNav";

const PROCESS_ORDER = [
  "Casting",
  "Magnet",
  "Filing",
  "Pre Polish",
  "Final Repair",
  "Stone Setting",
  "Buff",
  "Final Inspection QC",
  "Rhodium / Plating",
  "Tag Print",
  "Sale",
];

const ROLLBACK_TARGETS = PROCESS_ORDER.slice(0, 9); // Casting → Rhodium only

const PROCESS_LABELS = {
  Casting: "Casting",
  Magnet: "Magnet",
  Filing: "Filing / Bench",
  "Pre Polish": "Pre Polish",
  "Final Repair": "Final Repair",
  "Stone Setting": "Stone Setting",
  Buff: "Buff",
  "Final Inspection QC": "Final QC",
  "Rhodium / Plating": "Rhodium / Plating",
  "Tag Print": "Tag Print",
  Sale: "Sale",
};

function n(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function fmt(value) {
  return n(value).toFixed(3);
}

function normalizeProcess(value) {
  const raw = String(value || "").trim().toLowerCase();
  const map = {
    casting: "Casting",
    magnet: "Magnet",
    filing: "Filing",
    bench: "Filing",
    "filing / bench": "Filing",
    "pre polish": "Pre Polish",
    "pre-polish": "Pre Polish",
    "final repair": "Final Repair",
    "final-repair": "Final Repair",
    "stone setting": "Stone Setting",
    "stone-setting": "Stone Setting",
    buff: "Buff",
    "final inspection qc": "Final Inspection QC",
    "final qc": "Final Inspection QC",
    "final-qc": "Final Inspection QC",
    "rhodium / plating": "Rhodium / Plating",
    rhodium: "Rhodium / Plating",
    "tag print": "Tag Print",
    "tag-print": "Tag Print",
    sale: "Sale",
    completed: "Completed",
  };
  return map[raw] || value || "-";
}

function getCurrentProcess(batch) {
  return normalizeProcess(batch.current_process || batch.status);
}

function getCurrentWeight(batch) {
  if (batch.current_weight !== null && batch.current_weight !== undefined) return n(batch.current_weight);
  if (batch.received_weight !== null && batch.received_weight !== undefined) return n(batch.received_weight);
  return 0;
}

function getCurrentPieces(batch) {
  if (batch.current_pieces !== null && batch.current_pieces !== undefined) return n(batch.current_pieces);
  if (batch.good_pieces !== null && batch.good_pieces !== undefined) return n(batch.good_pieces);
  return 0;
}

function getBatchOrders(batch) {
  return [...new Set((batch.casting_batch_items || []).map((x) => x.orders?.order_no).filter(Boolean))];
}

function getBatchParties(batch) {
  return [...new Set((batch.casting_batch_items || []).map((x) => x.orders?.customer_name).filter(Boolean))];
}

function getRollbackTargets(batch, openRework) {
  if (openRework) return [];
  const current = getCurrentProcess(batch);
  const currentIndex = PROCESS_ORDER.indexOf(current);
  if (currentIndex <= 0 || current === "Sale" || current === "Completed") return [];
  return ROLLBACK_TARGETS.filter((target) => PROCESS_ORDER.indexOf(target) < currentIndex);
}

export default function ProcessControlPage() {
  const { loading: authLoading } = useRequireAuth();
  const [batches, setBatches] = useState([]);
  const [reworks, setReworks] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [processFilter, setProcessFilter] = useState("ALL");
  const [openBatchId, setOpenBatchId] = useState(null);
  const [rollbackBatch, setRollbackBatch] = useState(null);
  const [rollbackTarget, setRollbackTarget] = useState("");
  const [rollbackReason, setRollbackReason] = useState("");
  const [rollbackSaving, setRollbackSaving] = useState(false);
  const [rollbackError, setRollbackError] = useState("");
  const [rollbackSuccess, setRollbackSuccess] = useState("");

  async function fetchData() {
    setLoading(true);
    setErrorMessage("");
    const [batchResult, reworkResult, historyResult] = await Promise.all([
      supabase
        .from("casting_batches")
        .select(`*, casting_batch_items(*, orders(id, order_no, customer_name))`)
        .order("created_at", { ascending: false }),
      supabase.from("process_reworks").select("*").order("requested_at", { ascending: false }),
      supabase.from("process_history").select("*").order("created_at", { ascending: false }),
    ]);

    const firstError = batchResult.error || reworkResult.error || historyResult.error;
    if (firstError) {
      setErrorMessage(firstError.message);
      setLoading(false);
      return;
    }
    setBatches(batchResult.data || []);
    setReworks(reworkResult.data || []);
    setHistory(historyResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filteredBatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches.filter((batch) => {
      const current = getCurrentProcess(batch);
      if (processFilter !== "ALL" && current !== processFilter && normalizeProcess(batch.status) !== processFilter) return false;
      if (!q) return true;
      const haystack = [
        batch.batch_no,
        batch.kt,
        batch.status,
        batch.current_process,
        current,
        ...getBatchOrders(batch),
        ...getBatchParties(batch),
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [batches, search, processFilter]);

  const activeReworkCount = reworks.filter((x) => x.status === "OPEN" || x.status === "IN_PROGRESS").length;

  function openSendBack(batch, openRework) {
    const targets = getRollbackTargets(batch, openRework);
    if (!targets.length) return;
    setRollbackBatch(batch);
    setRollbackTarget(targets[targets.length - 1]);
    setRollbackReason("");
    setRollbackError("");
    setRollbackSuccess("");
  }

  function closeSendBack() {
    if (rollbackSaving) return;
    setRollbackBatch(null);
    setRollbackTarget("");
    setRollbackReason("");
    setRollbackError("");
    setRollbackSuccess("");
  }

  async function confirmSendBack() {
    if (!rollbackBatch) return;
    const reason = rollbackReason.trim();
    if (!rollbackTarget) return setRollbackError("Select the process to send this batch back to.");
    if (!reason) return setRollbackError("Reason is required.");

    setRollbackSaving(true);
    setRollbackError("");
    setRollbackSuccess("");

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = userData?.user || null;
      const requestedByName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || null;

      const { data, error } = await supabase.rpc("send_batch_back_to_process", {
        p_casting_batch_id: rollbackBatch.id,
        p_target_process: rollbackTarget,
        p_reason: reason,
        p_requested_by: user?.id || null,
        p_requested_by_name: requestedByName,
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data?.message || data?.error || "Rollback was not completed.");

      setRollbackSuccess(`${data?.batch_no || rollbackBatch.batch_no} sent back to ${PROCESS_LABELS[rollbackTarget] || rollbackTarget}.`);
      await fetchData();
      setTimeout(closeSendBack, 900);
    } catch (error) {
      setRollbackError(error?.message || "Unable to send batch back.");
    } finally {
      setRollbackSaving(false);
    }
  }

  if (authLoading || loading) {
    return <main className="min-h-screen bg-slate-100 p-6"><p className="text-sm font-semibold text-gray-700">Loading Process Control...</p></main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 pb-24 text-gray-900 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">🔄 Process Control</h1>
            <p className="mt-1 text-sm text-gray-600">Manufacturing batch tracking, history and controlled rework.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={fetchData} className="rounded-xl bg-white px-4 py-2 text-sm font-bold shadow-sm">↻ Refresh</button>
            <Link href="/factory" className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-white">← Factory</Link>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="font-bold text-blue-900">🛡️ Controlled Manufacturing Rework</p>
          <p className="mt-1 text-sm text-blue-800">
            Rollback is enabled across Casting → Magnet → Filing → Pre Polish → Final Repair → Stone Setting → Buff → Final QC → Rhodium → Tag Print. Tree Planning/Burnout and Sale remain outside this control.
          </p>
          <p className="mt-1 text-xs text-blue-700">Old process results are superseded, not deleted. Physical inventory/accounting history remains preserved.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard label="Total Batches" value={batches.length} />
          <SummaryCard label="Visible Batches" value={filteredBatches.length} />
          <SummaryCard label="Open Reworks" value={activeReworkCount} />
          <SummaryCard label="History Records" value={history.length} />
        </div>

        {errorMessage && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div>}

        <section className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_260px]">
            <Field label="Search">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Batch No, Order No, Party, KT..." className="control-input" />
            </Field>
            <Field label="Current Process">
              <select value={processFilter} onChange={(e) => setProcessFilter(e.target.value)} className="control-input">
                <option value="ALL">All Processes</option>
                {PROCESS_ORDER.map((process) => <option key={process} value={process}>{PROCESS_LABELS[process] || process}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-lg font-bold">Manufacturing Batches</h2>
            <p className="text-xs text-gray-500">Showing {filteredBatches.length} batches</p>
          </div>

          {filteredBatches.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">No manufacturing batch found.</div>
          ) : (
            <div className="grid gap-3">
              {filteredBatches.map((batch) => {
                const currentProcess = getCurrentProcess(batch);
                const batchReworks = reworks.filter((x) => x.casting_batch_id === batch.id);
                const batchHistory = history.filter((x) => x.casting_batch_id === batch.id);
                const openRework = batchReworks.find((x) => x.status === "OPEN" || x.status === "IN_PROGRESS");
                const rollbackTargets = getRollbackTargets(batch, openRework);
                const canRollback = rollbackTargets.length > 0;
                const isOpen = openBatchId === batch.id;

                return (
                  <article key={batch.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    <div className="p-4 md:p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold">{batch.batch_no || "-"}</h3>
                            <Badge>{batch.kt || "-"}</Badge>
                            <ProcessBadge>{PROCESS_LABELS[currentProcess] || currentProcess}</ProcessBadge>
                            {openRework && <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">↩ Rework · {PROCESS_LABELS[normalizeProcess(openRework.to_process)] || openRework.to_process}</span>}
                          </div>
                          <p className="mt-2 text-sm font-semibold text-gray-700">Order: {getBatchOrders(batch).join(", ") || "-"}</p>
                          <p className="mt-1 text-sm text-gray-500">Party: {getBatchParties(batch).join(", ") || "-"}</p>
                          <p className="mt-1 text-xs text-gray-400">Database Status: {batch.status || "-"}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => setOpenBatchId(isOpen ? null : batch.id)} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-gray-800">{isOpen ? "Close History" : "🕘 View History"}</button>
                          <button
                            disabled={!canRollback}
                            onClick={() => openSendBack(batch, openRework)}
                            title={openRework ? "This batch already has an open rework" : canRollback ? "Send this batch back to an earlier manufacturing process" : currentProcess === "Sale" || currentProcess === "Completed" ? "Sale/completed rollback is handled separately" : "No earlier controlled process is available"}
                            className={canRollback ? "rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700" : "cursor-not-allowed rounded-xl bg-gray-200 px-4 py-2 text-xs font-bold text-gray-500"}
                          >↩ Send Back</button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                        <MiniStat label="Current Weight" value={`${fmt(getCurrentWeight(batch))} g`} />
                        <MiniStat label="Current Pieces" value={getCurrentPieces(batch)} />
                        <MiniStat label="Reworks" value={batchReworks.length} />
                        <MiniStat label="History" value={batchHistory.length} />
                      </div>
                    </div>
                    {isOpen && <BatchHistory batch={batch} history={batchHistory} reworks={batchReworks} />}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {rollbackBatch && (
        <SendBackModal
          batch={rollbackBatch}
          openRework={reworks.find((x) => x.casting_batch_id === rollbackBatch.id && (x.status === "OPEN" || x.status === "IN_PROGRESS"))}
          target={rollbackTarget}
          setTarget={setRollbackTarget}
          reason={rollbackReason}
          setReason={setRollbackReason}
          saving={rollbackSaving}
          error={rollbackError}
          success={rollbackSuccess}
          onClose={closeSendBack}
          onConfirm={confirmSendBack}
        />
      )}

      <MobileBottomNav />
      <style jsx global>{`
        .control-input { width:100%; border-radius:.75rem; border:1px solid #d1d5db; background:white; padding:.7rem .9rem; font-size:.875rem; color:#111827; outline:none; }
        .control-input:focus { border-color:#111827; box-shadow:0 0 0 1px #111827; }
      `}</style>
    </main>
  );
}

function SendBackModal({ batch, openRework, target, setTarget, reason, setReason, saving, error, success, onClose, onConfirm }) {
  const current = getCurrentProcess(batch);
  const targets = getRollbackTargets(batch, openRework);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-wide text-orange-600">Controlled Rework</p><h2 className="mt-1 text-xl font-bold">↩ Send Batch Back</h2></div>
          <button disabled={saving} onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg font-bold disabled:opacity-50">×</button>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-2"><p className="text-lg font-bold">{batch.batch_no}</p><Badge>{batch.kt || "-"}</Badge><ProcessBadge>{PROCESS_LABELS[current] || current}</ProcessBadge></div>
          <p className="mt-2 text-sm"><span className="font-semibold">Order:</span> {getBatchOrders(batch).join(", ") || "-"}</p>
          <p className="mt-1 text-sm"><span className="font-semibold">Party:</span> {getBatchParties(batch).join(", ") || "-"}</p>
          <div className="mt-4 grid grid-cols-2 gap-2"><MiniStat label="Current Weight" value={`${fmt(getCurrentWeight(batch))} g`} /><MiniStat label="Current Pieces" value={getCurrentPieces(batch)} /></div>
        </div>

        <Field label="Send Back To">
          <select value={target} disabled={saving} onChange={(e) => setTarget(e.target.value)} className="control-input mt-1">
            {targets.slice().reverse().map((process) => <option key={process} value={process}>{PROCESS_LABELS[process] || process}</option>)}
          </select>
        </Field>

        <div className="my-4 flex items-center justify-center gap-3 text-sm font-bold">
          <span className="rounded-full bg-blue-50 px-3 py-2 text-blue-700">{PROCESS_LABELS[current] || current}</span>
          <span className="text-xl">→</span>
          <span className="rounded-full bg-orange-50 px-3 py-2 text-orange-700">{PROCESS_LABELS[target] || target || "Select Process"}</span>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-bold text-amber-900">Controlled rollback protection</p>
          <p className="mt-1 text-xs leading-5 text-amber-800">The selected process and all downstream operational results are superseded, not deleted. Inventory/accounting history is preserved. Printed tags are a protected boundary and the database will block unsafe rollback.</p>
        </div>

        <label className="mt-4 block"><p className="mb-1 text-xs font-bold text-gray-600">Reason for Send Back *</p><textarea rows={3} value={reason} disabled={saving} onChange={(e) => setReason(e.target.value)} placeholder="Example: Finish correction / process quality issue" className="control-input resize-none" /></label>
        {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
        {success && <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">✓ {success}</div>}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button disabled={saving} onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-gray-800 disabled:opacity-50">Cancel</button>
          <button disabled={saving || !target || !reason.trim() || Boolean(success)} onClick={onConfirm} className="rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white disabled:bg-gray-300">{saving ? "Sending Back..." : "Confirm Send Back"}</button>
        </div>
      </div>
    </div>
  );
}

function BatchHistory({ batch, history, reworks }) {
  const combined = [
    ...reworks.map((row) => ({ ...row, _type: "rework", _date: row.requested_at })),
    ...history.map((row) => ({ ...row, _type: "history", _date: row.created_at })),
  ].sort((a, b) => new Date(b._date || 0) - new Date(a._date || 0));

  return (
    <div className="border-t border-gray-100 bg-slate-50 p-4 md:p-5">
      <div className="mb-4"><h4 className="font-bold">Process History</h4><p className="text-xs text-gray-500">{batch.batch_no}</p></div>
      {combined.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">No Process Control history yet.</div> : (
        <div className="space-y-3">
          {combined.map((row) => row._type === "rework" ? (
            <div key={`rework-${row.id}`} className="rounded-xl border border-orange-200 bg-orange-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-orange-800">↩ Rework</p><span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-orange-700">{row.status}</span></div>
              <p className="mt-2 text-sm font-semibold">{PROCESS_LABELS[normalizeProcess(row.from_process)] || row.from_process} → {PROCESS_LABELS[normalizeProcess(row.to_process)] || row.to_process}</p>
              <p className="mt-1 text-xs text-gray-600">Reason: {row.reason || "-"}</p>
              <p className="mt-1 text-xs text-gray-500">Weight: {fmt(row.weight)} g · Pieces: {n(row.pieces)}</p>
              {row.requested_by_name && <p className="mt-1 text-xs text-gray-500">By: {row.requested_by_name}</p>}
              <p className="mt-1 text-[11px] text-gray-400">{row.requested_at ? new Date(row.requested_at).toLocaleString() : "-"}</p>
            </div>
          ) : (
            <div key={`history-${row.id}`} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold">{row.action_type || "Process Activity"}</p><span className="text-[11px] text-gray-400">{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</span></div>
              <p className="mt-2 text-sm">{PROCESS_LABELS[normalizeProcess(row.from_process)] || row.from_process || "-"} → {PROCESS_LABELS[normalizeProcess(row.to_process)] || row.to_process || "-"}</p>
              {(row.weight !== null || row.pieces !== null) && <p className="mt-1 text-xs text-gray-500">Weight: {fmt(row.weight)} g · Pieces: {n(row.pieces)}</p>}
              {row.reason && <p className="mt-1 text-xs text-gray-600">Reason: {row.reason}</p>}
              {row.created_by_name && <p className="mt-1 text-xs text-gray-500">By: {row.created_by_name}</p>}
              {row.remarks && <p className="mt-1 text-xs text-gray-500">{row.remarks}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) { return <label className="block"><p className="mb-1 text-xs font-bold text-gray-500">{label}</p>{children}</label>; }
function SummaryCard({ label, value }) { return <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-bold text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold text-gray-900">{value}</p></div>; }
function MiniStat({ label, value }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-gray-500">{label}</p><p className="mt-1 text-sm font-bold text-gray-900">{value}</p></div>; }
function Badge({ children }) { return <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{children}</span>; }
function ProcessBadge({ children }) { return <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{children}</span>; }
