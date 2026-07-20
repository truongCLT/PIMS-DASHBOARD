import React, { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";
import { useGetCashflowMonthly, getGetCashflowMonthlyQueryKey } from "@workspace/api-client-react";
import { getMrCashflowRef } from "../data/mrProjectLinks";
import { useProjectDetail } from "../lib/projectDetailData";
import { chartTheme } from "../lib/chartTheme";

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #d0dce8",
  borderRadius: "6px",
  padding: "10px 12px",
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(ym: string): string {
  const m = Number(ym.slice(5, 7));
  const label = MONTH_LABELS[m - 1] ?? ym;
  return `${label} '${ym.slice(2, 4)}`;
}

function niceStep(range: number): number {
  const raw = range / 8;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  for (const mult of [1, 2, 5, 10]) {
    if (raw <= mult * pow) return mult * pow;
  }
  return 10 * pow;
}

export function ServiceCashflowTab({
  projectName,
  fromYear,
  fromMonth,
  months,
}: {
  projectName: string;
  fromYear: number;
  fromMonth: number;
  months: number;
}) {
  const [comment, setComment] = useState("");

  // 보조: 데이터 입력 탭에서 저장한 프로젝트별 자금 데이터 (pd_cashflow_monthly)
  const { detail, isLoading: pdLoading } = useProjectDetail(projectName);
  const startIdx = fromYear * 12 + (fromMonth - 1);
  const pdPoints = (detail?.cashflow ?? [])
    .filter((c) => {
      const idx = c.year * 12 + (c.month - 1);
      return idx >= startIdx && idx < startIdx + months;
    })
    .map((c) => ({
      month: `${c.year}-${String(c.month).padStart(2, "0")}`,
      cashIn: c.cashIn ?? 0,
      cashOut: c.cashOut ?? 0,
      equivalent: c.equivalent ?? 0,
    }));
  const hasPdData = pdPoints.some((p) => p.cashIn !== 0 || p.cashOut !== 0 || p.equivalent !== 0);
  // 저장된 pd 행이 존재하면(값이 모두 0이어도) pd 데이터를 우선 사용
  const hasPdRows = (detail?.cashflow ?? []).length > 0;

  // 자금수지 Excel(cf_*) DB 데이터 — 저장된 pd 데이터가 없을 때 사용
  const cfRef = getMrCashflowRef(projectName);
  const params = {
    projectName: cfRef?.name ?? "",
    division: cfRef?.division,
    fromYear,
    fromMonth,
    months,
  };
  const query = useGetCashflowMonthly(params, {
    query: {
      enabled: cfRef != null,
      queryKey: getGetCashflowMonthlyQueryKey(params),
    },
  });
  const cfPoints = query.data?.points ?? [];
  const hasCfData = cfPoints.some((p) => p.cashIn !== 0 || p.cashOut !== 0 || p.equivalent !== 0);

  // 우선순위: 데이터 입력 탭에서 저장한 행(pd_*)이 있으면 그 값을, 없으면 자금수지 Excel(cf_*) 값을 표시
  const useCf = cfRef != null && hasCfData && !hasPdRows;
  const points = hasPdRows ? pdPoints : cfPoints;
  const chartData = points.map((p) => ({
    month: monthLabel(p.month),
    cashIn: p.cashIn,
    cashOut: -p.cashOut,
    equivalent: p.equivalent,
  }));

  const maxVal = Math.max(...chartData.map((d) => Math.max(d.cashIn, d.equivalent, 0)), 0);
  const minVal = Math.min(...chartData.map((d) => Math.min(d.cashOut, d.equivalent, 0)), 0);
  const step = niceStep(maxVal - minVal || 10);
  const top = Math.ceil(maxVal / step) * step || step;
  const bottom = Math.floor(minVal / step) * step;
  const ticks: number[] = [];
  for (let t = bottom; t <= top; t += step) ticks.push(t);

  const hasData = chartData.some((d) => d.cashIn !== 0 || d.cashOut !== 0 || d.equivalent !== 0);

  const entryGuide = (
    <div style={{ fontSize: "12px", color: "#8a97a8", marginTop: "8px" }}>
      관리자 모드로 로그인하면 "데이터 입력" 탭의 "6. 월별 자금" 표에서 자금 데이터를 입력할 수 있습니다.
    </div>
  );

  let body: React.ReactNode;
  if (pdLoading || (cfRef != null && query.isLoading)) {
    body = (
      <div style={{ padding: "60px 20px", textAlign: "center", fontSize: "13px", color: "#5a6a7e" }}>
        자금 데이터를 불러오는 중입니다…
      </div>
    );
  } else if (cfRef == null && !hasPdData) {
    body = (
      <div style={{ padding: "60px 20px", textAlign: "center", fontSize: "13px", color: "#5a6a7e" }}>
        아직 입력된 자금 데이터가 없습니다.
        {entryGuide}
      </div>
    );
  } else if (!useCf && !hasPdData && query.isError) {
    const status = (query.error as { status?: number } | null)?.status;
    body = (
      <div style={{ padding: "60px 20px", textAlign: "center", fontSize: "13px", color: status === 404 ? "#5a6a7e" : "#c0392b" }}>
        {status === 404 ? (
          <>
            해당 프로젝트의 자금수지 데이터가 없습니다.
            {entryGuide}
          </>
        ) : (
          "자금수지 데이터 조회에 실패했습니다. 잠시 후 다시 시도해 주세요."
        )}
      </div>
    );
  } else if (!hasData) {
    body = (
      <div style={{ padding: "60px 20px", textAlign: "center", fontSize: "13px", color: "#5a6a7e" }}>
        선택한 기간에 자금 데이터가 없습니다.
        {entryGuide}
      </div>
    );
  } else {
    const barSize = Math.max(30, Math.min(110, Math.floor(600 / chartData.length)));
    body = (
      <div style={{ height: "320px", marginTop: "10px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} stackOffset="sign" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "#333", fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: chartTheme.axisLine }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#333", fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              domain={[bottom, top]}
              ticks={ticks}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "#333", fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              domain={[bottom, top]}
              ticks={ticks}
            />
            <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} iconSize={14} />
            <ReferenceLine y={0} stroke={chartTheme.sgaOrange} strokeDasharray="3 3" />
            <Bar
              dataKey="cashIn"
              name="Cash in"
              fill={chartTheme.inflowBlue}
              barSize={barSize}
              stackId="cash"
              isAnimationActive={false}
              radius={[4, 4, 0, 0]}
            >
              <LabelList
                dataKey="cashIn"
                position="center"
                style={{ fontSize: "11px", fill: "#fff", fontWeight: 700 }}
                formatter={(v: number) => (v !== 0 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "")}
              />
            </Bar>
            <Bar
              dataKey="cashOut"
              name="Cash out"
              fill={chartTheme.actualGreen}
              barSize={barSize}
              stackId="cash"
              isAnimationActive={false}
              radius={[0, 0, 4, 4]}
            >
              <LabelList
                dataKey="cashOut"
                position="center"
                style={{ fontSize: "11px", fill: "#fff", fontWeight: 700 }}
                formatter={(v: number) => (v !== 0 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "")}
              />
            </Bar>
            <Line
              dataKey="equivalent"
              name="Cash equivalent"
              type="monotone"
              stroke={chartTheme.actualGreen}
              strokeWidth={2}
              dot={{ r: 3, fill: "#fff", stroke: chartTheme.actualGreen }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Cashflow */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: chartTheme.titleNavy }}>Cashflow</span>
          <span style={{ fontSize: "11px", color: "#5a6a7e" }}>
            {useCf && query.data
              ? `${query.data.projectName} · 단위: ${query.data.unit}`
              : hasPdData
                ? `${projectName} · 단위: 천 USD`
                : ""}
          </span>
        </div>
        {body}
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
              <option>Cashflow</option>
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
