import React, { useState } from "react";
import pimsBranding from "../assets/pims-branding.png";
import { FolderClosed } from "lucide-react";
import { PROJECT_GROUPS } from "../data/projects";

interface TreeItem {
  label: string;
  children?: TreeItem[];
  active?: boolean;
  isProject?: boolean;
}

const TREE_DATA: TreeItem[] = PROJECT_GROUPS.map((group, gi) => ({
  label: group.label,
  children: group.divisions.map((division, di) => ({
    label: division.label,
    active: gi === 0 && di === 0,
    children:
      division.label === "시공" || division.label === "용역"
        ? [
            {
              label: "진행중",
              children: division.projects.map((project) => ({ label: project.name, isProject: true })),
            },
            { label: "종료", children: [] },
          ]
        : division.projects.map((project) => ({ label: project.name, isProject: true })),
  })),
}));

function TreeNode({
  item,
  depth = 0,
  selectedProject,
  onSelectProject,
}: {
  item: TreeItem;
  depth?: number;
  selectedProject: string | null;
  onSelectProject: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isTopLevel = depth === 0;
  const isSubGroup = depth === 1;
  const collapsible = hasChildren && !isTopLevel;
  const expanded = isTopLevel || open;
  const isSelected = item.isProject && item.label === selectedProject;

  const color = isTopLevel ? "#1a2d4d" : isSubGroup ? "#2a3d55" : "#44546a";
  const fontSize = isTopLevel ? "12px" : "11px";
  const fontWeight = isTopLevel ? "700" : isSubGroup ? "600" : isSelected ? "600" : "400";
  const paddingLeft = depth === 0 ? "12px" : depth === 1 ? "20px" : depth === 2 ? "32px" : "44px";
  const bg = isSelected ? "#dbe6f5" : item.active ? "#e8ecf5" : "transparent";

  return (
    <div>
      <div
        onClick={() => {
          if (item.isProject) {
            onSelectProject(item.label);
          } else if (collapsible) {
            setOpen(!open);
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `6px 10px 6px ${paddingLeft}`,
          cursor: collapsible || item.isProject ? "pointer" : "default",
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
            <TreeNode
              key={i}
              item={child}
              depth={depth + 1}
              selectedProject={selectedProject}
              onSelectProject={onSelectProject}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  selectedProject,
  onSelectProject,
  onSelectTotal,
}: {
  selectedProject: string | null;
  onSelectProject: (name: string) => void;
  onSelectTotal: () => void;
}) {
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
      <div
        onClick={onSelectTotal}
        style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 12px",
        color: "#1a2d4d",
        fontSize: "12px",
        fontWeight: "700",
        borderBottom: "1px solid #eef1f5",
        cursor: "pointer",
        backgroundColor: selectedProject == null ? "#e8ecf5" : "transparent",
      }}>
        <FolderClosed size={14} color="#1a2d4d" fill="#1a2d4d" />
        DECV TOTAL
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {TREE_DATA.map((item, i) => (
          <TreeNode
            key={i}
            item={item}
            depth={0}
            selectedProject={selectedProject}
            onSelectProject={onSelectProject}
          />
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
