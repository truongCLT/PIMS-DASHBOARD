import React, { useState } from "react";
import { ProjectCommentPanel } from "./ProjectCommentPanel";

import { useProjectDetail, fmtPct, ratioPct } from "../lib/projectDetailData";
import { useMoney } from "../lib/displayUnit";

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #d0dce8",
  borderRadius: "6px",
  padding: "10px 12px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#4472c4",
};

const th: React.CSSProperties = {
  backgroundColor: "#eef2f7",
  color: "#1a2d4d",
  fontSize: "11px",
  fontWeight: 700,
  border: "1px solid #c8d2de",
  padding: "8px 6px",
  textAlign: "center",
  verticalAlign: "middle",
  position: "relative",
  overflow: "hidden",
};

const td: React.CSSProperties = {
  border: "1px solid #d5dce6",
  fontSize: "11px",
  color: "#333",
  padding: "8px 6px",
  verticalAlign: "middle",
  textAlign: "center",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

// 컬럼: 대공종, 세부공종, 업체명, 계약일, 차수, 예산, 집행예산, 결의금액, 결의율, 이번달, 누계, 비율
// 이번달(9), 누계(10), 비율(11) 동일 너비
const DEFAULT_WIDTHS = [64, 90, 90, 70, 46, 92, 92, 92, 60, 80, 80, 80];

function ResizeHandle({ onDrag }: { onDrag: (dx: number) => void }) {
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
      title="드래그하여 열 너비 조절"
    />
  );
}

export function OutsourcingTab({ projectName }: { projectName: string }) {
  const { fmtMoney } = useMoney();
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
  };

  const totalWidth = widths.reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Outsourcing and Materials table */}
      <div style={cardStyle}>
        <span style={sectionTitle}>Outsourcing and Materials</span>
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
                  공종
                  <ResizeHandle onDrag={resize(1)} />
                </th>
                <th style={th} rowSpan={2}>업체명<ResizeHandle onDrag={resize(2)} /></th>
                <th style={th} rowSpan={2}>최초<br />계약일<ResizeHandle onDrag={resize(3)} /></th>
                <th style={th} rowSpan={2}>변경<br />계약<br />차수<ResizeHandle onDrag={resize(4)} /></th>
                <th style={th} rowSpan={2}>예산<br />(A)<ResizeHandle onDrag={resize(5)} /></th>
                <th style={th} rowSpan={2}>집행예산<ResizeHandle onDrag={resize(6)} /></th>
                <th style={th} rowSpan={2}>결의금액<br />(B)<ResizeHandle onDrag={resize(7)} /></th>
                <th style={th} rowSpan={2}>결의율<br />(B/A)<ResizeHandle onDrag={resize(8)} /></th>
                <th style={th} colSpan={3}>기성현황</th>
              </tr>
              <tr>
                <th style={th}>구분<ResizeHandle onDrag={resize(0)} /></th>
                <th style={th}>세부공종<ResizeHandle onDrag={resize(1)} /></th>
                <th style={th}>이번달<ResizeHandle onDrag={resize(9)} /></th>
                <th style={th}>누계<br />(C)<ResizeHandle onDrag={resize(10)} /></th>
                <th style={th}>비율<br />(C/B)<ResizeHandle onDrag={resize(11)} /></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td style={td} colSpan={12}>
                    불러오는 중…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td style={{ ...td, color: "#8a97a8" }} colSpan={12}>
                    외주/자재 데이터가 없습니다. ( - )
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
                      <td style={td}>{fmtMoney(r.budget)}</td>
                      <td style={td}>{fmtMoney(r.executedBudget)}</td>
                      <td style={td}>{fmtMoney(r.resolved)}</td>
                      <td style={td}>{fmtPct(ratioPct(r.resolved, r.budget))}</td>
                      <td style={td}>{fmtMoney(r.thisMonth)}</td>
                      <td style={td}>{fmtMoney(r.accum)}</td>
                      <td style={td}>{fmtPct(ratioPct(r.accum, r.resolved))}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...td, fontWeight: 700 }} colSpan={2}>합계</td>
                    <td style={td} />
                    <td style={td} />
                    <td style={td} />
                    <td style={{ ...td, fontWeight: 600 }}>{fmtMoney(sum.budget)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{fmtMoney(sum.executedBudget)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{fmtMoney(sum.resolved)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{fmtPct(ratioPct(sum.resolved, sum.budget))}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{fmtMoney(sum.thisMonth)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{fmtMoney(sum.accum)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{fmtPct(ratioPct(sum.accum, sum.resolved))}</td>
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
