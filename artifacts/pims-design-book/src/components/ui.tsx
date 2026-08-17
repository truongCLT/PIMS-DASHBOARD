import React from 'react';

export function Badge({ type, text }: { type: 'achieved' | 'miss' | 'neutral', text: string }) {
  const styles = {
    achieved: { color: '#1c9e6e', bg: '#1c9e6e14', border: '#1c9e6e33' },
    miss: { color: '#e0655c', bg: '#e0655c14', border: '#e0655c33' },
    neutral: { color: '#16294a', bg: '#16294a14', border: '#16294a33' },
  }[type];

  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 700,
      color: styles.color,
      backgroundColor: styles.bg,
      border: `1px solid ${styles.border}`,
      borderRadius: '10px',
      padding: '2px 8px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      whiteSpace: 'nowrap'
    }}>
      {text}
    </span>
  )
}

export function CardExample() {
  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e2e9f3', borderRadius: '8px', padding: '10px 12px', boxShadow: '0 2px 10px rgba(22,41,74,0.06)', width: '100%', maxWidth: '300px' }}>
      <div style={{ fontSize: '14px', color: '#16294a', fontWeight: 600, marginBottom: '8px' }}>카드 컴포넌트 샘플</div>
      <div style={{ fontSize: '12px', color: '#7c8ba3' }}>이 카드는 실제 대시보드에서 사용되는 기본 카드 컨테이너의 형태를 보여줍니다.</div>
    </div>
  )
}

export function CardHeaderExample() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '300px', backgroundColor: '#fff', border: '1px solid #e2e9f3', borderRadius: '8px', padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#2f7cf6', margin: 0 }}>공정률 %</h4>
        <span style={{ fontSize: '11px', color: '#7c8ba3' }}>단위: %</span>
      </div>
      <Badge type="achieved" text="132% 달성" />
    </div>
  )
}

export function TableExample() {
  return (
    <div style={{ width: '100%', overflow: 'hidden', border: '1px solid #e2e9f3', borderRadius: '8px', backgroundColor: '#fff' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#333', borderBottom: '2px solid #e2e9f3' }}>구분</th>
            <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#333', borderBottom: '2px solid #e2e9f3', textAlign: 'right' }}>예산</th>
            <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#333', borderBottom: '2px solid #e2e9f3', textAlign: 'right' }}>계획</th>
            <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#333', borderBottom: '2px solid #e2e9f3', textAlign: 'right' }}>실적</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '10px 12px', fontSize: '12px', color: '#333', borderBottom: '1px solid #eef2f7' }}>외주성</td>
            <td style={{ padding: '10px 12px', fontSize: '12px', color: '#333', borderBottom: '1px solid #eef2f7', textAlign: 'right' }}>5,000</td>
            <td style={{ padding: '10px 12px', fontSize: '12px', color: '#333', borderBottom: '1px solid #eef2f7', textAlign: 'right' }}>3,200</td>
            <td style={{ padding: '10px 12px', fontSize: '12px', color: '#333', borderBottom: '1px solid #eef2f7', textAlign: 'right' }}>2,800</td>
          </tr>
          <tr style={{ backgroundColor: '#fafbfc' }}>
            <td style={{ padding: '10px 12px', fontSize: '12px', color: '#333', borderBottom: '1px solid #eef2f7' }}>경비</td>
            <td style={{ padding: '10px 12px', fontSize: '12px', color: '#333', borderBottom: '1px solid #eef2f7', textAlign: 'right' }}>2,000</td>
            <td style={{ padding: '10px 12px', fontSize: '12px', color: '#333', borderBottom: '1px solid #eef2f7', textAlign: 'right' }}>1,500</td>
            <td style={{ padding: '10px 12px', fontSize: '12px', color: '#333', borderBottom: '1px solid #eef2f7', textAlign: 'right' }}>1,200</td>
          </tr>
          <tr>
            <td style={{ padding: '10px 12px', fontSize: '12px', color: '#333', borderBottom: '1px solid #eef2f7' }}>기타</td>
            <td style={{ padding: '10px 12px', fontSize: '12px', color: '#333', borderBottom: '1px solid #eef2f7', textAlign: 'right' }}>800</td>
            <td style={{ padding: '10px 12px', fontSize: '12px', color: '#333', borderBottom: '1px solid #eef2f7', textAlign: 'right' }}>600</td>
            <td style={{ padding: '10px 12px', fontSize: '12px', color: '#333', borderBottom: '1px solid #eef2f7', textAlign: 'right' }}>700</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function EmptyStateExample() {
  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e2e9f3', borderRadius: '8px', width: '100%' }}>
      <div style={{ padding: '40px 12px', textAlign: 'center', fontSize: '13px', color: '#7c8ba3' }}>
        해당 기간에 데이터가 없습니다.
      </div>
    </div>
  )
}

export function ElapsedTimeBarExample() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '300px', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e9f3' }}>
      <div style={{ flex: 1, height: '10px', backgroundColor: '#e2e7ee', borderRadius: '5px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '68%', backgroundColor: '#2f7cf6', borderRadius: '5px' }} />
      </div>
      <div style={{ fontSize: '13px', fontWeight: 800, color: '#2f7cf6', width: '30px', textAlign: 'right' }}>
        68%
      </div>
    </div>
  )
}
