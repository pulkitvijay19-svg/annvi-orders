"use client";

import { Fragment, useMemo, useState } from "react";
import { useLanguage } from "../../../context/LanguageContext";

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value, digits = 4) {
  return safeNumber(value).toFixed(digits);
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "draft") return "tree-status-draft";
  if (value === "planned") return "tree-status-planned";
  if (value === "burnout") return "tree-status-burnout";
  if (value === "ready for casting")
    return "tree-status-ready";
  if (value === "casting") return "tree-status-casting";
  if (value === "completed")
    return "tree-status-completed";

  return "tree-status-default";
}

export default function TreesTable({
  trees,
  treeItemsByTreeId,
  ordersById,
  treeSearch,
  setTreeSearch,
  treeStatusFilter,
  setTreeStatusFilter,
  treeStatuses,
  deletingTreeId,
  editingTreeId,
  onEdit,
  onDelete,
  onStatusChange,
}) {

  const { t } = useLanguage();  
  const [expandedTreeIds, setExpandedTreeIds] = useState([]);

  function toggleExpandedTree(treeId) {
    setExpandedTreeIds((previous) =>
      previous.includes(treeId)
        ? previous.filter((id) => id !== treeId)
        : [...previous, treeId]
    );
  }

  const totals = useMemo(() => {
    return trees.reduce(
      (summary, tree) => {
        const items = treeItemsByTreeId[tree.id] || [];

        summary.totalTrees += 1;
        summary.totalItems += items.length;
        summary.totalQuantity += items.reduce(
          (sum, item) =>
            sum + safeNumber(item.selected_quantity),
          0
        );
        summary.totalTreeWeight += safeNumber(
          tree.tree_weight
        );

        if (tree.status === "Ready For Casting") {
          summary.readyTrees += 1;
        }

        if (tree.status === "Burnout") {
          summary.burnoutTrees += 1;
        }

        return summary;
      },
      {
        totalTrees: 0,
        totalItems: 0,
        totalQuantity: 0,
        totalTreeWeight: 0,
        readyTrees: 0,
        burnoutTrees: 0,
      }
    );
  }, [treeItemsByTreeId, trees]);

  return (
    <section className="tp-card trees-table-card">
      <div className="tp-card-header trees-header">
        <div>
          <h2 className="tp-card-title">
            6. {t("existing_trees")}
          </h2>

          <p className="tp-card-subtitle">
            {t("existing_trees_subtitle")}
          </p>
        </div>

        <div className="tree-header-summary">
          <span>
            {t("trees")} <b>{totals.totalTrees}</b>
          </span>

          <span>
            {t("burnout")} <b>{totals.burnoutTrees}</b>
          </span>

          <span>
           {t("ready")} <b>{totals.readyTrees}</b>
          </span>
        </div>
      </div>

      <div className="tp-card-body">
        <div className="trees-toolbar">
          <div className="tree-search-wrap">
            <span>⌕</span>

            <input
              type="text"
              className="tp-input"
              value={treeSearch}
              onChange={(event) =>
                setTreeSearch(event.target.value)
              }
             placeholder={t("search_tree_placeholder")}
            />

            {treeSearch ? (
              <button
                type="button"
                onClick={() => setTreeSearch("")}
                aria-label="Clear tree search"
              >
                ×
              </button>
            ) : null}
          </div>

          <select
            className="tp-select status-filter"
            value={treeStatusFilter}
            onChange={(event) =>
              setTreeStatusFilter(event.target.value)
            }
          >
           <option value="All">{t("all_statuses")}</option>

            {treeStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="tree-stats-grid">
          <div>
            <span>{t("total_trees")}</span>
            <strong>{totals.totalTrees}</strong>
          </div>

          <div>
            <span>{t("total_trees")}</span>
            <strong>{totals.totalItems}</strong>
          </div>

          <div>
            <span>{t("total_quantity")}</span>
            <strong>{totals.totalQuantity}</strong>
          </div>

          <div>
            <span>{t("total_tree_weight")}</span>
            <strong>
              {formatNumber(totals.totalTreeWeight)} g
            </strong>
          </div>
        </div>

        {trees.length === 0 ? (
          <div className="trees-empty-state">
            <div>♧</div>
            <strong>{t("no_trees_found")}</strong>
            <span>
             {t("no_trees_hint")}
            </span>
          </div>
        ) : (
          <>
            <div className="desktop-trees-table-wrap">
              <table className="desktop-trees-table">
                <thead>
                  <tr>
                    <th />
                    <th>{t("tree_no")}</th>
<th>{t("flask")}</th>
<th>KT</th>
<th>{t("tree_date")}</th>
<th>{t("burnout_date")}</th>
<th>{t("orders")}</th>
<th>{t("quantity")}</th>
<th>{t("weight")}</th>
<th>{t("status")}</th>
<th>{t("actions")}</th>
                  </tr>
                </thead>

                <tbody>
                  {trees.map((tree) => {
                    const items =
                      treeItemsByTreeId[tree.id] || [];

                    const expanded =
                      expandedTreeIds.includes(tree.id);

                    const uniqueOrderIds = [
                      ...new Set(
                        items.map((item) => item.order_id)
                      ),
                    ];

                    const totalQty = items.reduce(
                      (sum, item) =>
                        sum +
                        safeNumber(item.selected_quantity),
                      0
                    );

                    const isDeleting =
                      deletingTreeId === tree.id;

                    const isEditing =
                      editingTreeId === tree.id;

                    const cannotEdit = [
                      "Casting",
                      "Completed",
                    ].includes(tree.status);

                    return (
  <Fragment key={tree.id}>
    <tr
                          className={
                            isEditing
                              ? "editing-tree-row"
                              : ""
                          }
                        >
                          <td className="expand-cell">
                            <button
                              type="button"
                              className="tree-expand-button"
                              onClick={() =>
                                toggleExpandedTree(tree.id)
                              }
                            >
                              {expanded ? "−" : "+"}
                            </button>
                          </td>

                          <td>
                            <strong className="tree-number">
                              {tree.tree_no}
                            </strong>

                            {isEditing ? (
                              <small className="currently-editing">
                               {t("currently_editing")}
                              </small>
                            ) : null}
                          </td>

                          <td>{tree.flask_no || "-"}</td>

                          <td>
                            <span className="tree-kt-pill">
                              {tree.kt}
                            </span>
                          </td>

                          <td>
                            {formatDate(tree.tree_date)}
                          </td>

                          <td>
                            {formatDate(tree.burnout_date)}
                          </td>

                          <td>
                            <div className="order-count-cell">
                              <strong>
                                {uniqueOrderIds.length}
                              </strong>
                              <span>Orders</span>
                            </div>
                          </td>

                          <td>
                            <strong>{totalQty}</strong>
                          </td>

                          <td>
                            <strong>
                              {formatNumber(
                                tree.tree_weight
                              )}{" "}
                              g
                            </strong>
                          </td>

                          <td>
                            <select
                              className={`quick-status-select ${getStatusClass(
                                tree.status
                              )}`}
                              value={tree.status}
                              disabled={
                                tree.status === "Completed"
                              }
                              onChange={(event) =>
                                onStatusChange(
                                  tree.id,
                                  event.target.value
                                )
                              }
                            >
                              {treeStatuses.map((status) => (
                                <option
                                  key={status}
                                  value={status}
                                >
                                  {status}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <div className="table-action-buttons">
                              <button
                                type="button"
                                className="edit-tree-button"
                                onClick={() => onEdit(tree)}
                                disabled={cannotEdit || isDeleting}
                                title={
                                  cannotEdit
                                    ? `${tree.status} tree cannot be edited`
                                    : "Edit tree"
                                }
                              >
                                {t("edit")}
                              </button>

                              <button
                                type="button"
                                className="delete-tree-button"
                                onClick={() => onDelete(tree)}
                                disabled={
                                  isDeleting ||
                                  ["Casting", "Completed"].includes(
                                    tree.status
                                  )
                                }
                              >
                                {isDeleting
  ? t("deleting")
  : t("delete")}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expanded ? (
                          <tr className="expanded-tree-row">
                            <td colSpan={11}>
                              <TreeExpandedDetails
                                tree={tree}
                                items={items}
                                ordersById={ordersById}
                              />
                            </td>
                          </tr>
                        ) : null}
                       </Fragment>
);
                  })}
                </tbody>
              </table>
            </div>

            <div className="mobile-trees-list">
              {trees.map((tree) => {
                const items =
                  treeItemsByTreeId[tree.id] || [];

                const expanded =
                  expandedTreeIds.includes(tree.id);

                const uniqueOrderIds = [
                  ...new Set(
                    items.map((item) => item.order_id)
                  ),
                ];

                const totalQty = items.reduce(
                  (sum, item) =>
                    sum +
                    safeNumber(item.selected_quantity),
                  0
                );

                const isDeleting =
                  deletingTreeId === tree.id;

                const isEditing =
                  editingTreeId === tree.id;

                const cannotEdit = [
                  "Casting",
                  "Completed",
                ].includes(tree.status);

                return (
                  <article
                    key={tree.id}
                    className={`mobile-tree-card ${
                      isEditing
                        ? "mobile-tree-card-editing"
                        : ""
                    }`}
                  >
                    <div className="mobile-tree-top">
                      <div>
                        <strong>{tree.tree_no}</strong>

                        <span>
                          {t("flask")} {tree.flask_no || "-"} •{" "}
                          {tree.kt}
                        </span>
                      </div>

                      <span
                        className={`mobile-tree-status ${getStatusClass(
                          tree.status
                        )}`}
                      >
                        {tree.status}
                      </span>
                    </div>

                    <div className="mobile-tree-stats">
                      <span>
                        Orders
                        <b>{uniqueOrderIds.length}</b>
                      </span>

                      <span>
                        Items
                        <b>{items.length}</b>
                      </span>

                      <span>
                        Qty
                        <b>{totalQty}</b>
                      </span>

                      <span>
                        Weight
                        <b>
                          {formatNumber(tree.tree_weight)} g
                        </b>
                      </span>

                      <span>
                        Tree Date
                        <b>{formatDate(tree.tree_date)}</b>
                      </span>

                      <span>
                        Burnout
                        <b>
                          {formatDate(tree.burnout_date)}
                        </b>
                      </span>
                    </div>

                    <select
                      className={`mobile-status-select ${getStatusClass(
                        tree.status
                      )}`}
                      value={tree.status}
                      disabled={tree.status === "Completed"}
                      onChange={(event) =>
                        onStatusChange(
                          tree.id,
                          event.target.value
                        )
                      }
                    >
                      {treeStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    <div className="mobile-tree-actions">
                      <button
                        type="button"
                        className="mobile-view-button"
                        onClick={() =>
                          toggleExpandedTree(tree.id)
                        }
                      >
                       {expanded
  ? t("hide_items")
  : t("view_items")}
                      </button>

                      <button
                        type="button"
                        className="mobile-edit-button"
                        onClick={() => onEdit(tree)}
                        disabled={cannotEdit || isDeleting}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="mobile-delete-button"
                        onClick={() => onDelete(tree)}
                        disabled={
                          isDeleting ||
                          ["Casting", "Completed"].includes(
                            tree.status
                          )
                        }
                      >
                        {isDeleting
  ? t("deleting")
  : t("delete")}
                      </button>
                    </div>

                    {expanded ? (
                      <TreeExpandedDetails
                        tree={tree}
                        items={items}
                        ordersById={ordersById}
                        mobile
                      />
                    ) : null}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        .trees-table-card {
  margin-top: 0;
}

        .trees-header {
          align-items: center;
        }

        .tree-header-summary {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 7px;
        }

        .tree-header-summary span {
          padding: 7px 10px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
        }

        .tree-header-summary b {
          margin-left: 3px;
          color: #0f172a;
        }

        .trees-toolbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 210px;
          gap: 9px;
          margin-bottom: 12px;
        }

        .tree-search-wrap {
          position: relative;
        }

        .tree-search-wrap > span {
          position: absolute;
          top: 50%;
          left: 13px;
          transform: translateY(-50%);
          color: #64748b;
          font-size: 20px;
          pointer-events: none;
        }

        .tree-search-wrap input {
          padding-left: 39px;
          padding-right: 38px;
        }

        .tree-search-wrap button {
          position: absolute;
          top: 50%;
          right: 9px;
          display: grid;
          width: 27px;
          height: 27px;
          border: 0;
          border-radius: 50%;
          transform: translateY(-50%);
          place-items: center;
          background: #e2e8f0;
          color: #334155;
          cursor: pointer;
          font-size: 17px;
        }

        .status-filter {
          font-weight: 800;
        }

        .tree-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 13px;
        }

        .tree-stats-grid > div {
          padding: 10px;
          border-radius: 10px;
          background: #f8fafc;
        }

        .tree-stats-grid span {
          display: block;
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
        }

        .tree-stats-grid strong {
          display: block;
          margin-top: 4px;
          color: #0f172a;
          font-size: 15px;
          font-weight: 900;
        }

        .trees-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 230px;
          padding: 25px;
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          background: #f8fafc;
          text-align: center;
        }

        .trees-empty-state > div {
          display: grid;
          width: 46px;
          height: 46px;
          margin-bottom: 9px;
          border-radius: 50%;
          place-items: center;
          background: #e2e8f0;
          color: #475569;
          font-size: 24px;
        }

        .trees-empty-state strong {
          color: #334155;
          font-size: 13px;
        }

        .trees-empty-state span {
          margin-top: 4px;
          color: #64748b;
          font-size: 10px;
        }

        .desktop-trees-table-wrap {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }

        .desktop-trees-table {
          width: 100%;
          min-width: 1180px;
          border-collapse: collapse;
        }

        .desktop-trees-table th {
          padding: 10px 8px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          text-align: left;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .desktop-trees-table td {
          padding: 9px 8px;
          border-bottom: 1px solid #edf2f7;
          color: #334155;
          vertical-align: middle;
          font-size: 14px;
        }

        .desktop-trees-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .desktop-trees-table tbody tr:not(.expanded-tree-row):hover {
          background: #f8fafc;
        }

        .editing-tree-row {
          background: #fffbeb !important;
        }

        .expand-cell {
          width: 43px;
          text-align: center;
        }

        .tree-expand-button {
          display: grid;
          width: 28px;
          height: 28px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          place-items: center;
          background: #ffffff;
          color: #0f172a;
          cursor: pointer;
          font-size: 17px;
          font-weight: 900;
        }

        .tree-number {
          display: block;
          color: #0f172a;
          white-space: nowrap;
          font-size:15px;
font-weight:700;
        }

        .currently-editing {
          display: block;
          margin-top: 2px;
          color: #b45309;
          white-space: nowrap;
          font-size: 7px;
          font-weight: 900;
        }

        .tree-kt-pill {
          padding: 4px 7px;
          border-radius: 999px;
          background: #0f172a;
          color: #ffffff;
          font-size: 12px;
          font-weight: 900;
        }

        .order-count-cell strong,
        .order-count-cell span {
          display: block;
        }

        .order-count-cell span {
          margin-top: 2px;
          color: #94a3b8;
          font-size: 7px;
        }

        .quick-status-select {
          min-width: 130px;
          height: 34px;
          padding: 5px 7px;
          border: 1px solid transparent;
          border-radius: 8px;
          outline: none;
          font-size: 13px;
          font-weight: 900;
        }

        .tree-status-draft {
          background: #f1f5f9;
          color: #475569;
        }

        .tree-status-planned {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .tree-status-burnout {
          background: #ffedd5;
          color: #c2410c;
        }

        .tree-status-ready {
          background: #dcfce7;
          color: #15803d;
        }

        .tree-status-casting {
          background: #f3e8ff;
          color: #7e22ce;
        }

        .tree-status-completed {
          background: #d1fae5;
          color: #047857;
        }

        .tree-status-default {
          background: #e2e8f0;
          color: #475569;
        }

        .table-action-buttons {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .edit-tree-button,
        .delete-tree-button {
          min-height: 31px;
          padding: 5px 8px;
          border: 0;
          border-radius: 7px;
          cursor: pointer;
          font-size: 9px;
          font-weight: 900;
        }

        .edit-tree-button {
          background: #0f172a;
          color: #ffffff;
        }

        .delete-tree-button {
          background: #fee2e2;
          color: #b91c1c;
        }

        .edit-tree-button:disabled,
        .delete-tree-button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .expanded-tree-row td {
          padding: 0 !important;
          background: #f8fafc;
        }

        .mobile-trees-list {
          display: none;
        }

        @media (max-width: 760px) {
          .trees-toolbar {
            grid-template-columns: 1fr;
          }

          .tree-stats-grid {
            grid-template-columns: 1fr 1fr;
          }

          .desktop-trees-table-wrap {
            display: none;
          }

          .mobile-trees-list {
            display: grid;
            gap: 10px;
          }

          .mobile-tree-card {
            padding: 12px;
            border: 1px solid #dbe2ea;
            border-radius: 12px;
            background: #ffffff;
          }

          .mobile-tree-card-editing {
            border-color: #f59e0b;
            background: #fffbeb;
          }

          .mobile-tree-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 10px;
          }

          .mobile-tree-top strong {
            display: block;
            color: #0f172a;
            font-size: 12px;
          }

          .mobile-tree-top div > span {
            display: block;
            margin-top: 3px;
            color: #64748b;
            font-size: 9px;
          }

          .mobile-tree-status {
            flex: 0 0 auto;
            padding: 5px 7px;
            border-radius: 999px;
            font-size: 8px;
            font-weight: 900;
          }

          .mobile-tree-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
            margin-top: 11px;
          }

          .mobile-tree-stats span {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
            padding: 6px;
            border-radius: 7px;
            background: #f8fafc;
            color: #64748b;
            font-size: 7px;
          }

          .mobile-tree-stats b {
            overflow: hidden;
            color: #334155;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 9px;
          }

          .mobile-status-select {
            width: 100%;
            height: 38px;
            margin-top: 10px;
            padding: 6px 9px;
            border: 0;
            border-radius: 8px;
            outline: none;
            font-size: 10px;
            font-weight: 900;
          }

          .mobile-tree-actions {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 6px;
            margin-top: 9px;
          }

          .mobile-tree-actions button {
            min-height: 36px;
            padding: 6px;
            border: 0;
            border-radius: 8px;
            cursor: pointer;
            font-size: 9px;
            font-weight: 900;
          }

          .mobile-view-button {
            background: #e2e8f0;
            color: #334155;
          }

          .mobile-edit-button {
            background: #0f172a;
            color: #ffffff;
          }

          .mobile-delete-button {
            background: #fee2e2;
            color: #b91c1c;
          }

          .mobile-tree-actions button:disabled {
            cursor: not-allowed;
            opacity: 0.45;
          }
        }

        @media (max-width: 480px) {
          .trees-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .tree-header-summary {
            justify-content: flex-start;
          }

          .mobile-tree-stats {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </section>
  );
}

function TreeExpandedDetails({
  tree,
  items,
  ordersById,
  mobile = false,
}) {
     const { t } = useLanguage();
  const groupedOrders = useMemo(() => {
    const map = {};

    items.forEach((item) => {
      if (!map[item.order_id]) {
        map[item.order_id] = {
          order: ordersById[item.order_id] || null,
          items: [],
        };
      }

      map[item.order_id].items.push(item);
    });

    return Object.values(map);
  }, [items, ordersById]);

  const totalQty = items.reduce(
    (sum, item) =>
      sum + safeNumber(item.selected_quantity),
    0
  );

  const totalApproxWeight = items.reduce(
    (sum, item) =>
      sum +
      safeNumber(item.selected_quantity) *
        safeNumber(item.approx_weight),
    0
  );

  
  return (
    <div
      className={`tree-expanded-details ${
        mobile ? "tree-expanded-mobile" : ""
      }`}
    >
      <div className="expanded-details-summary">
        <div>
          <span>{t("tree_no")}</span>
          <strong>{tree.tree_no}</strong>
        </div>

        <div>
          <span>{t("orders")}</span>
          <strong>{groupedOrders.length}</strong>
        </div>

        <div>
          <span>{t("item_lines")}</span>
          <strong>{items.length}</strong>
        </div>

        <div>
          <span>{t("total_qty")}</span>
          <strong>{totalQty}</strong>
        </div>

        <div>
          <span>{t("approx_weight")}</span>
          <strong>
            {formatNumber(totalApproxWeight)} g
          </strong>
        </div>
</div>
        
      {tree.remarks ? (
        <div className="expanded-tree-remarks">
          <strong>Remarks:</strong> {tree.remarks}
        </div>
      ) : null}

      {groupedOrders.length === 0 ? (
        <div className="no-expanded-items">
          No items found in this tree.
        </div>
      ) : (
        <div className="expanded-order-groups">
          {groupedOrders.map((group) => {
            const orderQty = group.items.reduce(
              (sum, item) =>
                sum +
                safeNumber(item.selected_quantity),
              0
            );

            return (
              <div
                key={
                  group.order?.id ||
                  group.items[0]?.order_id
                }
                className="expanded-order-group"
              >
                <div className="expanded-order-title">
                  <div>
                    <strong>
                      {group.order?.order_no ||
                        "Unknown Order"}
                    </strong>

                    <span>
                      {group.order?.customer_name ||
                        "Unknown Party"}
                    </span>
                  </div>

                  <span>{orderQty} Qty</span>
                </div>

                <div className="expanded-items-grid">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="expanded-item-card"
                    >
                      <div>
                        <strong>
                          {item.category ||
                            "Uncategorized"}
                        </strong>

                        <small>
                          {item.sample_unique_id
                            ? `ID: ${item.sample_unique_id}`
                            : "No Sample ID"}

                          {item.die_no
                            ? ` • Die: ${item.die_no}`
                            : ""}
                        </small>
                      </div>

                      <div className="expanded-item-values">
                        <span>
                          Qty
                          <b>
                            {safeNumber(
                              item.selected_quantity
                            )}
                          </b>
                        </span>

                        <span>
                          Approx Each
                          <b>
                            {formatNumber(
                              item.approx_weight
                            )}{" "}
                            g
                          </b>
                        </span>

                        <span>
                          Approx Total
                          <b>
                            {formatNumber(
                              safeNumber(
                                item.selected_quantity
                              ) *
                                safeNumber(
                                  item.approx_weight
                                )
                            )}{" "}
                            g
                          </b>
                        </span>

                        
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        .tree-expanded-details {
          padding: 13px;
          background: #f8fafc;
        }

        .tree-expanded-mobile {
          margin-top: 10px;
          padding: 10px;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
        }

        .expanded-details-summary {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 7px;
        }

        .expanded-details-summary > div {
          padding: 8px;
          border-radius: 8px;
          background: #ffffff;
        }

        .expanded-details-summary span {
          display: block;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        .expanded-details-summary strong {
          display: block;
          margin-top: 3px;
          color: #0f172a;
          font-size: 18px;
font-weight: 800;
        }

        .expanded-tree-remarks {
          margin-top: 9px;
          padding: 8px;
          border-radius: 8px;
          background: #fffbeb;
          color: #92400e;
          font-size: 14px;
        }

        .no-expanded-items {
          margin-top: 9px;
          padding: 12px;
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          color: #64748b;
          text-align: center;
          font-size: 14px;
        }

        .expanded-order-groups {
          display: grid;
          gap: 9px;
          margin-top: 10px;
        }

        .expanded-order-group {
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          background: #ffffff;
        }

        .expanded-order-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 8px 10px;
          border-bottom: 1px solid #e2e8f0;
          background: #f1f5f9;
        }

        .expanded-order-title strong {
          display: block;
          color: #0f172a;
          font-size: 16px;
font-weight:700;
        }

        .expanded-order-title div > span {
          display: block;
          margin-top: 2px;
          color: #64748b;
          font-size: 13px;
        }

        .expanded-order-title > span {
          padding: 4px 7px;
          border-radius: 999px;
          background: #0f172a;
          color: #ffffff;
          font-size: 13px;
          font-weight: 900;
        }

        .expanded-items-grid {
          display: grid;
          gap: 6px;
          padding: 8px;
        }

        .expanded-item-card {
          display: grid;
          grid-template-columns: minmax(150px, 1fr) 2fr;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border: 1px solid #edf2f7;
          border-radius: 8px;
        }

        .expanded-item-card strong {
          display: block;
          color: #0f172a;
          font-size:16px;
font-weight:700;
      }

        .expanded-item-card small {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 13px;
        }

.expanded-item-values {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

        .expanded-item-values span {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 5px;
          border-radius: 6px;
          background: #f8fafc;
          color: #64748b;
          font-size:13px;
font-weight:600;
        }

        .expanded-item-values b {
          color: #334155;
          font-size:16px;
font-weight:700;
        }

        @media (max-width: 760px) {
          .expanded-details-summary {
            grid-template-columns: repeat(3, 1fr);
          }

          .expanded-item-card {
            grid-template-columns: 1fr;
          }

          .expanded-item-values {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 420px) {
          .expanded-details-summary {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}