"use client";







import { useEffect, useState } from "react";



import Link from "next/link";



import { supabase } from "../../../../lib/supabaseClient";



import { useRequireAuth } from "../../../../lib/useRequireAuth";



import MobileBottomNav from "../../../../components/MobileBottomNav";



import { useLanguage } from "../../../../context/LanguageContext";







const SCALE_URL = "http://localhost:5056/weight";



const PRINT_URL = "http://localhost:5055/print";







export default function TagPrintDashboard() {



  const { loading: authLoading } = useRequireAuth();



  const { t } = useLanguage();







  const [orders, setOrders] = useState([]);



  const [selectedOrder, setSelectedOrder] = useState(null);



  const [items, setItems] = useState([]);



  const [loading, setLoading] = useState(true);



  const [targetBatchNo, setTargetBatchNo] = useState("");



  const [scaleWeight, setScaleWeight] = useState("0.000");

  const [expectedTagCount, setExpectedTagCount] = useState(0);

  const [activeBatchIds, setActiveBatchIds] = useState([]);
  const [activeTagRunStartedAt, setActiveTagRunStartedAt] = useState(null);







useEffect(() => {



  fetchOrders();







  const timer = setInterval(fetchScaleWeight, 700);



  return () => clearInterval(timer);



}, []);







useEffect(() => {



  const params = new URLSearchParams(window.location.search);



  const orderId = params.get("order");







  if (!orderId || orders.length === 0) return;







  const matchedOrder = orders.find((order) => order.id === orderId);







  if (matchedOrder) {



    openOrder(matchedOrder);



  }



}, [orders]);







  async function fetchScaleWeight() {



    try {



      const res = await fetch(SCALE_URL);



      const data = await res.json();



      if (data?.ok) setScaleWeight(data.weight || "0.000");



    } catch {}



  }







  async function fetchOrders() {



    setLoading(true);







const { data, error } = await supabase



  .from("orders")



  .select("*")



  .eq("status", "Tag Print")



  .order("updated_at", { ascending: false });







    if (error) alert(error.message);







    setOrders(data || []);



    setLoading(false);



  }







async function openOrder(order) {



  setSelectedOrder(order);



  setItems([]);







  const { data: batches, error: batchError } = await supabase



    .from("casting_batches")



    .select(`



      id,



      batch_no,



      kt,



      casting_batch_items(category)



    `)



    .eq("order_id", order.id);







  if (batchError) {



    alert(batchError.message);



    return;



  }







  const batchIds = (batches || []).map((b) => b.id);

  setActiveBatchIds(batchIds);







  if (batchIds.length === 0) {



    alert(t("linked_casting_batch_not_found"));



    return;



  }







  const { data: rhodiumRows, error: rhodiumError } = await supabase



    .from("rhodium_results")



    .select("*")



    .in("casting_batch_id", batchIds)



    .order("created_at", { ascending: true });







  if (rhodiumError) {



    alert(rhodiumError.message);



    return;



  }







  const rhodiumResultIds = (rhodiumRows || []).map((row) => row.id);

  let invalidatedResultIds = new Set();



  if (rhodiumResultIds.length > 0) {

    const { data: invalidations, error: invalidationError } = await supabase

      .from("process_result_invalidations")

      .select("result_id")

      .eq("result_table", "rhodium_results")

      .in("result_id", rhodiumResultIds);



    if (invalidationError) { alert(invalidationError.message); return; }

    invalidatedResultIds = new Set((invalidations || []).map((row) => row.result_id));

  }



  const activeRhodiumRows = (rhodiumRows || []).filter((row) => !invalidatedResultIds.has(row.id));

  // Current Tag Print run starts from the latest ACTIVE Rhodium result.
  // Tags created before this point belong to an older/superseded run.
  const currentRunStartedAt = activeRhodiumRows.reduce((latest, row) => {
    if (!row?.created_at) return latest;
    if (!latest) return row.created_at;
    return new Date(row.created_at) > new Date(latest) ? row.created_at : latest;
  }, null);
  setActiveTagRunStartedAt(currentRunStartedAt);

  const rows = [];







  activeRhodiumRows.forEach((rhodium) => {



    const batch = (batches || []).find(



      (b) => b.id === rhodium.casting_batch_id



    );







    const categories = [



      ...new Set(



        (batch?.casting_batch_items || [])



          .map((i) => i.category)



          .filter(Boolean)



      ),



    ];







    const qty = Number(rhodium.received_pieces || 0);







    for (let i = 1; i <= qty; i++) {



      const tagId = makeTagId(order.order_no, rows.length + 1, rhodium.id);







      rows.push({



        rowKey: `${rhodium.id}-${i}`,



        rhodiumResultId: rhodium.id,



        orderItemId: null,







        category: categories.join(", ") || "Jewellery",



        karat: batch?.kt || "",



        brand: "Annvi Gold",







        grossWeight: "",



        lessWeight: "0.000",



        stoneCharges: "0",



        netWeight: "",







        tagId,



        qrValue: tagId,



      });



    }



  });







  setExpectedTagCount(rows.length);



  let existingTagsQuery = supabase
    .from("printed_tags")
    .select("tag_id, created_at")
    .eq("order_id", order.id);

  if (currentRunStartedAt) {
    existingTagsQuery = existingTagsQuery.gte("created_at", currentRunStartedAt);
  }

  const { data: existingTags, error: existingTagsError } = await existingTagsQuery;



  if (existingTagsError) { alert(existingTagsError.message); return; }



  const printedTagIds = new Set((existingTags || []).map((tag) => tag.tag_id));

  const pendingRows = rows.filter((row) => !printedTagIds.has(row.tagId));



  if (rows.length === 0) alert(t("no_rhodium_received_pieces"));

  else if (pendingRows.length === 0) alert("All tags for this order are already printed.");



  setItems(pendingRows);



}



  function updateItem(rowKey, field, value) {



    setItems((prev) =>



      prev.map((item) => {



        if (item.rowKey !== rowKey) return item;







        const updated = { ...item, [field]: value };







        const gw = Number(updated.grossWeight || 0);



        const lw = Number(updated.lessWeight || 0);



        updated.netWeight = Math.max(gw - lw, 0).toFixed(3);







        return updated;



      })



    );



  }







  function useScale(rowKey) {



    updateItem(rowKey, "grossWeight", Number(scaleWeight || 0).toFixed(3));



  }



async function printTag(item) {



  if (!item.grossWeight) {



  return alert(t("gross_weight_required"));



}



  if (!item.karat) {



  return alert(t("karat_required"));



}







  const payload = {



    qr: item.tagId,



    brand: item.brand || "Annvi Gold",



    karat: item.karat,



    gw: Number(item.grossWeight || 0).toFixed(3),



    lw: Number(item.lessWeight || 0).toFixed(3),



    sc: Number(item.stoneCharges || 0),



    nw: Number(item.netWeight || 0).toFixed(3),



  };







  try {



    const res = await fetch(PRINT_URL, {



      method: "POST",



      headers: { "Content-Type": "application/json" },



      body: JSON.stringify(payload),



    });







    const data = await res.json();







    if (!data.ok) {



      alert(data.error || t("print_failed"));



      return;



    }







    const { data: printedTag, error: printedError } = await supabase



      .from("printed_tags")



      .insert([



        {



          order_id: selectedOrder.id,



          order_item_id: item.orderItemId,







          order_no: selectedOrder.order_no,



          party_name: selectedOrder.customer_name,







          tag_id: item.tagId,



          qr_value: item.tagId,







          brand: payload.brand,



          karat: payload.karat,







          gross_weight: payload.gw,



          less_weight: payload.lw,



          stone_charges: payload.sc,



          net_weight: payload.nw,







          category: item.category,



          sample_unique_id: null,



die_no: null,







          is_inventory_created: true,



          remarks: `${item.category || ""}`,



        },



      ])



      .select()



      .single();







    if (printedError) {



      alert(printedError.message);



      return;



    }







    const { error: inventoryError } = await supabase



      .from("finished_inventory")



      .insert([



        {



          order_id: selectedOrder.id,



          order_item_id: item.orderItemId,







          tag_id: item.tagId,



          qr_value: item.tagId,







          order_no: selectedOrder.order_no,



          party_name: selectedOrder.customer_name,







          category: item.category,



          sample_unique_id: null,



die_no: null,







          brand: payload.brand,



          karat: payload.karat,







          gross_weight: payload.gw,



          less_weight: payload.lw,



          stone_charges: payload.sc,



          net_weight: payload.nw,







          status: "IN_STOCK",



          printed_tag_id: printedTag.id,



        },



      ]);







    if (inventoryError) {



      alert(inventoryError.message);



      return;



    }







// -------------------------------------------------------



// CHECK WHETHER ALL TAGS FOR THIS ORDER ARE NOW PRINTED



// -------------------------------------------------------



let printedCountQuery = supabase
  .from("printed_tags")
  .select("id", {
    count: "exact",
    head: true,
  })
  .eq("order_id", selectedOrder.id);

if (activeTagRunStartedAt) {
  printedCountQuery = printedCountQuery.gte("created_at", activeTagRunStartedAt);
}

const { count: printedCount, error: countError } = await printedCountQuery;







if (countError) {



  alert(countError.message);



  return;



}







const totalRequiredTags = expectedTagCount;







const allTagsPrinted =



  Number(printedCount || 0) >= totalRequiredTags;







// -------------------------------------------------------



// LAST TAG PRINTED → COMPLETE ORDER



// -------------------------------------------------------



if (allTagsPrinted) {

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) { alert(userError.message); return; }



  const currentUser = userData?.user || null;

  const completedByName = currentUser?.user_metadata?.name || currentUser?.user_metadata?.full_name || currentUser?.email || null;



  for (const batchId of activeBatchIds) {

    const { data: reworkCompleteData, error: reworkCompleteError } = await supabase.rpc("complete_process_rework", {

      p_casting_batch_id: batchId,

      p_completed_process: "Tag Print",

      p_next_process: "Completed",

      p_completed_by: currentUser?.id || null,

      p_completed_by_name: completedByName,

    });



    if (reworkCompleteError || reworkCompleteData?.success === false) {

      console.error("complete_process_rework Tag Print error:", reworkCompleteError || reworkCompleteData);

      alert(`All tags were printed, but Tag Print rework completion failed: ${reworkCompleteError?.message || "Unknown error"}`);

      return;

    }

  }



  const { error: orderCompleteError } = await supabase



      .from("orders")



      .update({



        status: "COMPLETED",



        updated_at: new Date().toISOString(),



      })



      .eq("id", selectedOrder.id);







  if (orderCompleteError) {



    alert(orderCompleteError.message);



    return;



  }







  alert(



    `✅ Order ${selectedOrder.order_no} completed successfully.\n\nAll ${totalRequiredTags} tags have been printed.`



  );







  // Remove completed order from this Tag Print queue



  setOrders((prev) =>



    prev.filter(



      (order) => order.id !== selectedOrder.id



    )



  );







  setSelectedOrder(null);



  setItems([]);







  return;



}







// -------------------------------------------------------



// SOME TAGS STILL PENDING



// -------------------------------------------------------



alert(



  `Tag printed successfully.\n\n${printedCount} of ${totalRequiredTags} tags printed.`



);



  } catch {



    alert(t("print_bridge_not_running"));



  }



}







  if (authLoading || loading) {



    return (



  <main className="p-6">



    {t("loading_tag_print")}



  </main>



);



  }







  const totalPieces = items.length;



  const totalWeight = items.reduce(



    (sum, item) => sum + Number(item.netWeight || 0),



    0



  );







  return (



    <main className="min-h-screen bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">



      <div className="mx-auto max-w-7xl space-y-5">



        <header className="flex items-center justify-between">



  <div>



    <h1 className="text-2xl font-bold md:text-3xl">



  {t("tag_printing")}



</h1>







    <p className="text-sm text-gray-600">



  {t("tag_printing_subtitle")}



</p>



  </div>







  <div className="flex flex-wrap gap-2">



  <Link



    href="/factory/rhodium/dashboard"



    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"



  >



    {t("rhodium_plating")}



  </Link>







  <Link



    href="/dashboard"



    className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"



  >



    {t("dashboard")}



  </Link>



</div>



</header>







        <div className="rounded-3xl bg-white p-4 shadow-sm">



          <p className="text-xs font-semibold text-gray-500">



  {t("live_scale")}



</p>



          <p className="text-3xl font-bold text-green-700">{scaleWeight} g</p>



        </div>







        <section className="grid gap-4 lg:grid-cols-[360px_1fr]">



          <div className="rounded-3xl bg-white p-4 shadow-sm">



            <h2 className="mb-3 text-lg font-bold">



  {t("completed_orders")} ({orders.length})



</h2>







            <div className="space-y-2">



              {orders.map((order) => (



                <button



                  key={order.id}



                  onClick={() => openOrder(order)}



                  className={`w-full rounded-2xl border p-3 text-left ${



                    selectedOrder?.id === order.id



                      ? "border-black bg-slate-50"



                      : "border-gray-200"



                  }`}



                >



                  <p className="font-bold">{order.order_no}</p>



                  <p className="text-sm text-gray-600">{order.customer_name}</p>



                  <p className="text-xs text-gray-500">



  {order.status === "COMPLETED"



    ? t("completed")



    : order.status}



</p>



                </button>



              ))}







              {orders.length === 0 && (



                <p className="text-sm text-gray-500">



  {t("no_completed_orders")}



</p>



              )}



            </div>



          </div>







          <div className="rounded-3xl bg-white p-4 shadow-sm">



            {!selectedOrder ? (



              <p className="text-sm text-gray-500">



  {t("select_order")}



</p>



            ) : (



              <>



                <div className="mb-4 flex flex-wrap justify-between gap-3">



                  <div>



                    <h2 className="text-lg font-bold">



                      {selectedOrder.order_no}



                    </h2>



                    <p className="text-sm text-gray-600">



                      {selectedOrder.customer_name}



                    </p>



                  </div>







                  <div className="grid grid-cols-2 gap-2">



                    <MiniStat label={t("total_pieces")} value={totalPieces} />



                    <MiniStat



  label={t("total_weight")}



  value={`${totalWeight.toFixed(3)}g`}



/>



                  </div>



                </div>







                <div className="space-y-4">



                  {items.map((item, index) => (



                    <div



                      key={item.rowKey}



                      className="rounded-2xl border border-gray-200 bg-slate-50 p-3"



                    >



                      <div className="mb-3 flex flex-wrap justify-between gap-2">



                        <div>



                          <p className="font-bold">



  {t("piece")} {index + 1} · {item.category}



</p>







                        </div>







                        <button



                          onClick={() => printTag(item)}



                          className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-white"



                        >



                          {t("print_tag")}



                        </button>



                      </div>







                      <div className="grid gap-3 md:grid-cols-4">



                        <Field label={t("qr")}>



                          <input



                            className="input"



                            value={item.qrValue}



                            onChange={(e) =>



                              updateItem(item.rowKey, "qrValue", e.target.value)



                            }



                          />



                        </Field>







                        <Field label={t("brand")}>



                          <input



                            className="input"



                            value={item.brand}



                            onChange={(e) =>



                              updateItem(item.rowKey, "brand", e.target.value)



                            }



                          />



                        </Field>







                        <Field label={t("karat")}>



                          <input



                            className="input"



                            value={item.karat}



                            onChange={(e) =>



                              updateItem(item.rowKey, "karat", e.target.value)



                            }



                          />



                        </Field>







                        <Field label={t("gross_weight")}>



                          <div className="flex gap-2">



                            <input



                              className="input"



                              type="number"



                              step="0.001"



                              value={item.grossWeight}



                              onChange={(e) =>



                                updateItem(



                                  item.rowKey,



                                  "grossWeight",



                                  e.target.value



                                )



                              }



                            />



                            <button



                              onClick={() => useScale(item.rowKey)}



                              className="rounded-xl bg-green-600 px-3 text-xs font-bold text-white"



                            >



                              {t("scale")}



                            </button>



                          </div>



                        </Field>







                        <Field label={t("less_weight")}>



                          <input



                            className="input"



                            type="number"



                            step="0.001"



                            value={item.lessWeight}



                            onChange={(e) =>



                              updateItem(



                                item.rowKey,



                                "lessWeight",



                                e.target.value



                              )



                            }



                          />



                        </Field>







                        <Field label={t("stone_charges")}>



                          <input



                            className="input"



                            type="number"



                            value={item.stoneCharges}



                            onChange={(e) =>



                              updateItem(



                                item.rowKey,



                                "stoneCharges",



                                e.target.value



                              )



                            }



                          />



                        </Field>







                        <Field label={t("net_weight")}>



                          <input



                            className="input bg-gray-100"



                            value={item.netWeight}



                            readOnly



                          />



                        </Field>







                        <Field label={t("tag_id")}>



                          <input className="input bg-gray-100" value={item.tagId} readOnly />



                        </Field>



                      </div>



                    </div>



                  ))}



                </div>



              </>



            )}



          </div>



        </section>



      </div>







      <MobileBottomNav />







      <style jsx global>{`



        .input {



          width: 100%;



          border-radius: 0.8rem;



          border: 1px solid #d1d5db;



          background: white;



          padding: 0.7rem;



          font-size: 0.875rem;



          color: #111827;



          outline: none;



        }



      `}</style>



    </main>



  );



}







function makeTagId(orderNo, pieceNo, runId = "") {
  const cleanOrder = String(orderNo || "ORD")
    .replace(/[^0-9]/g, "")
    .slice(-6);

  // Include a short Rhodium-result token so a rerun never collides with
  // a historical printed tag from an older manufacturing run.
  const runToken = String(runId || "RUN")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-4)
    .toUpperCase()
    .padStart(4, "0");

  return `AG${cleanOrder}${String(pieceNo).padStart(2, "0")}${runToken}`;
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



      <p className="text-sm font-bold">{value}</p>



    </div>



  );



}