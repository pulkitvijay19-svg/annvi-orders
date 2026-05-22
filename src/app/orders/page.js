"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function OrdersPage() {
  const searchParams = useSearchParams();

  const initialStatus = searchParams.get("status") || "All";
  const initialPriority = searchParams.get("priority") || "All";
  const initialDate = searchParams.get("date") || "All";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [priorityFilter, setPriorityFilter] = useState(initialPriority);
  const [dateFilter, setDateFilter] = useState(initialDate);
  const { loading: authLoading } = useRequireAuth();
 

  async function fetchOrders() {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items(id, category, quantity),
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

  const filteredOrders = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return orders.filter((order) => {
      const text = `${order.order_no} ${order.customer_name} ${
        order.customer_mobile || ""
      }`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());
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

      if (dateFilter === "Upcoming") {
        matchesDate =
          order.delivery_date &&
          order.delivery_date > today &&
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
    if (status === "New") return "bg-yellow-300 text-black";
    if (status === "Ready") return "bg-green-100 text-green-700";
    if (status === "Delivered") return "bg-blue-100 text-blue-700";
    if (status === "Cancelled") return "bg-red-100 text-red-700";
    if (status === "Hold") return "bg-yellow-100 text-yellow-700";
    if (status === "In Production") return "bg-purple-100 text-purple-700";
    if (status === "Stone Setting") return "bg-pink-100 text-pink-700";
    if (status === "Polish/QC") return "bg-cyan-100 text-cyan-700";
    return "bg-gray-100 text-gray-700";
  }

  function priorityClass(priority) {
    if (priority === "Super Urgent") return "bg-red-100 text-red-700";
    if (priority === "Urgent") return "bg-orange-100 text-orange-700";
    return "bg-slate-100 text-slate-700";
  }

  if (authLoading) {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <p className="text-gray-700">Checking login...</p>
    </main>
  );
}


  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="mt-1 text-sm text-gray-600">
              Search, filter and track all customer orders.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-white px-5 py-3 text-center text-sm font-semibold text-gray-900 shadow-sm"
            >
              Dashboard
            </Link>

            <Link
              href="/orders/add"
              className="rounded-xl bg-black px-5 py-3 text-center text-sm font-semibold text-white hover:bg-gray-800"
            >
              + Add Order
            </Link>
          </div>
        </div>

        <section className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-5">
            <input
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none md:col-span-2"
              placeholder="Search order no, customer, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 focus:border-black focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <select
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 focus:border-black focus:outline-none"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>

            <select
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 focus:border-black focus:outline-none"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option>All</option>
              <option>Today</option>
              <option>Delayed</option>
              <option>Upcoming</option>
            </select>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-semibold text-gray-900">
                {filteredOrders.length}
              </span>{" "}
              of {orders.length} orders
            </p>

            <button
              onClick={resetFilters}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-slate-200"
            >
              Reset
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          {loading ? (
            <p className="p-4 text-gray-600">Loading orders...</p>
          ) : filteredOrders.length === 0 ? (
            <p className="p-4 text-gray-600">No orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="p-3">Image</th>
                    <th className="p-3">Order No</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Delivery</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => {
                    const firstImage = order.order_images?.[0]?.image_url;
                    const itemCount = order.order_items?.length || 0;

                    return (
                      <tr
                        key={order.id}
                        className="border-b text-sm hover:bg-slate-50"
                      >
                        <td className="p-3">
                          {firstImage ? (
                            <img
                              src={firstImage}
                              alt="Order"
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
                          {itemCount} item{itemCount !== 1 ? "s" : ""}
                        </td>

                        <td className="p-3 text-gray-700">
                          {order.delivery_date || "-"}
                        </td>

                        <td className="p-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityClass(
                              order.priority
                            )}`}
                          >
                            {order.priority}
                          </span>
                        </td>

                        <td className="p-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>

                        <td className="p-3">
                          <Link
                            href={`/orders/${order.id}`}
                            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black"
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
          )}
        </section>
      </div>
    </main>
  );
}