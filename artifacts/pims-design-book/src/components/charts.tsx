import React from 'react';
import { ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Legend, Tooltip, ResponsiveContainer, LabelList, ReferenceLine } from 'recharts';

export function SvgDonut({ percent = 78 }: { percent?: number }) {
  const size = 110;
  const stroke = 14;
  const color = '#2f7cf6';
  const track = '#e2e9f3';
  const labelColor = '#16294a';
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = (p: number) => (Math.min(Math.max(p, 0), 100) / 100) * c;
  
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
        strokeDasharray={`${arc(percent)} ${c}`}
        strokeLinecap="butt"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="20"
        fontWeight="700"
        fill={labelColor}
      >
        {percent}%
      </text>
    </svg>
  );
}

export function DoubleSvgDonut() {
  const size = 120;
  const plan = 65;
  const actual = 58;
  const planColor = '#2f7cf6';
  const actualColor = '#35c7c0';
  const track = '#e2e9f3';
  
  const rOuter = 50;
  const cOuter = 2 * Math.PI * rOuter;
  const arcOuter = (plan / 100) * cOuter;
  
  const rInner = 36;
  const cInner = 2 * Math.PI * rInner;
  const arcInner = (actual / 100) * cInner;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: planColor, marginBottom: '8px' }}>
        계획 A {plan}%
      </div>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer Ring */}
        <circle cx={size/2} cy={size/2} r={rOuter} fill="none" stroke={planColor} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${arcOuter} ${cOuter}`} transform={`rotate(-90 ${size/2} ${size/2})`} />
        
        {/* Inner Track */}
        <circle cx={size/2} cy={size/2} r={rInner} fill="none" stroke={track} strokeWidth={16} />
        {/* Inner Ring */}
        <circle cx={size/2} cy={size/2} r={rInner} fill="none" stroke={actualColor} strokeWidth={16} strokeLinecap="butt" strokeDasharray={`${arcInner} ${cInner}`} transform={`rotate(-90 ${size/2} ${size/2})`} />
        
        {/* Text */}
        <text x={size/2} y={size/2 - 4} textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="700" fill="#16294a">
          {actual}%
        </text>
        <text x={size/2} y={size/2 + 12} textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="400" fill="#7c8ba3">
          실적
        </text>
      </svg>
    </div>
  )
}

function MiniBar({ value, max, color, label, valueLabel, valueOnTop }: any) {
  const height = 90;
  const width = 18;
  const h = max > 0 ? Math.max((value / max) * height, 2) : 2;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
      <div style={{ height: `${height}px`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
        {valueOnTop && valueLabel != null && (
          <span style={{ fontSize: "11px", color: "#16294a", fontWeight: 700, whiteSpace: "nowrap", marginBottom: "3px" }}>
            {valueLabel}
          </span>
        )}
        <div style={{ width: `${width}px`, height: `${h}px`, backgroundColor: color, borderRadius: "2px 2px 0 0" }} />
      </div>
      <span style={{ fontSize: "9px", color: "#555", whiteSpace: "nowrap", minHeight: "13px", display: 'flex', alignItems: 'center' }}>{label}</span>
      {!valueOnTop && valueLabel != null && <span style={{ fontSize: "9px", color: "#333", fontWeight: 600 }}>{valueLabel}</span>}
    </div>
  );
}

export function MonthlyMiniBars() {
  const data = [
    { m: '1월', plan: 10, actual: 9 },
    { m: '2월', plan: 25, actual: 20 },
    { m: '3월', plan: 45, actual: 48 },
    { m: '4월', plan: 60, actual: 65 },
    { m: '5월', plan: 80, actual: 75 },
    { m: '6월', plan: 100, actual: 88 },
  ];
  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      {data.map(d => (
        <div key={d.m} style={{ display: 'flex', gap: '4px' }}>
          <MiniBar value={d.plan} max={100} color="#2f7cf6" label={d.m} valueLabel={`${d.plan}`} valueOnTop={true} />
          <MiniBar value={d.actual} max={100} color="#35c7c0" label="" valueLabel={`${d.actual}`} valueOnTop={true} />
        </div>
      ))}
    </div>
  )
}

export function ProgressChart() {
  const data = [
    { name: "'25.01", planM: 8, actualM: 7, planC: 20, actualC: 19 },
    { name: "'25.02", planM: 10, actualM: 9, planC: 30, actualC: 28 },
    { name: "'25.03", planM: 12, actualM: 11, planC: 42, actualC: 39 },
    { name: "'25.04", planM: 11, actualM: 10, planC: 53, actualC: 49 },
    { name: "'25.05", planM: 9, actualM: 10, planC: 62, actualC: 59 },
    { name: "'25.06", planM: 8, actualM: 9, planC: 70, actualC: 68 },
    { name: "'25.07", planM: 5, actualM: 7, planC: 75, actualC: 75 },
  ];
  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7f1fd" />
          <XAxis dataKey="name" axisLine={{ stroke: '#e2e9f3' }} tickLine={false} tick={{ fontSize: 10, fill: '#7c8ba3' }} dy={5} />
          <YAxis yAxisId="left" hide domain={[0, 'auto']} />
          <YAxis yAxisId="right" orientation="right" hide domain={[0, 100]} />
          <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e9f3' }} cursor={{ fill: '#eef2f7' }} />
          <Legend wrapperStyle={{ fontSize: '11px', color: '#7c8ba3' }} iconType="circle" />
          <Bar yAxisId="left" dataKey="planM" name="월별 계획" fill="#2f7cf6" barSize={12} radius={[2,2,0,0]} isAnimationActive={false} />
          <Bar yAxisId="left" dataKey="actualM" name="월별 실적" fill="#82c4f5" barSize={12} radius={[2,2,0,0]} isAnimationActive={false} />
          <Line yAxisId="right" type="monotone" dataKey="planC" name="누계 계획" stroke="#35c7c0" strokeWidth={2} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
          <Line yAxisId="right" type="monotone" dataKey="actualC" name="누계 실적" stroke="#f0b429" strokeWidth={2} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RevenueChart() {
  const data = [
    { name: "'25.01", actualM: 2000, actualC: 2000 },
    { name: "'25.02", actualM: 3000, actualC: 5000 },
    { name: "'25.03", actualM: 4000, actualC: 9000 },
    { name: "'25.04", actualM: 5500, actualC: 14500 },
    { name: "'25.05", actualM: 6000, actualC: 20500 },
    { name: "'25.06", actualM: 4500, actualC: 25000 },
    { name: "'25.07", actualM: 3000, actualC: 28000 },
  ];
  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7f1fd" />
          <XAxis dataKey="name" axisLine={{ stroke: '#e2e9f3' }} tickLine={false} tick={{ fontSize: 10, fill: '#7c8ba3' }} dy={5} />
          <YAxis yAxisId="left" hide domain={[0, 8000]} />
          <YAxis yAxisId="right" orientation="right" hide domain={[0, 35000]} />
          <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e9f3' }} cursor={{ fill: '#eef2f7' }} />
          <Legend wrapperStyle={{ fontSize: '11px', color: '#7c8ba3' }} iconType="circle" />
          <Bar yAxisId="left" dataKey="actualM" name="월별 실적" fill="#2f7cf6" barSize={22} radius={[2,2,0,0]} isAnimationActive={false}>
            <LabelList dataKey="actualM" position="top" fill="#7c8ba3" fontSize={10} formatter={(val: number) => (val/1000).toFixed(1)} />
          </Bar>
          <Area yAxisId="right" type="monotone" dataKey="actualC" name="누계 실적" stroke="#f2736a" fill="#f2736a" fillOpacity={0.15} isAnimationActive={false}>
             <LabelList dataKey="actualC" position="top" offset={8} fill="#f2736a" fontSize={10} formatter={(val: number) => (val/1000).toFixed(1)} />
          </Area>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CashflowChart() {
  const data = [
    { name: "'25.01", cashIn: 500, cashOut: -300, balance: 200 },
    { name: "'25.02", cashIn: 600, cashOut: -400, balance: 400 },
    { name: "'25.03", cashIn: 800, cashOut: -500, balance: 700 },
    { name: "'25.04", cashIn: 700, cashOut: -600, balance: 800 },
    { name: "'25.05", cashIn: 550, cashOut: -350, balance: 1000 },
  ];
  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} stackOffset="sign" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7f1fd" />
          <XAxis dataKey="name" axisLine={{ stroke: '#e2e9f3' }} tickLine={false} tick={{ fontSize: 10, fill: '#7c8ba3' }} dy={5} />
          <YAxis hide domain={[-1000, 1500]} />
          <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e9f3' }} cursor={{ fill: '#eef2f7' }} />
          <Legend wrapperStyle={{ fontSize: '11px', color: '#7c8ba3' }} iconType="circle" />
          <ReferenceLine y={0} stroke="#f0b429" strokeDasharray="3 3" />
          <Bar dataKey="cashIn" name="자금 유입" fill="#2f7cf6" stackId="cash" barSize={20} radius={[2,2,0,0]} isAnimationActive={false} />
          <Bar dataKey="cashOut" name="자금 유출" fill="#35c7c0" stackId="cash" barSize={20} radius={[0,0,2,2]} isAnimationActive={false} />
          <Line type="monotone" dataKey="balance" name="누적 잔액" stroke="#35c7c0" strokeWidth={2} dot={{ r: 4, fill: '#fff', strokeWidth: 2, stroke: '#35c7c0' }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BudgetBars() {
  const data = [
    { label: '외주성', budget: 5000, plan: 3200, actual: 2800 },
    { label: 'Common', budget: 2000, plan: 1500, actual: 1200 },
    { label: 'Expense 1', budget: 800, plan: 600, actual: 700 }, // Exceeds plan
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {data.map(item => {
        const pPct = Math.min((item.plan / item.budget) * 100, 100);
        const aPct = Math.min((item.actual / item.budget) * 100, 100);
        const isExceed = item.actual > item.plan;
        
        return (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '80px', fontSize: '12px', color: '#333', fontWeight: 500 }}>{item.label}</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e9f3', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pPct}%`, backgroundColor: '#e0655c', borderRadius: '3px' }} />
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e9f3', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${aPct}%`, backgroundColor: isExceed ? '#1c9e6e' : '#2f7cf6', borderRadius: '3px' }} />
              </div>
            </div>
            <div style={{ width: '80px', textAlign: 'right', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px', fontFamily: 'Menlo, monospace' }}>
              <span style={{ color: '#e0655c', fontWeight: 600 }}>{item.plan.toLocaleString()}</span>
              <span style={{ color: isExceed ? '#1c9e6e' : '#2f7cf6', fontWeight: 600 }}>{item.actual.toLocaleString()}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
