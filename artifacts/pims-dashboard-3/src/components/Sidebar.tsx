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
  const [open, setOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isTopLevel = depth === 0;
  const isSubGroup = depth === 1;

  const color = isTopLevel ? "var(--color-text-primary)" : isSubGroup ? "var(--color-text-primary)" : "var(--color-text-secondary)";
  const fontSize = isTopLevel ? "13px" : "12px";
  const fontWeight = isTopLevel ? "600" : isSubGroup ? "500" : "400";
  const paddingLeft = depth === 0 ? "16px" : depth === 1 ? "24px" : "36px";
  const bg = item.active ? "var(--color-background)" : "transparent";

  return (
    <div>
      <div
        onClick={() => hasChildren && setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `8px 16px 8px ${paddingLeft}`,
          cursor: hasChildren ? "pointer" : "default",
          backgroundColor: bg,
          color,
          fontSize,
          fontWeight,
          userSelect: "none",
          transition: "background-color 0.2s",
        }}
        onMouseEnter={(e) => {
          if (!item.active) e.currentTarget.style.backgroundColor = "var(--color-background)";
        }}
        onMouseLeave={(e) => {
          if (!item.active) e.currentTarget.style.backgroundColor = "transparent";
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
          <span style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>
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
      width: "240px",
      minWidth: "240px",
      backgroundColor: "var(--color-card-bg)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      borderRight: "1px solid var(--color-border)",
    }}>
      {/* Tabs */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        backgroundColor: "var(--color-background)",
        padding: "12px 12px 0",
        gap: "4px",
        borderBottom: "1px solid var(--color-border)",
      }}>
        <button style={{
          padding: "8px 16px",
          backgroundColor: "var(--color-card-bg)",
          color: "var(--color-primary-blue)",
          border: "1px solid var(--color-border)",
          borderBottom: "none",
          borderRadius: "8px 8px 0 0",
          fontSize: "12px",
          cursor: "pointer",
          fontWeight: "600",
          position: "relative",
          zIndex: 1,
          marginBottom: "-1px",
        }}>내 메뉴</button>
        <button style={{
          padding: "8px 16px",
          backgroundColor: "transparent",
          color: "var(--color-text-secondary)",
          border: "none",
          fontSize: "12px",
          cursor: "pointer",
          fontWeight: "500",
        }}>메뉴</button>
        <div style={{ marginLeft: "auto", paddingBottom: "10px" }}>
          <Pin size={14} color="var(--color-text-secondary)" />
        </div>
      </div>

      {/* DECV TOTAL */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "16px",
        color: "var(--color-text-primary)",
        fontSize: "14px",
        fontWeight: "700",
        borderBottom: "1px solid var(--color-border)",
      }}>
        <FolderClosed size={16} color="var(--color-primary-blue)" />
        DECV TOTAL
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {TREE_DATA.map((item, i) => (
          <TreeNode key={i} item={item} depth={0} />
        ))}
      </div>

      {/* Bottom branding */}
      <div style={{
        padding: "16px",
        borderTop: "1px solid var(--color-border)",
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
