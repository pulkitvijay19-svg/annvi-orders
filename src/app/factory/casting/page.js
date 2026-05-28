"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import MobileBottomNav from "@/components/MobileBottomNav";

const KARATS = ["9KT", "14KT", "18KT", "20KT", "22KT"];

export default function CastingPage() {
  const { user, loading: authLoading } = useRequireAuth();

  const [orders, setOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
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

  async function fetchData() {
    const { data: formulas } = await supabase
      .from("kt_formulas")
      .select("*")
      .eq("is_active", true);

    const { data: orderData } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["New", "Approved"])
      .order("created_at", { ascending: false });

    const { data: invItems } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("is_active", true);

    const { data: invTx } = await supabase
      .from("inventory_transactions")
      .select("*, inventory_items(*)");

    setKtFormulas(formulas || []);
    setOrders(orderData || []);
    setInventoryItems(invItems || []);
    setInventoryTransactions(invTx || []);
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function loadOrderItems(orderIds) {
    if (orderIds.length === 0) {
      setOrderItems([]);
      setSelectedItems([]);
      return;
    }

    const { data } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);

    setOrderItems(data || []);
    setSelectedItems((prev) =>
      prev.filter((x) => orderIds.includes(x.order_id))
    );
  }

  function getPurity(kt) {
    if (kt === "24KT") return 99.5;
    const formula = ktFormulas.find((k) => k.kt === kt);
    return Number(formula?.gold_percent || 0);
  }

function getInventoryItemId(sourceType) {
  if (sourceType === "Fine Gold") {
    return inventoryItems.find(
      (i) => i.item_type === "Gold" && i.item_name === "Gold Fine"
    )?.id;
  }

  if (sourceType === "Scrap") {
    return inventoryItems.find(
      (i) => i.item_type === "Scrap" && i.item_name === "Casting Scrap"
    )?.id;
  }

  if (sourceType === "Alloy") {
    return inventoryItems.find(
      (i) => i.item_type === "Metal" && i.item_name === "Alloy"
    )?.id;
  }

  return null;
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

  function toggleOrder(orderId) {
    const updated = selectedOrderIds.includes(orderId)
      ? selectedOrderIds.filter((id) => id !== orderId)
      : [...selectedOrderIds, orderId];

    setSelectedOrderIds(updated);
    loadOrderItems(updated);
  }

  function toggleItem(item) {
    const exists = selectedItems.find((i) => i.id === item.id);

    if (exists) {
      setSelectedItems((prev) => prev.filter((i) => i.id !== item.id));
    } else {
      setSelectedItems((prev) => [
        ...prev,
        { ...item, selected_quantity: item.quantity || 1 },
      ]);
    }
  }

  function updateSelectedQty(itemId, qty) {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, selected_quantity: qty } : item
      )
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
    if (!treeWeight) return alert("Enter tree weight");
    if (selectedItems.length === 0) return alert("Select order items");

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
          status: "Draft",
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
        order_item_id: item.id,
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
      .from("orders")
      .update({ status: "In Production" })
      .in("id", [...new Set(selectedItems.map((i) => i.order_id))]);

    alert(`Casting batch created: ${batchNo}`);

    setSaving(false);
    setTreeWeight("");
    setActualMetalWeight("");
    setMetalInputs([{ source_type: "Fine Gold", source_kt: "24KT", weight: "" }]);
    setSelectedOrderIds([]);
    setOrderItems([]);
    setSelectedItems([]);
    fetchData();
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
        <Header />

        <Card title="1. Select Orders">
          <div className="grid gap-2 md:grid-cols-3">
            {orders.map((order) => (
              <label
                key={order.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${
                  selectedOrderIds.includes(order.id)
                    ? "border-black bg-slate-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedOrderIds.includes(order.id)}
                  onChange={() => toggleOrder(order.id)}
                />
                <div>
                  <p className="font-semibold">{order.order_no}</p>
                  <p className="text-xs text-gray-500">
                    {order.customer_name || "-"} · {order.status}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </Card>

        <Card title="2. Select Items">
          {orderItems.length === 0 ? (
            <p className="text-sm text-gray-500">Select order first.</p>
          ) : (
            <div className="space-y-2">
              {orderItems.map((item) => {
                const selected = selectedItems.find((i) => i.id === item.id);

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3 ${
                      selected ? "border-black bg-slate-50" : "border-gray-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() => toggleItem(item)}
                        />
                        <div>
                          <p className="text-sm font-semibold">{item.category}</p>
                          <p className="text-xs text-gray-500">
                            {item.sample_unique_id || "-"} · Die{" "}
                            {item.die_no || "-"} · Wt{" "}
                            {Number(item.approx_weight || 0).toFixed(3)}g
                          </p>
                        </div>
                      </label>

                      <input
                        type="number"
                        min="1"
                        max={item.quantity || 1}
                        value={selected?.selected_quantity || item.quantity || 1}
                        onChange={(e) => updateSelectedQty(item.id, e.target.value)}
                        className="w-20 rounded-lg border border-gray-300 bg-white p-2 text-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="3. Batch Details">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Target KT">
              <select
                value={selectedKt}
                onChange={(e) => setSelectedKt(e.target.value)}
                className="input"
              >
                {KARATS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>

            <Field label="Tree Weight">
              <input
                type="number"
                step="0.001"
                placeholder="0.000"
                value={treeWeight}
                onChange={(e) => setTreeWeight(e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Actual Metal Weight">
              <input
                type="number"
                step="0.001"
                placeholder="optional"
                value={actualMetalWeight}
                onChange={(e) => setActualMetalWeight(e.target.value)}
                className="input"
              />
            </Field>

            <MiniStat
              label="Suggested Metal"
              value={`${suggestedMetalWeight.toFixed(3)} g`}
            />
          </div>
        </Card>

        <Card
          title="4. Metal Inputs"
          action={
            <button
              type="button"
              onClick={addMetalInput}
              className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white"
            >
              + Add
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
                  Remove
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card title="5. Fine Gold Calculation">
          <div className="grid gap-3 md:grid-cols-4">
            <GreenStat
              label="Full 995 Fine Required"
              value={`${calculations.required995ForFull.toFixed(3)} g`}
            />
            <MiniStat
              label="995 Fine Entered"
              value={`${calculations.fine995Used.toFixed(3)} g`}
            />
            <GreenStat
              label="Fine Generated Metal"
              value={`${calculations.fineGeneratedMetal.toFixed(3)} g`}
            />
            <GreenStat
              label="Alloy For Fine"
              value={`${calculations.fineAlloyRequired.toFixed(3)} g`}
            />
          </div>
        </Card>

        <Card title="6. Scrap Conversion Calculation">
          <div className="space-y-2">
            {calculations.scrapBreakup.length === 0 ? (
              <p className="text-sm text-gray-500">No scrap entered.</p>
            ) : (
              calculations.scrapBreakup.map((s, i) => (
                <div
                  key={i}
                  className="grid gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-5"
                >
                  <MiniStat label="Scrap KT" value={s.source_kt} />
                  <MiniStat label="Type" value={s.type} />
                  <GreenStat
                    label="Generated Metal"
                    value={`${s.generatedMetal.toFixed(3)} g`}
                  />
                  <GreenStat
                    label="Alloy Needed"
                    value={`${s.alloyRequired.toFixed(3)} g`}
                  />
                  <GreenStat
                    label="995 Fine Needed"
                    value={`${s.fine995Required.toFixed(3)} g`}
                  />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="7. Final Total Calculation">
          <div className="grid gap-3 md:grid-cols-5">
            <MiniStat label="Target Metal" value={`${targetMetal.toFixed(3)} g`} />
            <GreenStat
              label="Generated Metal"
              value={`${calculations.generatedMetal.toFixed(3)} g`}
            />
            <MiniStat
              label="Remaining Metal"
              value={`${calculations.remainingMetal.toFixed(3)} g`}
              warn={Math.abs(calculations.remainingMetal) > 0.001}
            />
            <GreenStat
              label="Total Alloy Required"
              value={`${calculations.totalAlloyRequired.toFixed(3)} g`}
            />
            <GreenStat
              label="Total 995 Fine Required"
              value={`${calculations.total995Required.toFixed(3)} g`}
            />
          </div>
        </Card>
      </div>

      <button
        disabled={saving}
        onClick={createBatch}
        className="fixed bottom-20 left-3 right-3 z-40 rounded-2xl bg-black p-4 text-sm font-semibold text-white shadow-xl disabled:bg-gray-400 md:static md:mx-auto md:mt-5 md:block md:max-w-7xl"
      >
        {saving ? "Creating..." : "Create Casting Batch"}
      </button>

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

function Header() {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Casting Batch</h1>
        <p className="mt-1 text-sm text-gray-600">
          Select order items and calculate metal issue.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/factory/casting/dashboard"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"
        >
          Casting Dashboard
        </Link>
        <Link
          href="/factory/inventory"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"
        >
          Inventory
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