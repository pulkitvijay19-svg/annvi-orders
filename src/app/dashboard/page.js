"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useRequireAuth } from "../../lib/useRequireAuth";
import MobileBottomNav from "../../components/MobileBottomNav";
import { enablePushNotifications } from "../../lib/pushNotifications";
import { useLanguage } from "../../context/LanguageContext";

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useRequireAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [accessError, setAccessError] = useState("");
  const [accessLoading, setAccessLoading] = useState(false);
  const firstLoadDone = useRef(false);
  const [hardwareStatus, setHardwareStatus] = useState({ print: false, scale: false });

  async function fetchHardwareStatus() {
    try {
      const res = await fetch("http://localhost:5058/status");
      const data = await res.json();
      setHardwareStatus({ print: !!data.print, scale: !!data.scale });
    } catch {
      setHardwareStatus({ print: false, scale: false });
    }
  }

  async function startBridge(type) {
    try {
      await fetch(`http://localhost:5058/start/${type}`, { method: "POST" });
      fetchHardwareStatus();
    } catch { alert(t("hardware_not_running")); }
  }

  async function stopBridge(type) {
    try {
      await fetch(`http://localhost:5058/stop/${type}`, { method: "POST" });
      fetchHardwareStatus();
    } catch { alert(t("hardware_not_running")); }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function fetchOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select(`*, order_items(id, quantity, approx_weight)`)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setOrders(data || []);
    setLoading(false);
  }

  function playBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 700;
      gainNode.gain.value = 0.08;
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.25);
    } catch { console.log("Sound blocked"); }
  }

  useEffect(() => {
    fetchOrders().then(() => { firstLoadDone.current = true; });
    const interval = setInterval(fetchOrders, 10000);
    const channel = supabase
      .channel("orders-live-notification")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        if (!firstLoadDone.current) return;
        const newOrder = payload.new;
        setNewOrderAlert({ order_no: newOrder.order_no, customer_name: newOrder.customer_name });
        playBeep();
        fetchOrders();
        setTimeout(() => setNewOrderAlert(null), 8000);
      })
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    fetchHardwareStatus();
    const timer = setInterval(fetchHardwareStatus, 3000);
    return () => clearInterval(timer);
  }, []);

  function getOrderTotals(order) {
    const pieces = order.order_items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
    const weight = order.order_items?.reduce((sum, item) => sum + Number(item.approx_weight || 0), 0) || 0;
    return { pieces, weight: weight.toFixed(3) };
  }

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: orders.length,
      pending: orders.filter((o) => !["Delivered", "Cancelled"].includes(o.status)).length,
      todayDelivery: orders.filter((o) => o.delivery_date === today).length,
      delayed: orders.filter((o) => o.delivery_date && o.delivery_date < today && !["Delivered", "Cancelled"].includes(o.status)).length,
      ready: orders.filter((o) => o.status === "Ready").length,
      urgent: orders.filter((o) => o.priority === "Urgent" || o.priority === "Super Urgent").length,
    };
  }, [orders]);

  const recentOrders = orders.slice(0, 8);
  const isFactoryAdmin = user?.email === "pulkit.vijay19@gmail.com" || user?.email?.includes("pulkit");

  function openRollbackAccess() {
    setAccessPassword("");
    setAccessError("");
    setAccessOpen(true);
  }

  async function unlockRollback() {
    if (!accessPassword.trim()) return setAccessError("Password is required.");
    setAccessLoading(true); setAccessError("");
    try {
      const res = await fetch("/api/process-control-access", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: accessPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setAccessError(data.error || (res.status === 404 ? "Password service route not found. Check src/app/api/process-control-access/route.js." : `Unable to unlock (HTTP ${res.status}).`)); return; }
      setAccessOpen(false);
      router.push("/factory/process-control");
    } catch { setAccessError("Unable to verify password."); }
    finally { setAccessLoading(false); }
  }

  if (authLoading) return <main className="min-h-screen bg-[#f5f6f8] p-6"><p className="text-gray-700">{t("checking_login")}</p></main>;

  const navItems = [
    { label: t("add_order"), href: "/orders/add", primary: true },
    { label: t("view_orders"), href: "/orders" },
    { label: t("manufacturing"), href: "/factory", admin: true },
    { label: t("manufacturing_dashboard"), href: "/factory/manufacturing-dashboard" },
    { label: t("inventory"), href: "/factory/inventory" },
    { label: t("sample_catalog"), href: "/catalog/upload" },
    { label: t("direct_tag_print"), href: "/tag-print" },
  ];

  return (
    <main className="min-h-screen bg-[#f5f6f8] pb-24 text-slate-950">
      {newOrderAlert && <div className="fixed right-4 top-4 z-50 rounded-2xl bg-slate-950 p-4 text-white shadow-xl"><p className="font-bold">{t("new_order_received")}</p><p className="text-sm">{newOrderAlert.order_no}</p><p className="text-sm text-slate-300">{newOrderAlert.customer_name}</p></div>}

      <div className="mx-auto max-w-[1500px] p-3 md:p-5">
        <div className="grid gap-5 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-5">
            <div className="border-b border-slate-100 pb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">ANNVI ERP</p>
              <h1 className="mt-1 break-words text-2xl font-bold leading-tight">{t("dashboard")}</h1>
              <p className="mt-1 break-words text-xs leading-5 text-slate-500">{t("dashboard_subtitle")}</p>
            </div>

            <nav className="mt-4 flex flex-col gap-2">
              {navItems.filter((item) => !item.admin || isFactoryAdmin).map((item) => (
                <Link key={item.href} href={item.href} className={`flex min-h-[50px] w-full items-center rounded-xl px-4 py-3 text-left text-sm font-semibold leading-5 transition ${item.primary ? "bg-slate-950 text-white hover:bg-slate-800" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>{item.label}</Link>
              ))}
              {isFactoryAdmin && <button onClick={openRollbackAccess} className="flex min-h-[50px] w-full items-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-bold leading-5 text-amber-800 hover:bg-amber-100">↩ Manufacturing Correction</button>}
            </nav>

            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              <button onClick={() => enablePushNotifications(user)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">{t("enable_notifications")}</button>
              <button onClick={handleLogout} className="w-full rounded-xl px-4 py-2.5 text-left text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-red-600">{t("logout")}</button>
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            {loading ? <div className="rounded-3xl bg-white p-6 shadow-sm">Loading dashboard...</div> : <>
              <section className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
                <StatCard title={t("total_orders")} value={stats.total} href="/orders" />
                <StatCard title={t("pending")} value={stats.pending} href="/orders" />
                <StatCard title={t("today_delivery")} value={stats.todayDelivery} href="/orders?date=Today" />
                <StatCard title={t("delayed")} value={stats.delayed} href="/orders?date=Delayed" alert={stats.delayed > 0} />
                <StatCard title={t("ready")} value={stats.ready} href="/orders?status=Ready" />
                <StatCard title={t("urgent")} value={stats.urgent} href="/orders?priority=Urgent" alert={stats.urgent > 0} />
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div><h2 className="text-base font-bold">{t("hardware_manager")}</h2><p className="text-xs text-slate-500">{t("hardware_status")}</p></div>
                  <button onClick={fetchHardwareStatus} className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white">{t("refresh")}</button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <HardwareBox title="Print Bridge" icon="🖨️" connected={hardwareStatus.print} onStart={() => startBridge("print")} onStop={() => stopBridge("print")} />
                  <HardwareBox title="Scale Bridge" icon="⚖️" connected={hardwareStatus.scale} onStart={() => startBridge("scale")} onStop={() => stopBridge("scale")} />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <div className="mb-4 flex items-center justify-between"><div><h2 className="text-base font-bold">{t("recent_orders")}</h2><p className="text-xs text-slate-500">Latest order activity</p></div><Link href="/orders" className="text-xs font-bold text-slate-600 hover:text-black">{t("view_all")} →</Link></div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[980px] border-collapse">
                    <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"><th className="p-3">{t("order_no")}</th><th className="p-3">{t("customer")}</th><th className="p-3">{t("delivery")}</th><th className="p-3">{t("pieces")}</th><th className="p-3">{t("weight")}</th><th className="p-3">{t("priority")}</th><th className="p-3">{t("status")}</th><th className="p-3">{t("action")}</th></tr></thead>
                    <tbody>{recentOrders.map((order) => { const totals = getOrderTotals(order); return <tr key={order.id} className="border-b border-slate-100 text-sm last:border-0"><td className="p-3 font-semibold">{order.order_no}</td><td className="p-3"><p className="font-medium">{order.customer_name}</p><p className="text-xs text-slate-400">{order.customer_mobile || "-"}</p></td><td className="p-3 text-slate-600">{order.delivery_date || "-"}</td><td className="p-3">{totals.pieces}</td><td className="p-3">{totals.weight} g</td><td className="p-3"><Badge text={order.priority} type="priority" /></td><td className="p-3"><Badge text={order.status} type="status" /></td><td className="p-3"><Link href={`/orders/${order.id}`} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">View</Link></td></tr>; })}</tbody>
                  </table>
                </div>
                <div className="space-y-3 md:hidden">{recentOrders.map((order) => { const totals = getOrderTotals(order); return <div key={order.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{order.order_no}</p><p className="mt-1 text-sm font-semibold">{order.customer_name}</p><p className="text-xs text-slate-400">{order.customer_mobile || "-"}</p></div><Link href={`/orders/${order.id}`} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">View</Link></div><div className="mt-4 grid grid-cols-2 gap-2 text-sm"><InfoBox label="Delivery" value={order.delivery_date || "-"} /><InfoBox label="Pieces" value={totals.pieces} /><InfoBox label="Weight" value={`${totals.weight} g`} /><InfoBox label="Status" value={order.status || "-"} /></div></div>; })}</div>
              </section>
            </>}
          </div>
        </div>
      </div>

      {accessOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Restricted Access</p><h2 className="mt-1 text-xl font-bold">Manufacturing Correction</h2><p className="mt-2 text-sm leading-6 text-slate-500">This area can move manufacturing batches back to an earlier process. Enter the supervisor password to continue.</p></div><button onClick={() => setAccessOpen(false)} className="h-9 w-9 rounded-full bg-slate-100 font-bold">×</button></div><label className="mt-5 block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Supervisor Password</span><input autoFocus type="password" value={accessPassword} onChange={(e) => setAccessPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && unlockRollback()} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950" placeholder="Enter password" /></label>{accessError && <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{accessError}</div>}<div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => setAccessOpen(false)} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold">Cancel</button><button disabled={accessLoading} onClick={unlockRollback} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{accessLoading ? "Checking..." : "Unlock"}</button></div></div></div>}

      <MobileBottomNav />
    </main>
  );
}

function StatCard({ title, value, href, alert }) { return <Link href={href || "/orders"} className={`flex min-h-[108px] min-w-0 flex-col justify-between rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${alert ? "border-amber-200" : "border-slate-200"}`}><p className="min-h-[34px] break-words text-xs font-semibold leading-4 text-slate-500">{title}</p><p className={`mt-2 text-2xl font-bold leading-none ${alert ? "text-amber-700" : "text-slate-950"}`}>{value}</p></Link>; }
function Badge({ text, type }) { let cls = "bg-slate-100 text-slate-700"; if (type === "priority" && (text === "Urgent" || text === "Super Urgent")) cls = "bg-amber-100 text-amber-800"; if (type === "status" && text === "New") cls = "bg-slate-950 text-white"; else if (type === "status" && text === "Ready") cls = "bg-emerald-50 text-emerald-700"; else if (type === "status" && text === "Delivered") cls = "bg-blue-50 text-blue-700"; else if (type === "status" && text === "Cancelled") cls = "bg-red-50 text-red-700"; return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{text || "-"}</span>; }
function InfoBox({ label, value }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-400">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function HardwareBox({ title, icon, connected, onStart, onStop }) { const { t } = useLanguage(); return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between"><div><p className="font-bold">{title}</p><p className={`text-xs font-bold ${connected ? "text-emerald-700" : "text-slate-400"}`}>{connected ? t("connected") : t("disconnected")}</p></div><span className="text-2xl opacity-70">{icon}</span></div><div className="mt-4 flex gap-2"><button onClick={onStart} className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white">{t("start")}</button><button onClick={onStop} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600">{t("stop")}</button></div></div>; }
