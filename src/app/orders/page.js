"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";

const STATUS_OPTIONS = [
  "All",
  "New",
  "Approved",
  "In Production",
  "Stone Setting",
  "Polish/QC",
  "Ready",
  "Dispatched",
  "Delivered",
  "Hold",
  "Cancelled",
];

const PRIORITY_OPTIONS = ["All", "Normal", "Urgent", "Super Urgent"];
const DATE_OPTIONS = ["All", "Today", "Delayed"];

function OrdersContent() {
  const searchParams = useSearchParams();
  const { loading: authLoading } = useRequireAuth();

  const initialStatus = searchParams.get("status") || "All";
  const initialPriority = searchParams.get("priority") || "All";
  const initialDate = searchParams.get("date") || "All";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [priorityFilter, setPriorityFilter] = useState(initialPriority);
  const [dateFilter, setDateFilter] = useState(initialDate);

  async function fetchOrders() {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items(id, category, quantity, approx_weight),
        order_images(id, image_url)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert(error.message || "Orders fetch failed");
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  function getOrderTotals(order) {
    const pieces =
      order.order_items?.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      ) || 0;

    const weight =
      order.order_items?.reduce(
        (sum, item) => sum + Number(item.approx_weight || 0),
        0
      ) || 0;

    return {
      pieces,
      weight: weight.toFixed(3),
    };
  }

  const filteredOrders = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return orders.filter((order) => {
      const q = search.toLowerCase();

      const matchesSearch =
        !q ||
        order.order_no?.toLowerCase().includes(q) ||
        order.customer_name?.toLowerCase().includes(q) ||
        order.customer_mobile?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" || order.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" || order.priority === priorityFilter;

      let matchesDate = true;

      if (dateFilter === "Today") {
        matchesDate = order.delivery_date === today;
      }

      if (dateFilter === "Delayed") {
        matchesDate =
          order.delivery_date &&
          order.delivery_date < today &&
          !["Delivered", "Cancelled"].includes(order.status);
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesDate;
    });
  }, [orders, search, statusFilter, priorityFilter, dateFilter]);

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setDateFilter("All");
  }

  function statusClass(status) {
    let cls = "bg-gray-100 text-gray-700";

    if (status === "New") cls = "bg-yellow-300 text-black";
    else if (status === "Ready") cls = "bg-green-100 text-green-700";
    else if (status === "Delivered") cls = "bg-blue-100 text-blue-700";
    else if (status === "Cancelled") cls = "bg-red-100 text-red-700";
    else if (status === "Hold") cls = "bg-yellow-100 text-yellow-700";

    return `rounded-full px-3 py-1 text-xs font-semibold ${cls}`;
  }

  function priorityClass(priority) {
    let cls = "bg-gray-100 text-gray-700";

    if (priority === "Super Urgent") cls = "bg-red-100 text-red-700";
    else if (priority === "Urgent") cls = "bg-orange-100 text-orange-700";

    return `rounded-full px-3 py-1 text-xs font-semibold ${cls}`;
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <p className="text-gray-700">Checking login...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="mt-1 text-sm text-gray-600">
              Search, filter and track all customer orders.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm"
            >
              Dashboard
            </Link>

            <Link
              href="/orders/add"
              className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white"
            >
              + Add Order
            </Link>
          </div>
        </div>

        <section className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-5">
            <input
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 placeholder:text-gray-400 md:col-span-2"
              placeholder="Search order no, customer, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <select
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>

            <select
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              {DATE_OPTIONS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {filteredOrders.length} of {orders.length} orders
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-gray-700"
            >
              Reset
            </button>
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-gray-600">Loading orders...</p>
          </section>
        ) : filteredOrders.length === 0 ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-gray-600">No orders found.</p>
          </section>
        ) : (
          <>
            <section className="hidden rounded-2xl bg-white p-4 shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="p-3">Image</th>
                      <th className="p-3">Order No</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Pieces</th>
                      <th className="p-3">Weight</th>
                      <th className="p-3">Delivery</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.map((order) => {
                      const firstImage = order.order_images?.[0]?.image_url;
                      const totals = getOrderTotals(order);

                      return (
                        <tr
                          key={order.id}
                          className="border-b text-sm hover:bg-slate-50"
                        >
                          <td className="p-3">
                            {firstImage ? (
                              <img
                                src={firstImage}
                                alt="Design"
                                className="h-14 w-14 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-xs text-gray-500">
                                No Image
                              </div>
                            )}
                          </td>

                          <td className="p-3 font-semibold text-gray-900">
                            {order.order_no}
                          </td>

                          <td className="p-3">
                            <p className="font-medium text-gray-900">
                              {order.customer_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {order.customer_mobile || "-"}
                            </p>
                          </td>

                          <td className="p-3 text-gray-700">
                            {totals.pieces}
                          </td>

                          <td className="p-3 text-gray-700">
                            {totals.weight} g
                          </td>

                          <td className="p-3 text-gray-700">
                            {order.delivery_date || "-"}
                          </td>

                          <td className="p-3">
                            <span className={priorityClass(order.priority)}>
                              {order.priority || "-"}
                            </span>
                          </td>

                          <td className="p-3">
                            <span className={statusClass(order.status)}>
                              {order.status || "-"}
                            </span>
                          </td>

                          <td className="p-3">
                            <Link
                              href={`/orders/${order.id}`}
                              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="space-y-3 md:hidden no-print">
              {filteredOrders.map((order) => {
                const totals = getOrderTotals(order);

                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-900">
                          {order.order_no}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-800">
                          {order.customer_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.customer_mobile || "-"}
                        </p>
                      </div>

                      <Link
                        href={`/orders/${order.id}`}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                      >
                        View
                      </Link>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-gray-500">
                          Delivery
                        </p>
                        <p className="mt-1 text-gray-900">
                          {order.delivery_date || "-"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-gray-500">
                          Pieces
                        </p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {totals.pieces}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-gray-500">
                          Weight
                        </p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {totals.weight} g
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-gray-500">
                          Priority
                        </p>
                        <span className={priorityClass(order.priority)}>
                          {order.priority || "-"}
                        </span>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-gray-500">
                          Status
                        </p>
                        <span className={statusClass(order.status)}>
                          {order.status || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 p-6">
          <p className="text-gray-700">Loading orders...</p>
        </main>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}