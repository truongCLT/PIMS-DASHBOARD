import React, { useState } from "react";
import { ChevronUp, ChevronDown, Pin } from "lucide-react";

interface TreeItem {
  label: string;
  children?: TreeItem[];
  active?: boolean;
}

const TREE_DATA: TreeItem[] = [
  {
    label: "DECV TOTAL",
  },
  {
    label: "DECV",
    children: [
      {
        label: "도급사업",
        children: [
          { label: "진행중" },
          { label: "프로젝트 1" },
          { label: "프로젝트 2" },
          { label: "완료" },
          { label: "프로젝트 3" },
          { label: "프로젝트 4" },
        ],
      },
      {
        label: "서비스사업",
        children: [
          { label: "진행중" },
          { label: "프로젝트 1" },
          { label: "프로젝트 2" },
        ],
      },
    ],
  },
  {
    label: "TCC",
    children: [],
  },
  {
    label: "DEHEIM",
    children: [],
  },
];

function TreeNode({ item, depth = 0 }: { item: TreeItem; depth?: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const isTopLevel = depth === 0;
  const isSubGroup = depth === 1;

  const bg = isTopLevel && item.label === "DECV TOTAL"
    ? "#1c3a5c"
    : "transparent";

  const color = isTopLevel ? "#cfe2f7" : isSubGroup ? "#b8d4ed" : "#96b8d8";
  const fontSize = isTopLevel ? "12px" : isSubGroup ? "11px" : "11px";
  const fontWeight = isTopLevel ? "600" : isSubGroup ? "500" : "400";
  const paddingLeft = depth === 0 ? "10px" : depth === 1 ? "18px" : "28px";

  return (
    <div>
      <div
        onClick={() => hasChildren && setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `5px 8px 5px ${paddingLeft}`,
          cursor: hasChildren ? "pointer" : "default",
          backgroundColor: bg,
          color,
          fontSize,
          fontWeight,
          borderBottom: isTopLevel && item.label === "DECV TOTAL" ? "1px solid #1a3a5c" : undefined,
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {depth === 1 && (
            <span style={{ fontSize: "10px", opacity: 0.6 }}>▪</span>
          )}
          {item.label}
        </div>
        {hasChildren && (
          <span style={{ fontSize: "10px", color: "#6b9ab8" }}>
            {open ? "∧" : "∨"}
          </span>
        )}
        {!hasChildren && item.children && item.children.length === 0 && (
          <span style={{ fontSize: "10px", color: "#6b9ab8" }}>∧</span>
        )}
      </div>
      {open && item.children && (
        <div>
          {item.children.map((child, i) => (
            <TreeNode key={i} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  return (
    <div style={{
      width: "170px",
      minWidth: "170px",
      backgroundColor: "#142840",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      borderRight: "1px solid #0e2030",
    }}>
      {/* Tabs */}
      <div style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: "#0e2030",
        padding: "6px 8px",
        gap: "6px",
        borderBottom: "1px solid #0a1a28",
      }}>
        <button style={{
          padding: "3px 10px",
          backgroundColor: "#1e6fdd",
          color: "#fff",
          border: "none",
          borderRadius: "3px",
          fontSize: "11px",
          cursor: "pointer",
          fontWeight: "500",
        }}>내 메뉴</button>
        <button style={{
          padding: "3px 10px",
          backgroundColor: "transparent",
          color: "#7aafd4",
          border: "1px solid #2a4a6a",
          borderRadius: "3px",
          fontSize: "11px",
          cursor: "pointer",
        }}>메뉴</button>
        <div style={{ marginLeft: "auto" }}>
          <Pin size={12} color="#7aafd4" />
        </div>
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {TREE_DATA.map((item, i) => (
          <TreeNode key={i} item={item} depth={0} />
        ))}
      </div>

      {/* Bottom branding */}
      <div style={{
        backgroundColor: "#0e2030",
        padding: "12px 10px",
        borderTop: "1px solid #1a3a5c",
      }}>
        <div style={{
          backgroundColor: "#1e3a5a",
          borderRadius: "6px",
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
        }}>
          <div style={{
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: "700",
            letterSpacing: "0.5px",
          }}>
            PIMS System
          </div>
          <div style={{ color: "#7aafd4", fontSize: "9px" }}>For</div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}>
            <div style={{
              width: "14px",
              height: "14px",
              backgroundColor: "#1e90ff",
              borderRadius: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <span style={{ color: "#fff", fontSize: "8px", fontWeight: "700" }}>D</span>
            </div>
            <span style={{ color: "#cfe2f7", fontSize: "10px", fontWeight: "600" }}>
              DAEWOO E&amp;C VINA
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
