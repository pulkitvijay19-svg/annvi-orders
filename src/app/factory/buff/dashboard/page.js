"use client";



import { useEffect, useState } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { supabase } from "../../../../lib/supabaseClient";

import { useRequireAuth } from "../../../../lib/useRequireAuth";

import MobileBottomNav from "../../../../components/MobileBottomNav";

import { useLanguage } from "../../../../context/LanguageContext";



export default function BuffDashboardPage() {

  const { loading: authLoading } = useRequireAuth();

  const { t } = useLanguage();

  const [targetBatchNo, setTargetBatchNo] = useState(""); 

  const [batches, setBatches] = useState([]);

  const [findings, setFindings] = useState([]);

  const [activeBag, setActiveBag] = useState(null);

  const [openId, setOpenId] = useState(null);

  const [loading, setLoading] = useState(true);





  async function fetchData() {

    setLoading(true);



    const { data, error } = await supabase

      .from("casting_batches")

      .select(`

        *,

        casting_batch_items(*, orders(order_no, customer_name)),

        buff_results(*)

      `)

      .eq("status", "Buff")

      .order("created_at", { ascending: false });



    const { data: findingData } = await supabase

      .from("inventory_items")

      .select("*")

      .eq("is_active", true)

      .eq("item_type", "Finding")

      .order("item_name", { ascending: true });





        const { data: bagData } = await supabase

  .from("buff_bags")

  .select("*")

  .eq("status", "Active")

  .order("installed_date", { ascending: false })

  .limit(1)

  .maybeSingle();





    if (error) alert(error.message);



    setBatches(data || []);

    setFindings(findingData || []);

    setActiveBag(bagData || null);

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

        {t("loading_buff")}

      </main>

    );

  }



  return (

    <main className="min-h-screen bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">

      <div className="mx-auto max-w-7xl space-y-5">

        <Header t={t} />



        {batches.length === 0 ? (

          <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">

            {t("no_buff_batches")}

          </div>

        ) : (

          <div className="grid gap-4 xl:grid-cols-2">

            {batches.map((batch) => (

              <BuffCard

                key={batch.id}

                batch={batch}

                t={t}

                findings={findings}

                activeBag={activeBag}

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



function BuffCard({ batch, t, findings, activeBag, isOpen, onOpen, onRefresh }) {

  const router = useRouter();

  const items = batch.casting_batch_items || [];



  const [activeTab, setActiveTab] = useState("buff");



  const [polisherName, setPolisherName] = useState("");



  const [issuedPieces, setIssuedPieces] = useState(

    Number(batch.current_pieces || batch.good_pieces || 0)

  );

  const [issuedWeight, setIssuedWeight] = useState(

    Number(batch.current_weight || batch.received_weight || 0)

  );



  const [receivedPieces, setReceivedPieces] = useState("");

  const [receivedWeight, setReceivedWeight] = useState("");



  const [repairIssuedPieces, setRepairIssuedPieces] = useState("");

  const [repairIssuedWeight, setRepairIssuedWeight] = useState("");

  const [repairReceivedPieces, setRepairReceivedPieces] = useState("");

  const [repairReceivedWeight, setRepairReceivedWeight] = useState("");



  const [rejectedPieces, setRejectedPieces] = useState("");

  const [rejectedWeight, setRejectedWeight] = useState("");



  const [repairFindingRows, setRepairFindingRows] = useState([]);

  const [repairLossRows, setRepairLossRows] = useState([]);



const [remarks, setRemarks] = useState("");

const [saving, setSaving] = useState(false);

const [savingDraft, setSavingDraft] = useState(false);



  const parties = [

    ...new Set(items.map((i) => i.orders?.customer_name).filter(Boolean)),

  ];



  const orders = [

    ...new Set(items.map((i) => i.orders?.order_no).filter(Boolean)),

  ];



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



  const buffLoss =

    Number(issuedWeight || 0) -

    Number(receivedWeight || 0) -

    Number(rejectedWeight || 0) -

    Number(repairIssuedWeight || 0);



  const buffLossPercent =

    Number(issuedWeight || 0) > 0

      ? (buffLoss / Number(issuedWeight || 0)) * 100

      : 0;



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

  Number(buffLoss || 0) > 0

    ? Number(buffLoss || 0) * (ktFineMap[normalizedKt] || 0)

    : 0;



  const finalPiecesToQC =

    Number(receivedPieces || 0) + Number(repairReceivedPieces || 0);



  const finalWeightToQC =

    Number(receivedWeight || 0) + Number(repairReceivedWeight || 0);



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



  async function loadDraft() {

  const { data, error } = await supabase

    .from("process_drafts")

    .select("*")

    .eq("batch_id", batch.id)

    .eq("process_name", "BUFF")

    .maybeSingle();



  if (error) {

    console.error("Buff draft load error:", error);

    return;

  }



  if (!data?.draft_data) return;



  const draft = data.draft_data;



  setActiveTab(draft.activeTab || "buff");



  setPolisherName(draft.polisherName || "");



  setIssuedPieces(

    draft.issuedPieces ??

      Number(batch.current_pieces || batch.good_pieces || 0)

  );



  setIssuedWeight(

    draft.issuedWeight ??

      Number(batch.current_weight || batch.received_weight || 0)

  );



  setReceivedPieces(draft.receivedPieces || "");

  setReceivedWeight(draft.receivedWeight || "");



  setRepairIssuedPieces(draft.repairIssuedPieces || "");

  setRepairIssuedWeight(draft.repairIssuedWeight || "");

  setRepairReceivedPieces(draft.repairReceivedPieces || "");

  setRepairReceivedWeight(draft.repairReceivedWeight || "");



  setRejectedPieces(draft.rejectedPieces || "");

  setRejectedWeight(draft.rejectedWeight || "");



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



  setRemarks(draft.remarks || "");

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



      polisherName,



      issuedPieces,

      issuedWeight,



      receivedPieces,

      receivedWeight,



      repairIssuedPieces,

      repairIssuedWeight,

      repairReceivedPieces,

      repairReceivedWeight,



      rejectedPieces,

      rejectedWeight,



      repairFindingRows,

      repairLossRows,



      remarks,

    };



    const { error } = await supabase

      .from("process_drafts")

      .upsert(

        {

          batch_id: batch.id,

          process_name: "BUFF",

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

    console.error("Buff draft save error:", error);

    alert(error.message || "Draft could not be saved.");

  } finally {

    setSavingDraft(false);

  }

}



  async function getScrapItemId() {

    const { data, error } = await supabase

      .from("inventory_items")

      .select("id")

      .eq("item_type", "Scrap")

      .eq("item_name", "Casting Scrap")

      .maybeSingle();



    if (error) {

      alert(error.message);

      return null;

    }



    if (!data?.id) {

      alert(t("casting_scrap_not_found"));

      return null;

    }



    return data.id;

  }



  async function stockInRejectedScrap() {

    if (Number(rejectedWeight || 0) <= 0) return true;



    const scrapItemId = await getScrapItemId();

    if (!scrapItemId) return false;



    const { error } = await supabase.from("inventory_transactions").insert([

      {

        inventory_item_id: scrapItemId,

        kt: batch.kt,

        transaction_type: "Stock In",

        purpose: "Buff Rejection",

        reference_no: batch.batch_no,

        weight: Number(rejectedWeight || 0),

        quantity: Number(rejectedPieces || 0),

        weight_source: "manual",

        remarks: "Rejected pieces from buff moved to same KT scrap",

      },

    ]);



    if (error) {

      alert(error.message);

      return false;

    }



    return true;

  }



  async function saveBuffResult() {

    if (!receivedWeight && !repairReceivedWeight && !rejectedWeight) {

      alert(t("enter_buff_weight"));

      return;

    }



    setSaving(true);



    if (Number(buffLoss || 0) > 0 && !activeBag?.id) {

  setSaving(false);

  alert(t("active_buff_bag_not_found"));

  return;

}



if (Number(buffLoss || 0) > 0 && expectedFineGold <= 0) {

  setSaving(false);

  alert(`${t("kt_formula_not_found")}: ${batch.kt}`);

  return;

}



    const { error } = await supabase.from("buff_results").insert([

      {

        casting_batch_id: batch.id,

        polisher_name: polisherName,



        issued_pieces: Number(issuedPieces || 0),

        issued_weight: Number(issuedWeight || 0),



        received_pieces: Number(receivedPieces || 0),

        received_weight: Number(receivedWeight || 0),



        repair_pieces: Number(repairReceivedPieces || 0),

        repair_weight: Number(repairReceivedWeight || 0),



        rejected_pieces: Number(rejectedPieces || 0),

        rejected_weight: Number(rejectedWeight || 0),



        buff_loss_weight: buffLoss,

        buff_loss_percentage: buffLossPercent,



        remarks,

      },

    ]);



    if (error) {

      setSaving(false);

      alert(error.message);

      return;

    }



    if (Math.abs(Number(buffLoss || 0)) > 0.0001) {

      const { error: lossError } = await supabase

        .from("buff_loss_records")

        .insert([

          {

            casting_batch_id: batch.id,

            kt: batch.kt,

            loss_weight: Number(buffLoss || 0),

            expected_fine_gold: expectedFineGold,

            buff_bag_id: activeBag?.id || null,

            batch_no: batch.batch_no,

            party_name: parties.join(", "),

            recovery_status: "Pending",

            remarks: `Buff loss from ${batch.batch_no}`,

          },

        ]);



      if (lossError) {

        setSaving(false);

        alert(lossError.message);

        return;

      }

    }



    if (activeBag?.id && expectedFineGold > 0) {

  const { data: freshBag, error: freshBagError } = await supabase

    .from("buff_bags")

    .select("expected_fine_gold")

    .eq("id", activeBag.id)

    .single();



  if (freshBagError) {

    setSaving(false);

    alert(freshBagError.message);

    return;

  }



  const newExpectedFine =

    Number(freshBag?.expected_fine_gold || 0) +

    Number(expectedFineGold || 0);



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



    for (const row of repairFindingRows) {

      if (!row.finding_item_id) continue;



      const issuedWeight = Number(row.issued_weight || 0);

      const receivedWeight = Number(row.received_weight || 0);



      const { error: findingError } = await supabase

        .from("process_repair_findings")

        .insert([

          {

            casting_batch_id: batch.id,

            process_name: "Buff",

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



      if (findingError) {

        setSaving(false);

        alert(findingError.message);

        return;

      }



      if (issuedWeight > 0) {

        const { error: outError } = await supabase

          .from("inventory_transactions")

          .insert([

            {

              inventory_item_id: row.finding_item_id,

              kt: row.kt,

              transaction_type: "Stock Out",

              purpose: "Buff Repair Finding Issue",

              reference_no: batch.batch_no,

              weight: issuedWeight,

              quantity: Number(row.issued_qty || 0),

              weight_source: "manual",

              remarks: `${row.finding_name} issued for buff repair`,

            },

          ]);



        if (outError) {

          setSaving(false);

          alert(outError.message);

          return;

        }

      }



      if (receivedWeight > 0) {

        const { error: inError } = await supabase

          .from("inventory_transactions")

          .insert([

            {

              inventory_item_id: row.finding_item_id,

              kt: row.kt,

              transaction_type: "Stock In",

              purpose: "Buff Repair Finding Return",

              reference_no: batch.batch_no,

              weight: receivedWeight,

              quantity: Number(row.received_qty || 0),

              weight_source: "manual",

              remarks: `${row.finding_name} returned from buff repair`,

            },

          ]);



        if (inError) {

          setSaving(false);

          alert(inError.message);

          return;

        }

      }

    }



    for (const row of repairLossRows) {

      if (!row.loss_type || Number(row.weight || 0) <= 0) continue;



      const { error: repairLossError } = await supabase

        .from("process_repair_loss_breakup")

        .insert([

          {

            casting_batch_id: batch.id,

            process_name: "Buff",

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

        source_process: "Buff", // Stone Setting page me isko "Stone Setting" karna

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

  const scrapItemId = await getScrapItemId();



  if (scrapItemId) {

    const { error: scrapError } = await supabase

      .from("inventory_transactions")

      .insert([

        {

          inventory_item_id: scrapItemId,

          kt: batch.kt,

          transaction_type: "Stock In",

          purpose: "Repair Loss Scrap",

          reference_no: batch.batch_no,

          weight: lossWeight,

          quantity: 0,

          weight_source: "manual",

          remarks:

            row.remarks ||

            `${row.loss_type} from ${batch.batch_no}`,

        },

      ]);



    if (scrapError) {

      setSaving(false);

      alert(scrapError.message);

      return;

    }

  }

}

      if (repairLossError) {

        setSaving(false);

        alert(repairLossError.message);

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

        status: "Final Inspection QC",

        current_process: "final-qc",

        current_pieces: finalPiecesToQC,

        current_weight: finalWeightToQC,

      })

      .eq("id", batch.id);



    if (updateError) {

  setSaving(false);

  alert(updateError.message);

  return;

}

// Close a rollback/rework only when Buff was the process sent back for reprocessing.
const { data: reworkCompleteData, error: reworkCompleteError } = await supabase.rpc(
  "complete_process_rework",
  {
    p_casting_batch_id: batch.id,
    p_completed_process: "Buff",
    p_next_process: "Final Inspection QC",
    p_completed_by: null,
    p_completed_by_name: polisherName || "Buff",
  }
);

if (reworkCompleteError) {
  console.error("complete_process_rework error:", reworkCompleteError);
  setSaving(false);
  alert(
    `Buff saved and moved to Final Inspection QC, but rework completion failed: ${reworkCompleteError.message}`
  );
  return;
}

if (reworkCompleteData && reworkCompleteData.success === false) {
  console.error("complete_process_rework result:", reworkCompleteData);
  setSaving(false);
  alert("Buff saved and moved to Final Inspection QC, but rework could not be completed.");
  return;
}




await supabase

  .from("process_drafts")

  .delete()

  .eq("batch_id", batch.id)

  .eq("process_name", "BUFF");



setSaving(false);

router.push(`/factory/final-qc/dashboard?batch=${batch.id}`);



  }



  return (

    <section className="rounded-3xl bg-white p-4 shadow-sm">

      <div className="flex items-start justify-between gap-3">

        <div>

          <div className="flex flex-wrap items-center gap-2">

            <h3 className="text-lg font-bold">{batch.batch_no}</h3>

            <Badge>{batch.kt}</Badge>

            <Badge blue>{t("buff")}</Badge>

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

          value={`${Number(issuedWeight || 0).toFixed(3)}g`}

        />

        <MiniStat label={t("entries")} value={batch.buff_results?.length || 0} />

      </div>



      {isOpen && (

        <div className="mt-5 space-y-4">

          <ItemsSummary t={t} items={items} />



          <div className="flex gap-2 rounded-2xl bg-slate-100 p-2">

            <button

              type="button"

              onClick={() => setActiveTab("buff")}

              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold ${

                activeTab === "buff"

                  ? "bg-black text-white"

                  : "bg-white text-gray-700"

              }`}

            >

             {t("buff")}

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



          {activeTab === "buff" && (

            <Panel title={t("buff_final_polish_result")}>

              <div className="grid gap-3 md:grid-cols-3">

                <Field label={t("polisher_name")}>

                  <input

                    value={polisherName}

                    onChange={(e) => setPolisherName(e.target.value)}

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



                <Field label={t("received_pieces")}>

                  <input

                    type="number"

                    value={receivedPieces}

                    onChange={(e) => setReceivedPieces(e.target.value)}

                    className="input"

                  />

                </Field>



                <Field label={t("received_weight")}>

                  <input

                    type="number"

                    step="0.001"

                    value={receivedWeight}

                    onChange={(e) => setReceivedWeight(e.target.value)}

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



                <Field label={t("buff_loss")}>

                  <div className="rounded-xl bg-orange-50 p-3 text-sm font-bold text-orange-700">

                    {buffLoss.toFixed(3)} g

                  </div>

                </Field>



                <Field label={t("buff_loss_percent")}>

                  <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">

                    {buffLossPercent.toFixed(2)} %

                  </div>

                </Field>

                <Field label={t("expected_fine_gold")}>

  <div className="rounded-xl bg-yellow-50 p-3 text-sm font-bold text-yellow-700">

    {expectedFineGold.toFixed(3)} g

  </div>

</Field>



<Field label={t("active_buff_bag")}>

  <div className="rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-700">

    {activeBag?.bag_no || t("no_active_bag")}

  </div>

</Field>

              </div>



              <div className="mt-3 grid grid-cols-3 gap-2">

                <GreenStat label={t("good_to_qc")} value={`${finalPiecesToQC} pcs`} />

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

{t("buff_formula")}

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

    onClick={saveBuffResult}

    className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:bg-gray-400"

  >

    {saving ? t("saving") : t("save_move_final_qc")}

  </button>

</div>

            </Panel>

          )}



          {activeTab === "repair" && (

            <Panel title={t("repair_handling")}>

              <div className="grid gap-3 md:grid-cols-3">

                <Field label={t("repair_issued_pieces")}>

                  <input

                    type="number"

                    value={repairIssuedPieces}

                    onChange={(e) => setRepairIssuedPieces(e.target.value)}

                    className="input"

                  />

                </Field>



                <Field label={t("repair_issued_weight")}>

                  <input

                    type="number"

                    step="0.001"

                    value={repairIssuedWeight}

                    onChange={(e) => setRepairIssuedWeight(e.target.value)}

                    className="input"

                  />

                </Field>



                <Field label={t("repair_received_pieces")}>

                  <input

                    type="number"

                    value={repairReceivedPieces}

                    onChange={(e) => setRepairReceivedPieces(e.target.value)}

                    className="input"

                  />

                </Field>



                <Field label={t("repair_received_weight")}>

                  <input

                    type="number"

                    step="0.001"

                    value={repairReceivedWeight}

                    onChange={(e) => setRepairReceivedWeight(e.target.value)}

                    className="input"

                  />

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

                    {t("findings_issue_receive")}

                  </h4>

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

                      {t("no_findings_issued")}

                    </p>

                  ) : (

                    repairFindingRows.map((row, index) => (

                      <div

                        key={index}

                        className="rounded-2xl border border-gray-200 p-3"

                      >

                        <div className="grid gap-2 md:grid-cols-3">

                          <Field label={t("finding")}>

                            <select

                              value={row.finding_item_id}

                              onChange={(e) =>

                                updateRepairFinding(

                                  index,

                                  "finding_item_id",

                                  e.target.value

                                )

                              }

                              className="input"

                            >

                              <option value="">Select finding</option>

                              {findings.map((f) => (

                                <option key={f.id} value={f.id}>

                                  {f.item_name}

                                </option>

                              ))}

                            </select>

                          </Field>



                          <Field label={t("kt")}>

                            <input

                              value={row.kt}

                              onChange={(e) =>

                                updateRepairFinding(

                                  index,

                                  "kt",

                                  e.target.value

                                )

                              }

                              className="input"

                            />

                          </Field>



                          <Field label={t("issued_weight")}>

                            <input

                              type="number"

                              step="0.001"

                              value={row.issued_weight}

                              onChange={(e) =>

                                updateRepairFinding(

                                  index,

                                  "issued_weight",

                                  e.target.value

                                )

                              }

                              className="input"

                            />

                          </Field>



                          <Field label={t("issued_quantity")}>

                            <input

                              type="number"

                              value={row.issued_qty}

                              onChange={(e) =>

                                updateRepairFinding(

                                  index,

                                  "issued_qty",

                                  e.target.value

                                )

                              }

                              className="input"

                            />

                          </Field>



                          <Field label={t("received_weight")}>

                            <input

                              type="number"

                              step="0.001"

                              value={row.received_weight}

                              onChange={(e) =>

                                updateRepairFinding(

                                  index,

                                  "received_weight",

                                  e.target.value

                                )

                              }

                              className="input"

                            />

                          </Field>



                          <Field label={t("received_quantity")}>

                            <input

                              type="number"

                              value={row.received_qty}

                              onChange={(e) =>

                                updateRepairFinding(

                                  index,

                                  "received_qty",

                                  e.target.value

                                )

                              }

                              className="input"

                            />

                          </Field>



                          <Field label={t("remarks")}>

                            <input

                              value={row.remarks}

                              onChange={(e) =>

                                updateRepairFinding(

                                  index,

                                  "remarks",

                                  e.target.value

                                )

                              }

                              className="input"

                            />

                          </Field>



                          <div className="flex items-end">

                            <button

                              type="button"

                              onClick={() =>

                                setRepairFindingRows((p) =>

                                  p.filter((_, i) => i !== index)

                                )

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



                <div className="mt-3 grid grid-cols-2 gap-2">

                  <GreenStat

                    label={t("findings_issued")}

                    value={`${repairFindingsIssued.toFixed(3)}g`}

                  />

                  <GreenStat

                    label={t("findings_received")}

                    value={`${repairFindingsReceived.toFixed(3)}g`}

                  />

                </div>

              </div>



              <div className="mt-5 rounded-2xl bg-white p-3">

                <div className="mb-3 flex items-center justify-between gap-3">

                  <h4 className="text-sm font-bold">{t("loss_type_breakup")}</h4>

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

                    <p className="text-sm text-gray-500">

                      {t("no_repair_loss")}

                    </p>

                  ) : (

                    repairLossRows.map((row, index) => (

                      <div

                        key={index}

                        className="rounded-2xl border border-gray-200 p-3"

                      >

                        <div className="grid gap-2 md:grid-cols-3">

                          <Field label={t("loss_type")}>

                            <select

                              value={row.loss_type}

                              onChange={(e) =>

                                updateRepairLoss(

                                  index,

                                  "loss_type",

                                  e.target.value

                                )

                              }

                              className="input"

                            >

                              <option value="">{t("select_loss_type")}</option>

                              <option value="Buff Loss">{t("buff_loss")}</option>

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

                                updateRepairLoss(

                                  index,

                                  "weight",

                                  e.target.value

                                )

                              }

                              className="input"

                            />

                          </Field>



                          <Field label={t("remarks")}>

                            <input

                              value={row.remarks}

                              onChange={(e) =>

                                updateRepairLoss(

                                  index,

                                  "remarks",

                                  e.target.value

                                )

                              }

                              className="input"

                            />

                          </Field>



                          <div className="flex items-end">

                            <button

                              type="button"

                              onClick={() =>

                                setRepairLossRows((p) =>

                                  p.filter((_, i) => i !== index)

                                )

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

        <h1 className="text-2xl font-bold md:text-3xl">{t("buff")}</h1>

        <p className="text-sm text-gray-600">

          {t("buff_subtitle")}

        </p>

      </div>



      <div className="flex flex-wrap gap-2">

        <Link

          href="/factory/stone-setting/dashboard"

          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"

        >

          {t("stone_setting")}

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



            <p className="mt-1 text-sm font-bold">{item.category}</p>



            <p className="text-xs text-gray-500">

              {item.sample_unique_id} ·{t("die")}{item.die_no}

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