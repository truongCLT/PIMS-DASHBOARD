import React, { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { useProjectDetail, fmtNum, fmtPct, ratioPct } from "../lib/projectDetailData";

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #d0dce8",
  borderRadius: "6px",
  padding: "10px 12px",
};

function HBar({
  label,
  totalWidth,
  execRatio,
  execLabel,
  pctLabel,
  totalLabel,
  execColor,
  trackColor = "#d5d7e2",
  height = 46,
  sub = false,
}: {
  label: string;
  totalWidth: number; // % of container
  execRatio: number; // 0~1 of total bar
  execLabel?: string;
  pctLabel?: string;
  totalLabel?: string;
  execColor?: string;
  trackColor?: string;
  height?: number;
  sub?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: sub ? "10px" : "0" }}>
      <div
        style={{
          width: sub ? "160px" : "130px",
          paddingLeft: sub ? "60px" : "0",
          fontSize: "11px",
          color: "#333",
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ width: `${totalWidth}%`, height: `${height}px`, backgroundColor: trackColor, display: "flex" }}>
          {execRatio > 0 && execColor && (
            <div
              style={{
                width: `${Math.min(execRatio, 1) * 100}%`,
                height: "100%",
                backgroundColor: execColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {execLabel && (
                <span style={{ fontSize: "10px", color: "#fff", fontWeight: 700 }}>{execLabel}</span>
              )}
              {pctLabel && (
                <span
                  style={{
                    position: "absolute",
                    left: "100%",
                    marginLeft: "8px",
                    fontSize: "10px",
                    color: execColor === "#f0a875" ? "#e07b28" : "#2b5cad",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {pctLabel}
                </span>
              )}
            </div>
          )}
        </div>
        {totalLabel && <span style={{ fontSize: "10px", color: "#333", whiteSpace: "nowrap" }}>{totalLabel}</span>}
      </div>
    </div>
  );
}

export function ServiceBudgetTab({ projectName }: { projectName: string }) {
  const [comment, setComment] = useState("");
  const { detail, isLoading } = useProjectDetail(projectName);

  const rows = (detail?.costBudget ?? []).filter((c) => c.budget != null || c.actual != null);
  const totalBudget = rows.some((c) => c.budget != null) ? rows.reduce((a, c) => a + (c.budget ?? 0), 0) : null;
  const totalActual = rows.some((c) => c.actual != null) ? rows.reduce((a, c) => a + (c.actual ?? 0), 0) : null;
  const maxBudget = Math.max(rows.reduce((a, c) => Math.max(a, c.budget ?? 0), 0), totalBudget ?? 0);

  const widthPct = (v: number | null | undefined) =>
    maxBudget > 0 && v != null ? Math.max((v / maxBudget) * 82, 3) : 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Budget Execution Status */}
      <div style={{ ...cardStyle, padding: "14px 18px 24px" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "#4472c4" }}>
          Budget <u>Execution Status</u>
        </span>

        {isLoading ? (
          <div style={{ padding: "50px 20px", textAlign: "center", fontSize: "12px", color: "#8a97a8" }}>불러오는 중…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center", fontSize: "12px", color: "#8a97a8" }}>
            예산 집행 데이터가 없습니다. "데이터 입력" 탭에서 예산 집행 현황을 입력해 주세요.
          </div>
        ) : (
          <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "26px" }}>
            {rows.map((c, i) => {
              const ratio = c.budget != null && c.budget > 0 && c.actual != null ? c.actual / c.budget : 0;
              return (
                <HBar
                  key={`${c.item}-${i}`}
                  label={c.category ? `${c.category} · ${c.item}` : c.item}
                  totalWidth={widthPct(c.budget)}
                  execRatio={ratio}
                  execLabel={c.actual != null ? fmtNum(c.actual) : undefined}
                  pctLabel={fmtPct(ratioPct(c.actual, c.budget)) === "-" ? undefined : fmtPct(ratioPct(c.actual, c.budget))}
                  totalLabel={fmtNum(c.budget)}
                  execColor="#2b5cad"
                />
              );
            })}
            <HBar
              label="Sum"
              totalWidth={widthPct(totalBudget)}
              execRatio={totalBudget != null && totalBudget > 0 && totalActual != null ? totalActual / totalBudget : 0}
              execLabel={totalActual != null ? fmtNum(totalActual) : undefined}
              pctLabel={fmtPct(ratioPct(totalActual, totalBudget)) === "-" ? undefined : fmtPct(ratioPct(totalActual, totalBudget))}
              totalLabel={fmtNum(totalBudget)}
              execColor="#2b5cad"
            />
          </div>
        )}
      </div>

      {/* Comment */}
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
