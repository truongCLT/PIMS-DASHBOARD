import React, { useMemo, useState } from "react";
import pimsBranding from "../assets/pims-branding.png";
import { FolderClosed } from "lucide-react";
import { useListMgmtreportProjects } from "@workspace/api-client-react";
import { PROJECT_GROUPS, classifyMrProject } from "../data/projects";
import { REPORT_YEAR } from "../lib/mgmtreportData";

export type DashboardScope =
  | "전체"
  | "시공"
  | "용역"
  | "시공-진행중"
  | "시공-종료"
  | "용역-진행중"
  | "용역-종료";

interface TreeItem {
  label: string;
  children?: TreeItem[];
  isProject?: boolean;
  scope?: DashboardScope;
}

function buildTreeData(mrProjectNames: string[]): TreeItem[] {
  const byDivision: Record<"시공" | "용역", string[]> = { 시공: [], 용역: [] };
  for (const name of mrProjectNames) {
    byDivision[classifyMrProject(name)].push(name);
  }
  return PROJECT_GROUPS.map((group) => ({
    label: group.label,
    scope: group.label === "DECV" ? ("전체" as DashboardScope) : undefined,
    children: group.divisions.map((division) => ({
      label: division.label,
      scope:
        group.label === "DECV" && (division.label === "시공" || division.label === "용역")
          ? (division.label as DashboardScope)
          : undefined,
      children:
        division.label === "시공" || division.label === "용역"
          ? [
              {
                label: "진행중",
                scope: `${division.label}-진행중` as DashboardScope,
                children: (group.label === "DECV"
                  ? byDivision[division.label as "시공" | "용역"]
                  : []
                ).map((name) => ({ label: name, isProject: true })),
              },
              {
                label: "종료",
                scope: `${division.label}-종료` as DashboardScope,
                children: [],
              },
            ]
          : [],
    })),
  }));
}

function TreeNode({
  item,
  depth = 0,
  selectedProject,
  selectedScope,
  onSelectProject,
  onSelectScope,
}: {
  item: TreeItem;
  depth?: number;
  selectedProject: string | null;
  selectedScope: DashboardScope;
  onSelectProject: (name: string) => void;
  onSelectScope: (scope: DashboardScope) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isTopLevel = depth === 0;
  const isSubGroup = depth === 1;
  const collapsible = hasChildren && !isTopLevel;
  const expanded = isTopLevel || open;
  const isSelected = item.isProject && item.label === selectedProject;
  const isScopeSelected =
    item.scope != null && selectedProject == null && selectedScope === item.scope;

  const color = isTopLevel ? "#1a2d4d" : isSubGroup ? "#2a3d55" : "#44546a";
  const fontSize = isTopLevel ? "12px" : "11px";
  const fontWeight = isTopLevel ? "700" : isSubGroup ? "600" : isSelected ? "600" : "400";
  const paddingLeft = depth === 0 ? "12px" : depth === 1 ? "20px" : depth === 2 ? "32px" : "44px";
  const bg = isSelected || isScopeSelected ? "#dbe6f5" : "transparent";

  return (
    <div>
      <div
        onClick={() => {
          if (item.isProject) {
            onSelectProject(item.label);
            return;
          }
          if (item.scope != null) {
            onSelectScope(item.scope);
          }
          if (collapsible) {
            setOpen(!open);
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `6px 10px 6px ${paddingLeft}`,
          cursor: collapsible || item.isProject || item.scope != null ? "pointer" : "default",
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
              selectedScope={selectedScope}
              onSelectProject={onSelectProject}
              onSelectScope={onSelectScope}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  selectedProject,
  selectedScope,
  onSelectProject,
  onSelectScope,
  onSelectTotal,
}: {
  selectedProject: string | null;
  selectedScope: DashboardScope;
  onSelectProject: (name: string) => void;
  onSelectScope: (scope: DashboardScope) => void;
  onSelectTotal: () => void;
}) {
  const projectsQuery = useListMgmtreportProjects({ year: REPORT_YEAR });
  const treeData = useMemo(() => {
    const names = (projectsQuery.data?.projects ?? [])
      .filter((p) => !p.isGroup)
      .map((p) => p.name);
    return buildTreeData(names);
  }, [projectsQuery.data]);

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
        backgroundColor: selectedProject == null && selectedScope === "전체" ? "#e8ecf5" : "transparent",
      }}>
        <FolderClosed size={14} color="#1a2d4d" fill="#1a2d4d" />
        DECV TOTAL
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {treeData.map((item, i) => (
          <TreeNode
            key={i}
            item={item}
            depth={0}
            selectedProject={selectedProject}
            selectedScope={selectedScope}
            onSelectProject={onSelectProject}
            onSelectScope={onSelectScope}
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
