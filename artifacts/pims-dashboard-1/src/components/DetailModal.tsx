import React, { useState } from "react";
import { X } from "lucide-react";
import { INK_NAVY, INK_SECONDARY, INK_MUTED, CARD_BORDER, DIVIDER } from "../lib/uiTokens";

export function DetailModal({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(20,35,60,0.45)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          boxShadow: "0 12px 40px rgba(10,25,50,0.25)",
          width: "min(920px, 100%)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid #e2e9f3",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: INK_NAVY }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: "11px", color: INK_MUTED, marginTop: "2px" }}>{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: INK_MUTED,
              padding: "4px",
              display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 18px", overflow: "auto" }}>{children}</div>
      </div>
    </div>
  );
}

export interface DetailColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  format?: (value: T[keyof T] | undefined, row: T) => React.ReactNode;
}

export function DetailDataTable<T extends object>({
  columns,
  rows,
  rowKey,
  onRowClick,
  isRowClickable,
}: {
  columns: DetailColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  /** 행 클릭 핸들러. 제공 시 클릭 가능한 행 스타일이 적용됩니다. */
  onRowClick?: (row: T, index: number) => void;
  /** 특정 행만 클릭 가능하게 제한. 기본적으로 onRowClick이 있으면 모든 행이 클릭 가능 */
  isRowClickable?: (row: T) => boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const hasClick = !!onRowClick;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr style={{ backgroundColor: "#e7f1fd" }}>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  padding: "6px 10px",
                  textAlign: c.align ?? "right",
                  color: INK_SECONDARY,
                  fontWeight: 600,
                  borderBottom: `1px solid ${CARD_BORDER}`,
                  whiteSpace: "nowrap",
                }}
              >
                {c.label}
              </th>
            ))}
            {/* 드릴다운 화살표 헤더 자리 */}
            {hasClick && (
              <th style={{ width: 22, borderBottom: `1px solid ${CARD_BORDER}` }} />
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (hasClick ? 1 : 0)}
                style={{ padding: "16px", textAlign: "center", color: INK_MUTED }}
              >
                -
              </td>
            </tr>
          ) : (
            rows.map((row, i) => {
              const clickable = hasClick && (!isRowClickable || isRowClickable(row));
              return (
                <tr
                  key={rowKey(row, i)}
                  onClick={clickable ? () => onRowClick!(row, i) : undefined}
                  onMouseEnter={clickable ? () => setHoveredIdx(i) : undefined}
                  onMouseLeave={clickable ? () => setHoveredIdx(null) : undefined}
                  style={{
                    backgroundColor:
                      hoveredIdx === i && clickable
                        ? "#eef4ff"
                        : i % 2 === 0
                          ? "#fff"
                          : "#f8fbff",
                    cursor: clickable ? "pointer" : undefined,
                    transition: "background-color 0.1s",
                  }}
                >
                  {columns.map((c) => {
                    const raw = row[c.key as keyof T];
                    const content = c.format
                      ? c.format(raw, row)
                      : typeof raw === "number"
                        ? raw.toLocaleString()
                        : (raw as React.ReactNode) ?? "-";
                    return (
                      <td
                        key={c.key}
                        style={{
                          padding: "5px 10px",
                          textAlign: c.align ?? "right",
                          color: "#333",
                          borderBottom: "1px solid #eef2f7",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {content}
                      </td>
                    );
                  })}
                  {/* 드릴다운 화살표 셀 */}
                  {hasClick && (
                    <td
                      style={{
                        padding: "5px 6px",
                        borderBottom: `1px solid ${DIVIDER}`,
                        textAlign: "center",
                        color: clickable ? INK_MUTED : "transparent",
                        fontSize: "15px",
                        lineHeight: 1,
                        userSelect: "none",
                      }}
                    >
                      {clickable ? "›" : ""}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
