"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../../../lib/supabaseClient";
import { useRequireAuth } from "../../../lib/useRequireAuth";
import MobileBottomNav from "../../../components/MobileBottomNav";
import { useLanguage } from "../../../context/LanguageContext";

import OrdersPanel from "./OrdersPanel";
import TreeForm from "./TreeForm";
import TreesTable from "./TreesTable";

const TREE_STATUSES = [
  "Draft",
  "Planned",
  "Burnout",
  "Ready For Casting",
  "Casting",
  "Completed",
];

const KT_OPTIONS = ["9KT", "14KT", "18KT", "20KT", "22KT"];

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getErrorMessage(error, fallback = "Something went wrong.") {
  if (!error) return fallback;

  return (
    error.message ||
    error.details ||
    error.hint ||
    fallback
  );
}

export default function TreePlanningPage() {
  const router = useRouter();
  const { t } = useLanguage();
  
  const authResult = useRequireAuth();
  const user = authResult?.user || null;
  const authLoading =
    authResult?.loading ?? authResult?.authLoading ?? true;

  /* =========================================================
     MAIN LOADING STATES
  ========================================================= */

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingTreeId, setDeletingTreeId] = useState(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /* =========================================================
     DATABASE DATA
  ========================================================= */

  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [trees, setTrees] = useState([]);
  const [allTreeItems, setAllTreeItems] = useState([]);

  /* =========================================================
     SEARCH AND FILTER STATES
  ========================================================= */

  const [orderSearch, setOrderSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [treeSearch, setTreeSearch] = useState("");
  const [treeStatusFilter, setTreeStatusFilter] = useState("All");

  /* =========================================================
     ORDER SELECTION / COMBINE ORDERS
  ========================================================= */

  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [expandedOrderIds, setExpandedOrderIds] = useState([]);

  /*
    selectedAllocations structure:

    {
      [orderItemId]: {
        order_item_id,
        order_id,
        selected_quantity,
        gold_weight
      }
    }
  */

  const [selectedAllocations, setSelectedAllocations] = useState({});

  /* =========================================================
     TREE FORM
  ========================================================= */

  const [editingTreeId, setEditingTreeId] = useState(null);

  const [treeNo, setTreeNo] = useState("");
  const [flaskNo, setFlaskNo] = useState("");
  const [kt, setKt] = useState("18KT");
  const [treeWeight, setTreeWeight] = useState("");
  const [treeDate, setTreeDate] = useState(todayDate());
  const [burnoutDate, setBurnoutDate] = useState("");
  const [treeStatus, setTreeStatus] = useState("Planned");
  const [remarks, setRemarks] = useState("");

  /* =========================================================
     ALERT HELPERS
  ========================================================= */

  const clearAlerts = useCallback(() => {
    setMessage("");
    setErrorMessage("");
  }, []);

  const showSuccess = useCallback((text) => {
    setErrorMessage("");
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 4000);
  }, []);

  const showError = useCallback((text) => {
    setMessage("");
    setErrorMessage(text);

    window.setTimeout(() => {
      setErrorMessage("");
    }, 6000);
  }, []);

  /* =========================================================
     FETCH ORDERS
  ========================================================= */

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_no,
        customer_name,
        customer_mobile,
        delivery_date,
        priority,
        status,
        remarks,
        created_at,
        created_by,
        created_by_name
      `)
      .in("status", ["New", "Approved"])
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(getErrorMessage(error, "Unable to load orders."));
    }

    setOrders(data || []);
  }, []);

  /* =========================================================
     FETCH ORDER ITEMS
  ========================================================= */

  const fetchOrderItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("order_items")
      .select(`
        id,
        order_id,
        category,
        quantity,
        gold_kt,
        approx_weight,
        size,
        remarks,
        created_at,
        sample_unique_id,
        die_no
      `)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(
        getErrorMessage(error, "Unable to load order items.")
      );
    }

    setOrderItems(data || []);
  }, []);

  /* =========================================================
     FETCH TREES
  ========================================================= */

  const fetchTrees = useCallback(async () => {
    const { data, error } = await supabase
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
        created_by,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(
        getErrorMessage(error, "Unable to load casting trees.")
      );
    }

    setTrees(data || []);
  }, []);

  /* =========================================================
     FETCH ALL TREE ITEMS
  ========================================================= */

  const fetchAllTreeItems = useCallback(async () => {
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
        approx_weight,
        gold_weight,
        created_at
      `)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(
        getErrorMessage(error, "Unable to load tree allocations.")
      );
    }

    setAllTreeItems(data || []);
  }, []);

  /* =========================================================
     LOAD COMPLETE PAGE DATA
  ========================================================= */

  const loadPageData = useCallback(async () => {
    try {
      setPageLoading(true);
      clearAlerts();

      await Promise.all([
        fetchOrders(),
        fetchOrderItems(),
        fetchTrees(),
        fetchAllTreeItems(),
      ]);
    } catch (error) {
      console.error("Tree planning load error:", error);
      showError(
        error?.message || "Tree Planning data could not be loaded."
      );
    } finally {
      setPageLoading(false);
    }
  }, [
    clearAlerts,
    fetchAllTreeItems,
    fetchOrderItems,
    fetchOrders,
    fetchTrees,
    showError,
  ]);

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    loadPageData();
  }, [authLoading, loadPageData, router, user]);

  /* =========================================================
     ORDER MAP
  ========================================================= */

  const ordersById = useMemo(() => {
    const map = {};

    orders.forEach((order) => {
      map[order.id] = order;
    });

    return map;
  }, [orders]);

  /* =========================================================
     TREE MAP
  ========================================================= */

  const treesById = useMemo(() => {
    const map = {};

    trees.forEach((tree) => {
      map[tree.id] = tree;
    });

    return map;
  }, [trees]);

  /* =========================================================
     ORDER ITEMS GROUPED BY ORDER
  ========================================================= */

  const itemsByOrderId = useMemo(() => {
    const map = {};

    orderItems.forEach((item) => {
      if (!map[item.order_id]) {
        map[item.order_id] = [];
      }

      map[item.order_id].push(item);
    });

    return map;
  }, [orderItems]);

  /* =========================================================
     TREE ITEMS GROUPED BY TREE
  ========================================================= */

  const treeItemsByTreeId = useMemo(() => {
    const map = {};

    allTreeItems.forEach((item) => {
      if (!map[item.casting_tree_id]) {
        map[item.casting_tree_id] = [];
      }

      map[item.casting_tree_id].push(item);
    });

    return map;
  }, [allTreeItems]);

  /* =========================================================
     CURRENT EDIT TREE ITEM MAP
  ========================================================= */

  const editingTreeItemsByOrderItemId = useMemo(() => {
    const map = {};

    if (!editingTreeId) return map;

    allTreeItems
      .filter((item) => item.casting_tree_id === editingTreeId)
      .forEach((item) => {
        map[item.order_item_id] =
          safeNumber(item.selected_quantity);
      });

    return map;
  }, [allTreeItems, editingTreeId]);

  /* =========================================================
     TOTAL ALLOCATION MAP

     Editing tree allocation is excluded from used quantity.
     This allows the user to retain or modify its current qty.
  ========================================================= */

  const allocatedQtyByOrderItemId = useMemo(() => {
    const map = {};

    allTreeItems.forEach((treeItem) => {
      if (
        editingTreeId &&
        treeItem.casting_tree_id === editingTreeId
      ) {
        return;
      }

      const itemId = treeItem.order_item_id;

      map[itemId] =
        safeNumber(map[itemId]) +
        safeNumber(treeItem.selected_quantity);
    });

    return map;
  }, [allTreeItems, editingTreeId]);

  /* =========================================================
     ENRICHED ORDER ITEMS WITH REMAINING QUANTITY
  ========================================================= */

  const enrichedOrderItems = useMemo(() => {
    return orderItems.map((item) => {
      const orderQty = safeNumber(item.quantity);
      const allocatedQty = safeNumber(
        allocatedQtyByOrderItemId[item.id]
      );

      const remainingQty = Math.max(
        orderQty - allocatedQty,
        0
      );

      const currentSelectedQty = safeNumber(
        selectedAllocations[item.id]?.selected_quantity
      );

      const order = ordersById[item.order_id] || null;

      return {
        ...item,
        order,
        order_quantity: orderQty,
        allocated_quantity: allocatedQty,
        remaining_quantity: remainingQty,
        selected_quantity: currentSelectedQty,
      };
    });
  }, [
    allocatedQtyByOrderItemId,
    orderItems,
    ordersById,
    selectedAllocations,
  ]);

  /* =========================================================
     ENRICHED ITEMS GROUPED BY ORDER
  ========================================================= */

  const enrichedItemsByOrderId = useMemo(() => {
    const map = {};

    enrichedOrderItems.forEach((item) => {
      if (!map[item.order_id]) {
        map[item.order_id] = [];
      }

      map[item.order_id].push(item);
    });

    return map;
  }, [enrichedOrderItems]);

  /* =========================================================
     ORDER-WISE REMAINING SUMMARY
  ========================================================= */

  const orderRemainingSummary = useMemo(() => {
    const map = {};

    orders.forEach((order) => {
      const items = enrichedItemsByOrderId[order.id] || [];

      const totalOrdered = items.reduce(
        (sum, item) => sum + safeNumber(item.order_quantity),
        0
      );

      const totalAllocated = items.reduce(
        (sum, item) =>
          sum + safeNumber(item.allocated_quantity),
        0
      );

      const totalRemaining = items.reduce(
        (sum, item) =>
          sum + safeNumber(item.remaining_quantity),
        0
      );

      map[order.id] = {
        totalItems: items.length,
        totalOrdered,
        totalAllocated,
        totalRemaining,
      };
    });

    return map;
  }, [enrichedItemsByOrderId, orders]);

  /* =========================================================
     SEARCHED ORDERS
  ========================================================= */

  const filteredOrders = useMemo(() => {
    const query = normalizeText(orderSearch);

    return orders.filter((order) => {
      const summary = orderRemainingSummary[order.id];

      if (!summary || summary.totalItems === 0) {
        return false;
      }

      const matchesSearch =
        !query ||
        normalizeText(order.order_no).includes(query) ||
        normalizeText(order.customer_name).includes(query) ||
        normalizeText(order.customer_mobile).includes(query) ||
        normalizeText(order.status).includes(query);

      const isAlreadySelected = selectedOrderIds.includes(order.id);

      /*
        Fully allocated order remains visible only when it is selected
        or when its tree is currently being edited.
      */

      const hasRemaining =
        summary.totalRemaining > 0 ||
        isAlreadySelected ||
        Boolean(editingTreeId);

      return matchesSearch && hasRemaining;
    });
  }, [
    editingTreeId,
    orderRemainingSummary,
    orderSearch,
    orders,
    selectedOrderIds,
  ]);

  /* =========================================================
     SELECTED ORDER OBJECTS
  ========================================================= */

  const selectedOrders = useMemo(() => {
    return selectedOrderIds
      .map((orderId) => ordersById[orderId])
      .filter(Boolean);
  }, [ordersById, selectedOrderIds]);

  /* =========================================================
     SELECTED ORDER ITEMS

     This is the combined item pool from all selected orders.
  ========================================================= */

  const combinedOrderItems = useMemo(() => {
    const query = normalizeText(itemSearch);

    return enrichedOrderItems.filter((item) => {
      if (!selectedOrderIds.includes(item.order_id)) {
        return false;
      }

      const isSelected = Boolean(selectedAllocations[item.id]);

      if (item.remaining_quantity <= 0 && !isSelected) {
        return false;
      }

      if (!query) return true;

      return (
        normalizeText(item.category).includes(query) ||
        normalizeText(item.sample_unique_id).includes(query) ||
        normalizeText(item.die_no).includes(query) ||
        normalizeText(item.gold_kt).includes(query) ||
        normalizeText(item.order?.order_no).includes(query) ||
        normalizeText(item.order?.customer_name).includes(query)
      );
    });
  }, [
    enrichedOrderItems,
    itemSearch,
    selectedAllocations,
    selectedOrderIds,
  ]);

  /* =========================================================
     SELECTED ALLOCATION ITEMS
  ========================================================= */

  const selectedTreeItems = useMemo(() => {
    return enrichedOrderItems
      .filter((item) => Boolean(selectedAllocations[item.id]))
      .map((item) => {
        const allocation = selectedAllocations[item.id];

        return {
          ...item,
          selected_quantity: safeNumber(
            allocation.selected_quantity
          ),
          gold_weight: safeNumber(allocation.gold_weight),
        };
      });
  }, [enrichedOrderItems, selectedAllocations]);

  /* =========================================================
     TREE TOTALS
  ========================================================= */

  const selectedTotals = useMemo(() => {
    return selectedTreeItems.reduce(
      (totals, item) => {
        const selectedQty = safeNumber(
          item.selected_quantity
        );

        const approxWeightEach = safeNumber(
          item.approx_weight
        );

        const calculatedApproxWeight =
          selectedQty * approxWeightEach;

        totals.totalItems += 1;
        totals.totalQuantity += selectedQty;
        totals.totalApproxWeight += calculatedApproxWeight;
        totals.totalGoldWeight += safeNumber(item.gold_weight);

        if (!totals.orderIds.includes(item.order_id)) {
          totals.orderIds.push(item.order_id);
        }

        return totals;
      },
      {
        totalItems: 0,
        totalQuantity: 0,
        totalApproxWeight: 0,
        totalGoldWeight: 0,
        orderIds: [],
      }
    );
  }, [selectedTreeItems]);

  /* =========================================================
     TREE SEARCH AND FILTER
  ========================================================= */

  const filteredTrees = useMemo(() => {
    const query = normalizeText(treeSearch);

    return trees.filter((tree) => {
      const matchesStatus =
        treeStatusFilter === "All" ||
        tree.status === treeStatusFilter;

      const relatedItems =
        treeItemsByTreeId[tree.id] || [];

      const relatedOrderNumbers = relatedItems
        .map(
          (item) =>
            ordersById[item.order_id]?.order_no || ""
        )
        .join(" ");

      const relatedPartyNames = relatedItems
        .map(
          (item) =>
            ordersById[item.order_id]?.customer_name || ""
        )
        .join(" ");

      const matchesSearch =
        !query ||
        normalizeText(tree.tree_no).includes(query) ||
        normalizeText(tree.flask_no).includes(query) ||
        normalizeText(tree.kt).includes(query) ||
        normalizeText(tree.status).includes(query) ||
        normalizeText(relatedOrderNumbers).includes(query) ||
        normalizeText(relatedPartyNames).includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [
    ordersById,
    treeItemsByTreeId,
    treeSearch,
    treeStatusFilter,
    trees,
  ]);

  /* =========================================================
     AUTO GENERATE TREE NUMBER
  ========================================================= */

  const generateNextTreeNo = useCallback(async () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `TR-${year}-`;

    const { data, error } = await supabase
      .from("casting_trees")
      .select("tree_no")
      .like("tree_no", `${prefix}%`)
      .order("tree_no", { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(
        getErrorMessage(error, "Unable to generate Tree No.")
      );
    }

    let nextSequence = 1;

    if (data?.length) {
      const lastTreeNo = String(data[0].tree_no || "");
      const lastSequence = Number(
        lastTreeNo.replace(prefix, "")
      );

      if (Number.isFinite(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }

    return `${prefix}${String(nextSequence).padStart(6, "0")}`;
  }, []);

  /* =========================================================
     RESET TREE FORM
  ========================================================= */

  const resetTreeForm = useCallback(
    async ({ preserveStatus = false } = {}) => {
      clearAlerts();

      setEditingTreeId(null);
      setSelectedOrderIds([]);
      setExpandedOrderIds([]);
      setSelectedAllocations({});

      setFlaskNo("");
      setKt("18KT");
      setTreeWeight("");
      setTreeDate(todayDate());
      setBurnoutDate("");
      setRemarks("");

      if (!preserveStatus) {
        setTreeStatus("Planned");
      }

      try {
        const nextTreeNo = await generateNextTreeNo();
        setTreeNo(nextTreeNo);
      } catch (error) {
        console.error("Generate tree no error:", error);
        setTreeNo("");
        showError(error?.message || "Tree No could not be generated.");
      }
    },
    [clearAlerts, generateNextTreeNo, showError]
  );

  /* =========================================================
     GENERATE TREE NUMBER AFTER INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    if (
      !pageLoading &&
      user &&
      !editingTreeId &&
      !treeNo
    ) {
      generateNextTreeNo()
        .then((number) => setTreeNo(number))
        .catch((error) => {
          console.error(error);
          showError(
            error?.message || "Tree No could not be generated."
          );
        });
    }
  }, [
    editingTreeId,
    generateNextTreeNo,
    pageLoading,
    showError,
    treeNo,
    user,
  ]);

  /* =========================================================
     ORDER TOGGLE

     Multi-select is deliberately enabled.
     This is the Combine Orders feature.
  ========================================================= */

  function toggleOrderSelection(orderId) {
    clearAlerts();

    const isSelected = selectedOrderIds.includes(orderId);

    if (isSelected) {
      setSelectedOrderIds((previous) =>
        previous.filter((id) => id !== orderId)
      );

      setExpandedOrderIds((previous) =>
        previous.filter((id) => id !== orderId)
      );

      setSelectedAllocations((previous) => {
        const next = { ...previous };

        Object.keys(next).forEach((orderItemId) => {
          const item = orderItems.find(
            (row) => row.id === orderItemId
          );

          if (item?.order_id === orderId) {
            delete next[orderItemId];
          }
        });

        return next;
      });

      return;
    }

    setSelectedOrderIds((previous) => [
      ...previous,
      orderId,
    ]);

    setExpandedOrderIds((previous) =>
      previous.includes(orderId)
        ? previous
        : [...previous, orderId]
    );
  }

  /* =========================================================
     EXPAND ORDER
  ========================================================= */

  function toggleOrderExpanded(orderId) {
    setExpandedOrderIds((previous) =>
      previous.includes(orderId)
        ? previous.filter((id) => id !== orderId)
        : [...previous, orderId]
    );
  }

  /* =========================================================
     SELECT / REMOVE TREE ITEM
  ========================================================= */

  function toggleItemSelection(item) {
    clearAlerts();

    const alreadySelected = Boolean(
      selectedAllocations[item.id]
    );

    if (alreadySelected) {
      setSelectedAllocations((previous) => {
        const next = { ...previous };
        delete next[item.id];
        return next;
      });

      return;
    }

    if (item.remaining_quantity <= 0) {
      showError(
        `${item.sample_unique_id || item.category} has no remaining quantity.`
      );
      return;
    }

    setSelectedAllocations((previous) => ({
      ...previous,
      [item.id]: {
        order_item_id: item.id,
        order_id: item.order_id,
        selected_quantity: Math.min(
          1,
          item.remaining_quantity
        ),
        gold_weight: 0,
      },
    }));
  }

  /* =========================================================
     SELECT ALL AVAILABLE ITEMS OF ONE ORDER
  ========================================================= */

  function selectAllOrderItems(orderId) {
    clearAlerts();

    const availableItems =
      enrichedItemsByOrderId[orderId] || [];

    setSelectedAllocations((previous) => {
      const next = { ...previous };

      availableItems.forEach((item) => {
        if (
          item.remaining_quantity > 0 &&
          !next[item.id]
        ) {
          next[item.id] = {
            order_item_id: item.id,
            order_id: item.order_id,
            selected_quantity: item.remaining_quantity,
            gold_weight: 0,
          };
        }
      });

      return next;
    });
  }

  /* =========================================================
     REMOVE ALL ITEMS OF ONE ORDER
  ========================================================= */

  function removeAllOrderItems(orderId) {
    setSelectedAllocations((previous) => {
      const next = { ...previous };

      Object.keys(next).forEach((orderItemId) => {
        const item = orderItems.find(
          (row) => row.id === orderItemId
        );

        if (item?.order_id === orderId) {
          delete next[orderItemId];
        }
      });

      return next;
    });
  }

  /* =========================================================
     UPDATE SELECTED QUANTITY
  ========================================================= */

  function updateSelectedQuantity(orderItemId, value) {
    clearAlerts();

    const item = enrichedOrderItems.find(
      (row) => row.id === orderItemId
    );

    if (!item) return;

    let nextValue = safeNumber(value);

    if (nextValue < 0) {
      nextValue = 0;
    }

    if (nextValue > item.remaining_quantity) {
      nextValue = item.remaining_quantity;

      showError(
        `Maximum remaining quantity is ${item.remaining_quantity}.`
      );
    }

    setSelectedAllocations((previous) => ({
      ...previous,
      [orderItemId]: {
        ...previous[orderItemId],
        order_item_id: orderItemId,
        order_id: item.order_id,
        selected_quantity: nextValue,
      },
    }));
  }

  /* =========================================================
     UPDATE ITEM ACTUAL GOLD WEIGHT
  ========================================================= */

  function updateItemGoldWeight(orderItemId, value) {
    const item = enrichedOrderItems.find(
      (row) => row.id === orderItemId
    );

    if (!item) return;

    setSelectedAllocations((previous) => ({
      ...previous,
      [orderItemId]: {
        ...previous[orderItemId],
        order_item_id: orderItemId,
        order_id: item.order_id,
        gold_weight: Math.max(safeNumber(value), 0),
      },
    }));
  }

  /* =========================================================
     AUTO-FILL APPROXIMATE TREE WEIGHT
  ========================================================= */

  function useApproximateWeightAsTreeWeight() {
    setTreeWeight(
      selectedTotals.totalApproxWeight.toFixed(4)
    );
  }

  /* =========================================================
     VALIDATE TREE
  ========================================================= */

  function validateTreeForm(saveStatus) {
    if (!treeNo.trim()) {
      return "Tree No is required.";
    }

    if (!kt) {
      return "Please select KT.";
    }

    if (!treeDate) {
      return "Please select Tree Date.";
    }

    if (!selectedTreeItems.length) {
      return "Please select at least one order item.";
    }

    for (const item of selectedTreeItems) {
      const selectedQty = safeNumber(
        item.selected_quantity
      );

      if (selectedQty <= 0) {
        return `${
          item.sample_unique_id || item.category
        }: Selected quantity must be greater than zero.`;
      }

      if (selectedQty > item.remaining_quantity) {
        return `${
          item.sample_unique_id || item.category
        }: Only ${item.remaining_quantity} quantity is remaining.`;
      }

      /*
        The tree should normally contain one common KT.
        This protects against accidentally mixing karats.
      */

      if (
        item.gold_kt &&
        normalizeText(item.gold_kt) !== normalizeText(kt)
      ) {
        return `${
          item.sample_unique_id || item.category
        } belongs to ${item.gold_kt}, but Tree KT is ${kt}.`;
      }
    }

    if (
      saveStatus !== "Draft" &&
      safeNumber(treeWeight) <= 0
    ) {
      return "Tree Weight must be greater than zero.";
    }

    if (
      ["Burnout", "Ready For Casting"].includes(saveStatus) &&
      !burnoutDate
    ) {
      return "Burnout Date is required for this status.";
    }

    return "";
  }

  /* =========================================================
     BUILD TREE ITEM INSERT DATA
  ========================================================= */

  function buildTreeItemRows(castingTreeId) {
    return selectedTreeItems.map((item) => ({
      casting_tree_id: castingTreeId,
      order_id: item.order_id,
      order_item_id: item.id,
      selected_quantity: safeNumber(
        item.selected_quantity
      ),
      category: item.category || null,
      sample_unique_id: item.sample_unique_id || null,
      die_no: item.die_no || null,
      approx_weight: safeNumber(item.approx_weight),
      gold_weight: safeNumber(item.gold_weight),
    }));
  }

  /* =========================================================
     SAVE NEW TREE
  ========================================================= */

  async function createTree(saveStatus) {
    const validationError = validateTreeForm(saveStatus);

    if (validationError) {
      showError(validationError);
      return;
    }

    try {
      setSaving(true);
      clearAlerts();

      const treePayload = {
        tree_no: treeNo.trim(),
        flask_no: flaskNo.trim() || null,
        kt,
        tree_weight: safeNumber(treeWeight),
        tree_date: treeDate || todayDate(),
        burnout_date: burnoutDate || null,
        status: saveStatus,
        remarks: remarks.trim() || null,
        created_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      const { data: insertedTree, error: treeError } =
        await supabase
          .from("casting_trees")
          .insert(treePayload)
          .select("*")
          .single();

      if (treeError) {
        throw treeError;
      }

      const treeItemRows = buildTreeItemRows(
        insertedTree.id
      );

      const { error: itemsError } = await supabase
        .from("casting_tree_items")
        .insert(treeItemRows);

      if (itemsError) {
        /*
          Delete parent tree if child insertion fails.
          This prevents an empty tree record.
        */

        await supabase
          .from("casting_trees")
          .delete()
          .eq("id", insertedTree.id);

        throw itemsError;
      }

      await Promise.all([
        fetchTrees(),
        fetchAllTreeItems(),
      ]);

      await resetTreeForm();

      showSuccess(
        saveStatus === "Draft"
          ? "Tree saved as Draft."
          : "Tree planned successfully."
      );
    } catch (error) {
      console.error("Create tree error:", error);

      const text = getErrorMessage(
        error,
        "Tree could not be saved."
      );

      if (
        normalizeText(text).includes(
          "casting_trees_tree_no_key"
        ) ||
        normalizeText(text).includes("duplicate key")
      ) {
        showError(
          "This Tree No already exists. Please generate a new Tree No."
        );
      } else {
        showError(text);
      }
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     UPDATE EXISTING TREE
  ========================================================= */

  async function updateTree(saveStatus) {
    if (!editingTreeId) return;

    const validationError = validateTreeForm(saveStatus);

    if (validationError) {
      showError(validationError);
      return;
    }

    try {
      setSaving(true);
      clearAlerts();

      const treePayload = {
        tree_no: treeNo.trim(),
        flask_no: flaskNo.trim() || null,
        kt,
        tree_weight: safeNumber(treeWeight),
        tree_date: treeDate || todayDate(),
        burnout_date: burnoutDate || null,
        status: saveStatus,
        remarks: remarks.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error: treeUpdateError } = await supabase
        .from("casting_trees")
        .update(treePayload)
        .eq("id", editingTreeId);

      if (treeUpdateError) {
        throw treeUpdateError;
      }

      const { error: deleteItemsError } = await supabase
        .from("casting_tree_items")
        .delete()
        .eq("casting_tree_id", editingTreeId);

      if (deleteItemsError) {
        throw deleteItemsError;
      }

      const itemRows = buildTreeItemRows(editingTreeId);

      const { error: insertItemsError } = await supabase
        .from("casting_tree_items")
        .insert(itemRows);

      if (insertItemsError) {
        throw insertItemsError;
      }

      await Promise.all([
        fetchTrees(),
        fetchAllTreeItems(),
      ]);

      await resetTreeForm();

      showSuccess("Tree updated successfully.");
    } catch (error) {
      console.error("Update tree error:", error);
      showError(
        getErrorMessage(error, "Tree could not be updated.")
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     SAVE HANDLER
  ========================================================= */

  async function handleSaveTree(saveStatus) {
    if (saving) return;

    if (editingTreeId) {
      await updateTree(saveStatus);
    } else {
      await createTree(saveStatus);
    }
  }

  /* =========================================================
     EDIT TREE
  ========================================================= */

  function handleEditTree(tree) {
    clearAlerts();

    const treeItems = treeItemsByTreeId[tree.id] || [];

    const nextSelectedOrderIds = [
      ...new Set(treeItems.map((item) => item.order_id)),
    ];

    const nextAllocations = {};

    treeItems.forEach((treeItem) => {
      nextAllocations[treeItem.order_item_id] = {
        order_item_id: treeItem.order_item_id,
        order_id: treeItem.order_id,
        selected_quantity: safeNumber(
          treeItem.selected_quantity
        ),
        gold_weight: safeNumber(treeItem.gold_weight),
      };
    });

    setEditingTreeId(tree.id);

    setTreeNo(tree.tree_no || "");
    setFlaskNo(tree.flask_no || "");
    setKt(tree.kt || "18KT");
    setTreeWeight(
      tree.tree_weight === null ||
        tree.tree_weight === undefined
        ? ""
        : String(tree.tree_weight)
    );
    setTreeDate(tree.tree_date || todayDate());
    setBurnoutDate(tree.burnout_date || "");
    setTreeStatus(tree.status || "Planned");
    setRemarks(tree.remarks || "");

    setSelectedOrderIds(nextSelectedOrderIds);
    setExpandedOrderIds(nextSelectedOrderIds);
    setSelectedAllocations(nextAllocations);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =========================================================
     DELETE TREE
  ========================================================= */

  async function handleDeleteTree(tree) {
    if (!tree?.id) return;

    const protectedStatuses = [
      "Casting",
      "Completed",
    ];

    if (protectedStatuses.includes(tree.status)) {
      showError(
        `${tree.status} tree cannot be deleted from Tree Planning.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete ${tree.tree_no}?\n\nIts item allocations will be released and become available again.`
    );

    if (!confirmed) return;

    try {
      setDeletingTreeId(tree.id);
      clearAlerts();

      const { error } = await supabase
        .from("casting_trees")
        .delete()
        .eq("id", tree.id);

      if (error) {
        throw error;
      }

      if (editingTreeId === tree.id) {
        await resetTreeForm();
      }

      await Promise.all([
        fetchTrees(),
        fetchAllTreeItems(),
      ]);

      showSuccess("Tree deleted successfully.");
    } catch (error) {
      console.error("Delete tree error:", error);
      showError(
        getErrorMessage(error, "Tree could not be deleted.")
      );
    } finally {
      setDeletingTreeId(null);
    }
  }

  /* =========================================================
     CHANGE TREE STATUS FROM TABLE
  ========================================================= */

  async function handleQuickStatusChange(treeId, nextStatus) {
    try {
      clearAlerts();

      const payload = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };

      if (
        ["Burnout", "Ready For Casting"].includes(nextStatus)
      ) {
        const currentTree = treesById[treeId];

        if (!currentTree?.burnout_date) {
          payload.burnout_date = todayDate();
        }
      }

      const { error } = await supabase
        .from("casting_trees")
        .update(payload)
        .eq("id", treeId);

      if (error) {
        throw error;
      }

      await fetchTrees();

      showSuccess(`Tree moved to ${nextStatus}.`);
    } catch (error) {
      console.error("Tree status error:", error);
      showError(
        getErrorMessage(
          error,
          "Tree status could not be changed."
        )
      );
    }
  }

  /* =========================================================
     CANCEL EDITING
  ========================================================= */

  async function handleCancelEdit() {
    await resetTreeForm();
  }

  /* =========================================================
     LOADING UI
  ========================================================= */

  if (authLoading || pageLoading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f1f5f9",
          padding: "24px",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "18px",
            padding: "28px 36px",
            boxShadow:
              "0 10px 30px rgba(15, 23, 42, 0.08)",
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          Loading Tree Planning...
        </div>
      </main>
    );
  }

  /* =========================================================
     MAIN PAGE
  ========================================================= */

  return (
    <>
      <main className="tree-planning-page">
        <header className="page-header">
          <div>
            <h1>{t("tree_planning")}</h1>
           <p>{t("tree_planning_subtitle")}</p>
          </div>

          <div className="header-actions">
            <Link
              href="/factory/casting"
              className="header-link"
            >
             {t("casting")}
            </Link>

            <Link
              href="/factory"
              className="header-link"
            >
              {t("manufacturing")}
            </Link>

            <Link
              href="/dashboard"
              className="header-link"
            >
             {t("dashboard")}
            </Link>
          </div>
        </header>

        {message ? (
          <div className="alert success-alert">
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="alert error-alert">
            {errorMessage}
          </div>
        ) : null}

        <section className="top-grid">
  <div className="left-planning-column">
    <OrdersPanel
      orders={filteredOrders}
      selectedOrderIds={selectedOrderIds}
      expandedOrderIds={expandedOrderIds}
      orderItemsByOrderId={enrichedItemsByOrderId}
      orderRemainingSummary={orderRemainingSummary}
      selectedAllocations={selectedAllocations}
      orderSearch={orderSearch}
      setOrderSearch={setOrderSearch}
      itemSearch={itemSearch}
      setItemSearch={setItemSearch}
      combinedOrderItems={combinedOrderItems}
      selectedOrders={selectedOrders}
      kt={kt}
      onToggleOrder={toggleOrderSelection}
      onToggleExpanded={toggleOrderExpanded}
      onToggleItem={toggleItemSelection}
      onSelectAllOrderItems={selectAllOrderItems}
      onRemoveAllOrderItems={removeAllOrderItems}
      onUpdateQuantity={updateSelectedQuantity}
    />

    <TreesTable
      trees={filteredTrees}
      treeItemsByTreeId={treeItemsByTreeId}
      ordersById={ordersById}
      treeSearch={treeSearch}
      setTreeSearch={setTreeSearch}
      treeStatusFilter={treeStatusFilter}
      setTreeStatusFilter={setTreeStatusFilter}
      treeStatuses={TREE_STATUSES}
      deletingTreeId={deletingTreeId}
      editingTreeId={editingTreeId}
      onEdit={handleEditTree}
      onDelete={handleDeleteTree}
      onStatusChange={handleQuickStatusChange}
    />
  </div>

  <TreeForm
    editingTreeId={editingTreeId}
    treeNo={treeNo}
    setTreeNo={setTreeNo}
    flaskNo={flaskNo}
    setFlaskNo={setFlaskNo}
    kt={kt}
    setKt={setKt}
    ktOptions={KT_OPTIONS}
    treeWeight={treeWeight}
    setTreeWeight={setTreeWeight}
    treeDate={treeDate}
    setTreeDate={setTreeDate}
    burnoutDate={burnoutDate}
    setBurnoutDate={setBurnoutDate}
    treeStatus={treeStatus}
    setTreeStatus={setTreeStatus}
    treeStatuses={TREE_STATUSES}
    remarks={remarks}
    setRemarks={setRemarks}
    selectedTreeItems={selectedTreeItems}
    selectedTotals={selectedTotals}
    selectedOrders={selectedOrders}
    saving={saving}
    onUpdateQuantity={updateSelectedQuantity}
    onUpdateGoldWeight={updateItemGoldWeight}
    onRemoveItem={toggleItemSelection}
    onUseApproximateWeight={
      useApproximateWeightAsTreeWeight
    }
    onSaveDraft={() => handleSaveTree("Draft")}
    onSavePlanned={() =>
      handleSaveTree(
        treeStatus === "Draft"
          ? "Planned"
          : treeStatus
      )
    }
    onCancelEdit={handleCancelEdit}
    onReset={resetTreeForm}
  />
</section>
      </main>

      <MobileBottomNav />

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f1f5f9;
          color: #0f172a;
        }

.left-planning-column {
  flex: 1.18;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

        .tree-planning-page {
          min-height: 100vh;
          padding: 18px 22px 110px;
          background: #f1f5f9;
        }

        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 18px;
        }

        .page-header h1 {
          margin: 0;
          font-size: clamp(26px, 3vw, 38px);
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -0.04em;
          color: #0f172a;
        }

        .page-header p {
          margin: 7px 0 0;
          max-width: 760px;
          color: #475569;
          font-size: 14px;
          line-height: 1.55;
        }

        .bn {
          font-family: inherit;
        }

        .header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 8px;
        }

        .header-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 8px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          background: #ffffff;
          color: #0f172a;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }

        .header-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.1);
        }

        .alert {
          position: sticky;
          top: 10px;
          z-index: 50;
          margin-bottom: 14px;
          padding: 13px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.12);
        }

        .success-alert {
          border: 1px solid #86efac;
          background: #f0fdf4;
          color: #166534;
        }

        .error-alert {
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
        }

        .top-grid {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.top-grid > .tree-form-column {
  flex: 0.82;
  min-width: 390px;
}

        .tp-card {
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 2px 5px rgba(15, 23, 42, 0.05);
        }

        .tp-card + .tp-card {
          margin-top: 16px;
        }

        .tp-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          padding: 17px 18px;
          border-bottom: 1px solid #e2e8f0;
        }

        .tp-card-title {
          margin: 0;
          color: #0f172a;
          font-size: 17px;
          font-weight: 900;
        }

        .tp-card-subtitle {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
        }

        .tp-card-body {
          padding: 16px;
        }

        .tp-input,
        .tp-select,
        .tp-textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          background: #ffffff;
          color: #0f172a;
          font: inherit;
          outline: none;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .tp-input,
        .tp-select {
          min-height: 44px;
          padding: 9px 12px;
        }

        .tp-textarea {
          min-height: 88px;
          resize: vertical;
          padding: 11px 12px;
        }

        .tp-input:focus,
        .tp-select:focus,
        .tp-textarea:focus {
          border-color: #0f172a;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
        }

        .tp-label {
          display: block;
          margin-bottom: 6px;
          color: #475569;
          font-size: 12px;
          font-weight: 800;
        }

        .tp-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 40px;
          padding: 8px 14px;
          border: 0;
          border-radius: 10px;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 900;
          transition:
            transform 0.15s ease,
            opacity 0.15s ease;
        }

        .tp-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .tp-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .tp-button-dark {
          background: #020617;
          color: #ffffff;
        }

        .tp-button-light {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #0f172a;
        }

        .tp-button-green {
          background: #15803d;
          color: #ffffff;
        }

        .tp-button-red {
          background: #fee2e2;
          color: #b91c1c;
        }

        .tp-button-amber {
          background: #fef3c7;
          color: #92400e;
        }

       @media (max-width: 1120px) {
  .top-grid {
    flex-direction: column;
  }

  .left-planning-column,
  .top-grid > .tree-form-column {
    width: 100%;
    min-width: 0;
    flex: none;
  }
}

        @media (max-width: 760px) {
          .tree-planning-page {
            padding: 13px 11px 100px;
          }

          .page-header {
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .header-link {
            flex: 1;
            padding-inline: 10px;
            white-space: nowrap;
          }

          .tp-card {
            border-radius: 14px;
          }

          .tp-card-header {
            padding: 14px;
          }

          .tp-card-body {
            padding: 12px;
          }
        }

        @media (max-width: 480px) {
          .page-header h1 {
            font-size: 25px;
          }

          .header-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .header-link:last-child {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </>
  );
}