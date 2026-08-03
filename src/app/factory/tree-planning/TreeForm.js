"use client";
import { useLanguage } from "../../../context/LanguageContext";

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value, digits = 4) {
  return safeNumber(value).toFixed(digits);
}

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "draft") return "status-draft";
  if (value === "planned") return "status-planned";
  if (value === "burnout") return "status-burnout";
  if (value === "ready for casting") return "status-ready";
  if (value === "casting") return "status-casting";
  if (value === "completed") return "status-completed";

  return "status-default";
}

export default function TreeForm({
  editingTreeId,
  treeNo,
  setTreeNo,
  flaskNo,
  setFlaskNo,
  kt,
  setKt,
  ktOptions,
  treeWeight,
  setTreeWeight,
  treeDate,
  setTreeDate,
  burnoutDate,
  setBurnoutDate,
  treeStatus,
  setTreeStatus,
  treeStatuses,
  remarks,
  setRemarks,
  selectedTreeItems,
  selectedTotals,
  selectedOrders,
  saving,
  onUpdateQuantity,
  onUpdateGoldWeight,
  onRemoveItem,
  onUseApproximateWeight,
  onSaveDraft,
  onSavePlanned,
  onCancelEdit,
  onReset,
}) {

  const { t } = useLanguage();

  const actualGoldWeight = selectedTreeItems.reduce(
    (sum, item) => sum + safeNumber(item.gold_weight),
    0
  );

  const selectedApproxWeight = selectedTreeItems.reduce(
    (sum, item) =>
      sum +
      safeNumber(item.selected_quantity) *
        safeNumber(item.approx_weight),
    0
  );

  const totalSelectedQty = selectedTreeItems.reduce(
    (sum, item) => sum + safeNumber(item.selected_quantity),
    0
  );

  const canSave = selectedTreeItems.length > 0 && !saving;

  return (
    <aside className="tree-form-column">
      <section className="tp-card">
        <div className="tp-card-header">
          <div>
            <h2 className="tp-card-title">
              3. Tree Details /{" "}
              <span className="bn">ট্রি ডিটেইলস</span>
            </h2>

            <p className="tp-card-subtitle">
             {editingTreeId
  ? t("update_tree_subtitle")
  : t("tree_details_subtitle")}
            </p>
          </div>

          {editingTreeId ? (
            <span className="edit-badge">{t("editing")}</span>
          ) : (
           <span className="new-badge">{t("new_tree")}</span>
          )}
        </div>

        <div className="tp-card-body">
          {selectedOrders.length > 0 ? (
            <div className="selected-orders-box">
              <div className="selected-orders-box-header">
                <div>
                  <strong>
                   {t("orders_in_tree")}
                  </strong>

                  <small>
                   {t("orders_in_tree")}
                  </small>
                </div>

                <span>{selectedOrders.length}</span>
              </div>

              <div className="tree-order-chips">
                {selectedOrders.map((order) => (
                  <span key={order.id}>
                    {order.order_no}
                    <small>
                      {order.customer_name
                        ? ` • ${order.customer_name}`
                        : ""}
                    </small>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="form-grid two-column-grid">
            <div className="form-field">
              <label className="tp-label">
                {t("tree_no")}
              </label>

              <input
                type="text"
                className="tp-input"
                value={treeNo}
                onChange={(event) =>
                  setTreeNo(event.target.value)
                }
                placeholder="TR-26-000001"
              />
            </div>

            <div className="form-field">
              <label className="tp-label">
                {t("flask_no")}
              </label>

              <input
                type="text"
                className="tp-input"
                value={flaskNo}
                onChange={(event) =>
                  setFlaskNo(event.target.value)
                }
                placeholder="Optional"
              />
            </div>

            <div className="form-field">
              <label className="tp-label">
                {t("tree_kt")}
              </label>

              <select
                className="tp-select"
                value={kt}
                onChange={(event) => setKt(event.target.value)}
              >
                {ktOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="tp-label">
                {t("tree_kt")}
              </label>

              <div className="weight-input-row">
                <input
                  type="number"
                  className="tp-input"
                  value={treeWeight}
                  min="0"
                  step="0.0001"
                  onChange={(event) =>
                    setTreeWeight(event.target.value)
                  }
                  placeholder="0.0000"
                />

                <button
                  type="button"
                  className="weight-fill-button"
                  onClick={onUseApproximateWeight}
                  disabled={selectedTreeItems.length === 0}
                  title="Use selected item approximate weight"
                >
                 {t("use_approx")}
                </button>
              </div>
            </div>

            <div className="form-field">
              <label className="tp-label">
               {t("tree_date")}
              </label>

              <input
                type="date"
                className="tp-input"
                value={treeDate}
                onChange={(event) =>
                  setTreeDate(event.target.value)
                }
              />
            </div>

            <div className="form-field">
              <label className="tp-label">
                {t("burnout_date")}
              </label>

              <input
                type="date"
                className="tp-input"
                value={burnoutDate}
                onChange={(event) =>
                  setBurnoutDate(event.target.value)
                }
              />
            </div>

            <div className="form-field full-width-field">
              <label className="tp-label">
                {t("status")}
              </label>

              <select
                className={`tp-select tree-status-select ${getStatusClass(
                  treeStatus
                )}`}
                value={treeStatus}
                onChange={(event) =>
                  setTreeStatus(event.target.value)
                }
              >
                {treeStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field full-width-field">
              <label className="tp-label">
                {t("remarks")}
              </label>

              <textarea
                className="tp-textarea"
                value={remarks}
                onChange={(event) =>
                  setRemarks(event.target.value)
                }
                placeholder={t("tree_remarks_placeholder")}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="tp-card">
        <div className="tp-card-header">
          <div>
            <h2 className="tp-card-title">
              4. {t("selected_tree_items")}
               </h2>

            <p className="tp-card-subtitle">
             {t("selected_tree_items_subtitle")}
            </p>
          </div>

          <div className="selected-count-badge">
           {selectedTreeItems.length} {t("items")}
          </div>
        </div>

        <div className="tp-card-body">
          {selectedTreeItems.length === 0 ? (
            <div className="tree-form-empty">
              <div>＋</div>
              <strong>{t("no_items_selected")}</strong>
              <span>
               {t("select_items_left")}
              </span>
            </div>
          ) : (
            <div className="selected-tree-items-list">
              {selectedTreeItems.map((item, index) => {
                const itemApproxTotal =
                  safeNumber(item.selected_quantity) *
                  safeNumber(item.approx_weight);

                return (
                  <article
                    key={item.id}
                    className="selected-tree-item-card"
                  >
                    <div className="selected-tree-item-header">
                      <div className="item-sequence">
                        {index + 1}
                      </div>

                      <div className="selected-item-heading">
                        <strong>
                          {item.category || "Uncategorized"}
                        </strong>

                        <span>
                          {item.order?.order_no || "-"}
                          {item.order?.customer_name
                            ? ` • ${item.order.customer_name}`
                            : ""}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="remove-selected-item-button"
                        onClick={() => onRemoveItem(item)}
                        aria-label="Remove item"
                      >
                        ×
                      </button>
                    </div>

                    <div className="selected-item-identifiers">
                      <span>
                        {t("sample")}:
                        <b>{item.sample_unique_id || "-"}</b>
                      </span>

                      <span>
                       {t("sample")}:
                        <b>{item.die_no || "-"}</b>
                      </span>

                      <span>
                        KT:
                        <b>{item.gold_kt || "-"}</b>
                      </span>

                      <span>
                        {t("remaining")}:
                        <b>{item.remaining_quantity}</b>
                      </span>
                    </div>

                    <div className="selected-item-input-grid">
                      <div>
                        <label>{t("selected_qty")}</label>

                        <input
                          type="number"
                          min="0"
                          max={item.remaining_quantity}
                          step="1"
                          value={item.selected_quantity}
                          onChange={(event) =>
                            onUpdateQuantity(
                              item.id,
                              event.target.value
                            )
                          }
                        />

                        <small>
                         {t("maximum")} {item.remaining_quantity}
                        </small>
                      </div>

                      <div>
                        <label>{t("approx_weight_each")}</label>

                        <div className="readonly-value">
                          {formatNumber(item.approx_weight)} g
                        </div>

                        <small>{t("from_order_item")}</small>
                      </div>

                      <div>
                       <label>{t("approx_total_weight")}</label>

                        <div className="readonly-value">
                          {formatNumber(itemApproxTotal)} g
                        </div>

                        <small>{t("qty_approx_formula")}</small>
                      </div>

                     
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="tp-card">
        <div className="tp-card-header">
          <div>
            <h2 className="tp-card-title">
               5. {t("tree_summary")}
            </h2>

            <p className="tp-card-subtitle">
              {t("tree_summary_subtitle")}
            </p>
          </div>
        </div>

        <div className="tp-card-body">
          <div className="tree-summary-grid">
            <div className="summary-box">
              <span>{t("orders")}</span>
              <strong>{selectedTotals.orderIds.length}</strong>
            </div>

            <div className="summary-box">
              <span>{t("item_lines")}</span>
              <strong>{selectedTreeItems.length}</strong>
            </div>

            <div className="summary-box">
              <span>{t("total_quantity")}</span>
              <strong>{totalSelectedQty}</strong>
            </div>

            <div className="summary-box">
              <span>{t("approx_weight")}</span>
              <strong>
                {formatNumber(selectedApproxWeight)} g
              </strong>
            </div>

            
            <div className="summary-box tree-weight-summary-box">
              <span>{t("tree_weight")}</span>
              <strong>
                {formatNumber(treeWeight)} g
              </strong>
            </div>
          </div>

         

          <div className="tree-action-buttons">
            <button
              type="button"
              className="tp-button tp-button-light reset-button"
              onClick={() => onReset()}
              disabled={saving}
            > {t("reset")}
             
            </button>

            {editingTreeId ? (
              <button
                type="button"
                className="tp-button tp-button-red cancel-button"
                onClick={onCancelEdit}
                disabled={saving}
              >
                Cancel Edit
              </button>
            ) : null}

            <button
              type="button"
              className="tp-button tp-button-amber"
              onClick={onSaveDraft}
              disabled={!canSave}
            >
              {saving
                ? "Saving..."
                : editingTreeId
                  ? "Update Draft"
                  : "Save Draft"}
            </button>

            <button
              type="button"
              className="tp-button tp-button-green main-save-button"
              onClick={onSavePlanned}
              disabled={!canSave}
            >
              {saving
                ? "Saving Tree..."
                : editingTreeId
                  ? t("update_tree")
                  : t("save_as_planned")}
            </button>
          </div>
        </div>
      </section>

      <style jsx global>{`
        .tree-form-column {
          min-width: 0;
        }

      .sticky-tree-form {
  position: static;
  top: auto;
  z-index: auto;
}

        .edit-badge,
        .new-badge,
        .selected-count-badge {
          flex: 0 0 auto;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
        }

        .edit-badge {
          background: #fef3c7;
          color: #92400e;
        }

        .new-badge {
          background: #dcfce7;
          color: #15803d;
        }

        .selected-count-badge {
          background: #0f172a;
          color: #ffffff;
        }

        .selected-orders-box {
          margin-bottom: 15px;
          padding: 11px;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          background: #eff6ff;
        }

        .selected-orders-box-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .selected-orders-box-header strong {
          display: block;
          color: #1e3a8a;
          font-size: 11px;
        }

        .selected-orders-box-header small {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 9px;
        }

        .selected-orders-box-header > span {
          padding: 4px 8px;
          border-radius: 999px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 9px;
          font-weight: 900;
        }

        .tree-order-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 9px;
        }

        .tree-order-chips > span {
          padding: 5px 7px;
          border: 1px solid #93c5fd;
          border-radius: 7px;
          background: #ffffff;
          color: #1e3a8a;
          font-size: 9px;
          font-weight: 900;
        }

        .tree-order-chips small {
          color: #64748b;
          font-size: 8px;
          font-weight: 700;
        }

        .form-grid {
          display: grid;
          gap: 12px;
        }

        .two-column-grid {
          grid-template-columns: 1fr 1fr;
        }

        .full-width-field {
          grid-column: 1 / -1;
        }

        .weight-input-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 6px;
        }

        .weight-fill-button {
          padding: 0 9px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background: #f8fafc;
          color: #334155;
          cursor: pointer;
          font-size: 9px;
          font-weight: 900;
        }

        .weight-fill-button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .tree-status-select {
          font-weight: 900;
        }

        .status-draft {
          background: #f1f5f9;
          color: #475569;
        }

        .status-planned {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .status-burnout {
          background: #fff7ed;
          color: #c2410c;
        }

        .status-ready {
          background: #f0fdf4;
          color: #15803d;
        }

        .status-casting {
          background: #faf5ff;
          color: #7e22ce;
        }

        .status-completed {
          background: #ecfdf5;
          color: #047857;
        }

        .status-default {
          background: #ffffff;
          color: #0f172a;
        }

        .tree-form-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 185px;
          padding: 20px;
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          background: #f8fafc;
          text-align: center;
        }

        .tree-form-empty > div {
          display: grid;
          width: 43px;
          height: 43px;
          margin-bottom: 8px;
          border-radius: 50%;
          place-items: center;
          background: #e2e8f0;
          color: #475569;
          font-size: 24px;
        }

        .tree-form-empty strong {
          color: #334155;
          font-size: 12px;
        }

        .tree-form-empty span {
          margin-top: 4px;
          color: #64748b;
          font-size: 10px;
        }

        .selected-tree-items-list {
          display: grid;
          gap: 10px;
          max-height: 600px;
          overflow-y: auto;
          padding-right: 3px;
        }

        .selected-tree-items-list::-webkit-scrollbar {
          width: 5px;
        }

        .selected-tree-items-list::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: #cbd5e1;
        }

        .selected-tree-item-card {
          padding: 11px;
          border: 1px solid #dbe2ea;
          border-radius: 12px;
          background: #ffffff;
        }

        .selected-tree-item-header {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 9px;
        }

        .item-sequence {
          display: grid;
          width: 27px;
          height: 27px;
          border-radius: 8px;
          place-items: center;
          background: #0f172a;
          color: #ffffff;
          font-size: 10px;
          font-weight: 900;
        }

        .selected-item-heading {
          min-width: 0;
        }

        .selected-item-heading strong {
          display: block;
          color: #0f172a;
          font-size: 11px;
        }

        .selected-item-heading span {
          display: block;
          margin-top: 2px;
          overflow: hidden;
          color: #64748b;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 9px;
        }

        .remove-selected-item-button {
          display: grid;
          width: 27px;
          height: 27px;
          border: 0;
          border-radius: 8px;
          place-items: center;
          background: #fee2e2;
          color: #b91c1c;
          cursor: pointer;
          font-size: 17px;
          font-weight: 900;
        }

        .selected-item-identifiers {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 9px;
        }

        .selected-item-identifiers span {
          padding: 4px 6px;
          border-radius: 6px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 8px;
        }

        .selected-item-identifiers b {
          margin-left: 3px;
          color: #334155;
        }

        .selected-item-input-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 9px;
          margin-top: 10px;
        }

        .selected-item-input-grid label {
          display: block;
          margin-bottom: 4px;
          color: #475569;
          font-size: 8px;
          font-weight: 900;
        }

        .selected-item-input-grid input,
        .readonly-value {
          width: 100%;
          min-height: 37px;
          padding: 8px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          color: #0f172a;
          font-size: 10px;
          font-weight: 800;
        }

        .readonly-value {
          display: flex;
          align-items: center;
          background: #f8fafc;
        }

        .selected-item-input-grid small {
          display: block;
          margin-top: 3px;
          color: #94a3b8;
          font-size: 7px;
        }

        .tree-summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .summary-box {
          min-width: 0;
          padding: 10px;
          border-radius: 10px;
          background: #f1f5f9;
        }

        .summary-box span {
          display: block;
          color: #64748b;
          font-size: 8px;
          font-weight: 800;
        }

        .summary-box strong {
          display: block;
          margin-top: 5px;
          color: #0f172a;
          font-size: 14px;
          font-weight: 900;
        }

        .actual-summary-box {
          background: #ecfdf5;
        }

        .actual-summary-box strong {
          color: #047857;
        }

        .tree-weight-summary-box {
          background: #eff6ff;
        }

        .tree-weight-summary-box strong {
          color: #1d4ed8;
        }

        .weight-difference-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 9px;
          padding: 10px;
          border: 1px solid #fde68a;
          border-radius: 10px;
          background: #fffbeb;
        }

        .weight-difference-box span {
          color: #92400e;
          font-size: 9px;
          font-weight: 800;
        }

        .weight-difference-box strong {
          color: #78350f;
          font-size: 12px;
        }

        .tree-action-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-top: 14px;
        }

        .main-save-button {
          grid-column: 1 / -1;
          min-height: 46px;
        }

        .reset-button,
        .cancel-button {
          min-width: 0;
        }

        @media (max-width: 1120px) {
          .sticky-tree-form {
            position: static;
          }
        }

        @media (max-width: 480px) {
          .two-column-grid,
          .selected-item-input-grid {
            grid-template-columns: 1fr;
          }

          .full-width-field {
            grid-column: auto;
          }

          .tree-summary-grid {
            grid-template-columns: 1fr 1fr;
          }

          .tree-action-buttons {
            grid-template-columns: 1fr;
          }

          .main-save-button {
            grid-column: auto;
          }
        }
      `}</style>
    </aside>
  );
}