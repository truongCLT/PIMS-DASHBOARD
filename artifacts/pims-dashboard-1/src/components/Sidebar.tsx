import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import pimsBranding from "../assets/pims-branding.png";
import { FolderClosed } from "lucide-react";
import { useListMgmtreportProjects } from "@workspace/api-client-react";
import { PROJECT_GROUPS, classifyMrProject, isTestMrProject } from "../data/projects";
import { REPORT_YEAR } from "../lib/mgmtreportData";
import { useTheme } from "../lib/theme";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from "../lib/i18n";

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
  siteCode?: string | null;
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

function buildTreeData(mrProjects: { name: string; siteCode?: string | null; status?: string }[]): TreeItem[] {
  const byDivision: Record<
    "시공" | "용역",
    { ongoing: { name: string; siteCode?: string | null }[]; closed: { name: string; siteCode?: string | null }[] }
  > = {
    시공: { ongoing: [], closed: [] },
    용역: { ongoing: [], closed: [] },
  };
  for (const p of mrProjects) {
    const bucket = p.status === "closed" ? "closed" : "ongoing";
    byDivision[classifyMrProject(p.name)][bucket].push({ name: p.name, siteCode: p.siteCode });
  }
  // 테스트 프로젝트는 각 버킷 최상단에 (안정 정렬로 나머지 순서 유지)
  for (const division of ["시공", "용역"] as const) {
    for (const bucket of ["ongoing", "closed"] as const) {
      byDivision[division][bucket].sort(
        (a, b) => Number(isTestMrProject(b.name)) - Number(isTestMrProject(a.name)),
      );
    }
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
                  ? byDivision[division.label as "시공" | "용역"].ongoing
                  : []
                ).map((p) => ({ label: p.name, siteCode: p.siteCode, isProject: true })),
              },
              {
                label: "종료",
                scope: `${division.label}-종료` as DashboardScope,
                children: (group.label === "DECV"
                  ? byDivision[division.label as "시공" | "용역"].closed
                  : []
                ).map((p) => ({ label: p.name, siteCode: p.siteCode, isProject: true })),
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
  const { t } = useTranslation(["sidebar", "common"]);
  const [open, setOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isTopLevel = depth === 0;
  const isSubGroup = depth === 1;
  const collapsible = hasChildren && !isTopLevel;
  const expanded = isTopLevel || open;
  const isSelected = item.isProject && item.label === selectedProject;
  const isScopeSelected =
    item.scope != null && selectedProject == null && selectedScope === item.scope;

  const { theme: T } = useTheme();
  const color = isTopLevel ? T.sidebar.topLevelColor : isSubGroup ? T.sidebar.midLevelColor : T.sidebar.subLevelColor;
  const fontSize = isTopLevel ? "12px" : "11px";
  const fontWeight = isTopLevel ? "700" : isSubGroup ? "600" : isSelected ? "600" : "400";
  const paddingLeft = depth === 0 ? "12px" : depth === 1 ? "20px" : depth === 2 ? "32px" : "44px";
  const isActive = isSelected || isScopeSelected;
  const bg = isActive ? T.sidebar.activeItemBg : "transparent";
  const activeColor = isActive ? T.sidebar.activeItemColor : color;
  // Project names / group labels (DECV, TCC, DE HEIM) are data and pass through unchanged.
  const displayLabel = item.isProject
    ? item.siteCode
      ? `${item.label} (${item.siteCode})`
      : item.label
    : treeLabel(item.label, t);

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
  const projectsQuery = useListMgmtreportProjects({ year: REPORT_YEAR });
  const treeData = useMemo(() => {
    const projects = (projectsQuery.data?.projects ?? [])
      .filter((p) => !p.isGroup)
      .map((p) => ({ name: p.name, siteCode: p.siteCode, status: p.status }));
    return buildTreeData(projects);
  }, [projectsQuery.data]);

  const { theme: T } = useTheme();
  const isTotalSelected = selectedProject == null && selectedScope === "전체";

  return (
    <div style={{
      width: "170px",
      minWidth: "170px",
      backgroundColor: T.sidebar.bg,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      borderRight: T.sidebar.border,
    }}>
      {/* DECV TOTAL */}
      <div
        onClick={onSelectTotal}
        style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 12px",
        color: isTotalSelected ? T.sidebar.activeItemColor : T.sidebar.topLevelColor,
        fontSize: "12px",
        fontWeight: "700",
        borderBottom: T.sidebar.totalBorderBottom,
        cursor: "pointer",
        backgroundColor: isTotalSelected ? T.sidebar.totalActiveBg : "transparent",
        borderLeft: isTotalSelected ? `2px solid ${T.sidebar.activeItemAccent}` : "2px solid transparent",
      }}>
        <FolderClosed size={14} color={isTotalSelected ? T.sidebar.activeItemAccent : T.sidebar.topLevelColor} fill={isTotalSelected ? T.sidebar.activeItemAccent : T.sidebar.topLevelColor} />
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

      {/* Language switcher */}
      <div style={{ padding: "10px 10px 0", borderTop: T.sidebar.brandingBorderTop }}>
        <div style={{
          display: "flex",
          borderRadius: "6px",
          overflow: "hidden",
          border: "1px solid #dde6f1",
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
                  borderLeft: i === 0 ? "none" : "1px solid #dde6f1",
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

      {/* Bottom branding */}
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
    </div>
  );
}
