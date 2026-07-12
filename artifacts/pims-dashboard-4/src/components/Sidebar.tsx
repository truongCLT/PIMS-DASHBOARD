import React, { useState } from "react";
import pimsBranding from "../assets/pims-branding.png";
import { Pin, FolderClosed } from "lucide-react";
import { PROJECT_GROUPS } from "../data/projects";

interface TreeItem {
  label: string;
  children?: TreeItem[];
  active?: boolean;
}

const TREE_DATA: TreeItem[] = PROJECT_GROUPS.map((group, gi) => ({
  label: group.label,
  children: group.divisions.map((division, di) => ({
    label: division.label,
    active: gi === 0 && di === 0,
    children: division.projects.map((project) => ({ label: project.name })),
  })),
}));

function TreeNode({ item, depth = 0 }: { item: TreeItem; depth?: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const isTopLevel = depth === 0;
  const isSubGroup = depth === 1;

  const color = isTopLevel ? "#1a2d4d" : isSubGroup ? "#2a3d55" : "#44546a";
  const fontSize = isTopLevel ? "12px" : "11px";
  const fontWeight = isTopLevel ? "700" : isSubGroup ? "600" : "400";
  const paddingLeft = depth === 0 ? "12px" : depth === 1 ? "20px" : "32px";
  const bg = item.active ? "#e8ecf5" : "transparent";

  return (
    <div>
      <div
        onClick={() => hasChildren && setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `6px 10px 6px ${paddingLeft}`,
          cursor: hasChildren ? "pointer" : "default",
          backgroundColor: bg,
          color,
          fontSize,
          fontWeight,
          userSelect: "none",
        }}
      >
        <div
          title={item.label}
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.label}
        </div>
        {(hasChildren || (item.children && item.children.length === 0)) && (
          <span style={{ fontSize: "10px", color: "#44546a" }}>
            {hasChildren && !open ? "∨" : "∧"}
          </span>
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
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      borderRight: "1px solid #d5dce6",
    }}>
      {/* Tabs */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        backgroundColor: "#f2f4f7",
        padding: "8px 8px 0",
        gap: "4px",
        borderBottom: "1px solid #d5dce6",
      }}>
        <button style={{
          padding: "5px 12px",
          backgroundColor: "#e8eaee",
          color: "#1a2d4d",
          border: "1px solid #c8d0da",
          borderBottom: "none",
          borderRadius: "4px 4px 0 0",
          fontSize: "11px",
          cursor: "pointer",
          fontWeight: "600",
        }}>내 메뉴</button>
        <button style={{
          padding: "5px 12px",
          backgroundColor: "#ffffff",
          color: "#1e6fdd",
          border: "1px solid #c8d0da",
          borderBottom: "none",
          borderRadius: "4px 4px 0 0",
          fontSize: "11px",
          cursor: "pointer",
          fontWeight: "600",
        }}>메뉴</button>
        <div style={{ marginLeft: "auto", paddingBottom: "6px" }}>
          <Pin size={13} color="#2e4568" fill="#2e4568" />
        </div>
      </div>

      {/* DECV TOTAL */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 12px",
        color: "#1a2d4d",
        fontSize: "12px",
        fontWeight: "700",
        borderBottom: "1px solid #eef1f5",
      }}>
        <FolderClosed size={14} color="#1a2d4d" fill="#1a2d4d" />
        DECV TOTAL
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {TREE_DATA.map((item, i) => (
          <TreeNode key={i} item={item} depth={0} />
        ))}
      </div>

      {/* Bottom branding */}
      <div style={{
        padding: "12px 10px",
        borderTop: "1px solid #e5eaf0",
      }}>
        <img
          src={pimsBranding}
          alt="PIMS System For DAEWOO E&C VINA"
          style={{
            width: "100%",
            borderRadius: "8px",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}
