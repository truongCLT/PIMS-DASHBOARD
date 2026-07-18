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
import { getCashflowProjectRef } from "../data/cashflowProjectMap";

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

  const cfRef = getCashflowProjectRef(projectName);
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

  const points = query.data?.points ?? [];
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

  let body: React.ReactNode;
  if (cfRef == null) {
    body = (
      <div style={{ padding: "60px 20px", textAlign: "center", fontSize: "13px", color: "#5a6a7e" }}>
        이 프로젝트에 매핑된 자금수지 데이터가 없습니다.
      </div>
    );
  } else if (query.isLoading) {
    body = (
      <div style={{ padding: "60px 20px", textAlign: "center", fontSize: "13px", color: "#5a6a7e" }}>
        자금수지 데이터를 불러오는 중입니다…
      </div>
    );
  } else if (query.isError) {
    const status = (query.error as { status?: number } | null)?.status;
    body = (
      <div style={{ padding: "60px 20px", textAlign: "center", fontSize: "13px", color: status === 404 ? "#5a6a7e" : "#c0392b" }}>
        {status === 404
          ? "해당 프로젝트의 자금수지 데이터가 없습니다."
          : "자금수지 데이터 조회에 실패했습니다. 잠시 후 다시 시도해 주세요."}
      </div>
    );
  } else if (!hasData) {
    body = (
      <div style={{ padding: "60px 20px", textAlign: "center", fontSize: "13px", color: "#5a6a7e" }}>
        선택한 기간에 자금수지 데이터가 없습니다.
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
              axisLine={{ stroke: "#d5dce6" }}
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
            <ReferenceLine y={0} stroke="#e0763a" strokeDasharray="3 3" />
            <Bar
              dataKey="cashIn"
              name="Cash in"
              fill="#2e6db4"
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
              fill="#1e8449"
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
              stroke="#1e8449"
              strokeWidth={2}
              dot={{ r: 3, fill: "#fff", stroke: "#1e8449" }}
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
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#1a3a6b" }}>Cashflow</span>
          <span style={{ fontSize: "11px", color: "#5a6a7e" }}>
            {query.data ? `${query.data.projectName} · 단위: ${query.data.unit}` : ""}
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
