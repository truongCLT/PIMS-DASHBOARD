import React from 'react';

export const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  border: '1px solid #e2e9f3',
  borderRadius: '8px',
  padding: '24px',
};

export function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-[24px] font-bold text-[#16294a] mb-6">{title}</h2>;
}

export function SectionCard({ title, children }: { title?: string, children: React.ReactNode }) {
  return (
    <div style={cardStyle} className="shadow-sm flex flex-col">
      {title && <h3 className="text-[16px] font-bold text-[#16294a] border-b border-[#eef2f7] pb-4 mb-4">{title}</h3>}
      {children}
    </div>
  )
}

export function Annotation({ text }: { text: string }) {
  return (
    <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontFamily: 'Menlo, monospace', fontSize: '11px', color: '#475569', display: 'inline-block' }}>
      {text}
    </span>
  )
}
