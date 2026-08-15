import React from 'react';
import { SectionHeader, SectionCard } from '../components/shared';

const types = [
  { role: '카드 제목 (sectionTitle)', size: '16px', weight: 700, color: '#2f7cf6', sample: '매출 실적 및 전망' },
  { role: '핵심 결과값 (keyValue)', size: '15px', weight: 800, color: '#16294a', sample: '42,060 천 USD' },
  { role: '달성률 (achievement ≥100%)', size: '14px', weight: 800, color: '#1c9e6e', sample: '132%' },
  { role: '달성률 (achievement <100%)', size: '14px', weight: 800, color: '#e0655c', sample: '87%' },
  { role: '본문/라벨 (body)', size: '12px', weight: 400, color: '#333333', sample: '공정 계획 대비 실적' },
  { role: '보조 캡션 (caption)', size: '11px', weight: 400, color: '#7c8ba3', sample: '단위: 천 USD' },
  { role: '보조 캡션 (caption bold)', size: '11px', weight: 600, color: '#333333', sample: '계획' },
  { role: '축 눈금 (axis tick)', size: '10px', weight: 400, color: '#7c8ba3', sample: "'25.07" },
  { role: '마이크로 라벨', size: '9px', weight: 400, color: '#555555', sample: '3월' },
];

function TypographySample({ role, size, weight, color, sample }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #eef2f7' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '300px', flexShrink: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#16294a' }}>{role}</div>
        <div style={{ fontSize: '11px', color: '#7c8ba3', fontFamily: 'Menlo, monospace', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
          {size} / {weight} / {color}
        </div>
      </div>
      <div style={{ flex: 1, fontSize: size, fontWeight: weight, color: color, display: 'flex', alignItems: 'center' }}>
        {sample}
      </div>
    </div>
  )
}

export default function Typography() {
  return (
    <section id="typography" className="scroll-mt-12">
      <SectionHeader title="타이포그래피 (Typography)" />
      <SectionCard title="폰트 패밀리: Inter, sans-serif">
        <div className="flex flex-col">
          {types.map((type, idx) => (
            <TypographySample key={idx} {...type} />
          ))}
        </div>
      </SectionCard>
    </section>
  )
}
