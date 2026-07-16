import React, { useState } from "react";
import pimsBranding from "../assets/pims-branding.png";
import { FolderClosed } from "lucide-react";
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
  const collapsible = hasChildren && !isTopLevel;
  const expanded = isTopLevel || open;

  const color = isTopLevel ? "#1a2d4d" : isSubGroup ? "#2a3d55" : "#44546a";
  const fontSize = isTopLevel ? "12px" : "11px";
  const fontWeight = isTopLevel ? "700" : isSubGroup ? "600" : "400";
  const paddingLeft = depth === 0 ? "12px" : depth === 1 ? "20px" : "32px";
  const bg = item.active ? "#e8ecf5" : "transparent";

  return (
    <div>
      <div
        onClick={() => collapsible && setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `6px 10px 6px ${paddingLeft}`,
          cursor: collapsible ? "pointer" : "default",
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
        {collapsible && (
          <span style={{ fontSize: "10px", color: "#44546a" }}>
            {!open ? "∨" : "∧"}
          </span>
        )}
      </div>
      {expanded && item.children && (
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
