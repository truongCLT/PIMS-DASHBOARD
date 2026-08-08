import React from "react";
import { X } from "lucide-react";

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
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#16294a" }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: "11px", color: "#7c8ba3", marginTop: "2px" }}>{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#7c8ba3",
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
}: {
  columns: DetailColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
}) {
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
                  color: "#555",
                  fontWeight: 600,
                  borderBottom: "1px solid #e2e9f3",
                  whiteSpace: "nowrap",
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: "16px", textAlign: "center", color: "#888" }}>
                -
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={rowKey(row, i)} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f8fbff" }}>
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
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
