import React from "react";

const HEADER_BG = "#2e3a4f";

const thStyle: React.CSSProperties = {
  backgroundColor: HEADER_BG,
  color: "#fff",
  fontSize: "11px",
  fontWeight: 700,
  padding: "10px 8px",
  border: "1px solid #fff",
  textAlign: "center",
  verticalAlign: "middle",
  whiteSpace: "pre-line",
};

const tdStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#222",
  padding: "12px 10px",
  border: "1px solid #c8d2de",
  verticalAlign: "top",
  backgroundColor: "#fff",
};

const tdCenter: React.CSSProperties = { ...tdStyle, textAlign: "center" };
const tdRight: React.CSSProperties = { ...tdStyle, textAlign: "left" };

const ROWS = [
  { trade: "Environment Design", vendor: "Sein", type: "용역" },
  { trade: "Landscpae Design", vendor: "Sein", type: "용역" },
  { trade: "Interior Design", vendor: "Sein", type: "용역" },
  { trade: "BIM", vendor: "Sein", type: "외주" },
  { trade: "QS", vendor: "Sein", type: "외주" },
  { trade: "Structure", vendor: "Sein", type: "외주" },
  { trade: "LEED", vendor: "Sein", type: "외주" },
];

export function ServiceOutsourcingTab() {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #d0dce8",
        borderRadius: "6px",
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
            <th style={thStyle} rowSpan={2}>결의율{"\n"}(A/B)</th>
            <th style={thStyle} colSpan={3}>기성현황</th>
          </tr>
          <tr>
            <th style={{ ...thStyle, width: "13%" }}>이번달</th>
            <th style={{ ...thStyle, width: "10%" }}>누계{"\n"}(C)</th>
            <th style={thStyle}>비율{"\n"}(C/B)</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.trade}>
              <td style={tdStyle}>{r.trade}</td>
              <td style={tdCenter}>{r.vendor}</td>
              <td style={{ ...tdCenter, whiteSpace: "pre-line" }}>{r.type.split("").join("\n")}</td>
              <td style={tdCenter}>'24.12.31</td>
              <td style={tdCenter}></td>
              <td style={tdRight}>00,000,000</td>
              <td style={tdRight}>00,000,000</td>
              <td style={tdCenter}></td>
              <td style={tdRight}>00,000</td>
              <td style={tdRight}>000,000</td>
              <td style={tdRight}>00.0%</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...tdStyle, fontWeight: 600 }}>합계</td>
            <td style={tdCenter}></td>
            <td style={tdCenter}></td>
            <td style={tdCenter}></td>
            <td style={tdCenter}></td>
            <td style={tdRight}></td>
            <td style={tdRight}>000,000,000</td>
            <td style={tdCenter}></td>
            <td style={tdRight}>000,000,000</td>
            <td style={tdRight}>000,0000,000,000</td>
            <td style={tdRight}>00.0%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
