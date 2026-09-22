import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ProjectCommentPanel } from "./ProjectCommentPanel";

import { useProjectDetail, fmtPct, ratioPct } from "../lib/projectDetailData";
import { useMoney } from "../lib/displayUnit";
import {
  cardStyle,
  sectionTitle,
  INK_NAVY,
  INK_BODY,
  INK_MUTED,
  TABLE_HEADER_BG,
  CARD_BORDER,
  ACHIEVE_GREEN,
  ACHIEVE_RED,
  STATUS_POS_BG,
  STATUS_NEG_BG,
} from "../lib/uiTokens";

const th: React.CSSProperties = {
  backgroundColor: TABLE_HEADER_BG,
  color: INK_NAVY,
  fontSize: "13px",
  fontWeight: 700,
  border: `1px solid ${CARD_BORDER}`,
  padding: "8px 6px",
  textAlign: "center",
  verticalAlign: "middle",
  position: "relative",
  overflow: "hidden",
};

const td: React.CSSProperties = {
  border: `1px solid ${CARD_BORDER}`,
  fontSize: "13px",
  color: INK_BODY,
  padding: "8px 6px",
  verticalAlign: "middle",
  textAlign: "center",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

// 컬럼: 대공종, 세부공종, 업체명, 계약일, 차수, 예산, 집행예산, 결의금액, 결의율, 이번달, 누계, 비율
// 이번달(9), 누계(10), 비율(11) 동일 너비
const DEFAULT_WIDTHS = [64, 90, 90, 70, 46, 92, 92, 92, 60, 80, 80, 80, 92];

function ResizeHandle({ onDrag }: { onDrag: (dx: number) => void }) {
  const { t } = useTranslation(["outsourcingTab", "common"]);
  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        let last = 0;
        const move = (ev: MouseEvent) => {
          const dx = ev.clientX - startX;
          onDrag(dx - last);
          last = dx;
        };
        const up = () => {
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", up);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
      }}
      style={{
        position: "absolute",
        top: 0,
        right: "-3px",
        width: "7px",
        height: "100%",
        cursor: "col-resize",
        zIndex: 2,
      }}
      title={t("outsourcingTab:dragToResize")}
    />
  );
}

export function OutsourcingTab({
  projectName,
  referenceYear,
  referenceMonth,
}: {
  projectName: string;
  referenceYear: number;
  referenceMonth: number;
}) {
  const { t } = useTranslation(["outsourcingTab", "common"]);
  // budget/executedBudget/resolved/thisMonth/accum của pd_outsourcing lưu ĐÚNG số VND gốc (không quy
  // đổi kUSD) — dùng fmtVnd() thay vì fmtMoney().
  const { fmtVnd } = useMoney();
  const { detail, isLoading } = useProjectDetail(projectName);
  const [widths, setWidths] = useState<number[]>(DEFAULT_WIDTHS);

  const resize = (col: number) => (dx: number) => {
    setWidths((w) => {
      const next = [...w];
      next[col] = Math.max(36, next[col] + dx);
      return next;
    });
  };

  const rows = detail?.outsourcing ?? [];

  const sum = {
    budget: rows.some((r) => r.budget != null) ? rows.reduce((a, r) => a + (r.budget ?? 0), 0) : null,
    executedBudget: rows.some((r) => r.executedBudget != null) ? rows.reduce((a, r) => a + (r.executedBudget ?? 0), 0) : null,
    resolved: rows.some((r) => r.resolved != null) ? rows.reduce((a, r) => a + (r.resolved ?? 0), 0) : null,
    thisMonth: rows.some((r) => r.thisMonth != null) ? rows.reduce((a, r) => a + (r.thisMonth ?? 0), 0) : null,
    accum: rows.some((r) => r.accum != null) ? rows.reduce((a, r) => a + (r.accum ?? 0), 0) : null,
    remaining:
      rows.some((r) => r.resolved != null || r.accum != null)
        ? rows.reduce((a, r) => a + Math.max((r.resolved ?? 0) - (r.accum ?? 0), 0), 0)
        : null,
  };

  const totalWidth = widths.reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Outsourcing and Materials table */}
      <div style={cardStyle}>
        <span style={sectionTitle}>
          {t("outsourcingTab:outsourcingAndMaterials")}
          <span style={{ fontSize: "11px", fontWeight: 400, color: INK_MUTED, marginLeft: "6px" }}>
            ({t("outsourcingTab:asOf", {
              year: String(referenceYear).slice(2),
              month: String(referenceMonth).padStart(2, "0"),
            })})
          </span>
        </span>
        <div style={{ overflowX: "auto", marginTop: "10px" }}>
          <table style={{ width: "100%", minWidth: `${totalWidth}px`, borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              {widths.map((w, i) => (
                <col key={i} style={{ width: `${w}px` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th style={th} colSpan={2}>
                  {t("outsourcingTab:tradeType")}
                  <ResizeHandle onDrag={resize(1)} />
                </th>
                <th style={th} rowSpan={2}>{t("outsourcingTab:vendorName")}<ResizeHandle onDrag={resize(2)} /></th>
                <th style={th} rowSpan={2}>{t("outsourcingTab:first")}<br />{t("outsourcingTab:contractDate")}<ResizeHandle onDrag={resize(3)} /></th>
                <th style={th} rowSpan={2}>{t("outsourcingTab:change")}<br />{t("outsourcingTab:contract")}<br />{t("outsourcingTab:round")}<ResizeHandle onDrag={resize(4)} /></th>
                <th style={th} rowSpan={2}>{t("common:budget")}<br />(A)<ResizeHandle onDrag={resize(5)} /></th>
                <th style={th} rowSpan={2}>{t("outsourcingTab:executedBudget")}<ResizeHandle onDrag={resize(6)} /></th>
                <th style={th} rowSpan={2}>{t("outsourcingTab:resolvedAmount")}<br />(B)<ResizeHandle onDrag={resize(7)} /></th>
                <th style={th} rowSpan={2}>{t("outsourcingTab:resolvedRate")}<br />(B/A)<ResizeHandle onDrag={resize(8)} /></th>
                <th style={th} colSpan={4}>{t("outsourcingTab:progressBillingStatus")}</th>
              </tr>
              <tr>
                <th style={th}>{t("outsourcingTab:category")}<ResizeHandle onDrag={resize(0)} /></th>
                <th style={th}>{t("outsourcingTab:detailedTrade")}<ResizeHandle onDrag={resize(1)} /></th>
                <th style={th}>{t("outsourcingTab:thisMonth")}<ResizeHandle onDrag={resize(9)} /></th>
                <th style={th}>{t("common:cumulative")}<br />(C)<ResizeHandle onDrag={resize(10)} /></th>
                <th style={th}>{t("outsourcingTab:ratio")}<br />(C/B)<ResizeHandle onDrag={resize(11)} /></th>
                <th style={th}>{t("outsourcingTab:remainingBilling")}<br />(B-C)<ResizeHandle onDrag={resize(12)} /></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td style={td} colSpan={13}>
                    {t("common:loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td style={{ ...td, color: INK_MUTED }} colSpan={13}>
                    {t("outsourcingTab:noOutsourcingData")}
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td style={td} title={r.tradeGroup ?? undefined}>{r.tradeGroup ?? "-"}</td>
                      <td style={td} title={r.trade || undefined}>{r.trade || "-"}</td>
                      <td style={td} title={r.vendor ?? undefined}>{r.vendor ?? "-"}</td>
                      <td style={td}>{r.contractDate ?? "-"}</td>
                      <td style={td}>{r.changeNo ?? "-"}</td>
                      <td style={td}>{fmtVnd(r.budget)}</td>
                      <td style={td}>{fmtVnd(r.executedBudget)}</td>
                      <td style={td}>{fmtVnd(r.resolved)}</td>
                      <td style={{
                        ...td,
                        fontWeight: 700,
                        color: ratioPct(r.resolved, r.budget) != null && ratioPct(r.resolved, r.budget)! >= 100 ? ACHIEVE_GREEN : ACHIEVE_RED,
                      }}>{fmtPct(ratioPct(r.resolved, r.budget))}</td>
                      <td style={td}>{fmtVnd(r.thisMonth)}</td>
                      <td style={{ ...td, fontWeight: 700, color: INK_NAVY, backgroundColor: TABLE_HEADER_BG }}>{fmtVnd(r.accum)}</td>
                      <td style={{ ...td, fontWeight: 700, color: INK_NAVY }}>{fmtPct(ratioPct(r.accum, r.resolved))}</td>
                      <td style={{
                        ...td,
                        fontWeight: 700,
                        color: Math.max((r.resolved ?? 0) - (r.accum ?? 0), 0) > 0 ? ACHIEVE_RED : ACHIEVE_GREEN,
                        backgroundColor: Math.max((r.resolved ?? 0) - (r.accum ?? 0), 0) > 0 ? STATUS_NEG_BG : STATUS_POS_BG,
                      }}>
                        {fmtVnd(
                          r.resolved == null && r.accum == null
                            ? null
                            : Math.max((r.resolved ?? 0) - (r.accum ?? 0), 0),
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...td, fontWeight: 700 }} colSpan={2}>{t("common:total")}</td>
                    <td style={td} />
                    <td style={td} />
                    <td style={td} />
                    <td style={{ ...td, fontWeight: 600 }}>{fmtVnd(sum.budget)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{fmtVnd(sum.executedBudget)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{fmtVnd(sum.resolved)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{fmtPct(ratioPct(sum.resolved, sum.budget))}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{fmtVnd(sum.thisMonth)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{fmtVnd(sum.accum)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{fmtPct(ratioPct(sum.accum, sum.resolved))}</td>
                    <td style={{
                      ...td,
                      fontWeight: 700,
                      color: (sum.remaining ?? 0) > 0 ? ACHIEVE_RED : ACHIEVE_GREEN,
                      backgroundColor: (sum.remaining ?? 0) > 0 ? STATUS_NEG_BG : STATUS_POS_BG,
                    }}>{fmtVnd(sum.remaining)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comment */}
      <div style={cardStyle}>
        <ProjectCommentPanel projectName={projectName} tab="outsourcing" />
      </div>
    </div>
  );
}
