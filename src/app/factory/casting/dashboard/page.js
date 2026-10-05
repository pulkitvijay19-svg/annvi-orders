"use client";



import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { supabase } from "../../../../lib/supabaseClient";

import { useRequireAuth } from "../../../../lib/useRequireAuth";

import MobileBottomNav from "../../../../components/MobileBottomNav";

import { useLanguage } from "../../../../context/LanguageContext";



export default function CastingDashboardPage() {

  useRequireAuth();

  const router = useRouter();

  const { t } = useLanguage();

const [targetBatchNo, setTargetBatchNo] = useState("");



  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);

  const [openBatchId, setOpenBatchId] = useState(null);



  async function fetchBatches() {
    setLoading(true);

    const { data, error } = await supabase
      .from("casting_batches")
      .select(`
        *,
        casting_batch_items(
          *,
          orders(order_no, customer_name)
        ),
        casting_batch_metal_inputs(*)
      `)
      .in("status", ["Casting", "Casting Completed"])
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setBatches([]);
      setLoading(false);
      return;
    }

    const rows = data || [];
    const batchIds = rows.map((x) => x.id).filter(Boolean);
    let openReworks = [];

    if (batchIds.length > 0) {
      const { data: reworkData, error: reworkError } = await supabase
        .from("process_reworks")
        .select("id, casting_batch_id, from_process, to_process, reason, status, requested_at")
        .in("casting_batch_id", batchIds)
        .in("status", ["OPEN", "IN_PROGRESS"]);

      if (reworkError) {
        console.error("Open rework fetch error:", reworkError);
      } else {
        openReworks = reworkData || [];
      }
    }

    const reworkByBatch = {};
    openReworks.forEach((rw) => {
      if (!reworkByBatch[rw.casting_batch_id]) {
        reworkByBatch[rw.casting_batch_id] = rw;
      }
    });

    setBatches(
      rows.map((batch) => ({
        ...batch,
        open_rework: reworkByBatch[batch.id] || null,
      }))
    );

    setLoading(false);
  }

useEffect(() => {

  fetchBatches();

}, []);



  useEffect(() => {

  const batchId = targetBatchNo;

  if (batchId) {

    setOpenBatchId(batchId);

  }

}, [targetBatchNo]);



useEffect(() => {

  const params = new URLSearchParams(window.location.search);

  setTargetBatchNo(params.get("batch") || "");

}, []);



  async function updateBatch(id, values) {

    const { error } = await supabase

      .from("casting_batches")

      .update(values)

      .eq("id", id);



    if (error) {

      alert(error.message);

      return false;

    }



    await fetchBatches();

    return true;

  }



 async function markCastingFail(batch) {

  const recoveredWeight = prompt(

    "Casting fail ke baad recovered metal weight daalo"

  );



  if (recoveredWeight === null) return;



  const issueWeight = Number(

    batch.actual_metal_weight || 0

  );



  const recovered = Number(recoveredWeight || 0);



  if (

    !Number.isFinite(recovered) ||

    recovered < 0 ||

    recovered > issueWeight

  ) {

    alert(

      `Recovered weight 0 se ${issueWeight.toFixed(

        3

      )} g ke beech hona chahiye.`

    );

    return;

  }



  const confirmed = window.confirm(

    `Casting Fail confirm karein?\n\n` +

      `Issued Metal: ${issueWeight.toFixed(3)} g\n` +

      `Recovered Scrap: ${recovered.toFixed(3)} g\n` +

      `Casting Loss: ${(issueWeight - recovered).toFixed(

        3

      )} g\n\n` +

      `Recovered metal Casting Scrap inventory me add hoga aur order Tree Planning me wapas available ho jayega.`

  );



  if (!confirmed) return;



  try {

    const loss = issueWeight - recovered;



    // -----------------------------------------

    // 1. Find Casting Scrap inventory item

    // -----------------------------------------

    const { data: scrapItem, error: scrapItemError } =

      await supabase

        .from("inventory_items")

        .select("id, item_name, item_type")

        .eq("item_type", "Scrap")

        .eq("item_name", "Casting Scrap")

        .maybeSingle();



    if (scrapItemError) {

      throw scrapItemError;

    }



    if (!scrapItem?.id) {

      throw new Error(

        'Inventory master me "Casting Scrap" item nahi mila.'

      );

    }



    // -----------------------------------------

    // 2. Recovered metal → Scrap Stock In

    // -----------------------------------------

    if (recovered > 0) {

      const { error: inventoryError } =

        await supabase

          .from("inventory_transactions")

          .insert([

            {

              inventory_item_id: scrapItem.id,

              kt: batch.kt,

              transaction_type: "Stock In",

              purpose: "Casting Fail Recovery",

              reference_no: batch.batch_no,

              weight: recovered,

              quantity: 0,

              weight_source: "manual",

              remarks: `Recovered metal from failed casting batch ${batch.batch_no}`,

            },

          ]);



      if (inventoryError) {

        throw inventoryError;

      }

    }



    // -----------------------------------------

    // 3. Collect all orders from this batch

    // -----------------------------------------

    const batchItems =

      batch.casting_batch_items || [];



    const orderIds = [

      ...new Set(

        batchItems

          .map((item) => item.order_id)

          .filter(Boolean)

      ),

    ];



    // -----------------------------------------

    // 4. Release Tree Planning allocations

    // -----------------------------------------

    if (batch.casting_tree_id) {

      const { error: releaseError } =

        await supabase

          .from("casting_tree_items")

          .delete()

          .eq(

            "casting_tree_id",

            batch.casting_tree_id

          );



      if (releaseError) {

        throw releaseError;

      }



      // Keep tree record only for history,

      // but do not show it as an available tree.

      const { data: updatedTree, error: treeError } =

  await supabase

    .from("casting_trees")

    .update({

      status: "Casting Failed",

      updated_at: new Date().toISOString(),

    })

    .eq("id", batch.casting_tree_id)

    .select("id, tree_no, status")

    .single();



if (treeError) {

  throw treeError;

}



if (!updatedTree) {

  throw new Error(

    "Failed casting tree status could not be updated."

  );

}

    }



    // -----------------------------------------

    // 5. Return orders to Tree Planning

    // -----------------------------------------

    if (orderIds.length > 0) {

      const { error: ordersError } =

        await supabase

          .from("orders")

          .update({

            status: "Approved",

            updated_at: new Date().toISOString(),

          })

          .in("id", orderIds);



      if (ordersError) {

        throw ordersError;

      }

    }



    // -----------------------------------------

    // 6. Mark casting batch failed

    // -----------------------------------------

    const { error: batchError } =

      await supabase

        .from("casting_batches")

        .update({

          casting_failed: true,

          received_weight: 0,

          scrap_weight: recovered,

          casting_loss: loss,

          status: "Casting Failed",

          current_process: "casting_failed",

        })

        .eq("id", batch.id);



    if (batchError) {

      throw batchError;

    }



    alert(

      `Casting Failed.\n\n${recovered.toFixed(

        3

      )} g added to Casting Scrap.\nOrder released back to Tree Planning.`

    );



    await fetchBatches();

  } catch (error) {

    console.error(

      "Casting fail processing error:",

      error

    );



    alert(

      error?.message ||

        "Casting fail process complete nahi ho saka."

    );

  }

}



async function moveToMagnet(batch) {

  if (batch.status !== "Casting Completed") {

    alert("Pehle casting result save karo. Ye batch abhi Magnet ke liye ready nahi hai.");

    return;

  }



  const { data, error } = await supabase

    .from("casting_batches")

    .update({

      status: "Magnet",

      current_process: "magnet",

      moved_to_magnet_at: new Date().toISOString(),

    })

    .eq("id", batch.id)

    .eq("status", "Casting Completed")

    .select();



  if (error) {

    alert(error.message);

    return;

  }



  if (!data || data.length === 0) {

    alert("Batch already moved. Page refresh ho raha hai.");

    await fetchBatches();

    return;

  }



 router.push(`/factory/magnet/dashboard?batch=${batch.id}`);

}



  if (loading) {

    return (

      <main className="min-h-screen bg-slate-100 p-6">

        <p className="text-sm text-gray-700">{t("loading_casting_batches")} </p>

      </main>

    );

  }



  return (

    <main className="min-h-screen overscroll-y-contain bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">

      <div className="mx-auto max-w-7xl">

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

          <div>

            <h1 className="text-2xl font-bold md:text-3xl">

              {t("casting_dashboard")}

            </h1>

            <p className="mt-1 text-sm text-gray-600">

              {t("casting_dashboard_subtitle")}

            </p>

          </div>



          <div className="flex gap-2">

            <Link

              href="/factory/casting"

              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"

            >

              {t("new_casting")}

            </Link>



            <Link

              href="/dashboard"

              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"

            >

              Dashboard

            </Link>

          </div>

        </div>



        {batches.length === 0 ? (

          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">{t("no_active_casting_batch")} </p>

          </section>

        ) : (

          <div className="grid gap-4 lg:grid-cols-2">

            {batches.map((batch) => (

              <CastingBatchCard

                key={batch.id}

                batch={batch}

                  t={t}

                isOpen={openBatchId === batch.id}

                onToggle={() =>

                  setOpenBatchId(openBatchId === batch.id ? null : batch.id)

                }

                onUpdate={updateBatch}

                onFail={markCastingFail}

                onMove={moveToMagnet}

                onRefresh={fetchBatches}

              />

            ))}

          </div>

        )}

      </div>



      <MobileBottomNav />



      <style jsx global>{`

        .input {

          width: 100%;

          border-radius: 0.75rem;

          border: 1px solid #d1d5db;

          background: white;

          padding: 0.75rem;

          font-size: 0.875rem;

          color: #111827;

          outline: none;

        }

        .factory-input {
          width: 100%;
          min-height: 52px;
          border-radius: 0.75rem;
          border: 1.5px solid #cbd5e1;
          background: #ffffff;
          padding: 0.75rem 0.875rem;
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          outline: none;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }

        .factory-input:hover {
          border-color: #94a3b8;
        }

        .factory-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

      `}</style>

    </main>

  );

}



function CastingBatchCard({
  batch,
  t,
  isOpen,
  onToggle,
  onFail,
  onMove,
  onRefresh,
}) {
  const [goodPieces, setGoodPieces] = useState(batch.good_pieces || "");
  const [badPieces, setBadPieces] = useState(batch.bad_pieces || "");
  const [receivedWeight, setReceivedWeight] = useState(
    batch.received_weight || ""
  );
  const [scrapWeight, setScrapWeight] = useState(batch.scrap_weight || "");
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const items = batch.casting_batch_items || [];
  const inputs = batch.casting_batch_metal_inputs || [];
  const rework = batch.open_rework || null;
  const isRework =
    !!rework &&
    ["OPEN", "IN_PROGRESS"].includes(String(rework.status || "").toUpperCase()) &&
    String(rework.to_process || "").toLowerCase() === "casting";

  const orderNos = [
    ...new Set(items.map((x) => x.orders?.order_no).filter(Boolean)),
  ];
  const partyNames = [
    ...new Set(items.map((x) => x.orders?.customer_name).filter(Boolean)),
  ];

  const totalInputWeight = inputs.reduce(
    (sum, item) => sum + Number(item.weight || 0),
    0
  );

  const totalSelectedPieces = items.reduce(
    (sum, item) => sum + Number(item.selected_quantity || 0),
    0
  );

  const currentCastingLoss =
    Number(batch.actual_metal_weight || 0) -
    Number(receivedWeight || 0) -
    Number(scrapWeight || 0);

  const groupedItems = useMemo(() => {
    const map = {};

    items.forEach((item) => {
      const key = `${item.orders?.order_no || "-"}_${item.category || "-"}_${
        item.sample_unique_id || "-"
      }_${item.die_no || "-"}`;

      if (!map[key]) {
        map[key] = {
          order_no: item.orders?.order_no || "-",
          customer_name: item.orders?.customer_name || "-",
          category: item.category || "-",
          sample_unique_id: item.sample_unique_id || "-",
          die_no: item.die_no || "-",
          quantity: 0,
          weight: 0,
        };
      }

      map[key].quantity += Number(item.selected_quantity || 0);
      map[key].weight +=
        Number(item.approx_weight || 0) * Number(item.selected_quantity || 1);
    });

    return Object.values(map);
  }, [items]);

  async function saveCastingResult() {
    if (saving) return;

    const good = Number(goodPieces || 0);
    const bad = Number(badPieces || 0);
    const issueWeight = Number(batch.actual_metal_weight || 0);
    const receivedPiecesWt = Number(receivedWeight || 0);
    const scrapWt = Number(scrapWeight || 0);
    const loss = issueWeight - receivedPiecesWt - scrapWt;

    if (![good, bad, receivedPiecesWt, scrapWt].every(Number.isFinite)) {
      alert("Please enter valid numbers.");
      return;
    }

    if (good < 0 || bad < 0 || receivedPiecesWt < 0 || scrapWt < 0) {
      alert("Negative value allowed nahi hai.");
      return;
    }

    if (good + bad > totalSelectedPieces) {
      alert(
        `Good + Bad pieces (${good + bad}) selected pieces (${totalSelectedPieces}) se zyada nahi ho sakte.`
      );
      return;
    }

    if (receivedPiecesWt + scrapWt > issueWeight + 0.0005) {
      alert("Received weight + Scrap weight issued metal se zyada nahi ho sakta.");
      return;
    }

    const confirmed = window.confirm(
      `Casting result save karein?\n\n` +
        `Good Pieces: ${good}\n` +
        `Bad Pieces: ${bad}\n` +
        `Received Weight: ${receivedPiecesWt.toFixed(3)} g\n` +
        `Scrap: ${scrapWt.toFixed(3)} g\n` +
        `Casting Loss: ${loss.toFixed(3)} g`
    );

    if (!confirmed) return;

    setSaving(true);
    let newResultId = null;

    try {
      // 1. Save a fresh operational result.
      // Old rollback results remain superseded in process_result_invalidations.
      const { data: resultData, error: resultError } = await supabase
        .from("casting_results")
        .insert([
          {
            casting_batch_id: batch.id,
            good_pieces: good,
            bad_pieces: bad,
            received_weight: receivedPiecesWt,
            scrap_weight: scrapWt,
            casting_loss: loss,
            remarks:
              "Casting result saved. Loss = issued metal - received pieces weight - scrap weight.",
          },
        ])
        .select("id")
        .single();

      if (resultError) throw resultError;
      newResultId = resultData?.id || null;

      // 2. Update batch output. These values are also used by rework audit history.
      const { error: batchError } = await supabase
        .from("casting_batches")
        .update({
          good_pieces: good,
          bad_pieces: bad,
          received_weight: receivedPiecesWt,
          scrap_weight: scrapWt,
          casting_loss: loss,
          current_weight: receivedPiecesWt,
          current_pieces: good,
          status: "Casting Completed",
          current_process: "casting",
          updated_at: new Date().toISOString(),
        })
        .eq("id", batch.id);

      if (batchError) {
        // Avoid leaving a fresh active result if batch update failed.
        if (newResultId) {
          const { error: cleanupError } = await supabase
            .from("casting_results")
            .delete()
            .eq("id", newResultId);

          if (cleanupError) {
            console.error("Casting result cleanup failed:", cleanupError);
          }
        }
        throw batchError;
      }

      // 3. If this batch was rolled back to Casting, close that rework.
      // For normal production the RPC safely returns rework_found:false.
      const { data: reworkData, error: reworkError } = await supabase.rpc(
        "complete_process_rework",
        {
          p_casting_batch_id: batch.id,
          p_completed_process: "Casting",
          p_completed_by: null,
          p_completed_by_name: "Casting Dashboard",
        }
      );

      if (reworkError) {
        console.error("complete_process_rework error:", reworkError);
        alert(
          `Casting result save ho gaya, lekin rework close nahi hua: ${reworkError.message}`
        );
        await onRefresh();
        return;
      }

      if (reworkData && reworkData.success === false) {
        console.error("complete_process_rework result:", reworkData);
        alert("Casting result save ho gaya, lekin rework complete nahi ho saka.");
        await onRefresh();
        return;
      }

      alert(
        reworkData?.rework_found
          ? "Casting rework complete. Batch Magnet ke liye ready hai."
          : "Casting result saved. Batch Magnet ke liye ready hai."
      );

      await onRefresh();
    } catch (error) {
      console.error("Casting result save error:", error);
      alert(error?.message || "Casting result save nahi ho saka.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
        isRework ? "border-amber-300" : "border-gray-200"
      }`}
    >
      {isRework && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg">
              ↩
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-900">
                REWORK · CASTING
              </p>
              <p className="mt-1 text-sm font-semibold text-amber-800">
                {rework.from_process} → Casting
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SIMPLE FACTORY CARD HEADER */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 text-left active:bg-slate-50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">{batch.batch_no}</h2>
              <Badge>{batch.kt}</Badge>
              <Badge blue>{batch.status}</Badge>
            </div>

            <p className="mt-2 truncate text-sm font-semibold text-gray-700">
              {partyNames.join(", ") || "-"}
            </p>
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {t("order")}: {orderNos.join(", ") || "-"}
            </p>
          </div>

          <div className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
              {t("pieces")}
            </p>
            <p className="text-xl font-black">{totalSelectedPieces}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <SimpleStat
            label={t("issued")}
            value={`${Number(batch.actual_metal_weight || 0).toFixed(3)} g`}
          />
          <SimpleStat
            label={batch.status === "Casting Completed" ? t("received_pieces_weight") : t("tree")}
            value={
              batch.status === "Casting Completed"
                ? `${Number(batch.received_weight || 0).toFixed(3)} g`
                : `${Number(batch.tree_weight || 0).toFixed(3)} g`
            }
          />
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-gray-500">
          <span>{isOpen ? "▲" : "▼"}</span>
          <span>{isOpen ? t("close") : t("open")}</span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 bg-slate-50/60 p-4">
          {/* MAIN OPERATOR AREA */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  {t("casting_result")}
                </p>
                <h3 className="mt-1 text-lg font-black text-gray-900">
                  Enter Casting Output
                </h3>
              </div>

              <div className="rounded-xl bg-slate-100 px-3 py-2 text-right">
                <p className="text-[10px] font-bold text-gray-500">{t("selected")}</p>
                <p className="text-lg font-black">{totalSelectedPieces}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <BigField label={t("good_pieces")}>
                <input
                  inputMode="numeric"
                  type="number"
                  min="0"
                  value={goodPieces}
                  onChange={(e) => setGoodPieces(e.target.value)}
                  className="factory-input"
                  placeholder="0"
                />
              </BigField>

              <BigField label={t("bad_pieces")}>
                <input
                  inputMode="numeric"
                  type="number"
                  min="0"
                  value={badPieces}
                  onChange={(e) => setBadPieces(e.target.value)}
                  className="factory-input"
                  placeholder="0"
                />
              </BigField>

              <BigField label={t("received_pieces_weight")}>
                <input
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.001"
                  value={receivedWeight}
                  onChange={(e) => setReceivedWeight(e.target.value)}
                  className="factory-input"
                  placeholder="0.000"
                />
              </BigField>

              <BigField label={t("scrap_weight")}>
                <input
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.001"
                  value={scrapWeight}
                  onChange={(e) => setScrapWeight(e.target.value)}
                  className="factory-input"
                  placeholder="0.000"
                />
              </BigField>
            </div>

            {/* ONE CLEAR CALCULATION */}
            <div
              className={`mt-4 rounded-2xl p-4 ${
                currentCastingLoss < -0.0005
                  ? "bg-red-50 text-red-800"
                  : "bg-amber-50 text-amber-900"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide opacity-70">
                    {t("casting_loss")}
                  </p>
                  <p className="mt-1 text-xs opacity-70">
                    {t("casting_loss_formula")}
                  </p>
                </div>
                <p className="text-2xl font-black">
                  {Number.isFinite(currentCastingLoss)
                    ? `${currentCastingLoss.toFixed(3)} g`
                    : "0.000 g"}
                </p>
              </div>
            </div>

            {/* PRIMARY ACTION */}
            {batch.status !== "Casting Completed" ? (
              <button
                disabled={saving}
                onClick={saveCastingResult}
                className="mt-4 w-full rounded-2xl bg-black px-5 py-4 text-base font-black text-white shadow-sm active:scale-[0.99] disabled:bg-gray-400"
              >
                {saving ? t("saving") : t("save_result")}
              </button>
            ) : (
              <button
                onClick={() => onMove(batch)}
                className="mt-4 w-full rounded-2xl bg-blue-600 px-5 py-4 text-base font-black text-white shadow-sm active:scale-[0.99]"
              >
                {t("move_to_magnet")} →
              </button>
            )}

            {/* SECONDARY / DANGEROUS ACTION */}
            {batch.status !== "Casting Completed" && (
              <button
                onClick={() => onFail(batch)}
                className="mt-3 w-full rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-bold text-red-700 shadow-sm transition hover:border-red-400 hover:bg-red-50 active:bg-red-100"
              >
                {t("casting_fail")}
              </button>
            )}
          </div>

          {/* DETAILS ARE HIDDEN BY DEFAULT */}
          <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm font-bold text-gray-700">
                {t("items_summary")}
              </span>
              <span className="text-xs font-bold text-gray-400">
                {groupedItems.length} {t("groups")} · {showDetails ? "▲" : "▼"}
              </span>
            </button>

            {showDetails && (
              <div className="border-t border-gray-100 p-3">
                <div className="mb-3 grid grid-cols-3 gap-2">
                  <MiniStat
                    label={t("tree")}
                    value={`${Number(batch.tree_weight || 0).toFixed(3)}g`}
                  />
                  <MiniStat
                    label={t("input")}
                    value={`${totalInputWeight.toFixed(3)}g`}
                  />
                  <MiniStat label={t("items")} value={items.length} />
                </div>

                <div className="grid max-h-[300px] gap-2 overflow-y-auto md:grid-cols-2">
                  {groupedItems.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-gray-200 bg-slate-50 p-3"
                    >
                      <p className="text-xs font-semibold text-gray-500">
                        {item.order_no} · {item.customer_name}
                      </p>
                      <p className="mt-1 text-sm font-bold">{item.category}</p>
                      <p className="text-xs text-gray-500">
                        {item.sample_unique_id} · {t("die_no")}: {item.die_no}
                      </p>
                      <div className="mt-2 flex justify-between text-xs font-bold">
                        <span>{t("quantity")}: {item.quantity}</span>
                        <span>{item.weight.toFixed(3)}g</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function SimpleStat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <p className="text-[11px] font-bold text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-black text-gray-900">{value}</p>
    </div>
  );
}

function BigField({ label, children }) {
  return (
    <label className="block">
      <p className="mb-1.5 text-xs font-bold text-gray-600">{label}</p>
      {children}
    </label>
  );
}

function MiniStat({ label, value }) {

  return (

    <div className="rounded-xl bg-slate-50 p-3">

      <p className="text-xs font-semibold text-gray-500">{label}</p>

      <p className="mt-1 text-base font-bold">{value}</p>

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



function Badge({ children, blue }) {

  return (

    <span

      className={`rounded-full px-3 py-1 text-xs font-semibold ${

        blue ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-gray-700"

      }`}

    >

      {children}

    </span>

  );

}