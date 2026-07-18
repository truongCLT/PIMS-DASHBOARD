import React from "react";
import { Send, MessageSquare } from "lucide-react";
import { useProjectDetail, fmtNum, fmtPct, ratioPct } from "../lib/projectDetailData";

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

const emptyStyle: React.CSSProperties = {
  padding: "24px 0",
  textAlign: "center",
  fontSize: "11px",
  color: "#8a97a8",
};

function Donut({
  percent,
  size = 150,
  stroke = 16,
  color = "#2b5cad",
  track = "#dfe5ec",
  centerLabel,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  centerLabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = (Math.min(Math.max(percent, 0), 100) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${arc} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {centerLabel && (
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={15}
          fontWeight={700}
          fill="#1a2d4d"
        >
          {centerLabel}
        </text>
      )}
    </svg>
  );
}

const EST_META: { kind: "bidding" | "execution" | "completion"; label: string; color: string }[] = [
  { kind: "bidding", label: "Bidding", color: "#9db8d9" },
  { kind: "execution", label: "Execution Budgeting", color: "#2b5cad" },
  { kind: "completion", label: "Estimated Completion", color: "#1a2d4d" },
];

type BudgetRow = {
  category: string | null;
  item: string;
  budget: number | null;
  plan: number | null;
  actual: number | null;
};

function BudgetExecutionStatus({ rows }: { rows: BudgetRow[] }) {
  const maxBudget = Math.max(...rows.map((r) => r.budget ?? 0), 1);
  let lastCategory: string | null = null;
  return (
    <div style={cardStyle}>
      <span style={sectionTitle}>Budget Execution Status</span>
      {rows.length === 0 ? (
        <div style={emptyStyle}>예산 집행 데이터가 없습니다. ( - )</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "14px" }}>
          {rows.map((row, i) => {
            const showCategory = row.category != null && row.category !== lastCategory;
            lastCategory = row.category ?? lastCategory;
            const trackW = row.budget != null ? Math.max((Math.log10(row.budget + 1) / Math.log10(maxBudget + 1)) * 100, 12) : 12;
            const planW = row.plan != null ? Math.min((row.plan / maxBudget) * 100, 100) : 0;
            const actualW = row.actual != null ? Math.min((row.actual / maxBudget) * 100, 100) : 0;
            const planPct = ratioPct(row.plan, row.budget);
            const actualPct = ratioPct(row.actual, row.budget);
            return (
              <div key={`${row.item}-${i}`} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ width: "110px", minWidth: "110px", fontSize: "10px", color: "#333" }}>
                  {showCategory && <div style={{ marginBottom: "14px", fontWeight: 700 }}>{row.category}</div>}
                  <span>{row.item}</span>
                </div>
                <div style={{ flex: 1, position: "relative" }}>
                  <div
                    style={{
                      position: "relative",
                      width: `${trackW}%`,
                      height: row.plan != null || row.actual != null ? "52px" : "40px",
                      backgroundColor: "#d9dee5",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        right: "-8px",
                        top: "50%",
                        transform: "translate(100%, -50%)",
                        fontSize: "9px",
                        color: "#555",
                      }}
                    >
                      {fmtNum(row.budget)}
                    </span>
                  </div>
                  {row.plan != null && (
                    <div
                      style={{
                        position: "absolute",
                        top: "4px",
                        left: 0,
                        width: `${Math.max(planW, 3)}%`,
                        height: "20px",
                        backgroundColor: "#c0392b",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          fontSize: "8px",
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {fmtNum(row.plan)}
                      </span>
                      {planPct != null && (
                        <span
                          style={{
                            position: "absolute",
                            right: "-6px",
                            top: "50%",
                            transform: "translate(100%, -50%)",
                            fontSize: "8px",
                            color: "#c0392b",
                            fontWeight: 700,
                          }}
                        >
                          {fmtPct(planPct)}
                        </span>
                      )}
                    </div>
                  )}
                  {row.actual != null && (
                    <div
                      style={{
                        position: "absolute",
                        top: "28px",
                        left: 0,
                        width: `${Math.max(actualW, 3)}%`,
                        height: "20px",
                        backgroundColor: "#2b5cad",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          fontSize: "8px",
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {fmtNum(row.actual)}
                      </span>
                      {actualPct != null && (
                        <span
                          style={{
                            position: "absolute",
                            right: "-6px",
                            top: "50%",
                            transform: "translate(100%, -50%)",
                            fontSize: "8px",
                            color: "#2b5cad",
                            fontWeight: 700,
                          }}
                        >
                          {fmtPct(actualPct)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CostingTab({ projectName }: { projectName: string }) {
  const [comment, setComment] = React.useState("");
  const { detail, isLoading } = useProjectDetail(projectName);

  const estimation = detail?.costEstimation ?? [];
  const budgetRows: BudgetRow[] = (detail?.costBudget ?? []).map((r) => ({
    category: r.category ?? null,
    item: r.item,
    budget: r.budget ?? null,
    plan: r.plan ?? null,
    actual: r.actual ?? null,
  }));

  // 합계 행 (예산 데이터가 있을 때만)
  const rowsWithSum: BudgetRow[] =
    budgetRows.length > 0
      ? [
          ...budgetRows,
          {
            category: null,
            item: "Sum",
            budget: budgetRows.reduce((a, r) => a + (r.budget ?? 0), 0),
            plan: budgetRows.some((r) => r.plan != null) ? budgetRows.reduce((a, r) => a + (r.plan ?? 0), 0) : null,
            actual: budgetRows.some((r) => r.actual != null) ? budgetRows.reduce((a, r) => a + (r.actual ?? 0), 0) : null,
          },
        ]
      : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Row 1: Cost estimation donuts */}
      <div style={cardStyle}>
        <span style={sectionTitle}>Cost estimation</span>
        {isLoading ? (
          <div style={emptyStyle}>불러오는 중…</div>
        ) : estimation.length === 0 ? (
          <div style={emptyStyle}>원가율 데이터가 없습니다. ( - )</div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-around",
              marginTop: "10px",
              paddingBottom: "6px",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            {EST_META.map((meta) => {
              const row = estimation.find((e) => e.kind === meta.kind);
              const contract = row?.contractAmount ?? null;
              const cost = row?.costAmount ?? null;
              const pct = ratioPct(cost, contract);
              return (
                <div key={meta.kind} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>
                    {cost != null || contract != null ? `${fmtNum(cost)} / ${fmtNum(contract)}` : "-"}
                  </div>
                  <Donut percent={pct ?? 0} color={meta.color} size={150} stroke={16} centerLabel={fmtPct(pct)} />
                  <div style={{ fontSize: "11px", color: "#1a2d4d", fontWeight: 600, marginTop: "4px" }}>{meta.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 2: Budget Execution Status */}
      <BudgetExecutionStatus rows={rowsWithSum} />

      {/* Row 3: Comment */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
          <MessageSquare size={13} color="#1a2d4d" />
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#1a2d4d" }}>Comment</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "8px",
            border: "1px solid #ccd4dd",
            borderRadius: "6px",
            padding: "8px 10px",
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
      </div>
    </div>
  );
}
