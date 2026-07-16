import React from "react";
import { Send, MessageSquare, Copy } from "lucide-react";

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
};

type OutsourcingRow = {
  trade: string;
  underline?: boolean;
  vendor?: string;
  contractDate?: string;
  changeNo?: string;
  budget?: string;
  resolved?: string;
  rate?: string;
  thisMonth?: string;
  accum?: string;
  ratio?: string;
};

const ROWS: OutsourcingRow[] = [
  {
    trade: "Excalvation",
    underline: true,
    vendor: "Sein",
    contractDate: "'24.12.31",
    resolved: "00,000,000",
    thisMonth: "00,000",
    accum: "000,000",
    ratio: "00.0%",
  },
  { trade: "Pile" },
  { trade: "Main" },
  { trade: "Temporary" },
  { trade: "M&E" },
  { trade: "Security" },
  { trade: "" },
  { trade: "" },
  { trade: "" },
];

const SUM_ROW = {
  resolved: "000,000,000",
  thisMonth: "000,000,000",
  accum: "000,0000,000,000",
  ratio: "00.0%",
};

const COMMENTS = [
  {
    user: "You",
    date: "2026-08-06",
    text: "Revenue did not achieve plans because customers are experiencing financial difficulties",
    bg: "#dde8f8",
  },
  {
    user: "Manager",
    date: "2026-04-06",
    link: "https://infoplusvn.com/",
    text: "Revenue did not achieve plans because customers are experiencing financial difficulties",
    bg: "#f3f6fb",
  },
];

export function OutsourcingTab() {
  const [comment, setComment] = React.useState("");
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
              <th style={th} rowSpan={2}><u>결의율</u><br />(A/B)</th>
              <th style={th} colSpan={3}>기성현황</th>
            </tr>
            <tr>
              <th style={th}><u>이번달</u></th>
              <th style={th}>누계<br />(C)</th>
              <th style={th}>비율<br />(C/B)</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr key={i}>
                <td style={{ ...td, borderLeft: "1px solid #333", textDecoration: r.underline ? "underline" : "none" }}>
                  {r.trade || "\u00A0"}
                </td>
                <td style={td}>{r.vendor}</td>
                <td style={td}>{r.contractDate}</td>
                <td style={td}>{r.changeNo}</td>
                <td style={td}>{r.budget}</td>
                <td style={td}>{r.resolved}</td>
                <td style={td}>{r.rate}</td>
                <td style={td}>{r.thisMonth}</td>
                <td style={td}>{r.accum}</td>
                <td style={td}>{r.ratio}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...td, borderLeft: "1px solid #333", fontWeight: 700 }}>합계</td>
              <td style={td} />
              <td style={td} />
              <td style={td} />
              <td style={td} />
              <td style={{ ...td, fontWeight: 600 }}>{SUM_ROW.resolved}</td>
              <td style={td} />
              <td style={{ ...td, fontWeight: 600 }}>{SUM_ROW.thisMonth}</td>
              <td style={{ ...td, fontWeight: 600, wordBreak: "break-all" }}>{SUM_ROW.accum}</td>
              <td style={{ ...td, fontWeight: 600 }}>{SUM_ROW.ratio}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Comment */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
          <MessageSquare size={13} color="#1a2d4d" />
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#1a2d4d" }}>Comment</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "8px", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#333" }}>
            Chart :
            <select style={{ fontSize: "11px", padding: "4px 6px", border: "1px solid #ccd4dd", borderRadius: "4px" }}>
              <option>Sale by division</option>
              <option>Outsourcing and Materials</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#333" }}>
            Month :
            <select defaultValue="June" style={{ fontSize: "11px", padding: "4px 6px", border: "1px solid #ccd4dd", borderRadius: "4px" }}>
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((mo) => (
                <option key={mo}>{mo}</option>
              ))}
            </select>
          </label>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "8px",
            border: "1px solid #ccd4dd",
            borderRadius: "6px",
            padding: "8px 10px",
            marginBottom: "10px",
          }}
        >
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write a comment"
            rows={2}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              resize: "none",
              fontSize: "11px",
              color: "#333",
              fontFamily: "inherit",
            }}
          />
          <Send size={14} color="#1e6fdd" style={{ cursor: "pointer", flexShrink: 0 }} />
        </div>

        {COMMENTS.map((c) => (
          <div
            key={c.user + c.date}
            style={{
              backgroundColor: c.bg,
              borderRadius: "4px",
              padding: "10px 12px",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#1a2d4d" }}>User: {c.user}</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#1a2d4d" }}>{c.date}</span>
            </div>
            {c.link && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <a href={c.link} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#1e6fdd" }}>
                  {c.link}
                </a>
                <Copy size={11} color="#1e6fdd" style={{ cursor: "pointer" }} />
              </div>
            )}
            <div style={{ fontSize: "11px", color: "#333" }}>{c.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
