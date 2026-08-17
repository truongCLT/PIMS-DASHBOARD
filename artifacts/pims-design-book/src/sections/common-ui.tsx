import React from 'react';
import { SectionHeader } from '../components/shared';
import { Badge, CardExample, CardHeaderExample, TableExample, EmptyStateExample, ElapsedTimeBarExample } from '../components/ui';

function UIComponentCard({ title, location, children, description }: { title: string, location: string, children: React.ReactNode, description: string }) {
  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e2e9f3', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#16294a', marginBottom: '6px' }}>{title}</h3>
        <p style={{ fontSize: '12px', color: '#7c8ba3' }}>사용처: {location}</p>
      </div>
      
      <div style={{ padding: '32px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {children}
      </div>
      
      <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
        {description}
      </div>
    </div>
  )
}

export default function CommonUI() {
  return (
    <section id="common-ui" className="scroll-mt-12">
      <SectionHeader title="공통 UI (Common UI)" />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UIComponentCard 
          title="Badge — 달성률 뱃지"
          location="카드 헤더, 핵심 지표 우측 상단 등"
          description="초과 달성은 1c9e6e, 미달은 e0655c 색상 적용. 10% 불투명도의 배경과 20% 불투명도의 테두리 사용 (ex. #1c9e6e14, #1c9e6e33)."
        >
          <div className="flex gap-4">
            <Badge type="achieved" text="132% 달성" />
            <Badge type="miss" text="87% 달성" />
            <Badge type="neutral" text="기준월" />
          </div>
        </UIComponentCard>

        <UIComponentCard 
          title="카드 공통 스타일 (cardStyle)"
          location="대시보드 내 모든 패널 (Overview, 공정, 원가 등)"
          description="bg #fff, border 1px solid #e2e9f3, borderRadius 8px, padding 10px 12px, boxShadow: 0 2px 10px rgba(22,41,74,0.06)"
        >
          <CardExample />
        </UIComponentCard>

        <UIComponentCard 
          title="CardHeader — 카드 공통 헤더"
          location="개별 카드 타이틀 영역"
          description="좌측에 sectionTitle(16px/700/#2f7cf6)과 단위 캡션, 우측에 뱃지 혹은 액션 버튼 배치."
        >
          <CardHeaderExample />
        </UIComponentCard>

        <UIComponentCard 
          title="테이블 스타일"
          location="원가 현황, 외주 집행 등 리스트 데이터"
          description="헤더(11px, 600, #333, 밑줄 2px), 로우(12px, 밑줄 1px #eef2f7). 간결하고 타이트한 패딩(8-10px)."
        >
          <TableExample />
        </UIComponentCard>
        
        <UIComponentCard 
          title="데이터 없음 (Empty State)"
          location="차트 및 테이블 데이터 없을 시 폴백"
          description="padding 40px 12px, textAlign center, fontSize 13px, color #7c8ba3"
        >
          <EmptyStateExample />
        </UIComponentCard>

        <UIComponentCard 
          title="공기율 수평 진행 바 (Elapsed Time Bar)"
          location="용역 프로젝트 대시보드 공기율 등"
          description="높이 10px 둥근 트랙(#e2e7ee), 내부에 둥근 진행 표시 바(#2f7cf6), 우측에 진행률 숫자(13px 800)."
        >
          <ElapsedTimeBarExample />
        </UIComponentCard>
      </div>
    </section>
  )
}
