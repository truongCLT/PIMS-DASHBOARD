import React from "react";
import {
  ComposedChart,
  BarChart,
  AreaChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
  Cell,
} from "recharts";
import { CASHFLOW_DATA } from "./CashFlowChart";

const START_BALANCE = 30;

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
            backgroundColor: "#1e6fdd",
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

/* ---------- 1. Waterfall ---------- */

const WATERFALL_DATA = (() => {
  const rows: { name: string; base: number; delta: number; kind: "total" | "up" | "down"; label: number }[] = [];
  rows.push({ name: "기초", base: 0, delta: START_BALANCE, kind: "total", label: START_BALANCE });
  let cum = START_BALANCE;
  for (const r of CASHFLOW_DATA) {
    const next = cum + r.net;
    rows.push({
      name: r.month,
      base: Math.min(cum, next),
      delta: Math.abs(r.net),
      kind: r.net >= 0 ? "up" : "down",
      label: r.net,
    });
    cum = next;
  }
  rows.push({ name: "기말", base: 0, delta: cum, kind: "total", label: cum });
  return rows;
})();

const WaterfallLabel = (props: any) => {
  const { x, y, width, index } = props;
  const row = WATERFALL_DATA[index];
  if (!row) return null;
  const text = row.kind === "total" ? `${row.label}` : row.label >= 0 ? `+${row.label}` : `${row.label}`;
  const fill = row.kind === "down" ? "#e53935" : row.kind === "up" ? "#1565c0" : "#1a3a5c";
  return (
    <text x={x + width / 2} y={y - 4} fill={fill} textAnchor="middle" fontSize={8} fontWeight="600">
      {text}
    </text>
  );
};

function WaterfallChart() {
  return (
    <VariantCard no={1} title="폭포 차트" desc="기초 잔액에서 월별 증감을 거쳐 기말 잔액까지의 과정">
      <div style={{ height: "160px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={WATERFALL_DATA} margin={{ top: 16, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8f0f8" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ fontSize: "11px" }}
              formatter={(_v: any, _n: any, entry: any) => {
                const row = entry?.payload as (typeof WATERFALL_DATA)[number] | undefined;
                return row ? [row.label, row.kind === "total" ? "잔액" : "증감"] : [_v, _n];
              }}
            />
            <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="delta" stackId="wf" barSize={22} isAnimationActive={false} radius={[2, 2, 0, 0]}>
              {WATERFALL_DATA.map((row) => (
                <Cell
                  key={row.name}
                  fill={row.kind === "total" ? "#1a3a5c" : row.kind === "up" ? "#1565c0" : "#e53935"}
                />
              ))}
              <LabelList content={WaterfallLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <LegendRow
        items={[
          { color: "#1a3a5c", label: "기초·기말 잔액" },
          { color: "#1565c0", label: "증가" },
          { color: "#e53935", label: "감소" },
        ]}
      />
    </VariantCard>
  );
}

/* ---------- 2. Stacked Bar ---------- */

const STACKED_DATA = CASHFLOW_DATA.map((r) => {
  const fixedCost = Math.round(r.outflow * 0.6);
  return {
    month: r.month,
    operating: r.inflow - r.loan,
    loan: r.loan,
    fixedCost,
    variableCost: r.outflow - fixedCost,
  };
});

function StackedBarVariant() {
  return (
    <VariantCard no={2} title="누적 막대 그래프" desc="유입(영업수입·차입금)과 유출(고정비·변동비)의 구성 비중 — 유출 분해는 예시 비율">
      <div style={{ height: "160px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={STACKED_DATA} stackOffset="sign" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8f0f8" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: "11px" }} />
            <ReferenceLine y={0} stroke="#ccc" />
            <Bar isAnimationActive={false} dataKey="operating" name="영업수입" stackId="cf" fill="#1565c0" barSize={20} />
            <Bar isAnimationActive={false} dataKey="loan" name="차입금" stackId="cf" fill="#64b5f6" barSize={20} />
            <Bar isAnimationActive={false} dataKey="fixedCost" name="고정비" stackId="cf" fill="#e53935" barSize={20} />
            <Bar isAnimationActive={false} dataKey="variableCost" name="변동비" stackId="cf" fill="#ef9a9a" barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <LegendRow
        items={[
          { color: "#1565c0", label: "영업수입" },
          { color: "#64b5f6", label: "차입금" },
          { color: "#e53935", label: "고정비" },
          { color: "#ef9a9a", label: "변동비" },
        ]}
      />
    </VariantCard>
  );
}

/* ---------- 3. Area Chart ---------- */

const AREA_DATA = CASHFLOW_DATA.map((r) => ({
  month: r.month,
  inflow: r.inflow,
  outflow: Math.abs(r.outflow),
  net: r.net,
}));

function AreaVariant() {
  return (
    <VariantCard no={3} title="영역 차트" desc="유입·유출의 격차와 순현금흐름의 흑자/적자 흐름">
      <div style={{ height: "160px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={AREA_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8f0f8" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: "11px" }} />
            <ReferenceLine y={0} stroke="#ccc" />
            <Area
isAnimationActive={false}               type="monotone"
              dataKey="inflow"
              name="자금 유입"
              stroke="#1565c0"
              strokeWidth={1.5}
              fill="#1565c0"
              fillOpacity={0.22}
            />
            <Area
isAnimationActive={false}               type="monotone"
              dataKey="outflow"
              name="자금 유출"
              stroke="#e53935"
              strokeWidth={1.5}
              fill="#e53935"
              fillOpacity={0.16}
            />
            <Line
isAnimationActive={false}               type="monotone"
              dataKey="net"
              name="순현금흐름"
              stroke="#4caf50"
              strokeWidth={1.5}
              dot={{ r: 3, fill: "#4caf50" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <LegendRow
        items={[
          { color: "#1565c0", label: "자금 유입" },
          { color: "#e53935", label: "자금 유출" },
          { color: "#4caf50", label: "순현금흐름", type: "line" },
        ]}
      />
    </VariantCard>
  );
}

/* ---------- 4. Combo (Column & Line) ---------- */

const COMBO_DATA = (() => {
  let cum = START_BALANCE;
  return CASHFLOW_DATA.map((r) => {
    cum += r.net;
    return { month: r.month, inflow: r.inflow, outflow: r.outflow, balance: cum };
  });
})();

function ComboVariant() {
  return (
    <VariantCard no={4} title="콤보 차트" desc="월별 유입·유출(막대)과 누적 현금 잔액(선)을 함께 표시">
      <div style={{ height: "160px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={COMBO_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8f0f8" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: "11px" }} />
            <ReferenceLine y={0} stroke="#ccc" />
            <Bar isAnimationActive={false} dataKey="inflow" name="자금 유입" fill="#1565c0" barSize={16} radius={[2, 2, 0, 0]} />
            <Bar isAnimationActive={false} dataKey="outflow" name="자금 유출" fill="#e53935" barSize={16} radius={[0, 0, 2, 2]} />
            <Line
isAnimationActive={false}               type="monotone"
              dataKey="balance"
              name="누적 현금 잔액"
              stroke="#1a3a5c"
              strokeWidth={2}
              dot={{ r: 3, fill: "#1a3a5c" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <LegendRow
        items={[
          { color: "#1565c0", label: "자금 유입" },
          { color: "#e53935", label: "자금 유출" },
          { color: "#1a3a5c", label: "누적 현금 잔액", type: "line" },
        ]}
      />
    </VariantCard>
  );
}

/* ---------- 5. Bullet Graph ---------- */

const totalInflow = CASHFLOW_DATA.reduce((s, r) => s + r.inflow, 0);
const totalOutflow = Math.abs(CASHFLOW_DATA.reduce((s, r) => s + r.outflow, 0));
const totalNet = CASHFLOW_DATA.reduce((s, r) => s + r.net, 0);

const BULLET_ROWS = [
  { label: "누적 자금 유입", value: totalInflow, target: 200, max: 240, good: true },
  { label: "누적 자금 유출", value: totalOutflow, target: 110, max: 240, good: false },
  { label: "순현금흐름", value: totalNet, target: 40, max: 60, good: true },
];

function BulletRow({ row }: { row: (typeof BULLET_ROWS)[number] }) {
  const pct = (v: number) => `${Math.min(100, (v / row.max) * 100)}%`;
  const met = row.good ? row.value >= row.target : row.value <= row.target;
  const barColor = met ? "#1565c0" : "#e53935";
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
        <span style={{ fontSize: "10px", fontWeight: 600, color: "#1a3a5c" }}>{row.label}</span>
        <span style={{ fontSize: "10px", color: "#555" }}>
          실적 <b style={{ color: barColor }}>{row.value}</b> / 목표 {row.target}
        </span>
      </div>
      <div style={{ position: "relative", height: "14px", backgroundColor: "#eef2f7", borderRadius: "2px" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: pct(row.max * 0.75),
            backgroundColor: "#e2e9f1",
            borderRadius: "2px",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: pct(row.max * 0.5),
            backgroundColor: "#d3dde9",
            borderRadius: "2px",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "4px",
            height: "6px",
            width: pct(row.value),
            backgroundColor: barColor,
            borderRadius: "1px",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: pct(row.target),
            top: "1px",
            width: "2px",
            height: "12px",
            backgroundColor: "#1a3a5c",
          }}
        />
      </div>
    </div>
  );
}

function BulletVariant() {
  return (
    <VariantCard no={5} title="불릿 그래프" desc="상반기 누계 기준 목표(세로선) 대비 실적(막대) 비교">
      <div style={{ height: "160px", paddingTop: "12px" }}>
        {BULLET_ROWS.map((row) => (
          <BulletRow key={row.label} row={row} />
        ))}
      </div>
      <LegendRow
        items={[
          { color: "#1565c0", label: "실적(목표 달성)" },
          { color: "#e53935", label: "실적(목표 미달)" },
          { color: "#1a3a5c", label: "목표" },
        ]}
      />
    </VariantCard>
  );
}

/* ---------- section ---------- */

export function CashFlowChartVariants() {
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
        자금수지 차트 대안 비교 (안 1~5)
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "6px",
          marginBottom: "6px",
        }}
      >
        <WaterfallChart />
        <StackedBarVariant />
        <AreaVariant />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "6px",
        }}
      >
        <ComboVariant />
        <BulletVariant />
        <div />
      </div>
    </div>
  );
}
