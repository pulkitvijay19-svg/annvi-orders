"use client";



import { useEffect, useState } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { supabase } from "../../../../lib/supabaseClient";

import { useRequireAuth } from "../../../../lib/useRequireAuth";

import MobileBottomNav from "../../../../components/MobileBottomNav";

import { useLanguage } from "../../../../context/LanguageContext";



export default function StoneSettingDashboardPage() {

  const { loading: authLoading } = useRequireAuth();

  const { t } = useLanguage();

  const [targetBatchNo, setTargetBatchNo] = useState("");

  const [batches, setBatches] = useState([]);

  const [stones, setStones] = useState([]);

  const [transactions, setTransactions] = useState([]);

  const [findings, setFindings] = useState([]);

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



      const { data: findingData } = await supabase

  .from("inventory_items")

  .select("*")

  .eq("is_active", true)

  .eq("item_type", "Finding")

  .order("item_name", { ascending: true });



    if (batchError) alert(batchError.message);



    setBatches(batchData || []);

    setStones(stoneData || []);

    setTransactions(txData || []);

    setFindings(findingData || []);

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

      <main className="min-h-screen bg-slate-100 p-6 text-sm text-gray-700">

        {t("loading_stone_setting")}

      </main>

    );

  }



  return (

    <main className="min-h-screen bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">

      <div className="mx-auto max-w-7xl space-y-5">

        <Header t={t} />



        {batches.length === 0 ? (

          <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">

            {t("no_stone_setting_batches")}

          </div>

        ) : (

          <div className="grid gap-4 xl:grid-cols-2">

            {batches.map((batch) => (

              <StoneSettingCard

  key={batch.id}

  batch={batch}

  t={t}

  stones={stones}

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



function StoneSettingCard({

  batch,

  t,

  stones,

  findings,

  transactions,

  isOpen,

  onOpen,

  onRefresh,

}) {

  const router = useRouter();

  const items = batch.casting_batch_items || [];



  const [activeTab, setActiveTab] = useState("stone");



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



  const [repairIssuedPieces, setRepairIssuedPieces] = useState("");

  const [repairIssuedWeight, setRepairIssuedWeight] = useState("");

  const [repairReceivedPieces, setRepairReceivedPieces] = useState("");

  const [repairReceivedWeight, setRepairReceivedWeight] = useState("");



  const [rejectedPieces, setRejectedPieces] = useState("");

  const [rejectedWeight, setRejectedWeight] = useState("");



  const [remarks, setRemarks] = useState("");

  const [stoneRows, setStoneRows] = useState([]);

const [saving, setSaving] = useState(false);

const [savingDraft, setSavingDraft] = useState(false);

const [repairFindingRows, setRepairFindingRows] = useState([]);

  const [repairLossRows, setRepairLossRows] = useState([]);



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

      Number(rejectedWeight || 0) +

      Number(repairIssuedWeight || 0)

    );



  const finalPiecesToBuff =

    Number(receivedPieces || 0) + Number(repairReceivedPieces || 0);



  const finalWeightToBuff =

    Number(receivedGoldWeight || 0) + Number(repairReceivedWeight || 0);



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



  function addRepairFindingRow() {

  setRepairFindingRows((prev) => [

    ...prev,

    {

      finding_item_id: "",

      finding_name: "",

      kt: batch.kt,

      issued_weight: "",

      issued_qty: "",

      received_weight: "",

      received_qty: "",

      remarks: "",

    },

  ]);

}



function updateRepairFinding(index, field, value) {

  setRepairFindingRows((prev) =>

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



function addRepairLossRow() {

  setRepairLossRows((prev) => [

    ...prev,

    {

      loss_type: "",

      weight: "",

      remarks: "",

    },

  ]);

}



function updateRepairLoss(index, field, value) {

  setRepairLossRows((prev) =>

    prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))

  );

}



const repairFindingsIssued = repairFindingRows.reduce(

  (sum, row) => sum + Number(row.issued_weight || 0),

  0

);



const repairFindingsReceived = repairFindingRows.reduce(

  (sum, row) => sum + Number(row.received_weight || 0),

  0

);



const repairLoss =

  Number(repairIssuedWeight || 0) +

  repairFindingsIssued -

  (Number(repairReceivedWeight || 0) + repairFindingsReceived);



  async function loadDraft() {

  const { data, error } = await supabase

    .from("process_drafts")

    .select("*")

    .eq("batch_id", batch.id)

    .eq("process_name", "STONE_SETTING")

    .maybeSingle();



  if (error) {

    console.error("Stone Setting draft load error:", error);

    return;

  }



  if (!data?.draft_data) return;



  const draft = data.draft_data;



  setActiveTab(draft.activeTab || "stone");



  setSetterName(draft.setterName || "");

  setIssuedBy(draft.issuedBy || "");



  setIssuedPieces(

    draft.issuedPieces ??

      Number(batch.current_pieces || batch.good_pieces || 0)

  );



  setIssuedGoldWeight(

    draft.issuedGoldWeight ??

      Number(batch.current_weight || batch.received_weight || 0)

  );



  setReceivedPieces(draft.receivedPieces || "");

  setReceivedGoldWeight(draft.receivedGoldWeight || "");



  setRepairIssuedPieces(draft.repairIssuedPieces || "");

  setRepairIssuedWeight(draft.repairIssuedWeight || "");

  setRepairReceivedPieces(draft.repairReceivedPieces || "");

  setRepairReceivedWeight(draft.repairReceivedWeight || "");



  setRejectedPieces(draft.rejectedPieces || "");

  setRejectedWeight(draft.rejectedWeight || "");



  setRemarks(draft.remarks || "");

  setStoneRows(Array.isArray(draft.stoneRows) ? draft.stoneRows : []);



  setRepairFindingRows(

    Array.isArray(draft.repairFindingRows)

      ? draft.repairFindingRows

      : []

  );



  setRepairLossRows(

    Array.isArray(draft.repairLossRows)

      ? draft.repairLossRows

      : []

  );

}



useEffect(() => {

  if (isOpen) {

    loadDraft();

  }

}, [isOpen]);



async function saveDraft() {

  try {

    setSavingDraft(true);



    const draftData = {

      activeTab,



      setterName,

      issuedBy,



      issuedPieces,

      issuedGoldWeight,



      receivedPieces,

      receivedGoldWeight,



      repairIssuedPieces,

      repairIssuedWeight,

      repairReceivedPieces,

      repairReceivedWeight,



      rejectedPieces,

      rejectedWeight,



      remarks,

      stoneRows,

      repairFindingRows,

      repairLossRows,

    };



    const { error } = await supabase

      .from("process_drafts")

      .upsert(

        {

          batch_id: batch.id,

          process_name: "STONE_SETTING",

          draft_data: draftData,

          updated_at: new Date().toISOString(),

        },

        {

          onConflict: "batch_id,process_name",

        }

      );



    if (error) {

      alert(error.message);

      return;

    }



    alert(t("draft_saved"));

  } catch (error) {

    console.error("Stone Setting draft save error:", error);

    alert(error.message || t("draft_save_failed"));

  } finally {

    setSavingDraft(false);

  }

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

    if (!receivedGoldWeight && !repairReceivedWeight && !rejectedWeight) {

      alert(t("enter_stone_setting_weight"));

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

`${row.stone_name} ${t("stock_is_low")}.

${t("required")}: ${issuedWeight.toFixed(3)}g,

${t("available")}: ${available.toFixed(3)}g`

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



          repair_pieces: Number(repairReceivedPieces || 0),

          repair_weight: Number(repairReceivedWeight || 0),



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



for (const row of repairFindingRows) {

  if (!row.finding_item_id) continue;



  const issuedWeight = Number(row.issued_weight || 0);

  const receivedWeight = Number(row.received_weight || 0);



  await supabase.from("process_repair_findings").insert([

    {

      casting_batch_id: batch.id,

      process_name: "Stone Setting",

      finding_item_id: row.finding_item_id,

      finding_name: row.finding_name,

      kt: row.kt,

      issued_weight: issuedWeight,

      issued_qty: Number(row.issued_qty || 0),

      received_weight: receivedWeight,

      received_qty: Number(row.received_qty || 0),

      remarks: row.remarks || "",

    },

  ]);



  if (issuedWeight > 0) {

    await supabase.from("inventory_transactions").insert([

      {

        inventory_item_id: row.finding_item_id,

        kt: row.kt,

        transaction_type: "Stock Out",

        purpose: "Stone Setting Repair Finding Issue",

        reference_no: batch.batch_no,

        weight: issuedWeight,

        quantity: Number(row.issued_qty || 0),

        weight_source: "manual",

        remarks: `${row.finding_name} issued for stone setting repair`,

      },

    ]);

  }



  if (receivedWeight > 0) {

    await supabase.from("inventory_transactions").insert([

      {

        inventory_item_id: row.finding_item_id,

        kt: row.kt,

        transaction_type: "Stock In",

        purpose: "Stone Setting Repair Finding Return",

        reference_no: batch.batch_no,

        weight: receivedWeight,

        quantity: Number(row.received_qty || 0),

        weight_source: "manual",

        remarks: `${row.finding_name} returned from stone setting repair`,

      },

    ]);

  }

}





for (const row of repairLossRows) {

  if (!row.loss_type || Number(row.weight || 0) <= 0) continue;



  await supabase.from("process_repair_loss_breakup").insert([

    {

      casting_batch_id: batch.id,

      process_name: "Stone Setting",

      loss_type: row.loss_type,

      kt: batch.kt,

      weight: Number(row.weight || 0),

      remarks: row.remarks || "",

    },

  ]);



const lossWeight = Number(row.weight || 0);



if (row.loss_type === "Buff Loss") {

  const { error: buffLossError } = await supabase

    .from("buff_loss_records")

    .insert([

      {

        casting_batch_id: batch.id,

        kt: batch.kt,

        loss_weight: lossWeight,

        batch_no: batch.batch_no,

        party_name: parties.join(", "),

        recovery_status: "Pending",

        remarks:

          row.remarks ||

          `${row.loss_type} from ${batch.batch_no}`,

      },

    ]);



  if (buffLossError) {

    setSaving(false);

    alert(buffLossError.message);

    return;

  }

}



if (row.loss_type === "Ghis") {

  const { error: ghisError } = await supabase

    .from("ghis_records")

    .insert([

      {

        casting_batch_id: batch.id,

        kt: batch.kt,

        source_process: "Stone Setting", // Stone Setting page me isko "Stone Setting" karna

        ghis_weight: lossWeight,

        recovered_weight: 0,

        recovery_loss: 0,

        recovery_status: "Pending",

        remarks:

          row.remarks ||

          `${row.loss_type} from ${batch.batch_no}`,

      },

    ]);



  if (ghisError) {

    setSaving(false);

    alert(ghisError.message);

    return;

  }

}




  if (row.loss_type === "Scrap") {

    const { data: scrapItem } = await supabase

      .from("inventory_items")

      .select("id")

      .eq("item_type", "Scrap")

      .eq("item_name", "Casting Scrap")

      .maybeSingle();



    if (scrapItem?.id) {

      await supabase.from("inventory_transactions").insert([

        {

          inventory_item_id: scrapItem.id,

          kt: batch.kt,

          transaction_type: "Stock In",

          purpose: "Stone Setting Repair Loss Scrap",

          reference_no: batch.batch_no,

          weight: Number(row.weight || 0),

          quantity: 0,

          weight_source: "manual",

          remarks: row.remarks || "Stone setting repair loss moved to scrap",

        },

      ]);

    }

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

        current_process: "buff",

        current_pieces: finalPiecesToBuff,

        current_weight: finalWeightToBuff,

      })

      .eq("id", batch.id);



    if (updateError) {

  setSaving(false);

  alert(updateError.message);

  return;

}



    // Complete an OPEN rollback rework only after Stone Setting has
    // successfully advanced to Buff. Normal batches with no open rework
    // continue without any lifecycle change.
    const { data: reworkCompleteData, error: reworkCompleteError } =
      await supabase.rpc("complete_process_rework", {
        p_casting_batch_id: batch.id,
        p_completed_process: "Stone Setting",
        p_next_process: "Buff",
        p_completed_by: null,
        p_completed_by_name: setterName || issuedBy || "Stone Setting",
      });

    if (reworkCompleteError) {
      console.error("complete_process_rework error:", reworkCompleteError);
      setSaving(false);
      alert(
        `Stone Setting saved and moved to Buff, but rework completion failed: ${reworkCompleteError.message}`
      );
      return;
    }

    if (reworkCompleteData && reworkCompleteData.success === false) {
      console.error("complete_process_rework result:", reworkCompleteData);
      setSaving(false);
      alert("Stone Setting saved and moved to Buff, but rework could not be completed.");
      return;
    }

await supabase

  .from("process_drafts")

  .delete()

  .eq("batch_id", batch.id)

  .eq("process_name", "STONE_SETTING");



setSaving(false);

router.push(`/factory/buff/dashboard?batch=${batch.id}`);

  }



  return (

    <section className="rounded-3xl bg-white p-4 shadow-sm">

      <div className="flex items-start justify-between gap-3">

        <div>

          <div className="flex flex-wrap items-center gap-2">

            <h3 className="text-lg font-bold">{batch.batch_no}</h3>

            <Badge>{batch.kt}</Badge>

            <Badge blue>{t("stone_setting")}</Badge>

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

<MiniStat label={t("current_pieces")} value={issuedPieces} />



<MiniStat

  label={t("current_weight")}

  value={`${Number(issuedGoldWeight || 0).toFixed(3)}g`}

/>

        <MiniStat

          label={t("entries")}

          value={batch.stone_setting_results?.length || 0}

        />

      </div>



      {isOpen && (

        <div className="mt-5 space-y-4">

          <ItemsSummary

  t={t}

  items={items}

/>



          <div className="flex gap-2 rounded-2xl bg-slate-100 p-2">

            <button

              type="button"

              onClick={() => setActiveTab("stone")}

              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold ${

                activeTab === "stone"

                  ? "bg-black text-white"

                  : "bg-white text-gray-700"

              }`}

            >

              {t("stone_setting")}

            </button>



<button

  type="button"

  onClick={() => setActiveTab("repair")}

  className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold ${

    activeTab === "repair"

      ? "bg-black text-white"

      : "bg-white text-gray-700"

  }`}

>

  {t("repair")}

</button>

          </div>



          {activeTab === "stone" && (

            <>

              <Panel title={t("stone_issue_receive")}>

                <div className="mb-3 grid gap-3 md:grid-cols-2">

                  <Field label={t("issued_by")}>

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

                      {t("add_stone")}

                    </button>

                  </div>

                </div>



                <div className="space-y-3">

                  {stoneRows.length === 0 ? (

                    <p className="text-sm text-gray-500">

                      {t("no_stones_issued")}

                    </p>

                  ) : (

                    stoneRows.map((row, index) => (

                      <div

                        key={index}

                        className="rounded-2xl border border-gray-200 bg-white p-3"

                      >

                        <div className="grid gap-2 md:grid-cols-3">

                          <Field label={t("stone")}>

                            <select

                              value={row.stone_item_id}

                              onChange={(e) =>

                                updateStone(

                                  index,

                                  "stone_item_id",

                                  e.target.value

                                )

                              }

                              className="input"

                            >

                              <option value="">

  {t("select_stone")}

</option>

                              {stones.map((s) => (

                                <option key={s.id} value={s.id}>

                                  {s.item_name}

                                </option>

                              ))}

                            </select>

                          </Field>



                          <Field label={t("stone_type")}>

                            <input

                              value={row.stone_type}

                              onChange={(e) =>

                                updateStone(

                                  index,

                                  "stone_type",

                                  e.target.value

                                )

                              }

                              className="input"

                            />

                          </Field>



                          <Field label={t("stone_size")}>

                            <input

                              value={row.stone_size}

                              onChange={(e) =>

                                updateStone(

                                  index,

                                  "stone_size",

                                  e.target.value

                                )

                              }

                              className="input"

                            />

                          </Field>



                          <Field label={t("stone_issued_weight")}>

                            <input

                              type="number"

                              step="0.001"

                              value={row.issued_weight}

                              onChange={(e) =>

                                updateStone(

                                  index,

                                  "issued_weight",

                                  e.target.value

                                )

                              }

                              className="input"

                            />

                          </Field>



                          <Field label={t("stone_received_weight")}>

                            <input

                              type="number"

                              step="0.001"

                              value={row.returned_weight}

                              onChange={(e) =>

                                updateStone(

                                  index,

                                  "returned_weight",

                                  e.target.value

                                )

                              }

                              className="input"

                            />

                          </Field>



                          <Field label={t("stone_increased")}>

                            <div className="rounded-xl bg-green-50 p-3 text-sm font-bold text-green-800">

                              {(

                                Number(row.issued_weight || 0) -

                                Number(row.returned_weight || 0)

                              ).toFixed(3)}

                              g

                            </div>

                          </Field>



                          <Field label={t("remarks")}>

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

  type="button"

  onClick={() => removeStone(index)}

  className="w-full rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"

>

  {t("remove")}

</button>

                          </div>

                        </div>

                      </div>

                    ))

                  )}

                </div>



                <div className="mt-3 grid grid-cols-3 gap-2">

                  <GreenStat

                    label={t("stone_issued")}

                    value={`${totalStoneIssued.toFixed(3)}g`}

                  />

                  <GreenStat

                    label={t("stone_received")}

                    value={`${totalStoneReceived.toFixed(3)}g`}

                  />

                  <GreenStat

                    label={t("stone_increased")}

                    value={`${stoneIncreased.toFixed(3)}g`}

                  />

                </div>

              </Panel>



              <Panel title={t("stone_setting_challan")}>

                <div className="grid gap-3 md:grid-cols-3">

                  <Field label={t("setter_name")}>

                    <input

                      value={setterName}

                      onChange={(e) => setSetterName(e.target.value)}

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



                  <Field label={t("gold_issued_weight")}>

                    <input

                      type="number"

                      step="0.001"

                      value={issuedGoldWeight}

                      onChange={(e) => setIssuedGoldWeight(e.target.value)}

                      className="input"

                    />

                  </Field>



                  <Field label={t("received_pieces")}>

                    <input

                      type="number"

                      value={receivedPieces}

                      onChange={(e) => setReceivedPieces(e.target.value)}

                      className="input"

                    />

                  </Field>



                  <Field label={t("gold_received_weight")}>

                    <input

                      type="number"

                      step="0.001"

                      value={receivedGoldWeight}

                      onChange={(e) => setReceivedGoldWeight(e.target.value)}

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



                  <Field label={t("stone_setting_challan")}>

                    <div className="rounded-xl bg-orange-50 p-3 text-sm font-bold text-orange-700">

                      {stoneChallan.toFixed(3)} g

                    </div>

                  </Field>

                </div>



                <div className="mt-3 grid grid-cols-3 gap-2">

                  <GreenStat

                    label={t("good_to_buff")}

                    value={`${finalPiecesToBuff} pcs`}

                  />

                  <GreenStat

                    label={t("repair_received")}

                    value={`${Number(repairReceivedPieces || 0)} pcs`}

                  />

                  <GreenStat

                    label={t("rejected_scrap")}

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

{t("rejected_scrap")}
                </p>



                <div className="mt-4 flex flex-wrap gap-3">

  <button

    type="button"

    disabled={savingDraft || saving}

    onClick={saveDraft}

    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:bg-gray-400"

  >

    {savingDraft ? t("saving") : t("save_draft")}

  </button>



  <button

    type="button"

    disabled={saving || savingDraft}

    onClick={saveStoneSetting}

    className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:bg-gray-400"

  >

    {saving ? t("saving") : t("save_move_buff")}

  </button>

</div>

              </Panel>

            </>

          )}



          {activeTab === "repair" && (

  <Panel title={t("repair_handling")}>

    <div className="grid gap-3 md:grid-cols-3">

      <Field label={t("repair_issued_pieces")}>

        <input type="number" value={repairIssuedPieces} onChange={(e) => setRepairIssuedPieces(e.target.value)} className="input" />

      </Field>



      <Field label={t("repair_issued_weight")}>

        <input type="number" step="0.001" value={repairIssuedWeight} onChange={(e) => setRepairIssuedWeight(e.target.value)} className="input" />

      </Field>



      <Field label={t("repair_received_pieces")}>

        <input type="number" value={repairReceivedPieces} onChange={(e) => setRepairReceivedPieces(e.target.value)} className="input" />

      </Field>



      <Field label={t("repair_received_weight")}>

        <input type="number" step="0.001" value={repairReceivedWeight} onChange={(e) => setRepairReceivedWeight(e.target.value)} className="input" />

      </Field>



      <Field label={t("repair_loss")}>

        <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">

          {repairLoss.toFixed(3)} g

        </div>

      </Field>

    </div>



    <div className="mt-5 rounded-2xl bg-white p-3">

      <div className="mb-3 flex items-center justify-between gap-3">

        <h4 className="text-sm font-bold">

{t("findings_issue_receive")}</h4>

        <button

          type="button"

          onClick={addRepairFindingRow}

          className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-white"

        >

          {t("add_finding")}

        </button>

      </div>



      <div className="space-y-3">

        {repairFindingRows.length === 0 ? (

          <p className="text-sm text-gray-500">

            {t("no_findings_issued")}</p>

        ) : (

          repairFindingRows.map((row, index) => (

            <div key={index} className="rounded-2xl border border-gray-200 p-3">

              <div className="grid gap-2 md:grid-cols-3">

                <Field label={t("finding")}>

                  <select

                    value={row.finding_item_id}

                    onChange={(e) => updateRepairFinding(index, "finding_item_id", e.target.value)}

                    className="input"

                  >

                    <option value="">

{t("select_finding")}

</option>

                    {findings.map((f) => (

                      <option key={f.id} value={f.id}>{f.item_name}</option>

                    ))}

                  </select>

                </Field>



                <Field label={t("kt")}>

                  <input value={row.kt} onChange={(e) => updateRepairFinding(index, "kt", e.target.value)} className="input" />

                </Field>



                <Field label={t("issued_weight")}>

                  <input type="number" step="0.001" value={row.issued_weight} onChange={(e) => updateRepairFinding(index, "issued_weight", e.target.value)} className="input" />

                </Field>



                <Field label={t("issued_quantity")}>

                  <input type="number" value={row.issued_qty} onChange={(e) => updateRepairFinding(index, "issued_qty", e.target.value)} className="input" />

                </Field>



                <Field label={t("received_weight")}>

                  <input type="number" step="0.001" value={row.received_weight} onChange={(e) => updateRepairFinding(index, "received_weight", e.target.value)} className="input" />

                </Field>



                <Field label={t("received_quantity")}>

                  <input type="number" value={row.received_qty} onChange={(e) => updateRepairFinding(index, "received_qty", e.target.value)} className="input" />

                </Field>



                <Field label={t("remarks")}>

                  <input value={row.remarks} onChange={(e) => updateRepairFinding(index, "remarks", e.target.value)} className="input" />

                </Field>



                <div className="flex items-end">

                  <button

                    type="button"

                    onClick={() => setRepairFindingRows((p) => p.filter((_, i) => i !== index))}

                    className="w-full rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"

                  >

                    {t("remove")}
                  </button>

                </div>

              </div>

            </div>

          ))

        )}

      </div>



      <div className="mt-3 grid grid-cols-2 gap-2">

        <GreenStat label={t("findings_issued")} value={`${repairFindingsIssued.toFixed(3)}g`} />

        <GreenStat label={t("findings_received")} value={`${repairFindingsReceived.toFixed(3)}g`} />

      </div>

    </div>



<div className="mt-5 rounded-2xl bg-white p-3">

  <div className="mb-3 flex items-center justify-between gap-3">

    <h4 className="text-sm font-bold">

{t("loss_type_breakup")}</h4>

    <button

      type="button"

      onClick={addRepairLossRow}

      className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-white"

    >

      {t("add_loss")}

    </button>

  </div>



  <div className="space-y-3">

    {repairLossRows.length === 0 ? (

      <p className="text-sm text-gray-500">{t("no_repair_loss")}</p>

    ) : (

      repairLossRows.map((row, index) => (

        <div key={index} className="rounded-2xl border border-gray-200 p-3">

          <div className="grid gap-2 md:grid-cols-3">

            <Field label={t("loss_type")}>

              <select

                value={row.loss_type}

                onChange={(e) =>

                  updateRepairLoss(index, "loss_type", e.target.value)

                }

                className="input"

              >

                <option value="">

{t("select_loss_type")}

</option>

                <option value="Stone Setting Loss">{t("stone_setting_loss")}</option>

                <option value="Ghis">{t("ghis")}</option>

                <option value="Scrap">{t("scrap")}</option>

                <option value="Other">{t("other")}</option>

              </select>

            </Field>



            <Field label={t("weight")}>

              <input

                type="number"

                step="0.001"

                value={row.weight}

                onChange={(e) =>

                  updateRepairLoss(index, "weight", e.target.value)

                }

                className="input"

              />

            </Field>



            <Field label={t("remarks")}>

              <input

                value={row.remarks}

                onChange={(e) =>

                  updateRepairLoss(index, "remarks", e.target.value)

                }

                className="input"

              />

            </Field>



            <div className="flex items-end">

              <button

                type="button"

                onClick={() =>

                  setRepairLossRows((p) => p.filter((_, i) => i !== index))

                }

                className="w-full rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"

              >

                {t("remove")}
              </button>

            </div>

          </div>

        </div>

      ))

    )}

  </div>

</div>





   <p className="mt-3 text-xs text-gray-500">

  {t("repair_formula")}

</p>



<div className="mt-4">

  <button

    type="button"

    disabled={savingDraft || saving}

    onClick={saveDraft}

    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:bg-gray-400"

  >

    {savingDraft ? t("saving") : t("save_draft")}

  </button>

</div>

  </Panel>

)}

        </div>

      )}

    </section>

  );

}



function Header({ t }) {

  return (

    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

      <div>

        <h1 className="text-2xl font-bold md:text-3xl">

          {t("stone_setting")}

        </h1>



        <p className="text-sm text-gray-600">

          {t("stone_setting_subtitle")}

        </p>

      </div>



      <div className="flex flex-wrap gap-2">

        <Link

          href="/factory/final-repair/dashboard"

          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"

        >

          {t("final_repair")}

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



function ItemsSummary({ t, items }) {

  return (

    <Panel title={t("items_summary")}>

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