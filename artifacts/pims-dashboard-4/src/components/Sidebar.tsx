import React, { useState } from "react";
import pimsBranding from "../assets/pims-branding-transparent.png";
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

  const color = isTopLevel
    ? "var(--color-sidebar-text-active)"
    : isSubGroup
      ? "var(--color-sidebar-text)"
      : "var(--color-sidebar-text-dim)";
  const fontSize = isTopLevel ? "12px" : "11px";
  const fontWeight = isTopLevel ? "700" : isSubGroup ? "600" : "400";
  const paddingLeft = depth === 0 ? "12px" : depth === 1 ? "20px" : "32px";
  const bg = item.active ? "var(--color-sidebar-active-bg)" : "transparent";

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
          color: item.active ? "var(--color-sky-light)" : color,
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
          <span style={{ fontSize: "10px", color: "var(--color-sidebar-text-dim)" }}>
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
      backgroundColor: "var(--color-sidebar-bg)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      borderRight: "1px solid var(--color-sidebar-divider)",
    }}>
      {/* Tabs */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        backgroundColor: "var(--color-navy-deep)",
        padding: "8px 8px 0",
        gap: "4px",
        borderBottom: "1px solid var(--color-sidebar-divider)",
      }}>
        <button style={{
          padding: "5px 12px",
          backgroundColor: "var(--color-sidebar-bg)",
          color: "var(--color-sidebar-text-active)",
          border: "1px solid var(--color-sidebar-divider)",
          borderBottom: "none",
          borderRadius: "6px 6px 0 0",
          fontSize: "11px",
          cursor: "pointer",
          fontWeight: "600",
        }}>내 메뉴</button>
        <button style={{
          padding: "5px 12px",
          backgroundColor: "transparent",
          color: "var(--color-sky-light)",
          border: "1px solid var(--color-sidebar-divider)",
          borderBottom: "none",
          borderRadius: "6px 6px 0 0",
          fontSize: "11px",
          cursor: "pointer",
          fontWeight: "600",
        }}>메뉴</button>
        <div style={{ marginLeft: "auto", paddingBottom: "6px" }}>
          <Pin size={13} color="var(--color-sky-light)" />
        </div>
      </div>

      {/* DECV TOTAL */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 12px",
        color: "var(--color-sidebar-text-active)",
        fontSize: "12px",
        fontWeight: "700",
        borderBottom: "1px solid var(--color-sidebar-divider)",
      }}>
        <FolderClosed size={14} color="var(--color-sky-light)" />
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
        borderTop: "1px solid var(--color-sidebar-divider)",
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
