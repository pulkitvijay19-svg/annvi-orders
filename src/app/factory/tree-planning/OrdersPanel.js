"use client";
import { useLanguage } from "../../../context/LanguageContext";

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value, digits = 3) {
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

function getPriorityClass(priority) {
  const value = String(priority || "").toLowerCase();

  if (value === "urgent" || value === "high") {
    return "priority-high";
  }

  if (value === "medium") {
    return "priority-medium";
  }

  return "priority-normal";
}

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (
    value.includes("new") ||
    value.includes("pending")
  ) {
    return "status-new";
  }

  if (
    value.includes("progress") ||
    value.includes("production")
  ) {
    return "status-progress";
  }

  if (
    value.includes("complete") ||
    value.includes("ready")
  ) {
    return "status-complete";
  }

  return "status-default";
}

export default function OrdersPanel({
  orders,
  selectedOrderIds,
  expandedOrderIds,
  orderItemsByOrderId,
  orderRemainingSummary,
  selectedAllocations,
  orderSearch,
  setOrderSearch,
  itemSearch,
  setItemSearch,
  combinedOrderItems,
  selectedOrders,
  kt,
  onToggleOrder,
  onToggleExpanded,
  onToggleItem,
  onSelectAllOrderItems,
  onRemoveAllOrderItems,
  onUpdateQuantity,
}) {

  const { t } = useLanguage();
  const visibleOrders = (orders || []).filter((order) => {
  const status = String(order.status || "")
    .trim()
    .toLowerCase();

  return ![
    "completed",
    "delivered",
    "cancelled",
    "canceled",
    "hold",
  ].includes(status);
});  

  const selectedOrderCount = selectedOrderIds.length;

  const combinedTotalQuantity = combinedOrderItems.reduce(
    (sum, item) =>
      sum + safeNumber(item.remaining_quantity),
    0
  );

  const selectedItemCount = Object.keys(
    selectedAllocations || {}
  ).length;

  const selectedQuantityTotal = Object.values(
    selectedAllocations || {}
  ).reduce(
    (sum, allocation) =>
      sum + safeNumber(allocation.selected_quantity),
    0
  );

  function isItemSelected(itemId) {
    return Boolean(selectedAllocations?.[itemId]);
  }

  return (
    <div className="orders-panel-wrapper">
      {/* =====================================================
          SECTION 1: SELECT / COMBINE ORDERS
      ===================================================== */}

      <section className="tp-card">
        <div className="tp-card-header">
          <div>
            <h2 className="tp-card-title">
            1. {t("select_combine_orders")}
            </h2>

            <p className="tp-card-subtitle">
               {t("select_combine_orders_subtitle")}
               </p>
          </div>

          <div className="count-badge">
            {selectedOrderCount} {t("selected")}
          </div>
        </div>

        <div className="tp-card-body">
          <div className="search-row">
            <div className="search-input-wrap">
              <span className="search-icon">⌕</span>

              <input
                type="text"
                className="tp-input search-input"
                value={orderSearch}
                onChange={(event) =>
                  setOrderSearch(event.target.value)
                }
               placeholder={t("search_order_placeholder")}
              />

              {orderSearch ? (
                <button
                  type="button"
                  className="clear-search-button"
                  onClick={() => setOrderSearch("")}
                  aria-label="Clear order search"
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>

          {selectedOrders.length > 0 ? (
            <div className="combined-orders-summary">
              <div className="combined-summary-heading">
                <div>
                  <strong>
                   {t("combined_orders")}
                  </strong>

                  <small>
                    {t("combined_orders_subtitle")}
                  </small>
                </div>

                <span>
                  {selectedOrders.length} {t("orders")}
                </span>
              </div>

              <div className="selected-order-chips">
                {selectedOrders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    className="selected-order-chip"
                    onClick={() => onToggleOrder(order.id)}
                    title="Remove order"
                  >
                    <span>{order.order_no}</span>
                    <strong>×</strong>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="orders-list">
            {visibleOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">□</div>
               <strong>{t("no_available_orders")}</strong>
                <span>
                  {t("available_orders_hint")}
                </span>
              </div>
            ) : (
              visibleOrders.map((order) => {
                const selected = selectedOrderIds.includes(
                  order.id
                );

                const expanded = expandedOrderIds.includes(
                  order.id
                );

                const items =
                  orderItemsByOrderId[order.id] || [];

                const summary =
                  orderRemainingSummary[order.id] || {
                    totalItems: 0,
                    totalOrdered: 0,
                    totalAllocated: 0,
                    totalRemaining: 0,
                  };

                const selectedItemsForOrder =
                  items.filter((item) =>
                    isItemSelected(item.id)
                  );

                const allAvailableSelected =
                  items.length > 0 &&
                  items
                    .filter(
                      (item) =>
                        safeNumber(
                          item.remaining_quantity
                        ) > 0
                    )
                    .every((item) =>
                      isItemSelected(item.id)
                    );

                return (
                  <article
                    key={order.id}
                    className={`order-card ${
                      selected ? "order-card-selected" : ""
                    }`}
                  >
                    <div className="order-card-main">
                      <label className="order-checkbox-wrap">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            onToggleOrder(order.id)
                          }
                        />

                        <span className="custom-checkbox" />
                      </label>

                      <div className="order-info-button">
                        <div className="order-top-line">
                          <strong>{order.order_no}</strong>

                          {order.priority ? (
                            <span
                              className={`priority-pill ${getPriorityClass(
                                order.priority
                              )}`}
                            >
                              {order.priority}
                            </span>
                          ) : null}

                          <span
                            className={`status-pill ${getStatusClass(
                              order.status
                            )}`}
                          >
                            {order.status || "Unknown"}
                          </span>
                        </div>

                        <div className="order-customer-line">
                          <span>
                            {order.customer_name ||
                              "Unnamed Party"}
                          </span>

                          {order.customer_mobile ? (
                            <>
                              <i>•</i>
                              <span>
                                {order.customer_mobile}
                              </span>
                            </>
                          ) : null}
                        </div>

                        <div className="order-meta-grid">
                          <span>
                           {t("items")}:{" "}
                            <b>{summary.totalItems}</b>
                          </span>

                          <span>
                           {t("ordered")}:{" "}
                            <b>{summary.totalOrdered}</b>
                          </span>

                          <span>
                            {t("allocated")}:{" "}
                            <b>{summary.totalAllocated}</b>
                          </span>

                          <span className="remaining-text">
                           {t("remaining")}:{" "}
                            <b>{summary.totalRemaining}</b>
                          </span>

                          <span>
                            {t("delivery")}:{" "}
                            <b>
                              {formatDate(
                                order.delivery_date
                              )}
                            </b>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="expand-order-button"
                        onClick={() =>
                          onToggleExpanded(order.id)
                        }
                        aria-label={
                          expanded
                            ? "Collapse order"
                            : "Expand order"
                        }
                      >
                        {expanded ? "−" : "+"}
                      </button>
                    </div>

                    {expanded ? (
                      <div className="order-expanded-area">
                        <div className="expanded-actions">
                          <div>
                            <strong>
                            {t("order_items")}
                            </strong>

                            <span>
                              {
                                selectedItemsForOrder.length
                              }{" "}
                              selected
                            </span>
                          </div>

                          <div className="expanded-action-buttons">
                            <button
                              type="button"
                              className="small-action-button select-all-button"
                              onClick={() =>
                                onSelectAllOrderItems(
                                  order.id
                                )
                              }
                              disabled={
                                allAvailableSelected ||
                                summary.totalRemaining <= 0
                              }
                            >
                              {t("select_all_remaining")}
                            </button>

                            <button
                              type="button"
                              className="small-action-button remove-all-button"
                              onClick={() =>
                                onRemoveAllOrderItems(
                                  order.id
                                )
                              }
                              disabled={
                                selectedItemsForOrder.length ===
                                0
                              }
                            >
                             {t("remove_all")}
                            </button>
                          </div>
                        </div>

                        <div className="expanded-items-list">
                          {items.length === 0 ? (
                            <div className="inline-empty">
                              {t("no_items_in_order")}
                            </div>
                          ) : (
                            items.map((item) => {
                              const itemSelected =
                                isItemSelected(item.id);

                              const allocation =
                                selectedAllocations?.[
                                  item.id
                                ];

                              const itemKtMatches =
  !kt ||
  !item.gold_kt ||
  String(item.gold_kt).toLowerCase() ===
    String(kt).toLowerCase();

                              const noRemaining =
                                safeNumber(
                                  item.remaining_quantity
                                ) <= 0 &&
                                !itemSelected;

                              return (
                                <div
                                  key={item.id}
                                  className={`mini-item-row ${
                                    itemSelected
                                      ? "mini-item-selected"
                                      : ""
                                  } ${
                                    !itemKtMatches
                                      ? "mini-item-kt-mismatch"
                                      : ""
                                  }`}
                                >
                                  <label className="mini-checkbox-wrap">
                                    <input
                                      type="checkbox"
                                      checked={itemSelected}
                                      disabled={
                                        noRemaining ||
                                        !itemKtMatches
                                      }
                                      onChange={() =>
                                        onToggleItem(item)
                                      }
                                    />

                                    <span className="custom-checkbox" />
                                  </label>

                                  <div className="mini-item-content">
                                    <div className="mini-item-title">
                                      <strong>
                                        {item.category ||
                                          "Uncategorized"}
                                      </strong>

                                      {item.sample_unique_id ? (
                                        <span>
                                          ID:{" "}
                                          {
                                            item.sample_unique_id
                                          }
                                        </span>
                                      ) : null}

                                      {item.die_no ? (
                                        <span>
                                          Die: {item.die_no}
                                        </span>
                                      ) : null}
                                    </div>

                                    <div className="mini-item-stats">
                                      <span>
                                        KT:{" "}
                                        <b>
                                          {item.gold_kt || "-"}
                                        </b>
                                      </span>

                                      <span>
                                        {t("quantity")}:{" "}
                                        <b>
                                          {safeNumber(
                                            item.order_quantity
                                          )}
                                        </b>
                                      </span>

                                      <span>
                                        {t("used")}:{" "}
                                        <b>
                                          {safeNumber(
                                            item.allocated_quantity
                                          )}
                                        </b>
                                      </span>

                                      <span className="remaining-text">
                                        {t("remaining")}:{" "}
                                        <b>
                                          {safeNumber(
                                            item.remaining_quantity
                                          )}
                                        </b>
                                      </span>

                                      <span>
                                        {t("approx_weight")}:
                                        <b>
                                          {" "}
                                          {formatNumber(
                                            item.approx_weight,
                                            4
                                          )}{" "}
                                          g
                                        </b>
                                      </span>
                                    </div>

                                    {!itemKtMatches ? (
                                      <div className="kt-warning">
                                        This item is{" "}
                                        {item.gold_kt}. Current
                                        Tree KT is {kt}.
                                      </div>
                                    ) : null}

                                    {noRemaining ? (
                                      <div className="fully-allocated-note">
                                        Fully allocated to other
                                        trees.
                                      </div>
                                    ) : null}
                                  </div>

                                  {itemSelected ? (
                                    <div className="mini-qty-field">
                                      <label>
                                        {t("tree_qty")}
                                      </label>

                                      <input
                                        type="number"
                                        min="0"
                                        max={
                                          item.remaining_quantity
                                        }
                                        step="1"
                                        value={
                                          allocation?.selected_quantity ??
                                          ""
                                        }
                                        onChange={(event) =>
                                          onUpdateQuantity(
                                            item.id,
                                            event.target.value
                                          )
                                        }
                                      />

                                      <small>
                                       {t("maximum")}{" "}
                                        {
                                          item.remaining_quantity
                                        }
                                      </small>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 2: COMBINED ITEM POOL
      ===================================================== */}

      <section className="tp-card">
        <div className="tp-card-header">
          <div>
            <h2 className="tp-card-title">
            2. {t("combined_item_pool")} 
            </h2>

            <p className="tp-card-subtitle">
              {t("combined_item_pool_subtitle")}
            </p>
          </div>

          <div className="combined-header-counters">
            <span>
              {selectedItemCount} Items
            </span>
            <span>
              Qty {selectedQuantityTotal}
            </span>
          </div>
        </div>

        <div className="tp-card-body">
          {selectedOrderCount === 0 ? (
            <div className="empty-state large-empty-state">
              <div className="empty-state-icon">⇄</div>
              <strong>{t("select_orders_first_tree")}</strong>
              <span>
                {t("combine_orders_hint")}
              </span>
            </div>
          ) : (
            <>
              <div className="combined-pool-toolbar">
                <div className="search-input-wrap">
                  <span className="search-icon">⌕</span>

                  <input
                    type="text"
                    className="tp-input search-input"
                    value={itemSearch}
                    onChange={(event) =>
                      setItemSearch(event.target.value)
                    }
                    placeholder={t("search_item_placeholder")}
                  />

                  {itemSearch ? (
                    <button
                      type="button"
                      className="clear-search-button"
                      onClick={() => setItemSearch("")}
                      aria-label="Clear item search"
                    >
                      ×
                    </button>
                  ) : null}
                </div>

                <div className="pool-summary">
                  <span>
                    Orders{" "}
                    <b>{selectedOrderCount}</b>
                  </span>

                  <span>
                    Available Qty{" "}
                    <b>{combinedTotalQuantity}</b>
                  </span>
                </div>
              </div>

              <div className="combined-items-table-wrap">
                <table className="combined-items-table">
                  <thead>
                    <tr>
                      <th className="checkbox-column" />
                      <th>{t("order_no")}</th>
<th>{t("party")}</th>
<th>{t("item")}</th>
<th>KT</th>
<th>{t("ordered")}</th>
<th>{t("allocated")}</th>
<th>{t("remaining")}</th>
<th>{t("approx_wt")}</th>
<th>{t("tree_qty")}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {combinedOrderItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="table-empty-cell"
                        >
                          No available items found for selected
                          orders.
                        </td>
                      </tr>
                    ) : (
                      combinedOrderItems.map((item) => {
                        const selected =
                          isItemSelected(item.id);

                        const allocation =
                          selectedAllocations?.[
                            item.id
                          ];

                        const itemKtMatches =
  !kt ||
  !item.gold_kt ||
  String(item.gold_kt).toLowerCase() ===
    String(kt).toLowerCase();

                        const disabled =
                          safeNumber(
                            item.remaining_quantity
                          ) <= 0 ||
                          !itemKtMatches;

                        return (
                          <tr
                            key={item.id}
                            className={
                              selected
                                ? "selected-table-row"
                                : ""
                            }
                          >
                            <td className="checkbox-column">
                              <label className="table-checkbox-wrap">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={
                                    disabled && !selected
                                  }
                                  onChange={() =>
                                    onToggleItem(item)
                                  }
                                />

                                <span className="custom-checkbox" />
                              </label>
                            </td>

                            <td>
                              <strong className="order-number-cell">
                                {item.order?.order_no ||
                                  "-"}
                              </strong>
                            </td>

                            <td>
                              <span className="party-cell">
                                {item.order
                                  ?.customer_name || "-"}
                              </span>
                            </td>

                            <td>
                              <div className="item-name-cell">
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
                            </td>

                            <td>
                              <span
                                className={`kt-pill ${
                                  itemKtMatches
                                    ? "kt-match"
                                    : "kt-mismatch"
                                }`}
                              >
                                {item.gold_kt || "-"}
                              </span>
                            </td>

                            <td>
                              {safeNumber(
                                item.order_quantity
                              )}
                            </td>

                            <td>
                              {safeNumber(
                                item.allocated_quantity
                              )}
                            </td>

                            <td>
                              <strong className="remaining-number">
                                {safeNumber(
                                  item.remaining_quantity
                                )}
                              </strong>
                            </td>

                            <td>
                              {formatNumber(
                                item.approx_weight,
                                4
                              )}{" "}
                              g
                            </td>

                            <td>
                              {selected ? (
                                <div className="table-qty-editor">
                                  <input
                                    type="number"
                                    min="0"
                                    max={
                                      item.remaining_quantity
                                    }
                                    step="1"
                                    value={
                                      allocation?.selected_quantity ??
                                      ""
                                    }
                                    onChange={(event) =>
                                      onUpdateQuantity(
                                        item.id,
                                        event.target.value
                                      )
                                    }
                                  />

                                  <span>
                                    /{" "}
                                    {
                                      item.remaining_quantity
                                    }
                                  </span>
                                </div>
                              ) : !itemKtMatches ? (
                                <small className="table-warning">
                                  KT mismatch
                                </small>
                              ) : (
                                <button
                                  type="button"
                                  className="add-item-button"
                                  onClick={() =>
                                    onToggleItem(item)
                                  }
                                  disabled={disabled}
                                >
                                  + Add
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mobile-combined-items">
                {combinedOrderItems.length === 0 ? (
                  <div className="inline-empty">
                    No available items found.
                  </div>
                ) : (
                  combinedOrderItems.map((item) => {
                    const selected =
                      isItemSelected(item.id);

                    const allocation =
                      selectedAllocations?.[item.id];

                    const itemKtMatches =
  !kt ||
  !item.gold_kt ||
  String(item.gold_kt).toLowerCase() ===
    String(kt).toLowerCase();

                    const disabled =
                      safeNumber(
                        item.remaining_quantity
                      ) <= 0 || !itemKtMatches;

                    return (
                      <div
                        key={item.id}
                        className={`mobile-item-card ${
                          selected
                            ? "mobile-item-card-selected"
                            : ""
                        }`}
                      >
                        <div className="mobile-item-card-top">
                          <label className="table-checkbox-wrap">
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={
                                disabled && !selected
                              }
                              onChange={() =>
                                onToggleItem(item)
                              }
                            />

                            <span className="custom-checkbox" />
                          </label>

                          <div className="mobile-item-main">
                            <strong>
                              {item.category ||
                                "Uncategorized"}
                            </strong>

                            <span>
                              {item.order?.order_no || "-"} •{" "}
                              {item.order?.customer_name ||
                                "-"}
                            </span>
                          </div>

                          <span
                            className={`kt-pill ${
                              itemKtMatches
                                ? "kt-match"
                                : "kt-mismatch"
                            }`}
                          >
                            {item.gold_kt || "-"}
                          </span>
                        </div>

                        <div className="mobile-item-details">
                          <span>
                            Sample
                            <b>
                              {item.sample_unique_id ||
                                "-"}
                            </b>
                          </span>

                          <span>
                            Die
                            <b>{item.die_no || "-"}</b>
                          </span>

                          <span>
                            Ordered
                            <b>
                              {safeNumber(
                                item.order_quantity
                              )}
                            </b>
                          </span>

                          <span>
                            Used
                            <b>
                              {safeNumber(
                                item.allocated_quantity
                              )}
                            </b>
                          </span>

                          <span>
                            Remaining
                            <b className="remaining-number">
                              {safeNumber(
                                item.remaining_quantity
                              )}
                            </b>
                          </span>

                          <span>
                            Approx
                            <b>
                              {formatNumber(
                                item.approx_weight,
                                4
                              )}{" "}
                              g
                            </b>
                          </span>
                        </div>

                        {selected ? (
                          <div className="mobile-qty-editor">
                            <label>
                              Quantity for this tree
                            </label>

                            <div>
                              <input
                                type="number"
                                min="0"
                                max={
                                  item.remaining_quantity
                                }
                                step="1"
                                value={
                                  allocation?.selected_quantity ??
                                  ""
                                }
                                onChange={(event) =>
                                  onUpdateQuantity(
                                    item.id,
                                    event.target.value
                                  )
                                }
                              />

                              <span>
                                Max{" "}
                                {
                                  item.remaining_quantity
                                }
                              </span>
                            </div>
                          </div>
                        ) : !itemKtMatches ? (
                          <div className="mobile-kt-warning">
                            This item cannot be added because its KT
                            does not match the current tree.
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <style jsx global>{`
        .orders-panel-wrapper {
          min-width: 0;
        }

        .count-badge {
          flex: 0 0 auto;
          padding: 7px 11px;
          border-radius: 999px;
          background: #0f172a;
          color: #ffffff;
          font-size: 12px;
          font-weight: 900;
        }

        .search-row {
          margin-bottom: 13px;
        }

        .search-input-wrap {
          position: relative;
          width: 100%;
        }

        .search-input {
          padding-left: 38px;
          padding-right: 38px;
        }

        .search-icon {
          position: absolute;
          top: 50%;
          left: 13px;
          z-index: 2;
          transform: translateY(-50%);
          color: #64748b;
          font-size: 20px;
          line-height: 1;
          pointer-events: none;
        }

        .clear-search-button {
          position: absolute;
          top: 50%;
          right: 9px;
          width: 27px;
          height: 27px;
          border: 0;
          border-radius: 50%;
          transform: translateY(-50%);
          background: #e2e8f0;
          color: #334155;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        }

        .combined-orders-summary {
          margin-bottom: 14px;
          padding: 12px;
          border: 1px solid #bfdbfe;
          border-radius: 13px;
          background: #eff6ff;
        }

        .combined-summary-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .combined-summary-heading strong {
          display: block;
          color: #1e3a8a;
          font-size: 13px;
        }

        .combined-summary-heading small {
          display: block;
          margin-top: 3px;
          color: #475569;
          font-size: 11px;
        }

        .combined-summary-heading > span {
          flex: 0 0 auto;
          padding: 5px 9px;
          border-radius: 999px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 11px;
          font-weight: 900;
        }

        .selected-order-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 10px;
        }

        .selected-order-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 30px;
          padding: 5px 9px;
          border: 1px solid #93c5fd;
          border-radius: 8px;
          background: #ffffff;
          color: #1e3a8a;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
        }

        .selected-order-chip strong {
          color: #dc2626;
          font-size: 15px;
          line-height: 1;
        }

        .orders-list {
          display: grid;
          gap: 10px;
          max-height: 660px;
          overflow-y: auto;
          padding-right: 3px;
        }

        .orders-list::-webkit-scrollbar {
          width: 6px;
        }

        .orders-list::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: #cbd5e1;
        }

        .order-card {
          overflow: hidden;
          border: 1px solid #dbe2ea;
          border-radius: 13px;
          background: #ffffff;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .order-card:hover {
          border-color: #94a3b8;
          box-shadow: 0 5px 14px rgba(15, 23, 42, 0.06);
        }

        .order-card-selected {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }

        .order-card-main {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          padding: 12px;
        }

        .order-checkbox-wrap,
        .mini-checkbox-wrap,
        .table-checkbox-wrap {
          position: relative;
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          width: 21px;
          height: 21px;
          cursor: pointer;
        }

        .order-checkbox-wrap input,
        .mini-checkbox-wrap input,
        .table-checkbox-wrap input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .custom-checkbox {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 19px;
          height: 19px;
          border: 1.5px solid #94a3b8;
          border-radius: 5px;
          background: #ffffff;
          transition: 0.15s ease;
        }

        input:checked + .custom-checkbox {
          border-color: #0f172a;
          background: #0f172a;
        }

        input:checked + .custom-checkbox::after {
          content: "✓";
          color: #ffffff;
          font-size: 13px;
          font-weight: 900;
        }

        input:disabled + .custom-checkbox {
          cursor: not-allowed;
          border-color: #cbd5e1;
          background: #e2e8f0;
        }

        .order-info-button {
          min-width: 0;
          padding: 0;
          border: 0;
          background: transparent;
          text-align: left;
          cursor: pointer;
        }

        .order-top-line {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }

        .order-top-line > strong {
          color: #0f172a;
          font-size: 13px;
          font-weight: 900;
        }

        .priority-pill,
        .status-pill {
          display: inline-flex;
          align-items: center;
          min-height: 21px;
          padding: 3px 7px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .priority-high {
          background: #fee2e2;
          color: #b91c1c;
        }

        .priority-medium {
          background: #fef3c7;
          color: #92400e;
        }

        .priority-normal {
          background: #e2e8f0;
          color: #475569;
        }

        .status-new {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .status-progress {
          background: #fef3c7;
          color: #92400e;
        }

        .status-complete {
          background: #dcfce7;
          color: #15803d;
        }

        .status-default {
          background: #e2e8f0;
          color: #475569;
        }

        .order-customer-line {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 4px;
          color: #475569;
          font-size: 11px;
        }

        .order-customer-line i {
          color: #cbd5e1;
          font-style: normal;
        }

        .order-meta-grid {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 5px 12px;
          margin-top: 7px;
          color: #64748b;
          font-size: 10px;
        }

        .order-meta-grid b {
          color: #334155;
        }

        .remaining-text,
        .remaining-number {
          color: #15803d !important;
        }

        .expand-order-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 31px;
          height: 31px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          background: #f8fafc;
          color: #0f172a;
          cursor: pointer;
          font-size: 19px;
          font-weight: 700;
        }

        .order-expanded-area {
          padding: 12px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .expanded-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }

        .expanded-actions strong {
          display: block;
          font-size: 12px;
        }

        .expanded-actions span {
          display: block;
          margin-top: 2px;
          color: #64748b;
          font-size: 10px;
        }

        .expanded-action-buttons {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 6px;
        }

        .small-action-button {
          min-height: 30px;
          padding: 5px 9px;
          border: 0;
          border-radius: 8px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 900;
        }

        .small-action-button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .select-all-button {
          background: #0f172a;
          color: #ffffff;
        }

        .remove-all-button {
          background: #fee2e2;
          color: #b91c1c;
        }

        .expanded-items-list {
          display: grid;
          gap: 7px;
        }

        .mini-item-row {
          display: grid;
          grid-template-columns:
            auto
            minmax(0, 1fr)
            minmax(80px, 110px);
          align-items: center;
          gap: 9px;
          padding: 9px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #ffffff;
        }

        .mini-item-selected {
          border-color: #93c5fd;
          background: #eff6ff;
        }

        .mini-item-kt-mismatch {
          border-color: #fecaca;
          background: #fff7f7;
        }

        .mini-item-content {
          min-width: 0;
        }

        .mini-item-title {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 5px;
        }

        .mini-item-title strong {
          font-size: 11px;
        }

        .mini-item-title span {
          padding: 2px 5px;
          border-radius: 5px;
          background: #e2e8f0;
          color: #475569;
          font-size: 8px;
          font-weight: 800;
        }

        .mini-item-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 9px;
          margin-top: 5px;
          color: #64748b;
          font-size: 9px;
        }

        .mini-item-stats b {
          color: #334155;
        }

        .mini-qty-field label {
          display: block;
          margin-bottom: 4px;
          color: #475569;
          font-size: 8px;
          font-weight: 800;
        }

        .mini-qty-field input {
          width: 100%;
          height: 34px;
          padding: 5px 8px;
          border: 1px solid #94a3b8;
          border-radius: 8px;
          outline: none;
          background: #ffffff;
          font-size: 12px;
          font-weight: 800;
        }

        .mini-qty-field small {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 8px;
        }

        .kt-warning,
        .fully-allocated-note {
          margin-top: 5px;
          font-size: 9px;
          font-weight: 800;
        }

        .kt-warning {
          color: #b91c1c;
        }

        .fully-allocated-note {
          color: #92400e;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 150px;
          padding: 22px;
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          background: #f8fafc;
          text-align: center;
        }

        .large-empty-state {
          min-height: 230px;
        }

        .empty-state-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          margin-bottom: 9px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #334155;
          font-size: 23px;
        }

        .empty-state strong {
          color: #334155;
          font-size: 13px;
        }

        .empty-state span {
          margin-top: 5px;
          color: #64748b;
          font-size: 11px;
        }

        .inline-empty {
          padding: 13px;
          border: 1px dashed #cbd5e1;
          border-radius: 9px;
          color: #64748b;
          text-align: center;
          font-size: 11px;
        }

        .combined-header-counters {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 6px;
        }

        .combined-header-counters span {
          padding: 6px 9px;
          border-radius: 999px;
          background: #e2e8f0;
          color: #334155;
          font-size: 10px;
          font-weight: 900;
        }

        .combined-pool-toolbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .pool-summary {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 6px;
        }

        .pool-summary span {
          padding: 8px 10px;
          border-radius: 9px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 10px;
        }

        .pool-summary b {
          margin-left: 3px;
          color: #0f172a;
        }

        .combined-items-table-wrap {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }

        .combined-items-table {
          width: 100%;
          min-width: 950px;
          border-collapse: collapse;
        }

        .combined-items-table th {
          padding: 10px 9px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          text-align: left;
          white-space: nowrap;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .combined-items-table td {
          padding: 9px;
          border-bottom: 1px solid #edf2f7;
          color: #334155;
          vertical-align: middle;
          font-size: 10px;
        }

        .combined-items-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .combined-items-table tbody tr:hover {
          background: #f8fafc;
        }

        .selected-table-row {
          background: #eff6ff !important;
        }

        .checkbox-column {
          width: 40px;
          text-align: center !important;
        }

        .order-number-cell {
          white-space: nowrap;
          color: #0f172a;
          font-size: 10px;
        }

        .party-cell {
          display: block;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-name-cell strong {
          display: block;
          color: #0f172a;
          font-size: 10px;
        }

        .item-name-cell small {
          display: block;
          margin-top: 3px;
          color: #64748b;
          white-space: nowrap;
          font-size: 8px;
        }

        .kt-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 7px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 900;
        }

        .kt-match {
          background: #dcfce7;
          color: #15803d;
        }

        .kt-mismatch {
          background: #fee2e2;
          color: #b91c1c;
        }

        .table-qty-editor {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .table-qty-editor input {
          width: 64px;
          height: 33px;
          padding: 5px 7px;
          border: 1px solid #94a3b8;
          border-radius: 7px;
          outline: none;
          background: #ffffff;
          font-size: 11px;
          font-weight: 800;
        }

        .table-qty-editor span {
          color: #64748b;
          white-space: nowrap;
          font-size: 9px;
        }

        .add-item-button {
          min-height: 31px;
          padding: 5px 9px;
          border: 0;
          border-radius: 7px;
          background: #0f172a;
          color: #ffffff;
          cursor: pointer;
          font-size: 9px;
          font-weight: 900;
        }

        .add-item-button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .table-warning {
          color: #b91c1c;
          font-size: 8px;
          font-weight: 800;
        }

        .table-empty-cell {
          padding: 30px !important;
          color: #64748b !important;
          text-align: center !important;
        }

        .mobile-combined-items {
          display: none;
        }

        @media (max-width: 760px) {
          .orders-list {
            max-height: none;
            overflow: visible;
          }

          .combined-pool-toolbar {
            grid-template-columns: 1fr;
          }

          .pool-summary {
            justify-content: flex-start;
          }

          .combined-items-table-wrap {
            display: none;
          }

          .mobile-combined-items {
            display: grid;
            gap: 9px;
          }

          .mobile-item-card {
            padding: 11px;
            border: 1px solid #e2e8f0;
            border-radius: 11px;
            background: #ffffff;
          }

          .mobile-item-card-selected {
            border-color: #60a5fa;
            background: #eff6ff;
          }

          .mobile-item-card-top {
            display: grid;
            grid-template-columns:
              auto
              minmax(0, 1fr)
              auto;
            align-items: center;
            gap: 9px;
          }

          .mobile-item-main {
            min-width: 0;
          }

          .mobile-item-main strong {
            display: block;
            color: #0f172a;
            font-size: 12px;
          }

          .mobile-item-main span {
            display: block;
            margin-top: 3px;
            overflow: hidden;
            color: #64748b;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 9px;
          }

          .mobile-item-details {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 7px;
            margin-top: 11px;
          }

          .mobile-item-details span {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
            padding: 6px;
            border-radius: 7px;
            background: #f8fafc;
            color: #64748b;
            font-size: 8px;
          }

          .mobile-item-details b {
            overflow: hidden;
            color: #334155;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 9px;
          }

          .mobile-qty-editor {
            margin-top: 10px;
            padding-top: 9px;
            border-top: 1px solid #bfdbfe;
          }

          .mobile-qty-editor label {
            display: block;
            margin-bottom: 5px;
            color: #475569;
            font-size: 9px;
            font-weight: 800;
          }

          .mobile-qty-editor > div {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .mobile-qty-editor input {
            width: 100px;
            height: 38px;
            padding: 6px 9px;
            border: 1px solid #94a3b8;
            border-radius: 8px;
            outline: none;
            font-size: 12px;
            font-weight: 800;
          }

          .mobile-qty-editor span {
            color: #64748b;
            font-size: 9px;
          }

          .mobile-kt-warning {
            margin-top: 9px;
            padding: 7px;
            border-radius: 7px;
            background: #fee2e2;
            color: #b91c1c;
            font-size: 9px;
            font-weight: 800;
          }
        }

        @media (max-width: 560px) {
          .combined-summary-heading {
            flex-direction: column;
          }

          .order-card-main {
            grid-template-columns:
              auto
              minmax(0, 1fr)
              auto;
            padding: 10px;
          }

          .order-meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .expanded-actions {
            align-items: flex-start;
            flex-direction: column;
          }

          .expanded-action-buttons {
            width: 100%;
            justify-content: flex-start;
          }

          .mini-item-row {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .mini-qty-field {
            grid-column: 2;
          }

          .mini-item-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .combined-header-counters {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}