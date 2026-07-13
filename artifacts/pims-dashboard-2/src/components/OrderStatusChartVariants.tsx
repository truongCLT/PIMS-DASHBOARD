import React from "react";
import {
  ComposedChart,
  BarChart,
  PieChart,
  Pie,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";
import { ORDER_STATUS } from "./OrderStatus";

const { planTotal, ordered, remaining } = ORDER_STATUS;
const PCT = Math.round((ordered / planTotal) * 100);

/* ---------- shared card ---------- */

function VariantCard({
  no,
  title,
  desc,
  children,
}: {
  no: number;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #d0dce8",
        borderRadius: "6px",
        padding: "10px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "#fff",
            backgroundColor: "#00897b",
            borderRadius: "8px",
            padding: "1px 7px",
          }}
        >
          안 {no}
        </span>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#1a3a5c" }}>{title}</span>
      </div>
      <div style={{ fontSize: "10px", color: "#7a8ba0", marginBottom: "6px" }}>{desc}</div>
      {children}
    </div>
  );
}

function LegendRow({ items }: { items: { color: string; label: string; type?: "rect" | "line" }[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          {item.type === "line" ? (
            <div style={{ width: "16px", height: "2px", backgroundColor: item.color }} />
          ) : (
            <div style={{ width: "12px", height: "8px", backgroundColor: item.color, borderRadius: "1px" }} />
          )}
          <span style={{ fontSize: "9px", color: "#555" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- 1. Gauge ---------- */

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (Math.PI * angleDeg) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startPct: number, endPct: number) {
  // 0% => 180deg (left), 100% => 0deg (right)
  const startAngle = 180 - startPct * 1.8;
  const endAngle = 180 - endPct * 1.8;
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = startAngle - endAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function GaugeVariant() {
  const cx = 110;
  const cy = 100;
  const r = 74;
  const needleAngle = 180 - PCT * 1.8;
  const tip = polarToCartesian(cx, cy, r - 16, needleAngle);
  return (
    <VariantCard no={1} title="게이지 차트" desc="목표 대비 진척률을 속도계 형태로 직관적으로 표시">
      <div style={{ height: "160px", display: "flex", justifyContent: "center" }}>
        <svg viewBox="0 0 220 120" style={{ width: "100%", maxWidth: "260px", height: "100%" }}>
          <path d={arcPath(cx, cy, r, 0, 50)} stroke="#ef9a9a" strokeWidth={14} fill="none" strokeLinecap="butt" />
          <path d={arcPath(cx, cy, r, 50, 80)} stroke="#ffe082" strokeWidth={14} fill="none" strokeLinecap="butt" />
          <path d={arcPath(cx, cy, r, 80, 100)} stroke="#a5d6a7" strokeWidth={14} fill="none" strokeLinecap="butt" />
          <path d={arcPath(cx, cy, r, 0, PCT)} stroke="#1565c0" strokeWidth={6} fill="none" strokeLinecap="round" />
          <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="#1a3a5c" strokeWidth={2.5} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={5} fill="#1a3a5c" />
          <text x={cx} y={cy - 24} textAnchor="middle" fontSize={22} fontWeight={700} fill="#1565c0">
            {PCT}%
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize={9} fill="#888">
            계획 {planTotal.toLocaleString()} / 수주 {ordered.toLocaleString()}
          </text>
          <text x={cx - r} y={cy + 14} textAnchor="middle" fontSize={8} fill="#999">
            0%
          </text>
          <text x={cx + r} y={cy + 14} textAnchor="middle" fontSize={8} fill="#999">
            100%
          </text>
        </svg>
      </div>
      <LegendRow
        items={[
          { color: "#ef9a9a", label: "위험(~50%)" },
          { color: "#ffe082", label: "주의(50~80%)" },
          { color: "#a5d6a7", label: "양호(80%~)" },
          { color: "#1565c0", label: "현재 달성률", type: "line" },
        ]}
      />
    </VariantCard>
  );
}

/* ---------- 2. Horizontal Bar ---------- */

const HBAR_DATA = [
  { name: "계획", value: planTotal, color: "#1a3a5c" },
  { name: "수주", value: ordered, color: "#1565c0" },
  { name: "잔여", value: remaining, color: "#ff7043" },
];

function HBarVariant() {
  return (
    <VariantCard no={2} title="수평 막대 차트" desc="계획·수주·잔여를 나란히 비교하여 크기 차이를 명확하게 표시">
      <div style={{ height: "160px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={HBAR_DATA} layout="vertical" margin={{ top: 4, right: 46, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8f0f8" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "#1a3a5c" }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip contentStyle={{ fontSize: "11px" }} />
            <Bar dataKey="value" name="금액" barSize={22} radius={[0, 3, 3, 0]} isAnimationActive={false}>
              {HBAR_DATA.map((row) => (
                <Cell key={row.name} fill={row.color} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: any) => Number(v).toLocaleString()}
                style={{ fontSize: 10, fontWeight: 600, fill: "#1a3a5c" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <LegendRow
        items={[
          { color: "#1a3a5c", label: "계획" },
          { color: "#1565c0", label: "수주" },
          { color: "#ff7043", label: "잔여" },
        ]}
      />
    </VariantCard>
  );
}

/* ---------- 3. Donut ---------- */

const DONUT_DATA = [
  { name: "수주", value: ordered, color: "#1565c0" },
  { name: "잔여", value: remaining, color: "#e0e8f0" },
];

function DonutVariant() {
  return (
    <VariantCard no={3} title="도넛 차트" desc="전체 원을 목표 100%로 보고 달성 부분을 채워 진행률 강조">
      <div style={{ height: "160px", position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={DONUT_DATA}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={66}
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {DONUT_DATA.map((row) => (
                <Cell key={row.name} fill={row.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: "11px" }} formatter={(v: any) => Number(v).toLocaleString()} />
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#1565c0" }}>{PCT}%</div>
          <div style={{ fontSize: "9px", color: "#888" }}>수주 {ordered.toLocaleString()}</div>
        </div>
      </div>
      <LegendRow
        items={[
          { color: "#1565c0", label: `수주 ${ordered.toLocaleString()}` },
          { color: "#e0e8f0", label: `잔여 ${remaining.toLocaleString()}` },
        ]}
      />
    </VariantCard>
  );
}

/* ---------- 4. Bullet ---------- */

function BulletVariant() {
  const max = planTotal;
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const midTarget = Math.round(planTotal * 0.7); // 연중 중간 목표(예시)
  return (
    <VariantCard no={4} title="불릿 그래프" desc="하나의 막대에 실적·중간 목표(세로선)·달성 범주(음영)를 함께 표시">
      <div style={{ height: "160px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontSize: "10px", fontWeight: 600, color: "#1a3a5c" }}>연간 수주 목표 달성</span>
          <span style={{ fontSize: "10px", color: "#555" }}>
            실적 <b style={{ color: "#1565c0" }}>{ordered.toLocaleString()}</b> / 계획 {planTotal.toLocaleString()}
          </span>
        </div>
        <div style={{ position: "relative", height: "24px", backgroundColor: "#fbe9e7", borderRadius: "2px" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "80%",
              backgroundColor: "#fff8e1",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "50%",
              backgroundColor: "#ffecb3",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "8px",
              height: "8px",
              width: pct(ordered),
              backgroundColor: "#1565c0",
              borderRadius: "1px",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: pct(midTarget),
              top: "2px",
              width: "2px",
              height: "20px",
              backgroundColor: "#1a3a5c",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3px" }}>
          <span style={{ fontSize: "8px", color: "#999" }}>0</span>
          <span style={{ fontSize: "8px", color: "#999" }}>
            중간 목표 {midTarget.toLocaleString()} (예시)
          </span>
          <span style={{ fontSize: "8px", color: "#999" }}>{planTotal.toLocaleString()}</span>
        </div>
        <div style={{ fontSize: "10px", color: "#555", marginTop: "10px" }}>
          현재 달성률 <b style={{ color: "#1565c0" }}>{PCT}%</b> — 중간 목표(70%) 대비{" "}
          <b style={{ color: ordered >= midTarget ? "#2e7d32" : "#e53935" }}>
            {ordered >= midTarget ? "달성" : "미달"}
          </b>
        </div>
      </div>
      <LegendRow
        items={[
          { color: "#ffecb3", label: "위험(~50%)" },
          { color: "#fff8e1", label: "주의(50~80%)" },
          { color: "#fbe9e7", label: "양호(80%~)" },
          { color: "#1565c0", label: "실적" },
          { color: "#1a3a5c", label: "중간 목표", type: "line" },
        ]}
      />
    </VariantCard>
  );
}

/* ---------- 5. Combo (monthly bars + cumulative % line) ---------- */

const MONTHLY_ORDERS = [180, 220, 200, 250, 190, 210]; // 합계 = 1,250 (예시 월별 분배)

const COMBO_ORDER_DATA = (() => {
  let cum = 0;
  return MONTHLY_ORDERS.map((v, i) => {
    cum += v;
    return {
      month: `${i + 1}월`,
      value: v,
      cumRate: Math.round((cum / planTotal) * 1000) / 10,
    };
  });
})();

function ComboOrderVariant() {
  return (
    <VariantCard no={5} title="콤보 차트" desc="월별 수주 실적(막대)과 누적 수주율(선, %) — 월별 분배는 예시 값">
      <div style={{ height: "160px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={COMBO_ORDER_DATA} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8f0f8" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#00897b" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              width={40}
            />
            <Tooltip contentStyle={{ fontSize: "11px" }} />
            <Bar
              yAxisId="left"
              dataKey="value"
              name="월별 수주"
              fill="#1565c0"
              barSize={18}
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumRate"
              name="누적 수주율(%)"
              stroke="#00897b"
              strokeWidth={2}
              dot={{ r: 3, fill: "#00897b" }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <LegendRow
        items={[
          { color: "#1565c0", label: "월별 수주" },
          { color: "#00897b", label: "누적 수주율(%)", type: "line" },
        ]}
      />
    </VariantCard>
  );
}

/* ---------- section ---------- */

export function OrderStatusChartVariants() {
  return (
    <div style={{ padding: "0 10px 10px" }}>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 700,
          color: "#1a3a5c",
          margin: "4px 2px 6px",
        }}
      >
        수주 실적 차트 대안 비교 (안 1~5)
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "6px",
          marginBottom: "6px",
        }}
      >
        <GaugeVariant />
        <HBarVariant />
        <DonutVariant />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "6px",
        }}
      >
        <BulletVariant />
        <ComboOrderVariant />
        <div />
      </div>
    </div>
  );
}
