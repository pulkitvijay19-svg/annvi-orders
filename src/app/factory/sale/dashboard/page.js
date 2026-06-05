"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import MobileBottomNav from "@/components/MobileBottomNav";

function n(value) {
  return Number(value || 0);
}

function f3(value) {
  return Number(value || 0).toFixed(3);
}

function getKaratPercent(karat = "") {
  const k = String(karat).toUpperCase();
  if (k.includes("9")) return 38;
  if (k.includes("14")) return 59;
  if (k.includes("18")) return 76;
  if (k.includes("20")) return 84;
  if (k.includes("22")) return 92;
  return 0;
}

export default function SaleDashboardPage() {
  const { loading: authLoading } = useRequireAuth();

  const scannerRef = useRef(null);

  const [partySearch, setPartySearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [orderInventory, setOrderInventory] = useState([]);
  const [qrInput, setQrInput] = useState("");
  const [saleItems, setSaleItems] = useState([]);

  const [partyMobile, setPartyMobile] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const [categoryWastage, setCategoryWastage] = useState({});
  const [goldRate, setGoldRate] = useState("");
  const [labourCharges, setLabourCharges] = useState("");
  const [huidCharges, setHuidCharges] = useState("");
  const [goldReceived, setGoldReceived] = useState("");
  const [cashReceived, setCashReceived] = useState("");

  const [paymentMode, setPaymentMode] = useState("CASH"); // CASH, GOLD, MIXED
  const [availableAdvanceGold, setAvailableAdvanceGold] = useState(0);
  const [advanceGoldAdjusted, setAdvanceGoldAdjusted] = useState("");

  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    fetchCompletedOrders();
  }, []);

  const suggestions = useMemo(() => {
    const q = partySearch.toLowerCase().trim();
    if (!q) return [];
    return orders.filter((o) =>
      String(o.customer_name || "").toLowerCase().includes(q)
    );
  }, [partySearch, orders]);

  const orderSummary = useMemo(() => {
    return orderInventory.reduce(
      (acc, item) => {
        acc.pieces += 1;
        acc.gw += n(item.gross_weight);
        acc.lw += n(item.less_weight);
        acc.nw += n(item.net_weight);
        acc.sc += n(item.stone_charges);
        return acc;
      },
      { pieces: 0, gw: 0, lw: 0, nw: 0, sc: 0 }
    );
  }, [orderInventory]);

  const categoryGroups = useMemo(() => {
    const map = {};

    saleItems.forEach((item) => {
      const category = item.category || "Others";
      const karat = item.karat || "-";
      const key = `${category}__${karat}`;
      const karatPercent = getKaratPercent(karat);

      if (!map[key]) {
        map[key] = {
          key,
          category,
          karat,
          karatPercent,
          wastagePercent: n(categoryWastage[key]),
          pieces: 0,
          tagIds: [],
          grossWeight: 0,
          lessWeight: 0,
          stoneCharges: 0,
          netWeight: 0,
          gold999: 0,
          gold995: 0,
        };
      }

      map[key].pieces += 1;
      map[key].tagIds.push(item.tag_id);
      map[key].grossWeight += n(item.gross_weight);
      map[key].lessWeight += n(item.less_weight);
      map[key].stoneCharges += n(item.stone_charges);
      map[key].netWeight += n(item.net_weight);
    });

    return Object.values(map).map((g) => {
      const wastage = n(categoryWastage[g.key]);
      const gold999 = g.netWeight * ((g.karatPercent + wastage) / 100);
      const gold995 = gold999 / 0.995;

      return {
        ...g,
        wastagePercent: wastage,
        gold999,
        gold995,
      };
    });
  }, [saleItems, categoryWastage]);

  const totals = useMemo(() => {
    const base = saleItems.reduce(
      (acc, item) => {
        acc.pieces += 1;
        acc.gw += n(item.gross_weight);
        acc.lw += n(item.less_weight);
        acc.nw += n(item.net_weight);
        acc.sc += n(item.stone_charges);
        return acc;
      },
      { pieces: 0, gw: 0, lw: 0, nw: 0, sc: 0 }
    );

    const total999 = categoryGroups.reduce((sum, g) => sum + g.gold999, 0);
    const total995 = categoryGroups.reduce((sum, g) => sum + g.gold995, 0);

    const avgWastage =
      base.nw > 0
        ? categoryGroups.reduce(
            (sum, g) => sum + g.netWeight * n(g.wastagePercent),
            0
          ) / base.nw
        : 0;

    const chargesCash = n(labourCharges) + base.sc + n(huidCharges);
    const receivedGoldTotal = n(goldReceived) + n(advanceGoldAdjusted);
    const remainingGold995 = Math.max(0, total995 - receivedGoldTotal);
    const extraGoldAdvance = Math.max(0, receivedGoldTotal - total995);

    let goldAmount = 0;
    let totalCash = chargesCash;
    let pendingGold = 0;
    let pendingCash = 0;

    if (paymentMode === "CASH") {
      goldAmount = total999 * n(goldRate);
      totalCash = goldAmount + chargesCash;
      pendingGold = 0;
      pendingCash = Math.max(0, totalCash - n(cashReceived));
    }

    if (paymentMode === "GOLD") {
      goldAmount = 0;
      totalCash = chargesCash;
      pendingGold = remainingGold995;
      pendingCash = Math.max(0, chargesCash - n(cashReceived));
    }

    if (paymentMode === "MIXED") {
      const remainingGold999 = remainingGold995 * 0.995;
      goldAmount = remainingGold999 * n(goldRate);
      totalCash = goldAmount + chargesCash;
      pendingGold = n(goldRate) > 0 ? 0 : remainingGold995;
      pendingCash =
        n(goldRate) > 0
          ? Math.max(0, totalCash - n(cashReceived))
          : Math.max(0, chargesCash - n(cashReceived));
    }

    return {
      ...base,
      gold999: total999,
      gold995: total995,
      avgWastage,
      chargesCash,
      receivedGoldTotal,
      remainingGold995,
      extraGoldAdvance,
      goldAmount,
      totalCash,
      pendingGold,
      pendingCash,
    };
  }, [
    saleItems,
    categoryGroups,
    goldRate,
    labourCharges,
    huidCharges,
    goldReceived,
    cashReceived,
    paymentMode,
    advanceGoldAdjusted,
  ]);

  async function fetchCompletedOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "COMPLETED")
      .order("created_at", { ascending: false });

    if (error) return alert(error.message);
    setOrders(data || []);
  }

  async function selectOrder(order) {
    setSelectedOrder(order);
    setPartySearch(order.customer_name || "");
    setPartyMobile(order.customer_mobile || "");
    setSaleItems([]);
    setQrInput("");
    setCategoryWastage({});
    setGoldRate("");
    setLabourCharges("");
    setHuidCharges("");
    setGoldReceived("");
    setCashReceived("");
    setAdvanceGoldAdjusted("");
    setPaymentMode("CASH");

    await fetchOrderInventory(order.id);
    await fetchPartyAdvance(order.customer_name, order.customer_mobile);
  }

  async function fetchOrderInventory(orderId) {
    const { data, error } = await supabase
      .from("finished_inventory")
      .select("*")
      .eq("order_id", orderId)
      .eq("status", "IN_STOCK")
      .order("created_at", { ascending: true });

    if (error) return alert(error.message);
    setOrderInventory(data || []);
  }

  async function fetchPartyAdvance(partyName, partyMobileValue) {
    if (!partyName && !partyMobileValue) {
      setAvailableAdvanceGold(0);
      return;
    }

    const safeName = String(partyName || "").replaceAll(",", " ");
    const safeMobile = String(partyMobileValue || "").replaceAll(",", " ");

    const { data, error } = await supabase
      .from("party_gold_ledger")
      .select("entry_type, gold_995")
      .or(`party_name.eq.${safeName},party_mobile.eq.${safeMobile}`);

    if (error) {
      setAvailableAdvanceGold(0);
      return;
    }

    const balance = (data || []).reduce((sum, row) => {
      if (row.entry_type === "ADVANCE_IN") return sum + n(row.gold_995);
      if (row.entry_type === "ADJUSTED") return sum - n(row.gold_995);
      return sum;
    }, 0);

    setAvailableAdvanceGold(Math.max(0, balance));
  }

  async function addByQR() {
    await addByQRWithValue(qrInput);
  }

  async function addByQRWithValue(value) {
    const qr = String(value || "").trim();
    if (!qr) return alert("QR scan / enter karo");
    if (!selectedOrder) return alert("Pehle order select karo");

    if (saleItems.some((i) => i.qr_value === qr || i.tag_id === qr)) {
      setQrInput("");
      return alert("Ye item already add hai");
    }

    const { data, error } = await supabase
      .from("finished_inventory")
      .select("*")
      .eq("qr_value", qr)
      .eq("order_id", selectedOrder.id)
      .eq("status", "IN_STOCK")
      .maybeSingle();

    if (error) return alert(error.message);

    if (!data) {
      return alert(
        "Item nahi mila ya already sold hai ya selected order ka nahi hai"
      );
    }

    setSaleItems((prev) => [...prev, data]);
    setQrInput("");
  }

  function removeItem(id) {
    setSaleItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function openScanner() {
    if (!selectedOrder) return alert("Pehle order select karo");

    setScannerOpen(true);

    setTimeout(async () => {
      try {
        const element = document.getElementById("qr-reader");
        if (!element) {
          alert("Scanner box load nahi hua. Dobara Camera dabao.");
          return;
        }

        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            await closeScanner();
            await addByQRWithValue(decodedText);
          }
        );
      } catch (error) {
        alert("Camera open nahi hua: " + error.message);
        setScannerOpen(false);
      }
    }, 800);
  }

  async function closeScanner() {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch {}
    scannerRef.current = null;
    setScannerOpen(false);
  }

  function buildWhatsAppMessage(saleNo) {
    let msg = `Annvi Gold\n\n`;
    msg += `Sale No: ${saleNo}\n`;
    msg += `Order No: ${selectedOrder?.order_no || "-"}\n`;
    msg += `Party: ${selectedOrder?.customer_name || "-"}\n\n`;

    msg += `Category Wise Billing:\n`;

    categoryGroups.forEach((g) => {
      msg += `\n${g.category} (${g.karat})\n`;
      msg += `Tags: ${g.tagIds.join(", ")}\n`;
      msg += `Pieces: ${g.pieces}\n`;
      msg += `Net Wt: ${f3(g.netWeight)} gm\n`;
      msg += `Karat %: ${g.karatPercent}%\n`;
      msg += `Wastage: ${g.wastagePercent}%\n`;
      msg += `999 Gold: ${f3(g.gold999)} gm\n`;
      msg += `995 Gold: ${f3(g.gold995)} gm\n`;
    });

    if (categoryGroups.length > 1) {
  msg += `\nTotal Pieces: ${totals.pieces}\n`;
  msg += `Total Net Wt: ${f3(totals.nw)} gm\n`;
  msg += `Avg Wastage: ${totals.avgWastage.toFixed(2)}%\n`;
  msg += `Total 999 Gold: ${f3(totals.gold999)} gm\n`;
  msg += `Total 995 Gold: ${f3(totals.gold995)} gm\n\n`;
} else {
  msg += `\n`;
}
    msg += `Payment Mode: ${paymentMode}\n`;

    if (n(goldRate) > 0) {
      msg += `Gold Rate: ₹${goldRate}\n`;
      msg += `Gold Amount: ₹${totals.goldAmount.toFixed(0)}\n`;
    }

    msg += `Labour: ₹${n(labourCharges)}\n`;
    msg += `Stone Charges: ₹${totals.sc}\n`;
    msg += `HUID: ₹${n(huidCharges)}\n`;
    msg += `Total Cash: ₹${totals.totalCash.toFixed(0)}\n\n`;

    msg += `Gold Received: ${f3(goldReceived)} gm\n`;
    msg += `Advance Gold Adjusted: ${f3(advanceGoldAdjusted)} gm\n`;
    msg += `Cash Received: ₹${n(cashReceived)}\n`;

    if (totals.extraGoldAdvance > 0) {
      msg += `Extra Gold Advance: ${f3(totals.extraGoldAdvance)} gm\n`;
    }

    msg += `Pending Gold: ${f3(totals.pendingGold)} gm\n`;
    msg += `Pending Cash: ₹${totals.pendingCash.toFixed(0)}\n\n`;

    msg += `Jai Shree Shyam\nAnnvi Gold`;

    return msg;
  }

  async function saveSale() {
    if (!selectedOrder) return alert("Order select karo");
    if (saleItems.length === 0) return alert("Sale items add karo");

    const missingWastage = categoryGroups.some(
      (g) =>
        categoryWastage[g.key] === undefined || categoryWastage[g.key] === ""
    );

    if (missingWastage) {
      return alert("Har category ka wastage % fill karo");
    }

    if ((paymentMode === "CASH" || paymentMode === "MIXED") && n(goldRate) <= 0) {
      return alert("Cash/Mixed mode ke liye Gold Rate required hai");
    }

    if (n(advanceGoldAdjusted) > availableAdvanceGold) {
      return alert("Advance gold se zyada adjust nahi kar sakte");
    }

    setSaving(true);

    const saleNo = `SALE-${Date.now()}`;
    const whatsappMessage = buildWhatsAppMessage(saleNo);

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          sale_no: saleNo,
          order_id: selectedOrder.id,
          order_no: selectedOrder.order_no,
          party_name: selectedOrder.customer_name,
          party_mobile: partyMobile,

          total_pieces: totals.pieces,
          total_gross_weight: f3(totals.gw),
          total_less_weight: f3(totals.lw),
          total_net_weight: f3(totals.nw),
          total_stone_charges: totals.sc,

          total_999_gold: f3(totals.gold999),
          total_995_gold: f3(totals.gold995),
          party_avg_wastage_percent: totals.avgWastage.toFixed(2),

          gold_rate: n(goldRate),
          gold_amount: totals.goldAmount.toFixed(0),
          labour_charges: n(labourCharges),
          huid_charges: n(huidCharges),
          total_cash_amount: totals.totalCash.toFixed(0),

          gold_received: f3(goldReceived),
          cash_received: n(cashReceived),
          pending_gold: f3(totals.pendingGold),
          pending_cash: totals.pendingCash.toFixed(0),

          extra_gold_advance: f3(totals.extraGoldAdvance),
          advance_gold_adjusted: f3(advanceGoldAdjusted),

          whatsapp_message: whatsappMessage,
          sale_status: "COMPLETED",
          remarks: `${remarks || ""} Payment Mode: ${paymentMode}`,
        },
      ])
      .select()
      .single();

    if (saleError) {
      setSaving(false);
      return alert(saleError.message);
    }

    const saleRows = saleItems.map((item) => {
      const key = `${item.category || "Others"}__${item.karat || "-"}`;
      const wastage = n(categoryWastage[key]);
      const karatPercent = getKaratPercent(item.karat);
      const itemGold999 = n(item.net_weight) * ((karatPercent + wastage) / 100);
      const itemGold995 = itemGold999 / 0.995;

      return {
        sale_id: sale.id,
        order_id: selectedOrder.id,
        finished_inventory_id: item.id,

        tag_id: item.tag_id,
        qr_value: item.qr_value,

        order_no: item.order_no,
        category: item.category,
        brand: item.brand,
        karat: item.karat,

        gross_weight: item.gross_weight,
        less_weight: item.less_weight,
        stone_charges: item.stone_charges,
        net_weight: item.net_weight,

        wastage_percent: wastage,
        karat_percent: karatPercent,
        gold_999: f3(itemGold999),
        gold_995: f3(itemGold995),
      };
    });

    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(saleRows);

    if (itemsError) {
      setSaving(false);
      return alert(itemsError.message);
    }

    const breakupRows = categoryGroups.map((g) => ({
      sale_id: sale.id,
      order_id: selectedOrder.id,

      category: g.category,
      karat: g.karat,
      karat_percent: g.karatPercent,
      wastage_percent: g.wastagePercent,

      pieces: g.pieces,
      tag_ids: g.tagIds.join(", "),

      gross_weight: f3(g.grossWeight),
      less_weight: f3(g.lessWeight),
      stone_charges: g.stoneCharges,
      net_weight: f3(g.netWeight),

      gold_999: f3(g.gold999),
      gold_995: f3(g.gold995),
    }));

    const { error: breakupError } = await supabase
      .from("sale_category_breakup")
      .insert(breakupRows);

    if (breakupError) {
      setSaving(false);
      return alert(breakupError.message);
    }

    const ledgerRows = [];

    if (n(advanceGoldAdjusted) > 0) {
      ledgerRows.push({
        party_name: selectedOrder.customer_name,
        party_mobile: partyMobile,
        sale_id: sale.id,
        order_id: selectedOrder.id,
        entry_type: "ADJUSTED",
        gold_995: f3(advanceGoldAdjusted),
        remarks: `Advance gold adjusted in ${saleNo}`,
      });
    }

    if (n(totals.extraGoldAdvance) > 0) {
      ledgerRows.push({
        party_name: selectedOrder.customer_name,
        party_mobile: partyMobile,
        sale_id: sale.id,
        order_id: selectedOrder.id,
        entry_type: "ADVANCE_IN",
        gold_995: f3(totals.extraGoldAdvance),
        remarks: `Extra gold received in ${saleNo}`,
      });
    }

    if (ledgerRows.length > 0) {
      const { error: ledgerError } = await supabase
        .from("party_gold_ledger")
        .insert(ledgerRows);

      if (ledgerError) {
        setSaving(false);
        return alert(ledgerError.message);
      }
    }

    const ids = saleItems.map((i) => i.id);

    const { error: invError } = await supabase
      .from("finished_inventory")
      .update({
        status: "SOLD",
        sale_id: sale.id,
        sold_to_party: selectedOrder.customer_name,
        sold_order_id: selectedOrder.id,
        sold_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (invError) {
      setSaving(false);
      return alert(invError.message);
    }

    await supabase
      .from("orders")
      .update({ status: "DELIVERED" })
      .eq("id", selectedOrder.id);

    if (partyMobile) {
      const phone = String(partyMobile).replace(/\D/g, "");
      window.open(
        `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(
          whatsappMessage
        )}`,
        "_blank"
      );
    }

    setSaving(false);
    alert("Sale saved. Items SOLD ho gaye.");

    setSaleItems([]);
    setSelectedOrder(null);
    setOrderInventory([]);
    setPartySearch("");
    setPartyMobile("");
    setRemarks("");
    setCategoryWastage({});
    setGoldRate("");
    setLabourCharges("");
    setHuidCharges("");
    setGoldReceived("");
    setCashReceived("");
    setAdvanceGoldAdjusted("");
    setPaymentMode("CASH");
    fetchCompletedOrders();
  }

  if (authLoading) {
    return <main className="p-6">Loading sale page...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <header>
          <h1 className="text-2xl font-bold md:text-3xl">Sale / Delivery</h1>
          <p className="text-sm text-gray-600">
            Party select karo, order choose karo, QR scan karke sale save karo.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[400px_1fr]">
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-bold">Party Search</h2>

              <input
                className="input"
                placeholder="Party name type karo..."
                value={partySearch}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  setSelectedOrder(null);
                  setOrderInventory([]);
                }}
              />

              <div className="mt-3 space-y-2">
                {suggestions.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => selectOrder(order)}
                    className="w-full rounded-2xl border border-gray-200 bg-slate-50 p-3 text-left"
                  >
                    <p className="font-bold">{order.customer_name}</p>
                    <p className="text-sm text-gray-600">{order.order_no}</p>
                    <p className="text-xs text-gray-500">
                      {order.customer_mobile}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {selectedOrder && (
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <h2 className="text-lg font-bold">Selected Order</h2>
                <p className="mt-2 font-semibold">{selectedOrder.order_no}</p>
                <p className="text-sm text-gray-600">
                  {selectedOrder.customer_name}
                </p>
                <p className="text-sm text-gray-600">{partyMobile || "-"}</p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MiniBox label="Available Pieces" value={orderSummary.pieces} />
                  <MiniBox label="Gross Weight" value={`${f3(orderSummary.gw)}g`} />
                  <MiniBox label="Net Weight" value={`${f3(orderSummary.nw)}g`} />
                  <MiniBox label="Stone Charges" value={`₹${orderSummary.sc}`} />
                </div>

                <div className="mt-4 rounded-2xl bg-green-50 p-3">
                  <p className="text-xs font-semibold text-green-700">
                    Available Advance Gold
                  </p>
                  <p className="text-lg font-bold text-green-800">
                    {f3(availableAdvanceGold)} gm
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-bold">Scan Item QR</h2>

              <div className="flex gap-2">
                <input
                  autoFocus
                  className="input"
                  placeholder="QR scan / tag id enter"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addByQR();
                  }}
                />
                <button
                  onClick={addByQR}
                  className="rounded-xl bg-black px-5 text-sm font-bold text-white"
                >
                  Add
                </button>
                <button
                  onClick={openScanner}
                  className="rounded-xl bg-green-600 px-5 text-sm font-bold text-white"
                >
                  Camera
                </button>
              </div>

              {scannerOpen && (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-3">
                  <div id="qr-reader" className="w-full overflow-hidden rounded-xl" />
                  <button
                    onClick={closeScanner}
                    className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600"
                  >
                    Close Camera
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <MiniStat label="Scanned Pieces" value={totals.pieces} />
              <MiniStat label="GW" value={`${f3(totals.gw)}g`} />
              <MiniStat label="LW" value={`${f3(totals.lw)}g`} />
              <MiniStat label="NW" value={`${f3(totals.nw)}g`} />
              <MiniStat label="SC" value={`₹${totals.sc}`} />
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-bold">Sale Items</h2>

              {saleItems.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Abhi koi item add nahi hai.
                </p>
              ) : (
                <div className="space-y-2">
                  {saleItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-slate-50 p-3"
                    >
                      <div>
                        <p className="font-bold">{item.tag_id}</p>
                        <p className="text-sm text-gray-600">
                          {item.category} · {item.karat}
                        </p>
                        <p className="text-xs text-gray-500">
                          GW {f3(item.gross_weight)}g · LW {f3(item.less_weight)}
                          g · NW {f3(item.net_weight)}g · SC ₹
                          {item.stone_charges || 0}
                        </p>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {categoryGroups.length > 0 && (
                <div className="mt-5 rounded-2xl border border-gray-200 p-4">
                  <h3 className="mb-3 font-bold">Category Wise Billing</h3>

                  <div className="space-y-3">
                    {categoryGroups.map((g) => (
                      <div key={g.key} className="rounded-2xl bg-slate-50 p-3">
                        <div className="mb-2 flex flex-wrap justify-between gap-2">
                          <div>
                            <p className="font-bold">
                              {g.category} · {g.karat}
                            </p>
                            <p className="text-xs text-gray-500">
                              Tags: {g.tagIds.join(", ")}
                            </p>
                          </div>

                          <input
                            className="input max-w-[160px]"
                            placeholder="Wastage %"
                            value={categoryWastage[g.key] || ""}
                            onChange={(e) =>
                              setCategoryWastage((prev) => ({
                                ...prev,
                                [g.key]: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-6">
                          <MiniBox label="Pcs" value={g.pieces} />
                          <MiniBox label="NW" value={`${f3(g.netWeight)}g`} />
                          <MiniBox label="KT %" value={`${g.karatPercent}%`} />
                          <MiniBox label="999" value={`${f3(g.gold999)}g`} />
                          <MiniBox label="995" value={`${f3(g.gold995)}g`} />
                          <MiniBox label="SC" value={`₹${g.stoneCharges}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {saleItems.length > 0 && (
                <div className="mt-5 rounded-2xl border border-gray-200 p-4">
                  <h3 className="mb-3 font-bold">Payment Method</h3>

                  <div className="mb-4 grid gap-2 md:grid-cols-3">
                    {["CASH", "GOLD", "MIXED"].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setPaymentMode(mode)}
                        className={`rounded-xl px-4 py-3 text-sm font-bold ${
                          paymentMode === mode
                            ? "bg-black text-white"
                            : "bg-slate-100 text-gray-700"
                        }`}
                      >
                        {mode === "CASH" && "Cash Billing"}
                        {mode === "GOLD" && "Gold Billing"}
                        {mode === "MIXED" && "Half Cash + Half Gold"}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {(paymentMode === "CASH" || paymentMode === "MIXED") && (
                      <input
                        className="input"
                        placeholder="Gold Rate"
                        value={goldRate}
                        onChange={(e) => setGoldRate(e.target.value)}
                      />
                    )}

                    <input
                      className="input"
                      placeholder="Labour Charges"
                      value={labourCharges}
                      onChange={(e) => setLabourCharges(e.target.value)}
                    />

                    <input
                      className="input"
                      placeholder="HUID Charges"
                      value={huidCharges}
                      onChange={(e) => setHuidCharges(e.target.value)}
                    />

                    <input
                      className="input bg-gray-100"
                      readOnly
                      value={`Total 999 Gold : ${f3(totals.gold999)} gm`}
                    />

                    <input
                      className="input bg-gray-100"
                      readOnly
                      value={`Total 995 Gold : ${f3(totals.gold995)} gm`}
                    />

                    <input
                      className="input bg-gray-100"
                      readOnly
                      value={`Avg Wastage : ${totals.avgWastage.toFixed(2)}%`}
                    />

                    <input
                      className="input bg-gray-100"
                      readOnly
                      value={`Gold Amount : ₹${totals.goldAmount.toFixed(0)}`}
                    />

                    <input
                      className="input bg-gray-100"
                      readOnly
                      value={`Stone Charges : ₹${totals.sc}`}
                    />

                    <input
                      className="input bg-gray-100"
                      readOnly
                      value={`Total Cash : ₹${totals.totalCash.toFixed(0)}`}
                    />

                    <input
                      className="input bg-green-50"
                      readOnly
                      value={`Available Advance Gold : ${f3(
                        availableAdvanceGold
                      )} gm`}
                    />

                    <input
                      className="input"
                      placeholder="Advance Gold Adjust"
                      value={advanceGoldAdjusted}
                      onChange={(e) => {
                        if (n(e.target.value) > availableAdvanceGold) {
                          alert("Advance se zyada adjust nahi kar sakte");
                          return;
                        }
                        setAdvanceGoldAdjusted(e.target.value);
                      }}
                    />

                    <input
                      className="input"
                      placeholder="Gold Received"
                      value={goldReceived}
                      onChange={(e) => setGoldReceived(e.target.value)}
                    />

                    <input
                      className="input"
                      placeholder="Cash Received"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                    />

                    <input
                      className="input bg-green-50"
                      readOnly
                      value={`Extra Gold Advance : ${f3(
                        totals.extraGoldAdvance
                      )} gm`}
                    />

                    <input
                      className="input bg-yellow-50"
                      readOnly
                      value={`Pending Gold : ${f3(totals.pendingGold)} gm`}
                    />

                    <input
                      className="input bg-yellow-50"
                      readOnly
                      value={`Pending Cash : ₹${totals.pendingCash.toFixed(0)}`}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="block">
                  <p className="mb-1 text-xs font-semibold text-gray-500">
                    Remarks
                  </p>
                  <textarea
                    rows={3}
                    className="input"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </label>
              </div>

              <button
                disabled={saving || saleItems.length === 0}
                onClick={saveSale}
                className="mt-4 rounded-xl bg-black px-6 py-3 text-sm font-bold text-white disabled:bg-gray-400"
              >
                {saving ? "Saving..." : "Save Sale / Delivery"}
              </button>
            </div>
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
          padding: 0.75rem;
          font-size: 0.875rem;
          color: #111827;
          outline: none;
        }
      `}</style>
    </main>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function MiniBox({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-2">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}