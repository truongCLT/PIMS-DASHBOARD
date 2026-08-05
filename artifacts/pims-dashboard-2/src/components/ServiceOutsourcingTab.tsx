import React from "react";
import { useProjectDetail, fmtPct, ratioPct } from "../lib/projectDetailData";
import { useMoney } from "../lib/displayUnit";

const thStyle: React.CSSProperties = {
  backgroundColor: "#eef2f7",
  color: "#16294a",
  fontSize: "13px",
  fontWeight: 700,
  padding: "10px 8px",
  border: "1px solid #e2e9f3",
  textAlign: "center",
  verticalAlign: "middle",
  whiteSpace: "pre-line",
};

const tdStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#222",
  padding: "10px 8px",
  border: "1px solid #e2e9f3",
  verticalAlign: "top",
  backgroundColor: "#fff",
};

const tdCenter: React.CSSProperties = { ...tdStyle, textAlign: "center" };
const tdRight: React.CSSProperties = { ...tdStyle, textAlign: "right" };

export function ServiceOutsourcingTab({ projectName }: { projectName: string }) {
  const { detail, isLoading } = useProjectDetail(projectName);
  const { fmtMoney } = useMoney();
  const rows = detail?.outsourcing ?? [];

  const sum = {
    budget: rows.some((r) => r.budget != null) ? rows.reduce((a, r) => a + (r.budget ?? 0), 0) : null,
    resolved: rows.some((r) => r.resolved != null) ? rows.reduce((a, r) => a + (r.resolved ?? 0), 0) : null,
    thisMonth: rows.some((r) => r.thisMonth != null) ? rows.reduce((a, r) => a + (r.thisMonth ?? 0), 0) : null,
    accum: rows.some((r) => r.accum != null) ? rows.reduce((a, r) => a + (r.accum ?? 0), 0) : null,
  };

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e2e9f3",
        borderRadius: "8px",
        padding: "12px",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: "13%" }} rowSpan={2}>공종</th>
            <th style={thStyle} rowSpan={2}>업{"\n"}체{"\n"}명</th>
            <th style={thStyle} rowSpan={2}>구{"\n"}분</th>
            <th style={thStyle} rowSpan={2}>최초{"\n"}계약일</th>
            <th style={thStyle} rowSpan={2}>변경{"\n"}계약{"\n"}차수</th>
            <th style={thStyle} rowSpan={2}>예산{"\n"}(A)</th>
            <th style={{ ...thStyle, width: "12%" }} rowSpan={2}>결의금액{"\n"}(B)</th>
            <th style={thStyle} rowSpan={2}>결의율{"\n"}(B/A)</th>
            <th style={thStyle} colSpan={3}>기성현황</th>
          </tr>
          <tr>
            <th style={{ ...thStyle, width: "11%" }}>이번달</th>
            <th style={{ ...thStyle, width: "11%" }}>누계{"\n"}(C)</th>
            <th style={{ ...thStyle, width: "11%" }}>비율{"\n"}(C/B)</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td style={{ ...tdCenter, color: "#7c8ba3" }} colSpan={11}>
                불러오는 중…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td style={{ ...tdCenter, color: "#7c8ba3", padding: "24px 10px" }} colSpan={11}>
                외주/용역 데이터가 없습니다. 좌측 "데이터 입력" 탭에서 외주 데이터를 입력해 주세요.
              </td>
            </tr>
          ) : (
            <>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{r.trade || "-"}</td>
                  <td style={tdCenter}>{r.vendor ?? "-"}</td>
                  <td style={{ ...tdCenter, whiteSpace: "pre-line" }}>
                    {r.category ? r.category.split("").join("\n") : "-"}
                  </td>
                  <td style={tdCenter}>{r.contractDate ?? "-"}</td>
                  <td style={tdCenter}>{r.changeNo ?? "-"}</td>
                  <td style={tdRight}>{fmtMoney(r.budget)}</td>
                  <td style={tdRight}>{fmtMoney(r.resolved)}</td>
                  <td style={tdCenter}>{fmtPct(ratioPct(r.resolved, r.budget))}</td>
                  <td style={tdRight}>{fmtMoney(r.thisMonth)}</td>
                  <td style={tdRight}>{fmtMoney(r.accum)}</td>
                  <td style={tdRight}>{fmtPct(ratioPct(r.accum, r.resolved))}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...tdStyle, fontWeight: 600 }}>합계</td>
                <td style={tdCenter}></td>
                <td style={tdCenter}></td>
                <td style={tdCenter}></td>
                <td style={tdCenter}></td>
                <td style={{ ...tdRight, fontWeight: 600 }}>{fmtMoney(sum.budget)}</td>
                <td style={{ ...tdRight, fontWeight: 600 }}>{fmtMoney(sum.resolved)}</td>
                <td style={{ ...tdCenter, fontWeight: 600 }}>{fmtPct(ratioPct(sum.resolved, sum.budget))}</td>
                <td style={{ ...tdRight, fontWeight: 600 }}>{fmtMoney(sum.thisMonth)}</td>
                <td style={{ ...tdRight, fontWeight: 600 }}>{fmtMoney(sum.accum)}</td>
                <td style={{ ...tdRight, fontWeight: 600 }}>{fmtPct(ratioPct(sum.accum, sum.resolved))}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
