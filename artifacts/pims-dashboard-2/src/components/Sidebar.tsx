import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import pimsBranding from "../assets/pims-branding.png";
import { FolderClosed, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useListMgmtreportProjects, useGetOrgStructure } from "@workspace/api-client-react";
import { classifyMrProject, isTestMrProject, DEFAULT_PROJECT_GROUPS, type ProjectGroup } from "../data/projects";
import { REPORT_YEAR } from "../lib/mgmtreportData";
import { useTheme } from "../lib/theme";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from "../lib/i18n";
import { tokens as aquaTokens } from "@workspace/aqua-glass";
const AG = aquaTokens.color.light;

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

type TFn = ReturnType<typeof useTranslation>["t"];

/**
 * Raw Korean tree label (division/bucket names built in buildTreeData) → translated
 * display text. Project names and top-level group labels (DECV/TCC/DE HEIM) are not
 * in this map and pass through unchanged — they are data, not UI copy.
 * IMPORTANT: this only affects what is rendered; item.label/item.scope (used for
 * selection state and DashboardScope comparisons) are never modified.
 */
const TREE_LABEL_KEY: Record<string, string> = {
  "시공": "common:construction",
  "용역": "common:service",
  "진행중": "common:inProgress",
  "종료": "common:closed",
  "자체개발": "sidebar:selfDevelopmentDivision",
  "용지매각": "sidebar:landSaleDivision",
};

function treeLabel(label: string, t: TFn): string {
  const key = TREE_LABEL_KEY[label];
  return key ? t(key) : label;
}

function buildTreeData(
  mrProjects: { name: string; status?: string; businessType?: "시공" | "용역" | null }[],
  projectGroups: ProjectGroup[],
): TreeItem[] {
  const byDivision: Record<
    "시공" | "용역",
    { ongoing: string[]; closed: string[] }
  > = {
    시공: { ongoing: [], closed: [] },
    용역: { ongoing: [], closed: [] },
  };
  for (const p of mrProjects) {
    const bucket = p.status === "closed" ? "closed" : "ongoing";
    byDivision[p.businessType ?? classifyMrProject(p.name)][bucket].push(p.name);
  }
  // 테스트 프로젝트는 각 버킷 최상단에 (안정 정렬로 나머지 순서 유지)
  for (const division of ["시공", "용역"] as const) {
    for (const bucket of ["ongoing", "closed"] as const) {
      byDivision[division][bucket].sort(
        (a, b) => Number(isTestMrProject(b)) - Number(isTestMrProject(a)),
      );
    }
  }
  return projectGroups.map((group) => ({
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
                  ? byDivision[division.label as "시공" | "용역"].ongoing
                  : []
                ).map((name) => ({ label: name, isProject: true })),
              },
              {
                label: "종료",
                scope: `${division.label}-종료` as DashboardScope,
                children: (group.label === "DECV"
                  ? byDivision[division.label as "시공" | "용역"].closed
                  : []
                ).map((name) => ({ label: name, isProject: true })),
              },
            ]
          : [],
    })),
  }));
}

function TreeNode({
  item,
  depth,
  selectedProject,
  selectedScope,
  onSelectProject,
  onSelectScope,
  collapsed,
}: {
  item: TreeItem;
  depth: number;
  selectedProject: string | null;
  selectedScope: DashboardScope;
  onSelectProject: (name: string) => void;
  onSelectScope: (scope: DashboardScope) => void;
  collapsed?: boolean;
}) {
  const { t } = useTranslation(["sidebar", "common"]);
  const [open, setOpen] = useState(true);
  const { theme: T } = useTheme();

  const isProjectActive = item.isProject && selectedProject === item.label;
  const isScopeActive =
    !item.isProject &&
    item.scope != null &&
    selectedProject == null &&
    selectedScope === item.scope;
  const isActive = isProjectActive || isScopeActive;

  const collapsible = Boolean(item.children && item.children.length > 0);
  const expanded = collapsible && open;

  let paddingLeft = `${12 + depth * 14}px`;
  let fontSize = "12px";
  let fontWeight: React.CSSProperties["fontWeight"] = "400";
  let activeColor = T.sidebar.itemColor;

  if (depth === 0) {
    fontSize = "13px";
    fontWeight = "700";
    activeColor = T.sidebar.topLevelColor;
  } else if (depth === 1) {
    fontSize = "12px";
    fontWeight = "600";
    activeColor = T.sidebar.subLevelColor;
  } else if (item.isProject) {
    fontSize = "11px";
    fontWeight = "400";
    activeColor = T.sidebar.itemColor;
  }

  if (isActive) {
    activeColor = T.sidebar.activeItemColor;
    fontWeight = "700";
  }

  const bg = isActive
    ? T.sidebar.activeBg
    : depth === 0
      ? T.sidebar.topLevelBg
      : "transparent";

  const displayLabel = treeLabel(item.label, t);

  if (collapsed) {
    return null;
  }

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
          color: activeColor,
          fontSize,
          fontWeight,
          userSelect: "none",
          borderLeft: isActive ? `2px solid ${T.sidebar.activeItemAccent}` : "2px solid transparent",
        }}
      >
        <div
          title={displayLabel}
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayLabel}
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
              collapsed={collapsed}
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
  onLogoClick,
}: {
  selectedProject: string | null;
  selectedScope: DashboardScope;
  onSelectProject: (name: string) => void;
  onSelectScope: (scope: DashboardScope) => void;
  onSelectTotal: () => void;
  onLogoClick?: () => void;
}) {
  const { t, i18n } = useTranslation(["sidebar", "common"]);
  const [collapsed, setCollapsed] = useState(false);
  const projectsQuery = useListMgmtreportProjects({ year: REPORT_YEAR });
  const orgQuery = useGetOrgStructure();
  // 조직 구조(DB)가 비어 있거나 조회에 실패해도 좌측 메뉴가 통째로 사라지지 않도록
  // 기본 구조로 대체한다. 조직도 편집으로 저장된 구조가 있으면 그 값이 우선.
  const orgIsEmpty = orgQuery.isSuccess && (orgQuery.data?.companies ?? []).length === 0;
  const projectGroups: ProjectGroup[] = useMemo(() => {
    const companies = orgQuery.data?.companies ?? [];
    if (companies.length === 0) return DEFAULT_PROJECT_GROUPS;
    return companies.map((c) => ({
      label: c.label,
      divisions: c.divisions.map((d) => ({ label: d.label })),
    }));
  }, [orgQuery.data]);
  const treeData = useMemo(() => {
    const projects = (projectsQuery.data?.projects ?? [])
      .filter((p) => !p.isGroup)
      .map((p) => ({ name: p.name, status: p.status, businessType: p.businessType }));
    return buildTreeData(projects, projectGroups);
  }, [projectsQuery.data, projectGroups]);

  const { theme: T } = useTheme();
  const isTotalSelected = selectedProject == null && selectedScope === "전체";
  const width = collapsed ? "54px" : "240px";

  return (
    <div style={{
      width,
      minWidth: width,
      backgroundColor: T.sidebar.bg,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      borderRight: T.sidebar.border,
      transition: "width 0.2s ease, min-width 0.2s ease",
    }}>
      {/* DECV TOTAL & Collapse Toggle Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: "10px 12px",
          borderBottom: T.sidebar.totalBorderBottom,
          backgroundColor: isTotalSelected ? T.sidebar.totalActiveBg : "transparent",
          borderLeft: isTotalSelected ? `2px solid ${T.sidebar.activeItemAccent}` : "2px solid transparent",
        }}
      >
        <div
          onClick={onSelectTotal}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: isTotalSelected ? T.sidebar.activeItemColor : T.sidebar.topLevelColor,
            fontSize: "12px",
            fontWeight: "700",
            cursor: "pointer",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
          title="DECV TOTAL"
        >
          <FolderClosed
            size={16}
            color={isTotalSelected ? T.sidebar.activeItemAccent : T.sidebar.topLevelColor}
            fill={isTotalSelected ? T.sidebar.activeItemAccent : T.sidebar.topLevelColor}
          />
          {!collapsed && <span>DECV TOTAL</span>}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          style={{
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            color: T.sidebar.topLevelColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px",
            borderRadius: "4px",
          }}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Tree */}
      {!collapsed && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {orgIsEmpty && (
            <div
              style={{
                margin: "8px 10px",
                padding: "6px 8px",
                fontSize: "10.5px",
                lineHeight: 1.4,
                color: AG.mutedForeground,
                backgroundColor: "rgba(63,95,138,0.08)",
                borderRadius: "6px",
              }}
            >
              {t("sidebar:orgStructureEmptyNotice")}
            </div>
          )}
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
      )}

      {/* Empty space filler when collapsed */}
      {collapsed && <div style={{ flex: 1 }} />}

      {/* Language switcher */}
      {!collapsed && (
        <div style={{ padding: "10px 10px 0", borderTop: T.sidebar.brandingBorderTop }}>
          <div style={{
            display: "flex",
            borderRadius: "6px",
            overflow: "hidden",
            border: `1px solid ${AG.input}`,
          }}>
            {SUPPORTED_LANGUAGES.map((lng, i) => {
              const active = i18n.language === lng;
              return (
                <button
                  key={lng}
                  onClick={() => i18n.changeLanguage(lng)}
                  style={{
                    flex: 1,
                    padding: "6px 2px",
                    fontSize: "11px",
                    fontWeight: active ? "700" : "500",
                    border: "none",
                    borderLeft: i === 0 ? "none" : `1px solid ${AG.input}`,
                    backgroundColor: active ? T.sidebar.activeItemAccent : "#ffffff",
                    color: active ? "#ffffff" : "#556",
                    cursor: "pointer",
                  }}
                >
                  {LANGUAGE_LABELS[lng]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom branding */}
      {!collapsed && (
        <div style={{
          padding: "12px 10px",
        }}>
          <img
            src={pimsBranding}
            alt="PIMS System For DAEWOO E&C VINA"
            onClick={onLogoClick}
            title={t("sidebar:adminModeTooltip")}
            style={{
              width: "100%",
              borderRadius: "8px",
              display: "block",
              cursor: onLogoClick ? "pointer" : "default",
            }}
          />
        </div>
      )}
    </div>
  );
}
