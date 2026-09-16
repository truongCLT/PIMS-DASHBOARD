import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Save, Upload, X, Lock, LockOpen, ChevronRight } from "lucide-react";
import { readAdminToken } from "../lib/adminAuth";
import {
  usePutProjectdetail,
  useListMgmtreportProjects,
  useUpdateMgmtreportProjectStatus,
  useUpdateMgmtreportProjectDivision,
  getListMgmtreportProjectsQueryKey,
  useGetCashflowMonthly,
  getGetCashflowMonthlyQueryKey,
} from "@workspace/api-client-react";
import type {
  ProjectDetail,
  ProjectDetailOverview,
  ProjectDetailProgressPoint,
  ProjectDetailMilestone,
  ProjectDetailCostEstimation,
  ProjectDetailCostBudget,
  ProjectDetailCostBudgetMonthly,
  ProjectDetailOutsourcing,
  ProjectDetailCashflowPoint,
  ProjectDetailCogsPoint,
  ProjectDetailSalesPoint,
} from "@workspace/api-client-react";
import { useProjectDetail, getGetProjectdetailQueryKey } from "../lib/projectDetailData";
import { REPORT_YEAR } from "../lib/mgmtreportData";
import { getMrCashflowRef } from "../data/mrProjectLinks";
import { cardStyle, sectionTitle, emptyNote, INK_NAVY, INK_BODY, INK_MUTED, POINT_BLUE, TABLE_HEADER_BG, CARD_BORDER, ACHIEVE_RED, SUCCESS_GREEN, ADMIN_NAVY, BORDER_STRONG, BORDER_MID, BORDER_LIGHT, STATUS_CLOSED_BG, STATUS_OPEN_BG, STATUS_CLOSED_TEXT, STATUS_OPEN_TEXT } from "../lib/uiTokens";
import { chartTheme } from "../lib/chartTheme";

const th: React.CSSProperties = {
  backgroundColor: TABLE_HEADER_BG,
  color: INK_NAVY,
  fontSize: "13px",
  fontWeight: 700,
  border: "1px solid #c8d2de",
  padding: "6px",
  textAlign: "center",
};

const tdCell: React.CSSProperties = {
  border: `1px solid ${CARD_BORDER}`,
  padding: "2px",
};

const readOnlyCell: React.CSSProperties = {
  ...tdCell,
  padding: "5px 6px",
  color: INK_BODY,
  fontFamily: "inherit",
  fontSize: "13px",
  fontWeight: 400,
  lineHeight: 1.4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  outline: "none",
  fontSize: "13px",
  padding: "5px 6px",
  boxSizing: "border-box",
  backgroundColor: "transparent",
};

const addBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "13px",
  color: POINT_BLUE,
  background: "none",
  border: "1px dashed #9dc3e6",
  borderRadius: "4px",
  padding: "4px 10px",
  cursor: "pointer",
  marginTop: "8px",
};

import { useMoney } from "../lib/displayUnit";

function VndInput({
  valueKUsd,
  onChange,
  "data-row": dataRow,
  "data-col": dataCol,
}: {
  valueKUsd: number | null | undefined;
  onChange: (kUsd: number | null) => void;
  "data-row"?: string | number;
  "data-col"?: string | number;
}) {
  const { convert, fmtMoney } = useMoney();
  const [editing, setEditing] = React.useState(false);
  const [rawStr, setRawStr] = React.useState("");

  const displayValue = editing
    ? rawStr
    : valueKUsd != null
      ? fmtMoney(valueKUsd)
      : "";

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      data-row={dataRow}
      data-col={dataCol}
      style={{ ...inputStyle, textAlign: "right" }}
      onFocus={() => {
        const convertedVal = valueKUsd != null ? convert(valueKUsd) : 0;
        setRawStr(convertedVal === 0 ? "" : String(Math.round(convertedVal)));
        setEditing(true);
      }}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^\d]/g, "");
        setRawStr(digits === "" ? "" : Number(digits).toLocaleString("en-US"));
      }}
      onBlur={() => {
        setEditing(false);
        const cleaned = rawStr.replace(/,/g, "");
        if (cleaned === "" || cleaned === "0") {
          onChange(null);
        } else {
          const val = parseFloat(cleaned);
          onChange(isNaN(val) ? null : val);
        }
        setRawStr("");
      }}
    />
  );
}

function NumInput({
  value,
  onChange,
  min,
  max,
  step = "any",
  "data-row": dataRow,
  "data-col": dataCol,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  "data-row"?: string | number;
  "data-col"?: string | number;
}) {
  const normalize = (raw: string) => {
    if (raw === "") {
      onChange(null);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    const stepped = step === 1 ? Math.round(parsed) : parsed;
    onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, stepped)));
  };

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value ?? ""}
      data-row={dataRow}
      data-col={dataCol}
      onChange={(e) => normalize(e.target.value)}
      onWheel={(e) => (e.target as HTMLElement).blur()}
      style={{ ...inputStyle, textAlign: "right" }}
    />
  );
}

export function calculateProgressPlanCumulative(rows: ProjectDetailProgressPoint[]): ProjectDetailProgressPoint[] {
  let cumulative = 0;
  let hasPlan = false;
  const cumulativeByIndex = new Map<number, number | null>();

  rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        a.row.year - b.row.year ||
        a.row.month - b.row.month ||
        a.index - b.index,
    )
    .forEach(({ row, index }) => {
      if (row.planPct != null) {
        cumulative = Math.round((cumulative + row.planPct + Number.EPSILON) * 10) / 10;
        hasPlan = true;
      }
      cumulativeByIndex.set(index, hasPlan ? Math.min(100, Math.max(0, cumulative)) : null);
    });

  return rows.map((row, index) => ({
    ...row,
    planCumPct: cumulativeByIndex.get(index) ?? null,
  }));
}

function TextInput({
  value,
  onChange,
  placeholder,
  "data-row": dataRow,
  "data-col": dataCol,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  placeholder?: string;
  "data-row"?: string | number;
  "data-col"?: string | number;
}) {
  return (
    <input
      type="text"
      value={value ?? ""}
      placeholder={placeholder}
      data-row={dataRow}
      data-col={dataCol}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      style={inputStyle}
    />
  );
}

function makeArrowNav(tblId: string) {
  return (e: React.KeyboardEvent) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const target = e.target as HTMLElement;
    const rowStr = target.getAttribute("data-row");
    const colStr = target.getAttribute("data-col");
    if (rowStr == null || colStr == null) return;
    e.preventDefault();
    const row = parseInt(rowStr);
    const col = parseInt(colStr);
    let nextRow = row, nextCol = col;
    if (e.key === "ArrowDown") nextRow = row + 1;
    else if (e.key === "ArrowUp") nextRow = row - 1;
    else if (e.key === "ArrowRight") nextCol = col + 1;
    else if (e.key === "ArrowLeft") nextCol = col - 1;
    const next = document.querySelector<HTMLElement>(
      `[data-tbl="${tblId}"] [data-row="${nextRow}"][data-col="${nextCol}"]`,
    );
    next?.focus();
  };
}

function MonthInput({ value, onChange }: { value: string | null | undefined; onChange: (v: string | null) => void }) {
  return (
    <input
      type="month"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      style={inputStyle}
    />
  );
}

function DateInput({ value, onChange }: { value: string | null | undefined; onChange: (v: string | null) => void }) {
  return (
    <input
      type="date"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      style={inputStyle}
    />
  );
}

function DelBtn({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation(["projectDataEntryTab", "common"]);
  return (
    <button
      onClick={onClick}
      title={t("projectDataEntryTab:deleteRow")}
      style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: ACHIEVE_RED }}
    >
      <Trash2 size={13} />
    </button>
  );
}

const EMPTY_OVERVIEW: ProjectDetailOverview = {
  contractAmount: null,
  startDate: null,
  endDate: null,
  client: null,
  scale: null,
  location: null,
  siteArea: null,
  grossFloorArea: null,
  purpose: null,
  ownershipStake: null,
  partnerCompany: null,
  contractMethod: null,
  paymentTerms: null,
  defectWarrantyPeriod: null,
  defectWarrantyBond: null,
  advancePayment: null,
  retention: null,
  veTerms: null,
  asOfMonth: null,
  scope: null,
  revenueAnnualTarget: null,
  revenueTotal: null,
  cashConfirmed: null,
  cashCollection: null,
};

const FIXED_BUDGET_ITEMS = ["Common", "Expense 1", "Expense 2", "Contingency"];
const MONTHLY_BUDGET_ITEMS = ["Common", "Expense 1", "Expense 2", "외주성"] as const;
type MonthlyBudgetItem = (typeof MONTHLY_BUDGET_ITEMS)[number];
const BUDGET_ITEM_CATEGORY: Record<string, string> = {
  Common: "Direct Cost",
  "Expense 1": "Direct Cost",
  "Expense 2": "Indirect Cost",
  Contingency: "Indirect Cost",
};

const TRADE_GROUPS = ["대공종", "건축", "기계", "전기", "토목", "조경", "경비"] as const;
/** raw Korean trade group (fixed identifier stored as data) → translation key, for display only */
const TRADE_GROUP_LABEL_KEY: Record<string, string> = {
  "대공종": "processCostMajorWork",
  "건축": "tradeGroupArchitecture",
  "기계": "tradeGroupMechanical",
  "전기": "tradeGroupElectrical",
  "토목": "tradeGroupCivil",
  "조경": "tradeGroupLandscape",
  "경비": "processCostExpense",
};
const TRADE_GROUP_PROCESS_ITEM: Record<(typeof TRADE_GROUPS)[number], string> = {
  "대공종": "Common",
  "건축": "외주 건축",
  "기계": "외주 기계",
  "전기": "외주 전기",
  "토목": "외주 토목",
  "조경": "외주 조경",
  "경비": "외주 경비",
};
const normalizeTradeGroup = (value: string | null | undefined) =>
  value === "공통" ? "대공종" : value;

const PROCESS_COST_ITEMS = [
  { key: "Common", keys: ["Common"], label: "processCostMajorWork" },
  { key: "외주 건축", keys: ["외주 건축"], label: "processCostArchitecture" },
  { key: "외주 기계", keys: ["외주 기계"], label: "processCostMechanical" },
  { key: "외주 전기", keys: ["외주 전기"], label: "processCostElectrical" },
  { key: "외주 토목", keys: ["외주 토목"], label: "processCostCivil" },
  { key: "외주 조경", keys: ["외주 조경"], label: "processCostLandscape" },
  {
    key: "외주 경비",
    keys: ["외주 경비", "Expense 1", "Expense 2"],
    label: "processCostExpense",
  },
] as const;

const EST_KINDS: { kind: "bidding" | "execution" | "completion"; label: string }[] = [
  { kind: "bidding", label: "estKindBidding" },
  { kind: "execution", label: "estKindExecution" },
  { kind: "completion", label: "estKindCompletion" },
];

export function ProjectDataEntryTab({ projectName, service = false }: { projectName: string; service?: boolean }) {
  const { t } = useTranslation(["projectDataEntryTab", "common"]);
  const { fmtMoney, unitLabel } = useMoney();
  const { detail, isLoading } = useProjectDetail(projectName);
  const queryClient = useQueryClient();
  const mutation = usePutProjectdetail();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [closedSections, setClosedSections] = useState<Set<string>>(new Set());
  const [locksLoaded, setLocksLoaded] = useState(false);
  const [closingSection, setClosingSection] = useState<string | null>(null);
  const [closeMsg, setCloseMsg] = useState<string | null>(null);
  const [planVersion, setPlanVersion] = useState(0);

  const mrProjectsQuery = useListMgmtreportProjects({ year: REPORT_YEAR });
  const currentProject = mrProjectsQuery.data?.projects.find((p) => p.name === projectName);
  const currentYear = new Date().getFullYear();
  const actualCutoffMonth =
    REPORT_YEAR < currentYear ? 12 : REPORT_YEAR > currentYear ? 0 : new Date().getMonth();
  const mainSalesMonths = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    plan: currentProject?.revenuePlan[index] ?? null,
    actual: index + 1 <= actualCutoffMonth
      ? (currentProject?.revenueActual[index] ?? null)
      : null,
    forecast: index + 1 > actualCutoffMonth
      ? (currentProject?.revenueActual[index] ?? null)
      : null,
  }));
  const currentStatus = currentProject?.status ?? "ongoing";
  const currentBusinessType = currentProject?.businessType ?? (service ? "용역" : "시공");
  const statusMutation = useUpdateMgmtreportProjectStatus();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const divisionMutation = useUpdateMgmtreportProjectDivision();
  const [divisionMsg, setDivisionMsg] = useState<string | null>(null);
  const changeBusinessType = (businessType: "시공" | "용역") => {
    if (businessType === currentBusinessType) return;
    setDivisionMsg(null);
    setStatusMsg(null);
    setSaveMsg(null);
    divisionMutation.mutate(
      { name: projectName, data: { divisionId: null, businessType } },
      {
        onSuccess: async () => {
          setDivisionMsg(`${businessType} 메뉴로 변경되었습니다.`);
          await queryClient.invalidateQueries({ queryKey: getListMgmtreportProjectsQueryKey() });
        },
        onError: () => setDivisionMsg("프로젝트 메뉴 변경에 실패했습니다."),
      },
    );
  };
  const toggleStatus = () => {
    const next = currentStatus === "closed" ? "ongoing" : "closed";
    setDivisionMsg(null);
    setStatusMsg(null);
    statusMutation.mutate(
      { data: { name: projectName, status: next } },
      {
        onSuccess: () => {
          setStatusMsg(next === "closed" ? t("projectDataEntryTab:statusChangedToClosed") : t("projectDataEntryTab:statusChangedToOngoing"));
          queryClient.invalidateQueries({ queryKey: getListMgmtreportProjectsQueryKey() });
        },
        onError: () => setStatusMsg(t("projectDataEntryTab:statusChangeFailed")),
      },
    );
  };

  const [overview, setOverview] = useState<ProjectDetailOverview>(EMPTY_OVERVIEW);
  const [progress, setProgress] = useState<ProjectDetailProgressPoint[]>([]);
  const [milestones, setMilestones] = useState<ProjectDetailMilestone[]>([]);
  const [costEstimation, setCostEstimation] = useState<ProjectDetailCostEstimation[]>([]);
  const [costBudget, setCostBudget] = useState<ProjectDetailCostBudget[]>([]);
  const [costBudgetMonthly, setCostBudgetMonthly] = useState<ProjectDetailCostBudgetMonthly[]>([]);
  const [selectedMonthlyBudgetItem, setSelectedMonthlyBudgetItem] = useState<MonthlyBudgetItem>("Common");
  const [selectedMonthlyBudgetYear, setSelectedMonthlyBudgetYear] = useState(REPORT_YEAR);
  const [outsourcing, setOutsourcing] = useState<ProjectDetailOutsourcing[]>([]);
  const [cashflow, setCashflow] = useState<ProjectDetailCashflowPoint[]>([]);
  const [cogsMonthly, setCogsMonthly] = useState<ProjectDetailCogsPoint[]>([]);
  const [salesMonthly, setSalesMonthly] = useState<ProjectDetailSalesPoint[]>([]);
  const [photos, setPhotos] = useState<{ objectPath: string }[]>([]);
  const [slideshowIntervalSeconds, setSlideshowIntervalSeconds] = useState(0);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [cfPrefilled, setCfPrefilled] = useState(false);
  const lastLockStateRef = useRef<string | null>(null);

  // 자금수지 Excel(cf_*) DB 데이터 — 데이터 입력 이력이 없으면 표에 미리 채워 수정할 수 있게 함
  const cfRef = getMrCashflowRef(projectName);
  // 자금수지 DB의 전체 기간(2022~2031)을 넉넉히 커버하도록 REPORT_YEAR-4년 1월부터 120개월 조회
  const cfParams = {
    projectName: cfRef?.name ?? "",
    division: cfRef?.division,
    fromYear: REPORT_YEAR - 4,
    fromMonth: 1,
    months: 120,
  };
  const cfQuery = useGetCashflowMonthly(cfParams, {
    query: { enabled: cfRef != null, queryKey: getGetCashflowMonthlyQueryKey(cfParams), staleTime: 60_000 },
  });

  useEffect(() => {
    setLoaded(false);
    setCfPrefilled(false);
    setLocksLoaded(false);
    lastLockStateRef.current = null;
  }, [projectName]);

  useEffect(() => {
    if (detail && !loaded && !(cfRef != null && cfQuery.isLoading)) {
      setOverview(detail.overview ?? EMPTY_OVERVIEW);
      setProgress(calculateProgressPlanCumulative(detail.progress));
      setMilestones(detail.milestones);
      {
        const fixed = (["bidding", "execution"] as const).map(
          (kind) => detail.costEstimation.find((e) => e.kind === kind) ?? { kind, contractAmount: null, costAmount: null },
        );
        const completions = detail.costEstimation
          .filter((e) => e.kind === "completion")
          .sort((a, b) => (a.year ?? 0) * 100 + (a.month ?? 0) - ((b.year ?? 0) * 100 + (b.month ?? 0)));
        setCostEstimation([
          ...fixed,
          ...(completions.length > 0 ? completions : [{ kind: "completion" as const, contractAmount: null, costAmount: null, year: null, month: null }]),
        ]);
      }
      setCostBudget(
        FIXED_BUDGET_ITEMS.map((item) => {
          const found = detail.costBudget.find((r) => r.item.trim().toLowerCase() === item.toLowerCase());
          const category = BUDGET_ITEM_CATEGORY[item] ?? "Direct Cost";
          return found
            ? { ...found, category, item }
            : { category, item, budget: null, plan: null, actual: null };
        }),
      );
      setCostBudgetMonthly(detail.costBudgetMonthly ?? []);
      setOutsourcing(detail.outsourcing);
      if (detail.cashflow.length > 0) {
        setCashflow(detail.cashflow);
        setCfPrefilled(false);
      } else {
        const cfRows: ProjectDetailCashflowPoint[] = (cfQuery.data?.points ?? [])
          .filter((p) => p.cashIn !== 0 || p.cashOut !== 0 || p.equivalent !== 0)
          .map((p) => ({
            year: Number(p.month.slice(0, 4)),
            month: Number(p.month.slice(5, 7)),
            cashIn: p.cashIn,
            cashOut: p.cashOut,
            equivalent: p.equivalent,
            confirmedProgress: null,
          }));
        setCashflow(cfRows);
        setCfPrefilled(cfRows.length > 0);
      }
      setCogsMonthly(detail.cogsMonthly ?? []);
      setSalesMonthly(detail.salesMonthly ?? []);
      setPhotos(detail.photos ?? []);
      setSlideshowIntervalSeconds(detail.overview?.slideshowIntervalSeconds ?? 0);
      setPlanVersion(detail.planVersion ?? 0);
      setLoaded(true);
    }
  }, [detail, loaded, cfRef, cfQuery.isLoading, cfQuery.data]);

  const updateAt = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, i: number, patch: Partial<T>) =>
    setter((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const updateProgressAt = (i: number, patch: Partial<ProjectDetailProgressPoint>) =>
    setProgress((rows) =>
      calculateProgressPlanCumulative(rows.map((row, j) => (j === i ? { ...row, ...patch } : row))),
    );
  // 자금수지 표를 사용자가 직접 수정하면 prefill 상태 해제 → 이후 저장부터 실제 데이터로 저장
  const editCashflow: React.Dispatch<React.SetStateAction<ProjectDetailCashflowPoint[]>> = (action) => {
    setCfPrefilled(false);
    setCashflow(action);
  };
  const getOutsourcingActualTarget = () => {
    const matched = /^(\d{4})-(\d{2})$/.exec(overview.asOfMonth ?? "");
    if (matched) return { year: Number(matched[1]), month: Number(matched[2]) };
    return { year: REPORT_YEAR, month: Math.max(1, actualCutoffMonth) };
  };
  const getOutsourcingActualByItem = () => {
    const totals = new Map<string, number>();
    const hasAmount = new Set<string>();
    outsourcing.forEach((row) => {
      const tradeGroup = normalizeTradeGroup(row.tradeGroup);
      if (!TRADE_GROUPS.includes(tradeGroup as (typeof TRADE_GROUPS)[number])) return;
      const item = TRADE_GROUP_PROCESS_ITEM[tradeGroup as (typeof TRADE_GROUPS)[number]];
      totals.set(item, (totals.get(item) ?? 0) + (row.accum ?? 0));
      if (row.accum != null) hasAmount.add(item);
    });
    return new Map(
      [...totals].map(([item, total]) => [item, hasAmount.has(item) ? total : null] as const),
    );
  };
  const mergeOutsourcingActuals = (rows: ProjectDetailCostBudgetMonthly[]) => {
    const { year, month } = getOutsourcingActualTarget();
    const totals = getOutsourcingActualByItem();
    let merged = [...rows];
    totals.forEach((actual, item) => {
      if (item === "외주 경비") {
        merged = merged.map((row) =>
          row.year === year &&
          row.month === month &&
          (row.item === "Expense 1" || row.item === "Expense 2")
            ? { ...row, actual: null }
            : row,
        );
      }
      const index = merged.findIndex(
        (row) => row.item === item && row.year === year && row.month === month,
      );
      if (index >= 0) {
        merged = merged.map((row, rowIndex) =>
          rowIndex === index ? { ...row, actual } : row,
        );
      } else {
        merged.push({ item, year, month, plan: null, actual });
      }
    });
    return merged;
  };
  const removeAt = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, i: number) =>
    setter((rows) => rows.filter((_, j) => j !== i));

  const validateProgress = (rows: ProjectDetailProgressPoint[]): string | null => {
    const errors: string[] = [];
    const seen = new Map<string, number>();
    rows.forEach((p, i) => {
      const rowNo = i + 1;
      if (!Number.isInteger(p.year) || p.year < 2000 || p.year > 2100) {
        errors.push(t("projectDataEntryTab:progressRowYearRange", { rowNo, year: p.year }));
      }
      if (!Number.isInteger(p.month) || p.month < 1 || p.month > 12) {
        errors.push(t("projectDataEntryTab:progressRowMonthRange", { rowNo, month: p.month }));
      } else {
        const key = `${p.year}-${p.month}`;
        const prev = seen.get(key);
        if (prev != null) {
          errors.push(t("projectDataEntryTab:progressRowDuplicate", { rowNo, year: p.year, month: p.month, prev }));
        } else {
          seen.set(key, rowNo);
        }
      }
      (
        [
          ["planPct", t("projectDataEntryTab:monthlyPlanLabel")],
          ["actualPct", t("projectDataEntryTab:monthlyActualLabel")],
          ["planCumPct", t("projectDataEntryTab:cumulativePlanLabel")],
          ["actualCumPct", t("projectDataEntryTab:cumulativeActualLabel")],
        ] as const
      ).forEach(([field, label]) => {
        const v = p[field];
        if (v != null && (v < 0 || v > 100)) {
          errors.push(t("projectDataEntryTab:progressRowPercentRange", { rowNo, label, value: v }));
        }
      });
    });
    return errors.length > 0 ? errors.join(" ") : null;
  };

  // 사진 업로드: presigned URL 발급 → 직접 PUT
  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    setPhotoError(null);
    const newPaths: { objectPath: string }[] = [];
    const failed: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const token = readAdminToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const urlRes = await fetch("/api/storage/uploads/request-url", {
          method: "POST",
          headers,
          body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "image/jpeg" }),
        });
        if (!urlRes.ok) throw new Error(`URL 발급 실패: ${urlRes.status}`);
        const { uploadURL, objectPath } = (await urlRes.json()) as { uploadURL: string; objectPath: string };
        const putRes = await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type || "image/jpeg" },
          body: file,
        });
        if (!putRes.ok) throw new Error(`업로드 실패: ${putRes.status}`);
        newPaths.push({ objectPath });
      } catch {
        failed.push(file.name);
      }
    }
    if (newPaths.length > 0) setPhotos((prev) => [...prev, ...newPaths]);
    if (failed.length > 0) setPhotoError(t("projectDataEntryTab:photoUploadFailed", { files: failed.join(", ") }));
    setUploadingPhotos(false);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  useEffect(() => {
    let cancelled = false;
    setClosedSections(new Set());
    setLocksLoaded(false);
    fetch(`/api/projectdetail/section-locks?projectName=${encodeURIComponent(projectName)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ closedSections: string[] }>;
      })
      .then((data) => {
        if (!cancelled) {
          setClosedSections(new Set(data.closedSections));
          setLocksLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLocksLoaded(false);
          setCloseMsg(t("projectDataEntryTab:closeToggleFailed"));
        }
      });
    return () => { cancelled = true; };
  }, [projectName, t]);

  const handleToggleClose = async (section: string) => {
    const next = !closedSections.has(section);
    setCloseMsg(null);
    setClosingSection(section);
    try {
      const token = readAdminToken();
      const response = await fetch("/api/projectdetail/close", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ projectName, section, closed: next }),
      });
      if (!response.ok) throw new Error();
      setClosedSections((current) => {
        const updated = new Set(current);
        if (next) updated.add(section);
        else updated.delete(section);
        return updated;
      });
      queryClient.invalidateQueries({ queryKey: getGetProjectdetailQueryKey({ projectName }) });
    } catch {
      setCloseMsg(t("projectDataEntryTab:closeToggleFailed"));
    } finally {
      setClosingSection(null);
    }
  };

  const pendingRef = useRef(false);
  const queuedRef = useRef(false);
  const [cardMsgs, setCardMsgs] = useState<Record<string, string | null>>({});

  const save = (card?: string) => {
    if (!locksLoaded) return;
    if (!card && closedSections.size > 0) return;
    if (card && closedSections.has(card)) return;
    if (pendingRef.current) {
      queuedRef.current = true;
      return;
    }
    setSaveMsg(null);
    if (card) setCardMsgs((m) => ({ ...m, [card]: null }));
    const report = (msg: string) => {
      if (card) setCardMsgs((m) => ({ ...m, [card]: msg }));
      else setSaveMsg(msg);
    };
    const progressRows = progress.filter(
      (p) => p.year !== 0 || p.month !== 0 || p.planPct != null || p.actualPct != null || p.planCumPct != null || p.actualCumPct != null,
    );
    const validationError = validateProgress(progressRows);
    if (validationError) {
      report(validationError);
      return;
    }
    // 준공 전망(completion) 검증: 기준월 중복 및 기준월 없는 행 다중 입력 방지
    const estRows = costEstimation.filter((e) => e.contractAmount != null || e.costAmount != null);
    {
      const completions = estRows.filter((e) => e.kind === "completion");
      const undated = completions.filter((e) => e.year == null || e.month == null);
      if (undated.length > 1) {
        report(t("projectDataEntryTab:completionMissingMonthLimit"));
        return;
      }
      const seen = new Set<string>();
      for (const c of completions) {
        if (c.year == null || c.month == null) continue;
        const key = `${c.year}-${c.month}`;
        if (seen.has(key)) {
          report(t("projectDataEntryTab:completionDuplicateMonth", { year: c.year, month: String(c.month).padStart(2, "0") }));
          return;
        }
        seen.add(key);
      }
    }
    const body: ProjectDetail = {
      projectName,
      unit: "천 USD",
      overview: { ...overview, slideshowIntervalSeconds },
      progress: progressRows,
      milestones: milestones.filter((m) => m.label.trim() !== ""),
      costEstimation: estRows,
      costBudget: costBudget.filter((c) => c.item.trim() !== ""),
      costBudgetMonthly: mergeOutsourcingActuals(costBudgetMonthly).filter((r) => r.plan != null || r.actual != null),
      outsourcing: outsourcing.filter((o) => o.trade.trim() !== ""),
      // 자금수지 Excel prefill을 아직 수정하지 않았다면 저장하지 않음(향후 Excel 갱신 반영 유지)
      cashflow: cfPrefilled ? [] : cashflow.filter((c) => c.year > 0 && c.month >= 1 && c.month <= 12),
      cogsMonthly: cogsMonthly.filter((c) => c.year > 0 && c.month >= 1 && c.month <= 12),
      salesMonthly: salesMonthly.filter((s) => s.year > 0 && s.month >= 1 && s.month <= 12),
      photos,
    };
    pendingRef.current = true;
    mutation.mutate(
      { data: body },
      {
        onSettled: () => {
          pendingRef.current = false;
          if (queuedRef.current) {
            queuedRef.current = false;
            saveRef.current();
          }
        },
        onSuccess: (savedDetail) => {
          setPlanVersion(savedDetail.planVersion ?? planVersion);
          report(t("common:saveSucceeded"));
          queryClient.invalidateQueries({ queryKey: getGetProjectdetailQueryKey({ projectName }) });
        },
        onError: (err: unknown) => {
          const serverMsg =
            typeof err === "object" && err != null && "data" in err
              ? (err as { data?: { error?: string } | null }).data?.error
              : undefined;
          report(serverMsg || t("projectDataEntryTab:saveFailedRetry"));
        },
      },
    );
  };

  // 입력 후 자동 저장 — 저장되면 projectdetail 쿼리가 무효화되어 개요/다른 탭이 즉시 갱신됨
  const saveRef = useRef(save);
  saveRef.current = save;
  const skipAutoSaveRef = useRef(true);
  useEffect(() => {
    skipAutoSaveRef.current = true;
  }, [projectName]);
  useEffect(() => {
    if (!loaded) return;
    const lockState = `${locksLoaded}:${[...closedSections].sort().join(",")}`;
    const lockStateChanged = lastLockStateRef.current !== lockState;
    lastLockStateRef.current = lockState;
    if (!locksLoaded || lockStateChanged) {
      if (locksLoaded) skipAutoSaveRef.current = false;
      return;
    }
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }
    const t = setTimeout(() => saveRef.current(), 1000);
    return () => clearTimeout(t);
  }, [loaded, locksLoaded, closedSections, overview, progress, milestones, costEstimation, costBudget, costBudgetMonthly, outsourcing, cashflow, cogsMonthly, salesMonthly, photos, slideshowIntervalSeconds]);


  if (isLoading && !loaded) {
    return <div style={{ ...cardStyle, textAlign: "center", color: INK_MUTED, fontSize: "14px" }}>{t("common:loading")}</div>;
  }

  const nowYear = new Date().getFullYear();
  const toMonthIndex = (value: string | null | undefined) => {
    const match = /^(\d{4})-(\d{1,2})/.exec(value ?? "");
    return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : null;
  };
  const dataMonthIndexes = [
    ...progress.map((row) => row.year * 12 + row.month - 1),
    ...salesMonthly.map((row) => row.year * 12 + row.month - 1),
    ...costBudgetMonthly.map((row) => row.year * 12 + row.month - 1),
  ].filter((value) => Number.isFinite(value));
  const projectStartIndex =
    toMonthIndex(overview.startDate) ??
    (dataMonthIndexes.length > 0 ? Math.min(...dataMonthIndexes) : nowYear * 12);
  const projectEndIndex =
    toMonthIndex(overview.endDate) ??
    (dataMonthIndexes.length > 0 ? Math.max(...dataMonthIndexes) : projectStartIndex + 11);
  const processCostMonths = Array.from(
    { length: Math.min(120, Math.max(1, projectEndIndex - projectStartIndex + 1)) },
    (_, offset) => {
      const index = projectStartIndex + offset;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    },
  );
  const getProcessCostValue = (
    items: readonly string[],
    year: number,
    month: number,
    field: "plan" | "actual",
  ) => {
    const outsourcingTarget = getOutsourcingActualTarget();
    const outsourcingActual =
      field === "actual" &&
      year === outsourcingTarget.year &&
      month === outsourcingTarget.month
        ? getOutsourcingActualByItem().get(items[0])
        : undefined;
    if (outsourcingActual !== undefined) return outsourcingActual;
    const values = items.map(
      (item) =>
        costBudgetMonthly.find(
          (row) => row.item === item && row.year === year && row.month === month,
        )?.[field] ?? null,
    );
    return values.some((value) => value != null)
      ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
      : null;
  };
  const setProcessCostValue = (
    item: string,
    groupedItems: readonly string[],
    year: number,
    month: number,
    field: "plan" | "actual",
    value: number | null,
  ) =>
    setCostBudgetMonthly((rows) => {
      const preservedGroupValue = groupedItems
        .filter((groupedItem) => groupedItem !== item)
        .reduce<number>(
          (sum, groupedItem) =>
            sum +
            (rows.find(
              (row) =>
                row.item === groupedItem &&
                row.year === year &&
                row.month === month,
            )?.[field] ?? 0),
          0,
        );
      const storedValue = value == null ? null : value - preservedGroupValue;
      const index = rows.findIndex((row) => row.item === item && row.year === year && row.month === month);
      if (index >= 0) return rows.map((row, i) => (i === index ? { ...row, [field]: storedValue } : row));
      return [...rows, { item, year, month, plan: null, actual: null, [field]: storedValue }];
    });
  const getSalesPlan = (year: number, month: number) =>
    salesMonthly.find((row) => row.year === year && row.month === month)?.plan ?? null;
  const setSalesPlan = (year: number, month: number, value: number | null) =>
    setSalesMonthly((rows) => {
      const index = rows.findIndex((row) => row.year === year && row.month === month);
      if (index >= 0) return rows.map((row, i) => (i === index ? { ...row, plan: value } : row));
      return [...rows, { year, month, plan: value, actual: null }];
    });
  const getSalesEntryValue = (
    year: number,
    month: number,
    field: "plan" | "actual",
  ) => {
    const saved = salesMonthly.find(
      (row) => row.year === year && row.month === month,
    )?.[field];
    if (saved != null) return saved;
    if (year !== REPORT_YEAR) return null;
    return mainSalesMonths[month - 1]?.[field] ?? null;
  };
  const setSalesEntryValue = (
    year: number,
    month: number,
    field: "plan" | "actual",
    value: number | null,
  ) =>
    setSalesMonthly((rows) => {
      const index = rows.findIndex(
        (row) => row.year === year && row.month === month,
      );
      if (index >= 0) {
        return rows.map((row, rowIndex) =>
          rowIndex === index ? { ...row, [field]: value } : row,
        );
      }
      return [
        ...rows,
        {
          year,
          month,
          plan: field === "plan" ? value : getSalesEntryValue(year, month, "plan"),
          actual:
            field === "actual"
              ? value
              : getSalesEntryValue(year, month, "actual"),
        },
      ];
    });
  const getProgressPlan = (year: number, month: number) =>
    progress.find((row) => row.year === year && row.month === month)?.planPct ?? null;
  const setProgressPlan = (year: number, month: number, value: number | null) =>
    setProgress((rows) => {
      const index = rows.findIndex((row) => row.year === year && row.month === month);
      const next =
        index >= 0
          ? rows.map((row, i) => (i === index ? { ...row, planPct: value } : row))
          : [...rows, { year, month, planPct: value, actualPct: null, planCumPct: null, actualCumPct: null }];
      return calculateProgressPlanCumulative(next);
    });

  // 카드별 저장 버튼 + 마감 버튼 + 결과 메시지가 있는 섹션 헤더
  const cardHead = (label: string, key: string) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
        <span style={sectionTitle}>{label}</span>
        {planVersion > 0 && (
          <span style={{
            padding: "2px 8px",
            borderRadius: "999px",
            backgroundColor: TABLE_HEADER_BG,
            color: INK_NAVY,
            fontSize: "11px",
            fontWeight: 700,
          }}>
            {t("projectDataEntryTab:planVersion", { version: planVersion })}
          </span>
        )}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", pointerEvents: "auto" }}>
        {cardMsgs[key] && (
          <span style={{ fontSize: "13px", color: cardMsgs[key] === t("common:saveSucceeded") ? SUCCESS_GREEN : ACHIEVE_RED }}>
            {cardMsgs[key]}
          </span>
        )}
        {closeMsg && (
          <span style={{ fontSize: "13px", color: ACHIEVE_RED }}>{closeMsg}</span>
        )}
        {/* 마감 설정/해지 버튼 */}
        <button
          onClick={() => handleToggleClose(key)}
          disabled={!locksLoaded || closingSection != null}
          style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            padding: "4px 12px",
            fontSize: "13px",
            fontWeight: 600,
            backgroundColor: closedSections.has(key) ? INK_MUTED : "#fff",
            color: closedSections.has(key) ? "#fff" : INK_MUTED,
            border: `1px solid ${closedSections.has(key) ? INK_MUTED : BORDER_STRONG}`,
            borderRadius: "4px",
            cursor: !locksLoaded || closingSection != null ? "wait" : "pointer",
            opacity: !locksLoaded || closingSection != null ? 0.6 : 1,
            pointerEvents: "auto",
          }}
        >
          {closedSections.has(key) ? <><LockOpen size={12} />{t("projectDataEntryTab:closeUnlock")}</> : <><Lock size={12} />{t("projectDataEntryTab:closeLock")}</>}
        </button>
        {/* 저장 버튼 */}
        <button
          onClick={() => save(key)}
          disabled={!locksLoaded || closedSections.has(key) || mutation.isPending}
          style={{
            padding: "4px 14px",
            fontSize: "13px",
            fontWeight: 600,
            backgroundColor: ADMIN_NAVY,
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: (!locksLoaded || closedSections.has(key) || mutation.isPending) ? "not-allowed" : "pointer",
            opacity: (!locksLoaded || closedSections.has(key) || mutation.isPending) ? 0.45 : 1,
          }}
        >
          {t("common:save")}
        </button>
      </span>
    </div>
  );

  // 메인 경영현황판 Excel의 Site별 월 매출을 기본값으로 사용하는 월별 입력표.
  const salesMonthlyCard = (
    <div style={cardStyle}>
      {cardHead(
        `${t("projectDataEntryTab:salesMonthlyTitleConstruction")} · ${unitLabel}`,
        "salesMonthly",
      )}
      <div
        data-tbl="salesMonthly"
        onKeyDown={makeArrowNav("salesMonthly")}
        style={{ overflowX: "auto", marginTop: "8px" }}
      >
        <table
          style={{
            width: "100%",
            minWidth: "620px",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr>
              <th style={{ ...th, width: "18%" }}>{t("common:year")}</th>
              <th style={{ ...th, width: "14%" }}>{t("projectDataEntryTab:monthColumn")}</th>
              <th style={th}>{t("projectDataEntryTab:salesPlan")}</th>
              <th style={th}>{t("projectDataEntryTab:salesActual")}</th>
            </tr>
          </thead>
          <tbody>
            {mainSalesMonths.map(({ month }, rowIndex) => (
              <tr key={month}>
                <td style={{ ...tdCell, textAlign: "center", color: INK_BODY }}>
                  {REPORT_YEAR}
                </td>
                <td style={{ ...tdCell, textAlign: "center", color: INK_BODY }}>
                  {month}
                </td>
                <td style={tdCell}>
                  <VndInput
                    valueKUsd={getSalesEntryValue(REPORT_YEAR, month, "plan")}
                    onChange={(value) =>
                      setSalesEntryValue(REPORT_YEAR, month, "plan", value)
                    }
                    data-row={rowIndex}
                    data-col={0}
                  />
                </td>
                <td style={tdCell}>
                  <VndInput
                    valueKUsd={getSalesEntryValue(REPORT_YEAR, month, "actual")}
                    onChange={(value) =>
                      setSalesEntryValue(REPORT_YEAR, month, "actual", value)
                    }
                    data-row={rowIndex}
                    data-col={1}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: "12px", color: INK_MUTED, marginTop: "6px" }}>
        {t("projectDataEntryTab:salesMonthlyNote")}
      </div>
    </div>
  );

  // 용역: 월별 매출원가 (매출 탭)
  const cogsMonthlyCard = (
    <div style={cardStyle}>
      {cardHead(t("projectDataEntryTab:cogsMonthlyTitle"), "cogsMonthly")}
      <div data-tbl="cogsMonthly" onKeyDown={makeArrowNav("cogsMonthly")}>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
        <thead>
          <tr>
            <th style={th}>{t("common:year")}</th>
            <th style={th}>{t("projectDataEntryTab:monthColumn")}</th>
            <th style={th}>{t("projectDataEntryTab:acctCogsVnd")}</th>
            <th style={th}>{t("projectDataEntryTab:wipCogsVnd")}</th>
            <th style={{ ...th, width: "36px" }}></th>
          </tr>
        </thead>
        <tbody>
          {cogsMonthly.map((c, i) => (
            <tr key={i}>
              <td style={tdCell}><NumInput value={c.year} onChange={(v) => updateAt(setCogsMonthly, i, { year: v ?? 0 })} data-row={i} data-col={0} /></td>
              <td style={tdCell}><NumInput value={c.month} onChange={(v) => updateAt(setCogsMonthly, i, { month: v ?? 0 })} data-row={i} data-col={1} /></td>
              <td style={tdCell}><VndInput valueKUsd={c.acctCogs} onChange={(v) => updateAt(setCogsMonthly, i, { acctCogs: v })} data-row={i} data-col={2} /></td>
              <td style={tdCell}><VndInput valueKUsd={c.wipCogs} onChange={(v) => updateAt(setCogsMonthly, i, { wipCogs: v })} data-row={i} data-col={3} /></td>
              <td style={{ ...tdCell, textAlign: "center" }}><DelBtn onClick={() => removeAt(setCogsMonthly, i)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <button
        style={addBtn}
        onClick={() => {
          const last = cogsMonthly[cogsMonthly.length - 1];
          const next = last
            ? last.month >= 12
              ? { year: last.year + 1, month: 1 }
              : { year: last.year, month: last.month + 1 }
            : { year: new Date().getFullYear(), month: 1 };
          setCogsMonthly((rows) => [...rows, { ...next, acctCogs: null, wipCogs: null }]);
        }}
      >
        <Plus size={12} /> {t("projectDataEntryTab:addMonth")}
      </button>
      <div style={{ fontSize: "12px", color: INK_MUTED, marginTop: "6px" }}>
        {t("projectDataEntryTab:cogsMonthlyNote")}
      </div>
    </div>
  );

  const budgetAmount = (item: string) =>
    costBudget.find((row) => row.item === item)?.budget ?? null;
  const setBudgetAmount = (item: string, value: number | null) =>
    setCostBudget((rows) =>
      rows.map((row) => (row.item === item ? { ...row, budget: value } : row)),
    );
  const outsourcingBudgetValues = outsourcing
    .map((row) => row.budget)
    .filter((value): value is number => value != null);
  const outsourcingBudget =
    outsourcingBudgetValues.length > 0
      ? outsourcingBudgetValues.reduce((sum, value) => sum + value, 0)
      : null;
  const directBudget =
    outsourcingBudgetValues.length > 0 ||
    budgetAmount("Common") != null ||
    budgetAmount("Expense 1") != null
      ? (outsourcingBudget ?? 0) +
        (budgetAmount("Common") ?? 0) +
        (budgetAmount("Expense 1") ?? 0)
      : null;
  const indirectBudget = budgetAmount("Expense 2");
  const contingencyBudget = budgetAmount("Contingency");
  const totalBudget =
    directBudget != null || indirectBudget != null || contingencyBudget != null
      ? (directBudget ?? 0) + (indirectBudget ?? 0) + (contingencyBudget ?? 0)
      : null;
  const selectedBudgetCumulativeMonth = (() => {
    const matched = /^(\d{4})-(\d{2})$/.exec(overview.asOfMonth ?? "");
    if (matched && Number(matched[1]) === selectedMonthlyBudgetYear) {
      return Number(matched[2]);
    }
    return 12;
  })();
  const cumulativeBudgetAmount = (
    item: MonthlyBudgetItem | "Contingency",
    field: "plan" | "actual",
  ) => {
    const values = mergeOutsourcingActuals(costBudgetMonthly)
      .filter(
        (row) =>
          row.item === item &&
          row.year === selectedMonthlyBudgetYear &&
          row.month <= selectedBudgetCumulativeMonth,
      )
      .map((row) => row[field])
      .filter((value): value is number => value != null);
    return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null;
  };
  const outsourcingPlan = cumulativeBudgetAmount("외주성", "plan");
  const outsourcingActual = cumulativeBudgetAmount("외주성", "actual");
  const commonPlan = cumulativeBudgetAmount("Common", "plan");
  const commonActual = cumulativeBudgetAmount("Common", "actual");
  const expense1Plan = cumulativeBudgetAmount("Expense 1", "plan");
  const expense1Actual = cumulativeBudgetAmount("Expense 1", "actual");
  const expense2Plan = cumulativeBudgetAmount("Expense 2", "plan");
  const expense2Actual = cumulativeBudgetAmount("Expense 2", "actual");
  const contingencyPlan = cumulativeBudgetAmount("Contingency", "plan");
  const contingencyActual = cumulativeBudgetAmount("Contingency", "actual");
  const sumNullable = (...values: Array<number | null>) =>
    values.some((value) => value != null)
      ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
      : null;
  const directPlan = sumNullable(outsourcingPlan, commonPlan, expense1Plan);
  const directActual = sumNullable(outsourcingActual, commonActual, expense1Actual);
  const totalPlan = sumNullable(directPlan, expense2Plan, contingencyPlan);
  const totalActual = sumNullable(directActual, expense2Actual, contingencyActual);
  const budgetHierarchyBlock = (
    sectionLabel: string,
    blockIndex: number,
  ) => (
    <table
      key={sectionLabel}
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginTop: blockIndex === 0 ? "4px" : "10px",
        tableLayout: "fixed",
      }}
    >
      <thead>
        <tr>
          <th style={{ ...th, width: "11%" }}>{t("projectDataEntryTab:categoryColumn")}</th>
          <th style={{ ...th, width: "18%" }}>Level 1</th>
          <th style={{ ...th, width: "18%" }}>Level 2</th>
          <th style={{ ...th, width: "17%" }}>{t("projectDataEntryTab:budgetVnd")}</th>
          <th style={{ ...th, width: "18%" }}>{t("projectDataEntryTab:executionPlanCumulative")}</th>
          <th style={{ ...th, width: "18%" }}>{t("projectDataEntryTab:executionActualCumulative")}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ ...readOnlyCell, textAlign: "center", fontWeight: 700 }} rowSpan={9}>{sectionLabel}</td>
          <td style={readOnlyCell} rowSpan={3}>Direct cost</td>
          <td style={readOnlyCell}>{t("projectDataEntryTab:outsourcingItem")}</td>
          <td style={{ ...readOnlyCell, textAlign: "right" }}>{fmtMoney(outsourcingBudget)}</td>
          <td style={{ ...readOnlyCell, textAlign: "right" }}>{fmtMoney(outsourcingPlan)}</td>
          <td style={{ ...readOnlyCell, textAlign: "right" }}>{fmtMoney(outsourcingActual)}</td>
        </tr>
        <tr>
          <td style={readOnlyCell}>Common</td>
          <td style={tdCell}><VndInput valueKUsd={budgetAmount("Common")} onChange={(value) => setBudgetAmount("Common", value)} data-row={blockIndex * 4} data-col={0} /></td>
          <td style={{ ...readOnlyCell, textAlign: "right" }}>{fmtMoney(commonPlan)}</td>
          <td style={{ ...readOnlyCell, textAlign: "right" }}>{fmtMoney(commonActual)}</td>
        </tr>
        <tr>
          <td style={readOnlyCell}>Expense 1</td>
          <td style={tdCell}><VndInput valueKUsd={budgetAmount("Expense 1")} onChange={(value) => setBudgetAmount("Expense 1", value)} data-row={blockIndex * 4 + 1} data-col={0} /></td>
          <td style={{ ...readOnlyCell, textAlign: "right" }}>{fmtMoney(expense1Plan)}</td>
          <td style={{ ...readOnlyCell, textAlign: "right" }}>{fmtMoney(expense1Actual)}</td>
        </tr>
        <tr>
          <td style={{ ...readOnlyCell, textAlign: "center" }} colSpan={2}>{t("projectDataEntryTab:subtotal")}</td>
          <td style={{ ...readOnlyCell, textAlign: "right", fontWeight: 700 }}>{fmtMoney(directBudget)}</td>
          <td style={{ ...readOnlyCell, textAlign: "right", fontWeight: 700 }}>{fmtMoney(directPlan)}</td>
          <td style={{ ...readOnlyCell, textAlign: "right", fontWeight: 700 }}>{fmtMoney(directActual)}</td>
        </tr>
        <tr>
          <td style={readOnlyCell}>Indirect cost</td>
          <td style={readOnlyCell}>Expense 2</td>
          <td style={tdCell}><VndInput valueKUsd={budgetAmount("Expense 2")} onChange={(value) => setBudgetAmount("Expense 2", value)} data-row={blockIndex * 4 + 2} data-col={0} /></td>
          <td style={{ ...readOnlyCell, textAlign: "right" }}>{fmtMoney(expense2Plan)}</td>
          <td style={{ ...readOnlyCell, textAlign: "right" }}>{fmtMoney(expense2Actual)}</td>
        </tr>
        <tr>
          <td style={{ ...readOnlyCell, textAlign: "center" }} colSpan={2}>{t("projectDataEntryTab:subtotal")}</td>
          <td style={{ ...readOnlyCell, textAlign: "right", fontWeight: 700 }}>{fmtMoney(indirectBudget)}</td>
          <td style={{ ...readOnlyCell, textAlign: "right", fontWeight: 700 }}>{fmtMoney(expense2Plan)}</td>
          <td style={{ ...readOnlyCell, textAlign: "right", fontWeight: 700 }}>{fmtMoney(expense2Actual)}</td>
        </tr>
        <tr>
          <td style={readOnlyCell}>Contingency</td>
          <td style={readOnlyCell}>Contingency</td>
          <td style={tdCell}><VndInput valueKUsd={budgetAmount("Contingency")} onChange={(value) => setBudgetAmount("Contingency", value)} data-row={blockIndex * 4 + 3} data-col={0} /></td>
          <td style={{ ...readOnlyCell, textAlign: "right" }}>{fmtMoney(contingencyPlan)}</td>
          <td style={{ ...readOnlyCell, textAlign: "right" }}>{fmtMoney(contingencyActual)}</td>
        </tr>
        <tr>
          <td style={{ ...readOnlyCell, textAlign: "center" }} colSpan={2}>{t("projectDataEntryTab:subtotal")}</td>
          <td style={{ ...readOnlyCell, textAlign: "right", fontWeight: 700 }}>{fmtMoney(contingencyBudget)}</td>
          <td style={{ ...readOnlyCell, textAlign: "right", fontWeight: 700 }}>{fmtMoney(contingencyPlan)}</td>
          <td style={{ ...readOnlyCell, textAlign: "right", fontWeight: 700 }}>{fmtMoney(contingencyActual)}</td>
        </tr>
        <tr>
          <td style={{ ...readOnlyCell, textAlign: "center", fontWeight: 700 }} colSpan={2}>{t("common:total")}</td>
          <td style={{ ...readOnlyCell, textAlign: "right", fontWeight: 700 }}>{fmtMoney(totalBudget)}</td>
          <td style={{ ...readOnlyCell, textAlign: "right", fontWeight: 700 }}>{fmtMoney(totalPlan)}</td>
          <td style={{ ...readOnlyCell, textAlign: "right", fontWeight: 700 }}>{fmtMoney(totalActual)}</td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ fontSize: "14px", color: INK_BODY }}>
          <b>{projectName}</b> {t("projectDataEntryTab:headerDescPart1")} <b>VND</b> {t("projectDataEntryTab:headerDescPart2")} <b>%</b>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <div
            role="radiogroup"
            aria-label="프로젝트 메뉴 위치"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              minHeight: "32px",
              padding: "2px",
              border: `1px solid ${BORDER_MID}`,
              borderRadius: "6px",
              backgroundColor: TABLE_HEADER_BG,
            }}
          >
            {(["시공", "용역"] as const).map((businessType) => (
              <button
                type="button"
                role="radio"
                aria-checked={currentBusinessType === businessType}
                key={businessType}
                disabled={divisionMutation.isPending || mrProjectsQuery.isLoading}
                onClick={() => changeBusinessType(businessType)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "26px",
                  padding: "0 10px",
                  border: currentBusinessType === businessType ? `1px solid ${BORDER_MID}` : "1px solid transparent",
                  borderRadius: "4px",
                  backgroundColor: currentBusinessType === businessType ? "#fff" : "transparent",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: currentBusinessType === businessType ? ADMIN_NAVY : INK_MUTED,
                  cursor: divisionMutation.isPending ? "wait" : "pointer",
                  opacity: divisionMutation.isPending || mrProjectsQuery.isLoading ? 0.6 : 1,
                }}
              >
                {businessType}
              </button>
            ))}
          </div>
          {divisionMsg && (
            <span style={{ fontSize: "13px", color: divisionMsg.includes("실패") || divisionMsg.includes("없습니다") ? ACHIEVE_RED : SUCCESS_GREEN, fontWeight: 600 }}>
              {divisionMsg}
            </span>
          )}
          {statusMsg && (
            <span style={{ fontSize: "13px", color: statusMsg === t("projectDataEntryTab:statusChangeFailed") ? ACHIEVE_RED : SUCCESS_GREEN, fontWeight: 600 }}>
              {statusMsg}
            </span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "32px",
                fontSize: "13px",
                fontWeight: 700,
                padding: "0 11px",
                border: `1px solid ${currentStatus === "closed" ? STATUS_CLOSED_TEXT : STATUS_OPEN_TEXT}`,
                borderRadius: "6px",
                backgroundColor: currentStatus === "closed" ? STATUS_CLOSED_BG : STATUS_OPEN_BG,
                color: currentStatus === "closed" ? STATUS_CLOSED_TEXT : STATUS_OPEN_TEXT,
              }}
            >
              {currentStatus === "closed" ? t("common:closed") : t("common:inProgress")}
            </span>
            <button
              onClick={toggleStatus}
              disabled={statusMutation.isPending || mrProjectsQuery.isLoading}
              title={t("projectDataEntryTab:statusToggleTooltip")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                minHeight: "32px",
                fontSize: "13px",
                fontWeight: 600,
                color: ADMIN_NAVY,
                backgroundColor: "#fff",
                border: `1px solid ${BORDER_MID}`,
                borderRadius: "6px",
                padding: "0 12px",
                cursor: statusMutation.isPending ? "wait" : "pointer",
                opacity: statusMutation.isPending ? 0.7 : 1,
              }}
            >
              <ChevronRight size={12} />
              {statusMutation.isPending
                ? t("projectDataEntryTab:changingStatus")
                : currentStatus === "closed"
                  ? t("projectDataEntryTab:changeToOngoing")
                  : t("projectDataEntryTab:changeToClosed")}
            </button>
          </div>
          {saveMsg && (
            <span style={{ fontSize: "13px", color: saveMsg === t("common:saveSucceeded") ? SUCCESS_GREEN : ACHIEVE_RED, fontWeight: 600 }}>
              {saveMsg}
            </span>
          )}
          <button
            onClick={() => save()}
            disabled={!locksLoaded || mutation.isPending || closedSections.size > 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              minHeight: "32px",
              backgroundColor: ADMIN_NAVY,
              color: "#fff",
              border: `1px solid ${ADMIN_NAVY}`,
              borderRadius: "6px",
              padding: "0 12px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: (!locksLoaded || mutation.isPending || closedSections.size > 0) ? "not-allowed" : "pointer",
              opacity: (!locksLoaded || mutation.isPending || closedSections.size > 0) ? 0.4 : 1,
            }}
          >
            <Save size={13} />
            {mutation.isPending ? t("projectDataEntryTab:savingInProgress") : t("projectDataEntryTab:saveAll")}
          </button>
        </div>
      </div>

      {/* 0. 개요 정보 */}
      {!service && (
      <>
      <div style={cardStyle}>
        {cardHead(t("projectDataEntryTab:overviewTitle"), "overview")}
        <div data-tbl="overview" onKeyDown={makeArrowNav("overview")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>{t("projectDataEntryTab:contractAmountVnd")}</th>
              <th style={th}>{t("projectDataEntryTab:constructionStartDate")}</th>
              <th style={th}>{t("projectDataEntryTab:constructionEndDate")}</th>
              <th style={th}>{t("projectDataEntryTab:client")}</th>
              <th style={th}>{t("projectDataEntryTab:scale")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdCell}>
                <VndInput valueKUsd={overview.contractAmount} onChange={(v) => setOverview((o) => ({ ...o, contractAmount: v }))} data-row={0} data-col={0} />
              </td>
              <td style={tdCell}>
                <input
                  type="date"
                  value={overview.startDate ?? ""}
                  onChange={(e) => setOverview((o) => ({ ...o, startDate: e.target.value === "" ? null : e.target.value }))}
                  style={inputStyle}
                />
              </td>
              <td style={tdCell}>
                <input
                  type="date"
                  value={overview.endDate ?? ""}
                  onChange={(e) => setOverview((o) => ({ ...o, endDate: e.target.value === "" ? null : e.target.value }))}
                  style={inputStyle}
                />
              </td>
              <td style={tdCell}>
                <input
                  type="text"
                  value={overview.client ?? ""}
                  placeholder={t("projectDataEntryTab:clientPlaceholder")}
                  onChange={(e) => setOverview((o) => ({ ...o, client: e.target.value === "" ? null : e.target.value }))}
                  style={inputStyle}
                />
              </td>
              <td style={tdCell}>
                <input
                  type="text"
                  value={overview.scale ?? ""}
                  placeholder={t("projectDataEntryTab:scalePlaceholder")}
                  onChange={(e) => setOverview((o) => ({ ...o, scale: e.target.value === "" ? null : e.target.value }))}
                  style={inputStyle}
                />
              </td>
            </tr>
          </tbody>
        </table>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>{t("projectDataEntryTab:location")}</th>
              <th style={th}>{t("projectDataEntryTab:siteArea")}</th>
              <th style={th}>{t("projectDataEntryTab:grossFloorArea")}</th>
              <th style={th}>{t("projectDataEntryTab:purpose")}</th>
              <th style={th}>{t("projectDataEntryTab:ownershipStake")}</th>
              <th style={th}>{t("projectDataEntryTab:partnerCompany")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {([
                ["location", overview.location],
                ["siteArea", overview.siteArea],
                ["grossFloorArea", overview.grossFloorArea],
                ["purpose", overview.purpose],
                ["ownershipStake", overview.ownershipStake],
                ["partnerCompany", overview.partnerCompany],
              ] as const).map(([key, value], index) => (
                <td key={key} style={tdCell}>
                  <TextInput
                    value={value}
                    onChange={(next) => setOverview((o) => ({ ...o, [key]: next }))}
                    data-row={1}
                    data-col={index}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>{t("projectDataEntryTab:contractMethod")}</th>
              <th style={th}>{t("projectDataEntryTab:paymentTerms")}</th>
              <th style={th}>{t("projectDataEntryTab:defectWarrantyPeriod")}</th>
              <th style={th}>{t("projectDataEntryTab:defectWarrantyBond")}</th>
              <th style={th}>{t("projectDataEntryTab:advancePayment")}</th>
              <th style={th}>{t("projectDataEntryTab:retention")}</th>
              <th style={th}>{t("projectDataEntryTab:veTerms")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {([
                ["contractMethod", overview.contractMethod],
                ["paymentTerms", overview.paymentTerms],
                ["defectWarrantyPeriod", overview.defectWarrantyPeriod],
                ["defectWarrantyBond", overview.defectWarrantyBond],
                ["advancePayment", overview.advancePayment],
                ["retention", overview.retention],
                ["veTerms", overview.veTerms],
              ] as const).map(([key, value], index) => (
                <td key={key} style={tdCell}>
                  <TextInput
                    value={value}
                    onChange={(next) => setOverview((o) => ({ ...o, [key]: next }))}
                    data-row={2}
                    data-col={index}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      {/* 1. 월별 공정률 */}
      <div style={cardStyle}>
        {cardHead(t("projectDataEntryTab:progressTitle"), "progress")}
        <div data-tbl="progress" onKeyDown={makeArrowNav("progress")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>{t("common:year")}</th>
              <th style={th}>{t("projectDataEntryTab:monthColumn")}</th>
              <th style={th}>{t("projectDataEntryTab:monthlyPlanPercent")}</th>
              <th style={th}>{t("projectDataEntryTab:monthlyActualPercent")}</th>
              <th style={th}>{t("projectDataEntryTab:cumulativePlanPercent")}</th>
              <th style={th}>{t("projectDataEntryTab:cumulativeActualPercent")}</th>
              <th style={{ ...th, width: "36px" }}></th>
            </tr>
          </thead>
          <tbody>
            {progress.map((p, i) => (
              <tr key={i}>
                <td style={tdCell}><NumInput value={p.year} onChange={(v) => updateProgressAt(i, { year: v ?? 0 })} data-row={i} data-col={0} /></td>
                <td style={tdCell}>
                  <NumInput
                    value={p.month}
                    min={1}
                    max={12}
                    step={1}
                    onChange={(v) => updateProgressAt(i, { month: v ?? 1 })}
                    data-row={i}
                    data-col={1}
                  />
                </td>
                <td style={tdCell}><NumInput value={p.planPct} step={0.1} onChange={(v) => updateProgressAt(i, { planPct: v })} data-row={i} data-col={2} /></td>
                <td style={tdCell}><NumInput value={p.actualPct} step={0.1} onChange={(v) => updateProgressAt(i, { actualPct: v })} data-row={i} data-col={3} /></td>
                <td style={tdCell}>
                  <input
                    type="number"
                    value={p.planCumPct ?? ""}
                    readOnly
                    aria-label={t("projectDataEntryTab:cumulativePlanPercent")}
                    data-row={i}
                    data-col={4}
                    style={{ ...inputStyle, textAlign: "right" }}
                  />
                </td>
                <td style={tdCell}><NumInput value={p.actualCumPct} onChange={(v) => updateProgressAt(i, { actualCumPct: v })} data-row={i} data-col={5} /></td>
                <td style={{ ...tdCell, textAlign: "center" }}><DelBtn onClick={() => setProgress((rows) => calculateProgressPlanCumulative(rows.filter((_, j) => j !== i)))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <button
          style={addBtn}
          onClick={() => {
            const last = progress[progress.length - 1];
            const next = last
              ? last.month >= 12
                ? { year: last.year + 1, month: 1 }
                : { year: last.year, month: last.month + 1 }
              : { year: nowYear, month: 1 };
            setProgress((rows) =>
              calculateProgressPlanCumulative([
                ...rows,
                { ...next, planPct: null, actualPct: null, planCumPct: null, actualCumPct: null },
              ]),
            );
          }}
        >
          <Plus size={12} /> {t("projectDataEntryTab:addMonth")}
        </button>
      </div>

      {!service && salesMonthlyCard}

      {/* 2. 마일스톤 */}
      <div style={cardStyle}>
        {cardHead(t("projectDataEntryTab:milestonesTitle"), "milestones")}
        <div data-tbl="milestones" onKeyDown={makeArrowNav("milestones")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>{t("projectDataEntryTab:itemNameColumn")}</th>
              <th style={th}>{t("projectDataEntryTab:planStartColumn")}</th>
              <th style={th}>{t("projectDataEntryTab:planEndColumn")}</th>
              <th style={th}>{t("projectDataEntryTab:actualStartColumn")}</th>
              <th style={th}>{t("projectDataEntryTab:actualEndColumn")}</th>
              <th style={{ ...th, width: "36px" }}></th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m, i) => (
              <tr key={i}>
                <td style={tdCell}><TextInput value={m.label} onChange={(v) => updateAt(setMilestones, i, { label: v ?? "" })} placeholder={t("projectDataEntryTab:milestoneLabelPlaceholder")} data-row={i} data-col={0} /></td>
                <td style={tdCell}><DateInput value={m.planStart} onChange={(v) => updateAt(setMilestones, i, { planStart: v })} /></td>
                <td style={tdCell}><DateInput value={m.planEnd} onChange={(v) => updateAt(setMilestones, i, { planEnd: v })} /></td>
                <td style={tdCell}><DateInput value={m.actualStart} onChange={(v) => updateAt(setMilestones, i, { actualStart: v })} /></td>
                <td style={tdCell}><DateInput value={m.actualEnd} onChange={(v) => updateAt(setMilestones, i, { actualEnd: v })} /></td>
                <td style={{ ...tdCell, textAlign: "center" }}><DelBtn onClick={() => removeAt(setMilestones, i)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <button
          style={addBtn}
          onClick={() => setMilestones((rows) => [...rows, { label: "", planStart: null, planEnd: null, actualStart: null, actualEnd: null }])}
        >
          <Plus size={12} /> {t("projectDataEntryTab:addMilestone")}
        </button>
      </div>

      {/* 공정별 원가 계획 */}
      <div style={cardStyle}>
        {cardHead(t("projectDataEntryTab:processCostPlanTitle"), "costBudget")}
        <div style={{ fontSize: "12px", color: INK_MUTED, marginTop: "4px" }}>
          {t("projectDataEntryTab:processCostPlanNote")}
        </div>
        <div style={{ overflowX: "auto", marginTop: "8px" }}>
          <div data-tbl="processCostPlan" onKeyDown={makeArrowNav("processCostPlan")}>
            <table style={{ width: "100%", minWidth: "2140px", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: "64px" }} rowSpan={2}>{t("common:year")}</th>
                  <th style={{ ...th, width: "52px" }} rowSpan={2}>{t("projectDataEntryTab:monthColumn")}</th>
                  {PROCESS_COST_ITEMS.map((item) => (
                    <th key={item.key} style={th} colSpan={2}>{t(`projectDataEntryTab:${item.label}`)}</th>
                  ))}
                  <th style={{ ...th, width: "92px" }} rowSpan={2}>{t("projectDataEntryTab:totalPlan")}</th>
                  <th style={{ ...th, width: "92px" }} rowSpan={2}>{t("projectDataEntryTab:totalActual")}</th>
                  <th style={{ ...th, width: "104px" }} rowSpan={2}>{t("projectDataEntryTab:monthlySales")}</th>
                  <th style={{ ...th, width: "78px" }} rowSpan={2}>{t("projectDataEntryTab:progressRate")}</th>
                </tr>
                <tr>
                  {PROCESS_COST_ITEMS.flatMap((item) => [
                    <th key={`${item.key}-plan`} style={th}>{t("common:plan")}</th>,
                    <th key={`${item.key}-actual`} style={th}>{t("common:actual")}</th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {processCostMonths.map(({ year, month }, rowIndex) => {
                  const planValues = PROCESS_COST_ITEMS.map((item) => getProcessCostValue(item.keys, year, month, "plan"));
                  const actualValues = PROCESS_COST_ITEMS.map((item) => getProcessCostValue(item.keys, year, month, "actual"));
                  const totalPlan = planValues.some((value) => value != null)
                    ? planValues.reduce<number>((sum, value) => sum + (value ?? 0), 0)
                    : null;
                  const totalActual = actualValues.some((value) => value != null)
                    ? actualValues.reduce<number>((sum, value) => sum + (value ?? 0), 0)
                    : null;
                  return (
                    <tr key={`${year}-${month}`}>
                      <td style={{ ...tdCell, textAlign: "center", fontSize: "13px", color: INK_BODY }}>{String(year).slice(2)}{t("projectDataEntryTab:yearSuffix")}</td>
                      <td style={{ ...tdCell, textAlign: "center", fontSize: "13px", color: INK_BODY }}>{t("projectDataEntryTab:monthSuffix", { month })}</td>
                      {PROCESS_COST_ITEMS.flatMap((item, itemIndex) => [
                        <td key={`${item.key}-plan`} style={tdCell}>
                          <VndInput
                            valueKUsd={planValues[itemIndex]}
                            onChange={(value) => setProcessCostValue(item.key, item.keys, year, month, "plan", value)}
                            data-row={rowIndex}
                            data-col={itemIndex * 2}
                          />
                        </td>,
                        <td key={`${item.key}-actual`} style={tdCell}>
                          <VndInput
                            valueKUsd={actualValues[itemIndex]}
                            onChange={(value) => setProcessCostValue(item.key, item.keys, year, month, "actual", value)}
                            data-row={rowIndex}
                            data-col={itemIndex * 2 + 1}
                          />
                        </td>,
                      ])}
                      <td style={{ ...tdCell, textAlign: "right", padding: "5px 6px", fontSize: "13px", fontWeight: 700, color: INK_NAVY, backgroundColor: TABLE_HEADER_BG }}>
                        {fmtMoney(totalPlan)}
                      </td>
                      <td style={{ ...tdCell, textAlign: "right", padding: "5px 6px", fontSize: "13px", fontWeight: 700, color: INK_NAVY, backgroundColor: TABLE_HEADER_BG }}>
                        {fmtMoney(totalActual)}
                      </td>
                      <td style={tdCell}>
                        <VndInput
                          valueKUsd={getSalesPlan(year, month)}
                          onChange={(value) => setSalesPlan(year, month, value)}
                          data-row={rowIndex}
                          data-col={PROCESS_COST_ITEMS.length * 2}
                        />
                      </td>
                      <td style={tdCell}>
                        <NumInput
                          value={getProgressPlan(year, month)}
                          onChange={(value) => setProgressPlan(year, month, value)}
                          data-row={rowIndex}
                          data-col={PROCESS_COST_ITEMS.length * 2 + 1}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </>
      )}

      {/* 용역: 개요 정보 */}
      {service && (
      <div style={cardStyle}>
        {cardHead(t("projectDataEntryTab:overviewTitle"), "overview")}
        <div data-tbl="svcOverview" onKeyDown={makeArrowNav("svcOverview")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>{t("projectDataEntryTab:contractAmountVnd")}</th>
              <th style={th}>{t("projectDataEntryTab:performanceStartDate")}</th>
              <th style={th}>{t("projectDataEntryTab:performanceEndDate")}</th>
              <th style={th}>{t("projectDataEntryTab:client")}</th>
              <th style={th}>{t("projectDataEntryTab:scopeOfWork")}</th>
              <th style={th}>{t("projectDataEntryTab:baseMonthOfRecord")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdCell}>
                <VndInput valueKUsd={overview.contractAmount} onChange={(v) => setOverview((o) => ({ ...o, contractAmount: v }))} data-row={0} data-col={0} />
              </td>
              <td style={tdCell}>
                <DateInput value={overview.startDate} onChange={(v) => setOverview((o) => ({ ...o, startDate: v }))} />
              </td>
              <td style={tdCell}>
                <DateInput value={overview.endDate} onChange={(v) => setOverview((o) => ({ ...o, endDate: v }))} />
              </td>
              <td style={tdCell}>
                <TextInput value={overview.client} placeholder={t("projectDataEntryTab:clientPlaceholderService")} onChange={(v) => setOverview((o) => ({ ...o, client: v }))} data-row={0} data-col={1} />
              </td>
              <td style={tdCell}>
                <TextInput value={overview.scope} placeholder={t("projectDataEntryTab:scopePlaceholder")} onChange={(v) => setOverview((o) => ({ ...o, scope: v }))} data-row={0} data-col={2} />
              </td>
              <td style={tdCell}>
                <MonthInput value={overview.asOfMonth} onChange={(v) => setOverview((o) => ({ ...o, asOfMonth: v }))} />
              </td>
            </tr>
          </tbody>
        </table>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
          <thead>
            <tr>
              <th style={th}>{t("projectDataEntryTab:annualRevenueTargetVnd")}</th>
              <th style={th}>{t("projectDataEntryTab:cumulativeRevenueActualVnd")}</th>
              <th style={th}>Cash Confirmed (A)</th>
              <th style={th}>Cash Collection (B)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdCell}>
                <VndInput valueKUsd={overview.revenueAnnualTarget} onChange={(v) => setOverview((o) => ({ ...o, revenueAnnualTarget: v }))} data-row={1} data-col={0} />
              </td>
              <td style={tdCell}>
                <VndInput valueKUsd={overview.revenueTotal} onChange={(v) => setOverview((o) => ({ ...o, revenueTotal: v }))} data-row={1} data-col={1} />
              </td>
              <td style={tdCell}>
                <VndInput valueKUsd={overview.cashConfirmed} onChange={(v) => setOverview((o) => ({ ...o, cashConfirmed: v }))} data-row={1} data-col={2} />
              </td>
              <td style={tdCell}>
                <VndInput valueKUsd={overview.cashCollection} onChange={(v) => setOverview((o) => ({ ...o, cashCollection: v }))} data-row={1} data-col={3} />
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ fontSize: "12px", color: INK_MUTED, marginTop: "6px" }}>
          {t("projectDataEntryTab:overviewCashNote")}
        </div>
        </div>
      </div>
      )}

      {/* 3. 원가율 */}
      <div style={cardStyle}>
        {cardHead(service ? t("projectDataEntryTab:costEstimationTitleService") : t("projectDataEntryTab:costEstimationTitleConstruction"), "costEstimation")}
        <div data-tbl="costEst" onKeyDown={makeArrowNav("costEst")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>{t("projectDataEntryTab:categoryColumn")}</th>
              <th style={th}>{t("common:baseMonth")}</th>
              <th style={th}>{t("projectDataEntryTab:contractAmountVnd")}</th>
              <th style={th}>{t("projectDataEntryTab:costVnd")}</th>
              <th style={{ ...th, width: "30px" }}></th>
            </tr>
          </thead>
          <tbody>
            {costEstimation.map((e, i) => {
              const isCompletion = e.kind === "completion";
              const completionCount = costEstimation.filter((r) => r.kind === "completion").length;
              return (
                <tr key={`${e.kind}-${i}`}>
                  <td style={{ ...tdCell, fontSize: "13px", padding: "5px 6px", color: INK_BODY }}>
                    {t(`projectDataEntryTab:${EST_KINDS.find((k) => k.kind === e.kind)?.label ?? e.kind}`)}
                  </td>
                  <td style={{ ...tdCell, textAlign: "center" }}>
                    {isCompletion ? (
                      <input
                        type="month"
                        value={e.year != null && e.month != null ? `${e.year}-${String(e.month).padStart(2, "0")}` : ""}
                        onChange={(ev) => {
                          const v = ev.target.value;
                          if (!v) {
                            updateAt(setCostEstimation, i, { year: null, month: null });
                          } else {
                            const [y, m] = v.split("-");
                            updateAt(setCostEstimation, i, { year: Number(y), month: Number(m) });
                          }
                        }}
                        style={{ fontSize: "13px", padding: "3px 4px", border: `1px solid ${BORDER_LIGHT}`, borderRadius: "3px" }}
                      />
                    ) : (
                      <span style={{ fontSize: "12px", color: INK_MUTED }}>-</span>
                    )}
                  </td>
                  <td style={tdCell}><VndInput valueKUsd={e.contractAmount} onChange={(v) => updateAt(setCostEstimation, i, { contractAmount: v })} data-row={i} data-col={0} /></td>
                  <td style={tdCell}><VndInput valueKUsd={e.costAmount} onChange={(v) => updateAt(setCostEstimation, i, { costAmount: v })} data-row={i} data-col={1} /></td>
                  <td style={{ ...tdCell, textAlign: "center" }}>
                    {isCompletion && completionCount > 1 && (
                      <button
                        onClick={() => setCostEstimation((rows) => rows.filter((_, j) => j !== i))}
                        style={{ border: "none", background: "none", cursor: "pointer", color: ACHIEVE_RED, padding: "2px" }}
                        title={t("common:delete")}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <button
          onClick={() =>
            setCostEstimation((rows) => [...rows, { kind: "completion", contractAmount: null, costAmount: null, year: null, month: null }])
          }
          style={{ marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: POINT_BLUE, border: "1px dashed #9db6d8", borderRadius: "4px", padding: "3px 8px", background: "none", cursor: "pointer" }}
        >
          <Plus size={12} /> {t("projectDataEntryTab:addCompletionForecast")}
        </button>
        <div style={{ fontSize: "12px", color: INK_MUTED, marginTop: "4px" }}>
          {t("projectDataEntryTab:costEstimationNote")}
        </div>
      </div>

      {/* 용역: 매출 탭 순서(개요 다음) */}
      {service && (
        <>
          {salesMonthlyCard}
          {cogsMonthlyCard}
        </>
      )}

      {/* 예산 집행 현황 */}
      <div style={cardStyle}>
        {cardHead(service ? t("projectDataEntryTab:costBudgetTitleService") : t("projectDataEntryTab:costBudgetTitleConstruction"), "costBudget")}
        <div style={{ fontSize: "12px", color: INK_MUTED, marginTop: "4px" }}>
          {t("projectDataEntryTab:costBudgetNote")}
        </div>
        <div data-tbl="costBudget" onKeyDown={makeArrowNav("costBudget")}>
          {budgetHierarchyBlock(t("projectDataEntryTab:executionPlan"), 0)}
          {budgetHierarchyBlock(t("projectDataEntryTab:executionActual"), 1)}
        </div>

        {/* 월별 계획/실적 */}
        <div style={{ marginTop: "10px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: POINT_BLUE, marginBottom: "4px" }}>
            {t("projectDataEntryTab:monthlyPlanActualYear", { year: selectedMonthlyBudgetYear })}
          </div>
          <div style={{ fontSize: "11px", color: INK_MUTED, marginBottom: "6px" }}>
            {t("projectDataEntryTab:monthlyPlanActualNote")}
          </div>
          {(() => {
            const item = selectedMonthlyBudgetItem;
            const availableYears = Array.from(
              new Set([
                ...Array.from({ length: 11 }, (_, index) => REPORT_YEAR - 5 + index),
                ...costBudgetMonthly.map((row) => row.year),
              ]),
            ).sort((a, b) => b - a);
            const getCbm = (month: number, field: "plan" | "actual") =>
              costBudgetMonthly.find((r) => r.item === item && r.year === selectedMonthlyBudgetYear && r.month === month)?.[field] ?? null;
            const setCbm = (month: number, field: "plan" | "actual", value: number | null) =>
              setCostBudgetMonthly((rows) => {
                const idx = rows.findIndex((r) => r.item === item && r.year === selectedMonthlyBudgetYear && r.month === month);
                if (idx >= 0) return rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r));
                return [...rows, { item, year: selectedMonthlyBudgetYear, month, plan: null, actual: null, [field]: value }];
              });
            const tblKey = `cbm-${item}-${selectedMonthlyBudgetYear}`;
            return (
              <div key={item} style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <select
                    value={item}
                    onChange={(event) => setSelectedMonthlyBudgetItem(event.target.value as MonthlyBudgetItem)}
                    aria-label={t("projectDataEntryTab:itemColumn")}
                    style={{
                      minWidth: "180px",
                      padding: "5px 28px 5px 8px",
                      border: `1px solid ${BORDER_LIGHT}`,
                      borderRadius: "3px",
                      backgroundColor: "#fff",
                      color: INK_NAVY,
                      fontFamily: "inherit",
                      fontSize: "13px",
                      fontWeight: 700,
                      lineHeight: 1.4,
                    }}
                  >
                    {MONTHLY_BUDGET_ITEMS.map((option) => (
                      <option key={option} value={option}>
                        {option === "외주성" ? t("projectDataEntryTab:outsourcingItem") : option}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedMonthlyBudgetYear}
                    onChange={(event) => setSelectedMonthlyBudgetYear(Number(event.target.value))}
                    aria-label={t("projectDataEntryTab:monthlyPlanActualYear", { year: selectedMonthlyBudgetYear })}
                    style={{
                      minWidth: "100px",
                      padding: "5px 28px 5px 8px",
                      border: `1px solid ${BORDER_LIGHT}`,
                      borderRadius: "3px",
                      backgroundColor: "#fff",
                      color: INK_NAVY,
                      fontFamily: "inherit",
                      fontSize: "13px",
                      fontWeight: 700,
                      lineHeight: 1.4,
                    }}
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div data-tbl={tblKey} onKeyDown={makeArrowNav(tblKey)}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, width: "44px" }}>{t("projectDataEntryTab:monthColumn")}</th>
                      <th style={th}>{t("projectDataEntryTab:planVndLabel")}</th>
                      <th style={th}>{t("projectDataEntryTab:actualVndLabel")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <tr key={month}>
                        <td style={{ ...tdCell, textAlign: "center", fontSize: "13px", color: INK_MUTED, padding: "3px 4px" }}>{t("projectDataEntryTab:monthSuffix", { month })}</td>
                        <td style={tdCell}><VndInput valueKUsd={getCbm(month, "plan")} onChange={(v) => setCbm(month, "plan", v)} data-row={month - 1} data-col={0} /></td>
                        <td style={tdCell}><VndInput valueKUsd={getCbm(month, "actual")} onChange={(v) => setCbm(month, "actual", v)} data-row={month - 1} data-col={1} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 5. 외주/자재 */}
      <div style={cardStyle}>
        {cardHead(service ? t("projectDataEntryTab:outsourcingTitleService") : t("projectDataEntryTab:outsourcingTitleConstruction"), "outsourcing")}
        <div data-tbl="outsourcing" onKeyDown={makeArrowNav("outsourcing")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>{t("projectDataEntryTab:tradeGroupColumn")}</th>
              <th style={th}>{t("projectDataEntryTab:tradeColumn")}</th>
              <th style={th}>{t("projectDataEntryTab:vendorColumn")}</th>
              <th style={th}>{t("projectDataEntryTab:categoryColumn")}</th>
              <th style={th}>{t("projectDataEntryTab:contractDateColumn")}</th>
              <th style={th}>{t("projectDataEntryTab:changeNoColumn")}</th>
              <th style={th}>{t("projectDataEntryTab:budgetAVnd")}</th>
              <th style={th}>{t("projectDataEntryTab:executedBudgetVnd")}</th>
              <th style={th}>{t("projectDataEntryTab:resolvedBVnd")}</th>
              <th style={th}>{t("projectDataEntryTab:thisMonthVnd")}</th>
              <th style={th}>{t("projectDataEntryTab:accumCVnd")}</th>
            </tr>
          </thead>
          <tbody>
            {outsourcing.map((o, i) => (
              <tr key={i}>
                <td style={tdCell}>
                  <select
                    value={normalizeTradeGroup(o.tradeGroup) ?? ""}
                    onChange={(ev) => updateAt(setOutsourcing, i, { tradeGroup: ev.target.value || null })}
                    style={{
                      width: "100%",
                      padding: "5px 6px",
                      border: `1px solid ${BORDER_LIGHT}`,
                      borderRadius: "3px",
                      backgroundColor: "#fff",
                      color: INK_BODY,
                      fontFamily: "inherit",
                      fontSize: "13px",
                      fontWeight: 400,
                      lineHeight: 1.4,
                    }}
                  >
                    <option value="">-</option>
                    {TRADE_GROUPS.map((g) => (
                      <option key={g} value={g}>{t(`projectDataEntryTab:${TRADE_GROUP_LABEL_KEY[g]}`)}</option>
                    ))}
                  </select>
                </td>
                <td style={readOnlyCell}>{o.trade || "-"}</td>
                <td style={readOnlyCell}>{o.vendor || "-"}</td>
                <td style={readOnlyCell}>{o.category || "-"}</td>
                <td style={{ ...readOnlyCell, textAlign: "center" }}>{o.contractDate || "-"}</td>
                <td style={{ ...readOnlyCell, textAlign: "center" }}>{o.changeNo || "-"}</td>
                <td style={{ ...readOnlyCell, textAlign: "right" }}>{fmtMoney(o.budget)}</td>
                <td style={{ ...readOnlyCell, textAlign: "right" }}>{fmtMoney(o.executedBudget)}</td>
                <td style={{ ...readOnlyCell, textAlign: "right" }}>{fmtMoney(o.resolved)}</td>
                <td style={{ ...readOnlyCell, textAlign: "right" }}>{fmtMoney(o.thisMonth)}</td>
                <td style={{ ...readOnlyCell, textAlign: "right" }}>{fmtMoney(o.accum)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* 6. 월별 자금 */}
      <div style={cardStyle}>
        {cardHead(service ? t("projectDataEntryTab:cashflowTitleService") : t("projectDataEntryTab:cashflowTitleConstruction"), "cashflow")}
        <div data-tbl="cashflow" onKeyDown={makeArrowNav("cashflow")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>{t("common:year")}</th>
              <th style={th}>{t("projectDataEntryTab:monthColumn")}</th>
              <th style={th}>{t("projectDataEntryTab:cashInVnd")}</th>
              <th style={th}>{t("projectDataEntryTab:cashOutVnd")}</th>
              <th style={th}>{t("projectDataEntryTab:equivalentVnd")}</th>
              <th style={th}>{t("projectDataEntryTab:confirmedProgressVnd")}</th>
              <th style={{ ...th, width: "36px" }}></th>
            </tr>
          </thead>
          <tbody>
            {cashflow.map((c, i) => (
              <tr key={i}>
                <td style={tdCell}><NumInput value={c.year} onChange={(v) => updateAt(editCashflow, i, { year: v ?? 0 })} data-row={i} data-col={0} /></td>
                <td style={tdCell}><NumInput value={c.month} onChange={(v) => updateAt(editCashflow, i, { month: v ?? 0 })} data-row={i} data-col={1} /></td>
                <td style={tdCell}><VndInput valueKUsd={c.cashIn} onChange={(v) => updateAt(editCashflow, i, { cashIn: v })} data-row={i} data-col={2} /></td>
                <td style={tdCell}><VndInput valueKUsd={c.cashOut} onChange={(v) => updateAt(editCashflow, i, { cashOut: v })} data-row={i} data-col={3} /></td>
                <td style={tdCell}><VndInput valueKUsd={c.equivalent} onChange={(v) => updateAt(editCashflow, i, { equivalent: v })} data-row={i} data-col={4} /></td>
                <td style={tdCell}><VndInput valueKUsd={c.confirmedProgress} onChange={(v) => updateAt(editCashflow, i, { confirmedProgress: v })} data-row={i} data-col={5} /></td>
                <td style={{ ...tdCell, textAlign: "center" }}><DelBtn onClick={() => removeAt(editCashflow, i)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <button
          style={addBtn}
          onClick={() => {
            const last = cashflow[cashflow.length - 1];
            const next = last
              ? last.month >= 12
                ? { year: last.year + 1, month: 1 }
                : { year: last.year, month: last.month + 1 }
              : { year: nowYear, month: 1 };
            editCashflow((rows) => [...rows, { ...next, cashIn: null, cashOut: null, equivalent: null, confirmedProgress: null }]);
          }}
        >
          <Plus size={12} /> {t("projectDataEntryTab:addMonth")}
        </button>
        <div style={{ fontSize: "12px", color: INK_MUTED, marginTop: "6px" }}>
          {t("projectDataEntryTab:cashflowNote")}
        </div>
        {cfPrefilled && (
          <div style={{ fontSize: "12px", color: POINT_BLUE, marginTop: "4px", fontWeight: 600 }}>
            {t("projectDataEntryTab:cashflowPrefilledNote")}
          </div>
        )}
      </div>

      {/* 7. 현장 사진 */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={sectionTitle}>{t("projectDataEntryTab:photoSection")}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <label style={{ fontSize: "13px", color: chartTheme.subLabel, display: "flex", alignItems: "center", gap: "6px" }}>
              {t("projectDataEntryTab:slideshowIntervalLabel")}
              <input
                type="number"
                min={0}
                max={300}
                step={1}
                value={slideshowIntervalSeconds}
                onChange={(e) => setSlideshowIntervalSeconds(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                style={{ width: "60px", border: "1px solid #c8d2de", borderRadius: "4px", padding: "3px 6px", fontSize: "13px" }}
              />
              <span style={{ fontSize: "11px", color: INK_MUTED }}>{t("projectDataEntryTab:slideshowIntervalOff")}</span>
            </label>
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhotos}
              style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                fontSize: "13px", fontWeight: 600,
                background: ADMIN_NAVY, color: "#fff",
                border: "none", borderRadius: "5px", padding: "5px 12px",
                cursor: uploadingPhotos ? "wait" : "pointer",
                opacity: uploadingPhotos ? 0.7 : 1,
              }}
            >
              <Upload size={13} />
              {uploadingPhotos ? t("projectDataEntryTab:photoUploading") : t("projectDataEntryTab:photoUploadBtn")}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => handlePhotoUpload(e.target.files)}
            />
          </div>
        </div>
        {photoError && (
          <div style={{ fontSize: "12px", color: ACHIEVE_RED, marginBottom: "8px" }}>{photoError}</div>
        )}
        {photos.length === 0 && !uploadingPhotos && (
          <div style={{ ...emptyNote, padding: "24px 0" }}>
            {t("projectDataEntryTab:photoEmpty")}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px" }}>
          {photos.map((p, i) => (
            <div key={p.objectPath} style={{ position: "relative", borderRadius: "6px", overflow: "hidden", aspectRatio: "4/3", background: TABLE_HEADER_BG }}>
              <img
                src={`/api/storage${p.objectPath}`}
                alt={`photo-${i + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <button
                onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                title={t("projectDataEntryTab:photoDeleteBtn")}
                style={{
                  position: "absolute", top: "4px", right: "4px",
                  background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%",
                  width: "22px", height: "22px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#fff", padding: 0,
                }}
              >
                <X size={13} />
              </button>
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "rgba(0,0,0,0.35)", color: "#fff",
                fontSize: "10px", textAlign: "center", padding: "2px 0",
              }}>
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
