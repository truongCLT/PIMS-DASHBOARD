import React from 'react';
import { SectionHeader, SectionCard } from '../components/shared';

const colorGroups = [
  { group: 'chartTheme.ts (차트 팔레트)', items: [
    { name: 'planBlue', hex: '#2f7cf6', desc: '계획 (plan)' },
    { name: 'actualGreen', hex: '#35c7c0', desc: '실적/전망 (actual/forecast)' },
    { name: 'rateOrange', hex: '#5fe0a8', desc: '달성률 (achievement rate)' },
    { name: 'profitNavy', hex: '#2f7cf6', desc: '영업이익 막대' },
    { name: 'profitGreen', hex: '#35c7c0', desc: '영업외손익' },
    { name: 'profitLight', hex: '#e7f1fd', desc: '판관비 fill' },
    { name: 'sgaOrange', hex: '#f0b429', desc: '판관비 브래킷' },
    { name: 'inflowBlue', hex: '#2f7cf6', desc: '자금 유입' },
    { name: 'outflowRed', hex: '#f2736a', desc: '자금 유출' },
    { name: 'balanceNavy', hex: '#16294a', desc: '누적 잔액' },
    { name: 'neutralGray', hex: '#dde6f1', desc: '중립/보조' },
    { name: 'lightGray', hex: '#e2e9f3', desc: '라이트 그레이' },
    { name: 'lightBlue', hex: '#82c4f5', desc: '월별 실적 바 (공정 라이프사이클)' },
    { name: 'paleBlue', hex: '#a9d4f0', desc: '도넛 보조 라이트' },
    { name: 'trackGray', hex: '#e2e9f3', desc: '도넛 트랙' },
    { name: 'titleNavy', hex: '#16294a', desc: '차트 제목' },
    { name: 'headingNavy', hex: '#16294a', desc: '카드 소제목/강조 텍스트' },
    { name: 'linkBlue', hex: '#2f7cf6', desc: '링크/버튼 파랑' },
    { name: 'axisText', hex: '#7c8ba3', desc: '축 눈금' },
    { name: 'gridLine', hex: '#e7f1fd', desc: '그리드 라인' },
    { name: 'axisLine', hex: '#e2e9f3', desc: '축 라인' },
    { name: 'zeroLine', hex: '#dde6f1', desc: '0 기준선' },
  ]},
  { group: 'uiTokens.ts (UI 팔레트)', items: [
    { name: 'ACHIEVE_GREEN', hex: '#1c9e6e', desc: '달성 (≥100%)' },
    { name: 'ACHIEVE_RED', hex: '#e0655c', desc: '미달 (<100%)' },
    { name: 'INK_NAVY', hex: '#16294a', desc: '본문 강조 텍스트' },
    { name: 'INK_MUTED', hex: '#7c8ba3', desc: '보조 텍스트/축' },
    { name: 'POINT_BLUE', hex: '#2f7cf6', desc: '포인트/링크/제목' },
    { name: 'CARD_BORDER', hex: '#e2e9f3', desc: '카드 테두리' },
  ]},
  { group: '기타 배경', items: [
    { name: 'Dashboard bg', hex: '#eef2f7', desc: '대시보드 배경' },
  ]}
];

function ColorSwatch({ name, hex, desc }: { name: string, hex: string, desc: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ width: '48px', height: '48px', backgroundColor: hex, borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#16294a' }}>{name}</div>
        <div style={{ fontSize: '11px', color: '#7c8ba3', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Menlo, monospace', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#475569' }}>{hex}</span>
          <span>{desc}</span>
        </div>
      </div>
    </div>
  )
}

export default function ColorTokens() {
  return (
    <section id="color-tokens" className="scroll-mt-12">
      <SectionHeader title="컬러 토큰 (Color Tokens)" />
      <div className="flex flex-col gap-6">
        {colorGroups.map((group, idx) => (
          <SectionCard key={idx} title={group.group}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8">
              {group.items.map(item => (
                <ColorSwatch key={item.name} {...item} />
              ))}
            </div>
          </SectionCard>
        ))}
      </div>
    </section>
  )
}
