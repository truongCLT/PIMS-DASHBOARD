import React from "react";
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
  backgroundColor: "#2e3c50",
  color: "#fff",
  fontSize: "11px",
  fontWeight: 700,
  border: "1px solid #1f2a3a",
  padding: "8px 6px",
  textAlign: "center",
  verticalAlign: "middle",
};

const td: React.CSSProperties = {
  border: "1px solid #333",
  borderLeft: "none",
  borderRight: "1px solid #333",
  fontSize: "11px",
  color: "#333",
  padding: "8px 6px",
  verticalAlign: "middle",
  textAlign: "center",
};

export function OutsourcingTab({ projectName }: { projectName: string }) {
  const { fmtMoney } = useMoney();
  const { detail, isLoading } = useProjectDetail(projectName);

  const rows = detail?.outsourcing ?? [];

  const sum = {
    budget: rows.some((r) => r.budget != null) ? rows.reduce((a, r) => a + (r.budget ?? 0), 0) : null,
    resolved: rows.some((r) => r.resolved != null) ? rows.reduce((a, r) => a + (r.resolved ?? 0), 0) : null,
    thisMonth: rows.some((r) => r.thisMonth != null) ? rows.reduce((a, r) => a + (r.thisMonth ?? 0), 0) : null,
    accum: rows.some((r) => r.accum != null) ? rows.reduce((a, r) => a + (r.accum ?? 0), 0) : null,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Outsourcing and Materials table */}
      <div style={cardStyle}>
        <span style={sectionTitle}>Outsourcing and Materials</span>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
          <thead>
            <tr>
              <th style={th} rowSpan={2}>공종</th>
              <th style={th} rowSpan={2}>업체명</th>
              <th style={th} rowSpan={2}>최초<br />계약일</th>
              <th style={th} rowSpan={2}>변경<br />계약<br />차수</th>
              <th style={th} rowSpan={2}>예산<br />(A)</th>
              <th style={th} rowSpan={2}>결의금액<br />(B)</th>
              <th style={th} rowSpan={2}>결의율<br />(B/A)</th>
              <th style={th} colSpan={3}>기성현황</th>
            </tr>
            <tr>
              <th style={th}>이번달</th>
              <th style={th}>누계<br />(C)</th>
              <th style={th}>비율<br />(C/B)</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td style={{ ...td, borderLeft: "1px solid #333" }} colSpan={10}>
                  불러오는 중…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td style={{ ...td, borderLeft: "1px solid #333", color: "#8a97a8" }} colSpan={10}>
                  외주/자재 데이터가 없습니다. ( - )
                </td>
              </tr>
            ) : (
              <>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ ...td, borderLeft: "1px solid #333" }}>{r.trade || "-"}</td>
                    <td style={td}>{r.vendor ?? "-"}</td>
                    <td style={td}>{r.contractDate ?? "-"}</td>
                    <td style={td}>{r.changeNo ?? "-"}</td>
                    <td style={td}>{fmtMoney(r.budget)}</td>
                    <td style={td}>{fmtMoney(r.resolved)}</td>
                    <td style={td}>{fmtPct(ratioPct(r.resolved, r.budget))}</td>
                    <td style={td}>{fmtMoney(r.thisMonth)}</td>
                    <td style={td}>{fmtMoney(r.accum)}</td>
                    <td style={td}>{fmtPct(ratioPct(r.accum, r.resolved))}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...td, borderLeft: "1px solid #333", fontWeight: 700 }}>합계</td>
                  <td style={td} />
                  <td style={td} />
                  <td style={td} />
                  <td style={{ ...td, fontWeight: 600 }}>{fmtMoney(sum.budget)}</td>
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

      {/* Comment */}
      <div style={cardStyle}>
        <ProjectCommentPanel projectName={projectName} tab="outsourcing" />
      </div>
    </div>
  );
}
