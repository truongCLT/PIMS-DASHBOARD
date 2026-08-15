import React from 'react';
import { SectionHeader, Annotation } from '../components/shared';
import { SvgDonut, DoubleSvgDonut, MonthlyMiniBars, ProgressChart, RevenueChart, CashflowChart, BudgetBars } from '../components/charts';

function ChartCard({ title, location, children, tokens, lib }: { title: string, location: string, children: React.ReactNode, tokens: string[], lib: string }) {
  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e2e9f3', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#16294a', marginBottom: '6px' }}>{title}</h3>
        <p style={{ fontSize: '12px', color: '#7c8ba3' }}>사용처: {location}</p>
      </div>
      
      <div style={{ padding: '32px', backgroundColor: '#fafbfc', borderRadius: '8px', border: '1px solid #eef2f7', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        {children}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '11px', color: '#7c8ba3', fontWeight: 600, textTransform: 'uppercase' }}>개발 정보</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <Annotation text={`Library: ${lib}`} />
          {tokens.map(t => <Annotation key={t} text={t} />)}
        </div>
      </div>
    </div>
  )
}

export default function ChartGallery() {
  return (
    <section id="chart-gallery" className="scroll-mt-12">
      <SectionHeader title="차트 갤러리 (Chart Gallery)" />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard 
          title="Chart 1: 단일 링 달성률 (SVG Donut)"
          location="OverviewTab (공정률 달성, 외주 집행률), CostingTab"
          lib="Custom SVG"
          tokens={['planBlue: #2f7cf6', 'trackGray: #e2e9f3', 'titleNavy: #16294a']}
        >
          <SvgDonut percent={78} />
        </ChartCard>

        <ChartCard 
          title="Chart 2: 누계 계획/실적 (이중링 Donut)"
          location="OverviewTab (누계 공정률)"
          lib="Custom SVG"
          tokens={['planBlue: #2f7cf6', 'actualGreen: #35c7c0', 'trackGray: #e2e9f3', 'titleNavy: #16294a']}
        >
          <DoubleSvgDonut />
        </ChartCard>

        <ChartCard 
          title="Chart 3: 월별 계획 대비 실적 수직 바 (MiniBar)"
          location="OverviewTab (당월 공정), ServiceProjectDashboard"
          lib="Custom CSS/DOM"
          tokens={['planBlue: #2f7cf6', 'actualGreen: #35c7c0', 'titleNavy: #16294a']}
        >
          <MonthlyMiniBars />
        </ChartCard>

        <ChartCard 
          title="Chart 7: 예산 집행 (CSS 수평 이중 바)"
          location="ServiceBudgetTab, CostingTab"
          lib="Custom CSS/DOM"
          tokens={['planBlue: #2f7cf6 (실적 바)', 'ACHIEVE_RED: #e0655c (미달/계획 바)', 'ACHIEVE_GREEN: #1c9e6e (초과달성 강조)', 'trackGray: #e2e9f3 (트랙)']}
        >
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <BudgetBars />
          </div>
        </ChartCard>
        
        <div className="lg:col-span-2">
          <ChartCard 
            title="Chart 4: 라이프사이클 공정 (Recharts 바 + 라인)"
            location="ConstructionProgressTab"
            lib="Recharts (ComposedChart)"
            tokens={['planBlue: #2f7cf6 (월별 계획 바)', 'lightBlue: #82c4f5 (월별 실적 바)', 'profitGreen: #35c7c0 (누계 계획 라인)', 'sgaOrange: #f0b429 (누계 실적 라인)', 'axisText: #7c8ba3', 'gridLine: #e7f1fd']}
          >
            <ProgressChart />
          </ChartCard>
        </div>

        <div className="lg:col-span-2">
          <ChartCard 
            title="Chart 5: 월별 매출 (Recharts 바 + 에어리어)"
            location="SaleProfitTab (월별 매출)"
            lib="Recharts (ComposedChart)"
            tokens={['planBlue: #2f7cf6', 'outflowRed: #f2736a', 'axisText: #7c8ba3', 'gridLine: #e7f1fd']}
          >
            <RevenueChart />
          </ChartCard>
        </div>

        <div className="lg:col-span-2">
          <ChartCard 
            title="Chart 6: 자금수지 (Recharts 스택 바 + 라인)"
            location="ServiceCashflowTab"
            lib="Recharts (ComposedChart)"
            tokens={['inflowBlue: #2f7cf6', 'actualGreen: #35c7c0', 'sgaOrange: #f0b429', 'gridLine: #e7f1fd']}
          >
            <CashflowChart />
          </ChartCard>
        </div>
      </div>
    </section>
  )
}
