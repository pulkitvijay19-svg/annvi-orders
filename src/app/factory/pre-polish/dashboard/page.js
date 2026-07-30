"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { useRequireAuth } from "../../../../lib/useRequireAuth";
import MobileBottomNav from "../../../../components/MobileBottomNav";
import { useLanguage } from "../../../../context/LanguageContext";

const PROCESS_TYPES = ["Electro Polish", "2C Polish"];

export default function PrePolishDashboardPage() {
  const { loading: authLoading } = useRequireAuth();
  const { t } = useLanguage();
  const [targetBatchNo, setTargetBatchNo] = useState("");
  const [batches, setBatches] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);

    const { data, error } = await supabase
      .from("casting_batches")
      .select(`
        *,
        casting_batch_items(*, orders(order_no, customer_name)),
        pre_polish_results(*)
      `)
      .eq("status", "Pre Polish")
      .order("created_at", { ascending: false });

    if (error) alert(error.message);
    setBatches(data || []);
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
        <p className="text-sm text-gray-700">
  {t("loading_pre_polish")}
</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <Header t={t} />

        {batches.length === 0 ? (
<div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
  {t("no_pre_polish_batches")}
</div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {batches.map((batch) => (
              <PrePolishCard
                key={batch.id}
                batch={batch}
                t={t}
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

function PrePolishCard({
  batch,
  t,
  isOpen,
  onOpen,
  onRefresh,
}) {
  const router = useRouter();
  const items = batch.casting_batch_items || [];

  const issuedDefaultPieces =
    Number(batch.current_pieces || 0) > 0
      ? Number(batch.current_pieces || 0)
      : Number(batch.good_pieces || 0);

  const issuedDefaultWeight =
    Number(batch.current_weight || 0) > 0
      ? Number(batch.current_weight || 0)
      : Number(batch.received_weight || 0);

  const [processType, setProcessType] = useState("Electro Polish");
  const [operator, setOperator] = useState("");
  const [issuedPieces, setIssuedPieces] = useState(issuedDefaultPieces);
  const [issuedWeight, setIssuedWeight] = useState(issuedDefaultWeight);
  const [goodPieces, setGoodPieces] = useState("");
  const [goodWeight, setGoodWeight] = useState("");
  const [repairPieces, setRepairPieces] = useState("");
  const [repairWeight, setRepairWeight] = useState("");
  const [rejectedPieces, setRejectedPieces] = useState("");
  const [rejectedWeight, setRejectedWeight] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const parties = [...new Set(items.map((i) => i.orders?.customer_name).filter(Boolean))];
  const orders = [...new Set(items.map((i) => i.orders?.order_no).filter(Boolean))];

  const processTypeLabel =
  processType === "Electro Polish"
    ? t("electro_polish")
    : t("two_c_polish");

  const loss =
    Number(issuedWeight || 0) -
    Number(goodWeight || 0) -
    Number(repairWeight || 0) -
    Number(rejectedWeight || 0);

async function loadDraft() {
  const { data } = await supabase
    .from("process_drafts")
    .select("*")
    .eq("batch_id", batch.id)
    .eq("process_name", "PRE_POLISH")
    .maybeSingle();

  if (!data?.draft_data) return;

  const draft = data.draft_data;

  setProcessType(draft.processType || "Electro Polish");
  setOperator(draft.operator || "");

  setIssuedPieces(draft.issuedPieces || "");
  setIssuedWeight(draft.issuedWeight || "");

  setGoodPieces(draft.goodPieces || "");
  setGoodWeight(draft.goodWeight || "");

  setRepairPieces(draft.repairPieces || "");
  setRepairWeight(draft.repairWeight || "");

  setRejectedPieces(draft.rejectedPieces || "");
  setRejectedWeight(draft.rejectedWeight || "");

  setRemarks(draft.remarks || "");
}

useEffect(() => {
  if (isOpen) {
    loadDraft();
  }
}, [isOpen]);

    const ktFineMap = {
  "9K": 0.38,
  "9KT": 0.38,
  "14K": 0.59,
  "14KT": 0.59,
  "18K": 0.752,
  "18KT": 0.752,
  "20K": 0.84,
  "20KT": 0.84,
  "22K": 0.92,
  "22KT": 0.92,
};

const normalizedKt = String(batch.kt || "").toUpperCase().replace(/\s/g, "");

const expectedFineGold =
  processType === "2C Polish" && Number(loss || 0) > 0
    ? Number(loss || 0) * (ktFineMap[normalizedKt] || 0)
    : 0;

async function saveDraft() {
  setSavingDraft(true);

  const draftData = {
    processType,
    operator,
    issuedPieces,
    issuedWeight,
    goodPieces,
    goodWeight,
    repairPieces,
    repairWeight,
    rejectedPieces,
    rejectedWeight,
    remarks,
  };

  const { error } = await supabase
    .from("process_drafts")
    .upsert(
      {
        batch_id: batch.id,
        process_name: "PRE_POLISH",
        draft_data: draftData,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "batch_id,process_name",
      }
    );

  setSavingDraft(false);

  if (error) {
    alert(error.message);
    return;
  }

  alert(t("draft_saved"));
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
      alert(t("casting_scrap_not_found"));
      return false;
    }

    const { error } = await supabase.from("inventory_transactions").insert([
      {
        inventory_item_id: scrapItem.id,
        kt: batch.kt,
        transaction_type: "Stock In",
        purpose: `${processType} Rejection`,
        reference_no: batch.batch_no,
        weight: Number(rejectedWeight || 0),
        quantity: Number(rejectedPieces || 0),
        weight_source: "manual",
        remarks: `Rejected pieces from ${processType} moved to same KT scrap`,
      },
    ]);

    if (error) {
      alert(error.message);
      return false;
    }

    return true;
  }

  async function savePrePolishResult() {
    if (!goodWeight && !repairWeight && !rejectedWeight) {
      alert(t("enter_pre_polish_weight"));
      return;
    }

    setSaving(true);

    const { data: resultData, error } = await supabase
      .from("pre_polish_results")
      .insert([
        {
          casting_batch_id: batch.id,
          process_name: processType,
          process_type: processType,
          karigar_name: operator,

          issued_pieces: Number(issuedPieces || 0),
          issued_weight: Number(issuedWeight || 0),

          received_pieces: Number(goodPieces || 0),
          received_weight: Number(goodWeight || 0),

          good_pieces: Number(goodPieces || 0),
          good_weight: Number(goodWeight || 0),

          repair_pieces: Number(repairPieces || 0),
          repair_weight: Number(repairWeight || 0),

          rejected_pieces: Number(rejectedPieces || 0),
          rejected_weight: Number(rejectedWeight || 0),

          loss_weight: loss,
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

    if (Number(loss || 0) > 0) {

      let activeBag = null;

if (processType === "2C Polish") {
  const { data: bagData, error: bagError } = await supabase
    .from("buff_bags")
    .select("*")
    .eq("status", "Active")
    .order("installed_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bagError) {
    setSaving(false);
    alert(bagError.message);
    return;
  }

  if (!bagData?.id) {
    setSaving(false);
    alert(t("active_buff_bag_not_found"));
    return;
  }

  if (expectedFineGold <= 0) {
    setSaving(false);
    alert(`${t("kt_formula_not_found")}: ${batch.kt}`);
    return;
  }

  activeBag = bagData;
}
      const lossTable =
        processType === "Electro Polish"
          ? "electro_polish_loss_records"
          : "buff_loss_records";

      const payload =
        processType === "Electro Polish"
          ? {
              casting_batch_id: batch.id,
              electro_polish_result_id: null,
              kt: batch.kt,
              loss_weight: loss,
              recovery_status: "Pending",
              remarks: `${processType} loss from ${batch.batch_no}`,
            }
: {
    casting_batch_id: batch.id,
    pre_polish_result_id: resultData.id,
    kt: batch.kt,
    loss_weight: loss,
    expected_fine_gold: expectedFineGold,
    buff_bag_id: activeBag?.id || null,
    recovery_status: "Pending",
    remarks: `${processType} loss from ${batch.batch_no}`,
  };

      const { error: lossInsertError } = await supabase.from(lossTable).insert([payload]);

if (lossInsertError) {
  setSaving(false);
  alert(lossInsertError.message);
  return;
}

if (processType === "2C Polish" && activeBag?.id && expectedFineGold > 0) {
  const newExpectedFine =
    Number(activeBag.expected_fine_gold || 0) + Number(expectedFineGold || 0);

  const { error: bagUpdateError } = await supabase
    .from("buff_bags")
    .update({
      expected_fine_gold: newExpectedFine,
    })
    .eq("id", activeBag.id);

  if (bagUpdateError) {
    setSaving(false);
    alert(bagUpdateError.message);
    return;
  }
}
    }

    if (Number(repairPieces || 0) > 0 || Number(repairWeight || 0) > 0) {
      const { error: repairError } = await supabase.from("repair_queue").insert([
        {
          casting_batch_id: batch.id,
          source_process: processType,
          kt: batch.kt,
          pending_pieces: Number(repairPieces || 0),
          pending_weight: Number(repairWeight || 0),
          status: "Pending",
          remarks: `Repair from ${processType} - ${batch.batch_no}`,
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
    status: "Final Repair",
    current_process: "final-repair",
    current_pieces: Number(goodPieces || 0),
    current_weight: Number(goodWeight || 0),
    moved_to_final_repair_at: new Date().toISOString(),
    moved_to_final_qc_at: null,
  })
  .eq("id", batch.id)
  .eq("status", "Pre Polish");

    if (updateError) {
      setSaving(false);
      alert(updateError.message);
      return;
    }

    await supabase
  .from("process_drafts")
  .delete()
  .eq("batch_id", batch.id)
  .eq("process_name", "PRE_POLISH");

setSaving(false);
router.push(`/factory/final-repair/dashboard?batch=${batch.id}`);
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{batch.batch_no}</h3>
            <Badge>{batch.kt}</Badge>
            <Badge blue>{t("pre_polish")}</Badge>
          </div>
<p className="mt-2 text-xs font-semibold text-gray-500">
  {t("party")}: {parties.join(", ") || "-"}
</p>

<p className="text-xs text-gray-500">
  {t("order")}: {orders.join(", ") || "-"}
</p>
        </div>

        <button
          onClick={onOpen}
          className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white"
        >
          {isOpen ? t("close") : t("open")}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label={t("current_pcs")} value={issuedDefaultPieces} />
        <MiniStat
  label={t("current_wt")}
  value={`${issuedDefaultWeight.toFixed(3)}g`}
/>
        <MiniStat
  label={t("entries")}
  value={batch.pre_polish_results?.length || 0}
/>
      </div>

      {isOpen && (
        <div className="mt-5 space-y-4">
          <ItemsSummary t={t} items={items} />

          <div className="rounded-3xl border border-gray-200 p-4">
            <h4 className="mb-3 text-sm font-bold">
  {t("pre_polish_entry")}
</h4>

            <div className="grid gap-3 md:grid-cols-3">
<Field label={t("process_type")}>
  <select
    value={processType}
    onChange={(e) => setProcessType(e.target.value)}
    className="input"
  >
    {PROCESS_TYPES.map((p) => (
      <option key={p} value={p}>
        {p === "Electro Polish"
          ? t("electro_polish")
          : t("two_c_polish")}
      </option>
    ))}
  </select>
</Field>

              <Field label={t("operator_karigar")}>
                <input
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label={t("issued_pieces")}>
                <input
                  type="number"
                  value={issuedPieces}
                  onChange={(e) => setIssuedPieces(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label={t("issued_weight")}>
                <input
                  type="number"
                  step="0.001"
                  value={issuedWeight}
                  onChange={(e) => setIssuedWeight(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label={t("good_pieces")}>
                <input
                  type="number"
                  value={goodPieces}
                  onChange={(e) => setGoodPieces(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label={t("good_weight")}>
                <input
                  type="number"
                  step="0.001"
                  value={goodWeight}
                  onChange={(e) => setGoodWeight(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label={t("repair_pieces")}>
                <input
                  type="number"
                  value={repairPieces}
                  onChange={(e) => setRepairPieces(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label={t("repair_weight")}>
                <input
                  type="number"
                  step="0.001"
                  value={repairWeight}
                  onChange={(e) => setRepairWeight(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label={t("rejected_pieces")}>
                <input
                  type="number"
                  value={rejectedPieces}
                  onChange={(e) => setRejectedPieces(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label={t("rejected_weight")}>
                <input
                  type="number"
                  step="0.001"
                  value={rejectedWeight}
                  onChange={(e) => setRejectedWeight(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label={`${processTypeLabel} ${t("loss")}`}>
                <div className="rounded-xl bg-orange-50 p-3 text-sm font-bold text-orange-700">
                  {loss.toFixed(3)} g
                </div>
              </Field>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <GreenStat
  label={t("to_final_repair")}
  value={`${Number(repairPieces || 0)} ${t("pcs")}`}
/>
              <GreenStat
  label={t("good_for_next")}
  value={`${Number(goodPieces || 0)} ${t("pcs")}`}
/>
<GreenStat
  label={t("rejected_to_scrap")}
  value={`${Number(rejectedWeight || 0).toFixed(3)}g`}
/>
            </div>

            <div className="mt-3">
              <Field label={t("remarks")}>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="input"
                />
              </Field>
            </div>

<p className="mt-2 text-xs text-gray-500">
  {t("pre_polish_loss_formula")}
</p>

            <div className="mt-4 flex gap-3">
  <button
    type="button"
    disabled={savingDraft}
    onClick={saveDraft}
    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
  >
    {savingDraft ? t("saving") : t("save_draft")}
  </button>

  <button
    disabled={saving}
    onClick={savePrePolishResult}
    className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white"
  >
    {saving ? t("saving") : t("save_move_final_repair")}
  </button>
</div>

            
          </div>
        </div>
      )}
    </section>
  );
}

function ItemsSummary({ t, items }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <h4 className="mb-2 text-sm font-bold">
        {t("items_summary")}
      </h4>

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

            <p className="mt-1 text-sm font-bold">
              {item.category}
            </p>

            <p className="text-xs text-gray-500">
              {item.sample_unique_id} · {t("die")} {item.die_no}
            </p>

            <p className="mt-2 text-xs font-bold">
              {t("qty")}: {item.selected_quantity}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header({ t }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">
          {t("pre_polish")}
        </h1>

        <p className="text-sm text-gray-600">
          {t("pre_polish_subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/factory/bench/dashboard"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"
        >
          {t("filing")}
        </Link>

        <Link
          href="/dashboard"
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          {t("dashboard")}
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
    <span
      className={`rounded-full px-2 py-1 text-xs font-bold ${
        blue ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-gray-700"
      }`}
    >
      {children}
    </span>
  );
}