"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useRequireAuth } from "../../../lib/useRequireAuth";
import MobileBottomNav from "../../../components/MobileBottomNav";
import { useLanguage } from "../../../context/LanguageContext";

const KARATS = ["9KT", "14KT", "18KT", "20KT", "22KT"];

export default function CastingPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { t } = useLanguage();

  const router = useRouter();

  const [orders, setOrders] = useState([]);
const [trees, setTrees] = useState([]);
const [treeItems, setTreeItems] = useState([]);
const [selectedTreeId, setSelectedTreeId] = useState("");
const [selectedItems, setSelectedItems] = useState([]);

  const [ktFormulas, setKtFormulas] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryTransactions, setInventoryTransactions] = useState([]);

  const [selectedKt, setSelectedKt] = useState("18KT");
  const [treeWeight, setTreeWeight] = useState("");
  const [actualMetalWeight, setActualMetalWeight] = useState("");

  const [metalInputs, setMetalInputs] = useState([
    { source_type: "Fine Gold", source_kt: "24KT", weight: "" },
  ]);

  const [saving, setSaving] = useState(false);
const [savingDraft, setSavingDraft] = useState(false);

function loadCastingDraft() {
  try {
    const savedDraft = localStorage.getItem("casting_page_draft");

    if (!savedDraft) return;

    const draft = JSON.parse(savedDraft);

    setSelectedTreeId(draft.selectedTreeId || "");
setSelectedItems(draft.selectedItems || []);

    setSelectedKt(draft.selectedKt || "18KT");
    setTreeWeight(draft.treeWeight || "");
    setActualMetalWeight(draft.actualMetalWeight || "");

    setMetalInputs(
      draft.metalInputs?.length
        ? draft.metalInputs
        : [
            {
              source_type: "Fine Gold",
              source_kt: "24KT",
              weight: "",
            },
          ]
    );
  } catch (error) {
    console.error("Casting draft load error:", error);
  }
} 

function saveCastingDraft() {
  try {
    setSavingDraft(true);

    const draftData = {
      selectedTreeId,
selectedItems,
      selectedKt,
      treeWeight,
      actualMetalWeight,
      metalInputs,
    };

    localStorage.setItem(
      "casting_page_draft",
      JSON.stringify(draftData)
    );

    alert(t("draft_saved"));
  } catch (error) {
    console.error("Casting draft save error:", error);
    alert(error.message);
  } finally {
    setSavingDraft(false);
  }
}

function clearCastingDraft() {
  localStorage.removeItem("casting_page_draft");
}

async function fetchData() {
  const [
    formulasResult,
    treesResult,
    usedTreesResult,
    invItemsResult,
    invTxResult,
  ] = await Promise.all([
    supabase
      .from("kt_formulas")
      .select("*")
      .eq("is_active", true),

    supabase
      .from("casting_trees")
      .select(`
        id,
        tree_no,
        flask_no,
        kt,
        tree_weight,
        tree_date,
        burnout_date,
        status,
        remarks,
        created_at
      `)
      .in("status", ["Planned", "Burnout", "Ready For Casting"])
      .order("created_at", { ascending: false }),

    supabase
      .from("casting_batches")
      .select("casting_tree_id")
      .not("casting_tree_id", "is", null),

    supabase
      .from("inventory_items")
      .select("*")
      .eq("is_active", true),

    supabase
      .from("inventory_transactions")
      .select("*, inventory_items(*)"),
  ]);

  if (treesResult.error) {
    console.error("Casting trees load error:", treesResult.error);
  }

  const usedTreeIds = new Set(
    (usedTreesResult.data || [])
      .map((row) => row.casting_tree_id)
      .filter(Boolean)
  );

  const availableTrees = (treesResult.data || []).filter(
    (tree) => !usedTreeIds.has(tree.id)
  );

  const availableTreeIds = availableTrees.map((tree) => tree.id);

  let loadedTreeItems = [];

  if (availableTreeIds.length > 0) {
    const { data, error } = await supabase
      .from("casting_tree_items")
      .select(`
        id,
        casting_tree_id,
        order_id,
        order_item_id,
        selected_quantity,
        category,
        sample_unique_id,
        die_no,
        approx_weight
      `)
      .in("casting_tree_id", availableTreeIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Casting tree items load error:", error);
    } else {
      loadedTreeItems = data || [];
    }
  }

  const orderIds = [
    ...new Set(
      loadedTreeItems
        .map((item) => item.order_id)
        .filter(Boolean)
    ),
  ];

  let loadedOrders = [];

  if (orderIds.length > 0) {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_no,
        customer_name,
        customer_mobile,
        status
      `)
      .in("id", orderIds);

    if (error) {
      console.error("Tree orders load error:", error);
    } else {
      loadedOrders = data || [];
    }
  }

  setKtFormulas(formulasResult.data || []);
  setTrees(availableTrees);
  setTreeItems(loadedTreeItems);
  setOrders(loadedOrders);
  setInventoryItems(invItemsResult.data || []);
  setInventoryTransactions(invTxResult.data || []);
}

useEffect(() => {
  fetchData();
  loadCastingDraft();
}, []);

const ordersById = useMemo(() => {
  const map = {};

  orders.forEach((order) => {
    map[order.id] = order;
  });

  return map;
}, [orders]);

const selectedTree = useMemo(
  () => trees.find((tree) => tree.id === selectedTreeId) || null,
  [trees, selectedTreeId]
);

function getTreeItems(treeId) {
  return treeItems.filter(
    (item) => item.casting_tree_id === treeId
  );
}

function getTreeOrderIds(treeId) {
  return [
    ...new Set(
      getTreeItems(treeId)
        .map((item) => item.order_id)
        .filter(Boolean)
    ),
  ];
}
  function getStockBalance(inventoryItemId, kt) {
    let balance = 0;

    inventoryTransactions.forEach((tx) => {
      if (tx.inventory_item_id !== inventoryItemId) return;
      if ((tx.kt || "") !== kt) return;

      const sign = tx.transaction_type === "Stock Out" ? -1 : 1;
      balance += sign * Number(tx.weight || 0);
    });

    return balance;
  }

  const selectedFormula = useMemo(
    () => ktFormulas.find((k) => k.kt === selectedKt),
    [ktFormulas, selectedKt]
  );

  const suggestedMetalWeight = useMemo(() => {
    if (!treeWeight || !selectedFormula) return 0;
    return Number(treeWeight) * Number(selectedFormula.tree_multiplier || 0);
  }, [treeWeight, selectedFormula]);

  const targetMetal = Number(actualMetalWeight || 0) || suggestedMetalWeight;
  const targetPurity = Number(selectedFormula?.gold_percent || 0) / 100;

  const calculations = useMemo(() => {
    const fineInputs = metalInputs.filter((x) => x.source_type === "Fine Gold");
    const scrapInputs = metalInputs.filter((x) => x.source_type === "Scrap");

    const requiredPureGold = targetMetal * targetPurity;
    const required995ForFull = requiredPureGold / 0.995;
    const requiredAlloyForFull = targetMetal - requiredPureGold;

    let fine995Used = 0;
    let finePureGold = 0;
    let fineGeneratedMetal = 0;
    let fineAlloyRequired = 0;

    fineInputs.forEach((input) => {
      const weight = Number(input.weight || 0);
      fine995Used += weight;
      const pure = weight * 0.995;
      finePureGold += pure;
      const generated = targetPurity > 0 ? pure / targetPurity : 0;
      fineGeneratedMetal += generated;
      fineAlloyRequired += Math.max(generated - pure, 0);
    });

    let scrapGeneratedMetal = 0;
    let scrapAlloyRequired = 0;
    let scrapFine995Required = 0;

    const scrapBreakup = scrapInputs.map((input) => {
      const weight = Number(input.weight || 0);
      const sourcePurity = getPurity(input.source_kt) / 100;

      if (!weight || !sourcePurity || !targetPurity) {
        return {
          ...input,
          generatedMetal: 0,
          alloyRequired: 0,
          fine995Required: 0,
          type: "Empty",
        };
      }

      if (Math.abs(sourcePurity - targetPurity) < 0.00001) {
        scrapGeneratedMetal += weight;

        return {
          ...input,
          generatedMetal: weight,
          alloyRequired: 0,
          fine995Required: 0,
          type: "Same KT",
        };
      }

      if (sourcePurity > targetPurity) {
        const netFine = weight * sourcePurity;
        const generatedMetal = netFine / targetPurity;

        // ✅ Correct higher KT → lower KT formula
        const alloyRequired = generatedMetal - weight;

        scrapGeneratedMetal += generatedMetal;
        scrapAlloyRequired += alloyRequired;

        return {
          ...input,
          generatedMetal,
          alloyRequired,
          fine995Required: 0,
          type: "Higher KT",
        };
      }

      // ✅ Lower KT → higher KT formula
      const pureFineRequired =
        weight *
        ((targetPurity * 100 - sourcePurity * 100) /
          (100 - targetPurity * 100));

      const fine995Required = pureFineRequired / 0.995;
      const generatedMetal = weight + fine995Required;

      scrapGeneratedMetal += generatedMetal;
      scrapFine995Required += fine995Required;

      return {
        ...input,
        generatedMetal,
        alloyRequired: 0,
        fine995Required,
        type: "Lower KT",
      };
    });

    const generatedMetal = fineGeneratedMetal + scrapGeneratedMetal;
    const remainingMetal = targetMetal - generatedMetal;

    const remaining995Fine =
      remainingMetal > 0 ? (remainingMetal * targetPurity) / 0.995 : 0;

    const remainingAlloy =
      remainingMetal > 0 ? remainingMetal * (1 - targetPurity) : 0;

    const total995Required =
      Math.max(required995ForFull - fine995Used, 0) + scrapFine995Required;

    const totalAlloyRequired =
      fineAlloyRequired + scrapAlloyRequired + remainingAlloy;

    return {
      required995ForFull,
      requiredAlloyForFull,
      fine995Used,
      fineGeneratedMetal,
      fineAlloyRequired,
      scrapGeneratedMetal,
      scrapAlloyRequired,
      scrapFine995Required,
      scrapBreakup,
      generatedMetal,
      remainingMetal,
      remaining995Fine,
      remainingAlloy,
      total995Required,
      totalAlloyRequired,
    };
  }, [metalInputs, targetMetal, targetPurity, ktFormulas]);

 function handleSelectTree(treeId) {
  const tree = trees.find((row) => row.id === treeId);

  if (!tree) return;

  const allocatedItems = getTreeItems(treeId);

  setSelectedTreeId(treeId);
  setSelectedKt(tree.kt || "18KT");
  setTreeWeight(
    tree.tree_weight === null ||
      tree.tree_weight === undefined
      ? ""
      : String(tree.tree_weight)
  );
  setActualMetalWeight("");

  setSelectedItems(
    allocatedItems.map((item) => ({
      ...item,
      selected_quantity: Number(item.selected_quantity || 0),
    }))
  );

  setMetalInputs((previous) =>
    previous.map((input) => ({
      ...input,
      source_kt:
        input.source_type === "Fine Gold"
          ? "24KT"
          : tree.kt || "18KT",
    }))
  );
} 

  function addMetalInput() {
    setMetalInputs((prev) => [
      ...prev,
      { source_type: "Scrap", source_kt: selectedKt, weight: "" },
    ]);
  }

  function removeMetalInput(index) {
    if (metalInputs.length === 1) return;
    setMetalInputs((prev) => prev.filter((_, i) => i !== index));
  }

  function updateInput(index, field, value) {
    setMetalInputs((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const updated = { ...item, [field]: value };

        if (field === "source_type") {
          updated.source_kt = value === "Fine Gold" ? "24KT" : selectedKt;
        }

        return updated;
      })
    );
  }

  function validateStock() {
    const errors = [];

    metalInputs.forEach((input) => {
      const weight = Number(input.weight || 0);
      if (!weight) return;

      const itemId = getInventoryItemId(input.source_type);
      const stockKt = input.source_type === "Fine Gold" ? "24KT" : input.source_kt;
      const available = itemId ? getStockBalance(itemId, stockKt) : 0;

      if (available < weight) {
        errors.push({
          name: input.source_type,
          kt: stockKt,
          required: weight,
          available,
        });
      }
    });

    if (calculations.totalAlloyRequired > 0.001) {
      const alloyId = getInventoryItemId("Alloy");
      const available = alloyId ? getStockBalance(alloyId, selectedKt) : 0;

      if (available < calculations.totalAlloyRequired) {
        errors.push({
          name: "Alloy",
          kt: selectedKt,
          required: calculations.totalAlloyRequired,
          available,
        });
      }
    }

    return errors;
  }

  async function createBatch() {
   if (!selectedTreeId) {
  return alert(t("select_tree_first"));
}

if (!treeWeight || Number(treeWeight) <= 0) {
  return alert(t("enter_tree_weight"));
}

if (selectedItems.length === 0) {
  return alert(t("tree_has_no_items"));
}

    const stockErrors = validateStock();

    if (stockErrors.length > 0) {
      alert(
        "Insufficient stock:\n\n" +
          stockErrors
            .map(
              (x) =>
                `${x.name} ${x.kt}: Required ${x.required.toFixed(
                  3
                )}g, Available ${x.available.toFixed(3)}g`
            )
            .join("\n")
      );
      return;
    }

    setSaving(true);

    const batchNo = "CB-" + Date.now().toString().slice(-6);

    const { data: batchData, error } = await supabase
      .from("casting_batches")
      .insert([
        {
  batch_no: batchNo,
casting_tree_id: selectedTreeId,
order_id: selectedItems[0]?.order_id || null,
kt: selectedKt,
  tree_weight: Number(treeWeight || 0),
  suggested_metal_weight: suggestedMetalWeight,
  actual_metal_weight: targetMetal,
  target_gold_percent: Number(selectedFormula?.gold_percent || 0),
  alloy_required: calculations.totalAlloyRequired,
  fine_995_required: calculations.total995Required,
  total_target_metal_generated: calculations.generatedMetal,
  remaining_target_metal: calculations.remainingMetal,
  created_by: user?.id || null,
  status: "Casting",
  current_process: "casting",
},
      ])
      .select()
      .single();

    if (error) {
      setSaving(false);
      return alert(error.message);
    }

    const batchId = batchData.id;

    await supabase.from("casting_batch_items").insert(
      selectedItems.map((item) => ({
        casting_batch_id: batchId,
        order_id: item.order_id,
        order_item_id: item.order_item_id,
        category: item.category,
        sample_unique_id: item.sample_unique_id,
        die_no: item.die_no,
        selected_quantity: Number(item.selected_quantity || 1),
        approx_weight: Number(item.approx_weight || 0),
      }))
    );

    await supabase.from("casting_batch_metal_inputs").insert(
      metalInputs.map((input) => {
        const purity = getPurity(input.source_kt);
        const weight = Number(input.weight || 0);

        return {
          casting_batch_id: batchId,
          source_type: input.source_type,
          source_kt: input.source_kt,
          source_name:
            input.source_type === "Fine Gold" ? "995 Fine Gold" : "Scrap",
          weight,
          purity_percent: purity,
          pure_gold_weight: (weight * purity) / 100,
        };
      })
    );

    const inventoryRows = [];

    metalInputs.forEach((input) => {
      const weight = Number(input.weight || 0);
      if (!weight) return;

      const itemId = getInventoryItemId(input.source_type);
      const stockKt = input.source_type === "Fine Gold" ? "24KT" : input.source_kt;

      inventoryRows.push({
        inventory_item_id: itemId,
        kt: stockKt,
        transaction_type: "Stock Out",
        purpose: "Casting",
        reference_no: batchNo,
        weight,
        quantity: 0,
        weight_source: "manual",
        remarks: `${input.source_type} issued for casting batch ${batchNo}`,
        created_by: user?.id || null,
      });
    });

    if (calculations.totalAlloyRequired > 0.001) {
      const alloyId = getInventoryItemId("Alloy");

      inventoryRows.push({
        inventory_item_id: alloyId,
        kt: selectedKt,
        transaction_type: "Stock Out",
        purpose: "Casting",
        reference_no: batchNo,
        weight: calculations.totalAlloyRequired,
        quantity: 0,
        weight_source: "manual",
        remarks: `Alloy issued for casting batch ${batchNo}`,
        created_by: user?.id || null,
      });
    }

    await supabase.from("inventory_transactions").insert(inventoryRows);

    await supabase
  .from("casting_trees")
  .update({
    status: "Casting",
    updated_at: new Date().toISOString(),
  })
  .eq("id", selectedTreeId);

    alert(`Casting batch created: ${batchNo}`);

    setSaving(false);
    setTreeWeight("");
    setActualMetalWeight("");
    setMetalInputs([{ source_type: "Fine Gold", source_kt: "24KT", weight: "" }]);
setSelectedTreeId("");
setSelectedItems([]);

clearCastingDraft();

fetchData();

router.push(`/factory/casting/dashboard?batch=${batchId}`);
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <p className="text-sm text-gray-700">Checking login...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overscroll-y-contain bg-slate-100 p-3 pb-28 text-gray-900 md:p-5">
      <div className="mx-auto max-w-7xl space-y-4">
        <Header t={t} />

       <Card title={t("select_tree")}>
  {trees.length === 0 ? (
    <div className="rounded-xl border border-dashed border-gray-300 bg-slate-50 p-8 text-center">
      <p className="text-sm font-bold text-gray-700">
        {t("no_casting_trees")}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {t("no_casting_trees_hint")}
      </p>
    </div>
  ) : (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {trees.map((tree) => {
        const items = getTreeItems(tree.id);
        const orderIds = getTreeOrderIds(tree.id);
        const selected = selectedTreeId === tree.id;

        const totalQuantity = items.reduce(
          (sum, item) =>
            sum + Number(item.selected_quantity || 0),
          0
        );

        return (
          <button
            key={tree.id}
            type="button"
            onClick={() => handleSelectTree(tree.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              selected
                ? "border-black bg-slate-100 ring-2 ring-slate-200"
                : "border-gray-200 bg-white hover:border-gray-400"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-gray-950">
                  {tree.tree_no}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {t("flask_no")}: {tree.flask_no || "-"} ·{" "}
                  {tree.kt}
                </p>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  selected
                    ? "bg-black text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {selected ? t("tree_selected") : tree.status}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <MiniTreeStat
                label={t("tree_weight")}
                value={`${Number(tree.tree_weight || 0).toFixed(3)} g`}
              />

              <MiniTreeStat
                label={t("items")}
                value={items.length}
              />

              <MiniTreeStat
                label={t("quantity")}
                value={totalQuantity}
              />
            </div>

            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                {t("tree_orders")}
              </p>

              <div className="mt-2 space-y-1">
                {orderIds.map((orderId) => {
                  const order = ordersById[orderId];

                  return (
                    <p
                      key={orderId}
                      className="text-xs text-gray-700"
                    >
                      <span className="font-semibold">
                        {order?.order_no || "-"}
                      </span>

                      {" · "}

                      {order?.customer_name || "-"}
                    </p>
                  );
                })}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  )}
</Card> 

        
        <Card title={t("batch_details")}>
          <div className="grid gap-3 md:grid-cols-4">
           <Field label={t("target_kt")}>
              <select
  value={selectedKt}
  className="input disabled:bg-slate-100 disabled:text-gray-700"
  disabled
>
                {KARATS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>

            <Field label={t("tree_weight")}>
              <div>
  <input
    type="number"
    step="0.001"
    placeholder="0.000"
    value={treeWeight}
    readOnly
    className="input bg-slate-100 font-semibold text-gray-800"
  />

  <p className="mt-1 text-[10px] text-gray-500">
    {t("tree_weight_auto")}
  </p>
</div>
            </Field>

            <Field label={t("actual_metal_weight")}>
              <input
                type="number"
                step="0.001"
                placeholder={t("optional")}
                value={actualMetalWeight}
                onChange={(e) => setActualMetalWeight(e.target.value)}
                className="input"
              />
            </Field>

            <MiniStat
              label={t("suggested_metal")}
              value={`${suggestedMetalWeight.toFixed(3)} g`}
            />
          </div>
        </Card>

        <Card
          title={t("metal_inputs")}
          action={
            <button
              type="button"
              onClick={addMetalInput}
              className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white"
            >
              {t("add")}
            </button>
          }
        >
          <div className="space-y-2">
            {metalInputs.map((input, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-xl border border-gray-200 p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <select
                  value={input.source_type}
                  onChange={(e) => updateInput(index, "source_type", e.target.value)}
                  className="input"
                >
                  <option>Fine Gold</option>
                  <option>Scrap</option>
                </select>

                <select
                  value={input.source_kt}
                  onChange={(e) => updateInput(index, "source_kt", e.target.value)}
                  className="input"
                  disabled={input.source_type === "Fine Gold"}
                >
                  {input.source_type === "Fine Gold" ? (
                    <option>24KT</option>
                  ) : (
                    KARATS.map((k) => <option key={k}>{k}</option>)
                  )}
                </select>

                <input
                  type="number"
                  step="0.001"
                  placeholder="Weight"
                  value={input.weight}
                  onChange={(e) => updateInput(index, "weight", e.target.value)}
                  className="input"
                />

                <button
                  type="button"
                  onClick={() => removeMetalInput(index)}
                  className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                >
                  {t("remove")}
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card title={t("fine_gold_calculation")}>
          <div className="grid gap-3 md:grid-cols-4">
            <GreenStat
              label={t("full_995_fine_required")}
              value={`${calculations.required995ForFull.toFixed(3)} g`}
            />
            <MiniStat
              label={t("fine_995_entered")}
              value={`${calculations.fine995Used.toFixed(3)} g`}
            />
            <GreenStat
              label={t("fine_generated_metal")}
              value={`${calculations.fineGeneratedMetal.toFixed(3)} g`}
            />
            <GreenStat
              label={t("alloy_for_fine")}
              value={`${calculations.fineAlloyRequired.toFixed(3)} g`}
            />
          </div>
        </Card>

        <Card title={t("scrap_conversion_calculation")}>
          <div className="space-y-2">
            {calculations.scrapBreakup.length === 0 ? (
              <p className="text-sm text-gray-500">{t("no_scrap_entered")}  </p>
            ) : (
              calculations.scrapBreakup.map((s, i) => (
                <div
                  key={i}
                  className="grid gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-5"
                >
                  <MiniStat label={t("scrap_kt")} value={s.source_kt} />
                  <MiniStat label={t("type")} value={s.type} />
                  <GreenStat
                    label={t("generated_metal")}
                    value={`${s.generatedMetal.toFixed(3)} g`}
                  />
                  <GreenStat
                    label={t("alloy_needed")}
                    value={`${s.alloyRequired.toFixed(3)} g`}
                  />
                  <GreenStat
                    label={t("fine_995_needed")}
                    value={`${s.fine995Required.toFixed(3)} g`}
                  />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title={t("final_total_calculation")}>
          <div className="grid gap-3 md:grid-cols-5">
            <MiniStat label={t("target_metal")} value={`${targetMetal.toFixed(3)} g`} />
            <GreenStat
              label="Generated Metal"
              value={`${calculations.generatedMetal.toFixed(3)} g`}
            />
            <MiniStat
              label={t("remaining_metal")}
              value={`${calculations.remainingMetal.toFixed(3)} g`}
              warn={Math.abs(calculations.remainingMetal) > 0.001}
            />
            <GreenStat
              label={t("total_alloy_required")}
              value={`${calculations.totalAlloyRequired.toFixed(3)} g`}
            />
            <GreenStat
              label={t("total_995_fine_required")}
              value={`${calculations.total995Required.toFixed(3)} g`}
            />
          </div>
        </Card>
      </div>

<div className="fixed bottom-20 left-3 right-3 z-40 grid grid-cols-2 gap-3 md:static md:mx-auto md:mt-5 md:max-w-7xl">
  <button
    type="button"
    disabled={savingDraft || saving}
    onClick={saveCastingDraft}
    className="rounded-2xl bg-blue-600 p-4 text-sm font-semibold text-white shadow-xl disabled:bg-gray-400"
  >
    {savingDraft ? t("saving") : t("save_draft")}
  </button>

  <button
    type="button"
    disabled={saving || savingDraft}
    onClick={createBatch}
    className="rounded-2xl bg-black p-4 text-sm font-semibold text-white shadow-xl disabled:bg-gray-400"
  >
    {saving ? t("creating") : t("create_casting_batch")}
  </button>
</div>

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
      `}</style>

      <MobileBottomNav />
    </main>
  );
}

function Header({ t }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t("casting_batch")}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {t("casting_subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/factory/casting/dashboard"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"
        >
          {t("casting_dashboard")}
        </Link>
        <Link
          href="/factory/inventory"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"
        >
          {t("inventory")}
        </Link>
      </div>
    </div>
  );
}

function Card({ title, children, action }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function MiniTreeStat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <p className="text-[9px] font-semibold text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-xs font-bold text-gray-900">
        {value}
      </p>
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

function MiniStat({ label, value, warn }) {
  return (
    <div className={`rounded-xl p-3 ${warn ? "bg-orange-50" : "bg-slate-50"}`}>
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function GreenStat({ label, value }) {
  return (
    <div className="rounded-xl bg-green-50 p-3">
      <p className="text-xs font-semibold text-green-700">{label}</p>
      <p className="mt-1 text-lg font-bold text-green-800">{value}</p>
    </div>
  );
}