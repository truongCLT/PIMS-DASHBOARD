import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Save } from "lucide-react";
import {
  usePutProjectdetail,
  useListMgmtreportProjects,
  useUpdateMgmtreportProjectStatus,
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
import { cardStyle, sectionTitle } from "../lib/uiTokens";
import { tokens as aquaTokens } from "@workspace/aqua-glass";
const AG = aquaTokens.color.light;

const th: React.CSSProperties = {
  backgroundColor: AG.background,
  color: AG.foreground,
  fontSize: "13px",
  fontWeight: 700,
  border: "1px solid #c8d2de",
  padding: "6px",
  textAlign: "center",
};

const tdCell: React.CSSProperties = {
  border: `1px solid ${AG.border}`,
  padding: "2px",
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
  color: AG.primary,
  background: "none",
  border: "1px dashed #9dc3e6",
  borderRadius: "4px",
  padding: "4px 10px",
  cursor: "pointer",
  marginTop: "8px",
};

const VND_PER_K_USD = 25_400_000;

function fmtVnd(vnd: number): string {
  return Math.round(vnd).toLocaleString("en-US");
}

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
  const [editing, setEditing] = React.useState(false);
  const [rawStr, setRawStr] = React.useState("");

  const displayValue = editing
    ? rawStr
    : valueKUsd != null
      ? fmtVnd(valueKUsd * VND_PER_K_USD)
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
        const vnd = valueKUsd != null ? valueKUsd * VND_PER_K_USD : 0;
        setRawStr(vnd === 0 ? "" : String(Math.round(vnd)));
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
          const vnd = parseFloat(cleaned);
          onChange(isNaN(vnd) ? null : vnd / VND_PER_K_USD);
        }
        setRawStr("");
      }}
    />
  );
}

function NumInput({
  value,
  onChange,
  "data-row": dataRow,
  "data-col": dataCol,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  "data-row"?: string | number;
  "data-col"?: string | number;
}) {
  return (
    <input
      type="number"
      step="any"
      value={value ?? ""}
      data-row={dataRow}
      data-col={dataCol}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      onWheel={(e) => (e.target as HTMLElement).blur()}
      style={{ ...inputStyle, textAlign: "right" }}
    />
  );
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
      style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#e0655c" }}
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
  asOfMonth: null,
  scope: null,
  revenueAnnualTarget: null,
  revenueTotal: null,
  cashConfirmed: null,
  cashCollection: null,
};

const FIXED_BUDGET_ITEMS = ["Common", "Expense 1", "Expense 2", "Contingency"];
const BUDGET_ITEM_CATEGORY: Record<string, string> = {
  Common: "Direct Cost",
  "Expense 1": "Direct Cost",
  "Expense 2": "Indirect Cost",
  Contingency: "Indirect Cost",
};

const TRADE_GROUPS = ["공통", "토목", "건축", "기계", "전기", "조경"];
/** raw Korean trade group (fixed identifier stored as data) → translation key, for display only */
const TRADE_GROUP_LABEL_KEY: Record<string, string> = {
  "공통": "tradeGroupCommon",
  "토목": "tradeGroupCivil",
  "건축": "tradeGroupArchitecture",
  "기계": "tradeGroupMechanical",
  "전기": "tradeGroupElectrical",
  "조경": "tradeGroupLandscape",
};

const EST_KINDS: { kind: "bidding" | "execution" | "completion"; label: string }[] = [
  { kind: "bidding", label: "estKindBidding" },
  { kind: "execution", label: "estKindExecution" },
  { kind: "completion", label: "estKindCompletion" },
];

export function ProjectDataEntryTab({ projectName, service = false }: { projectName: string; service?: boolean }) {
  const { t } = useTranslation(["projectDataEntryTab", "common"]);
  const { detail, isLoading } = useProjectDetail(projectName);
  const queryClient = useQueryClient();
  const mutation = usePutProjectdetail();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const mrProjectsQuery = useListMgmtreportProjects({ year: REPORT_YEAR });
  const currentStatus =
    mrProjectsQuery.data?.projects.find((p) => p.name === projectName)?.status ?? "ongoing";
  const statusMutation = useUpdateMgmtreportProjectStatus();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const toggleStatus = () => {
    const next = currentStatus === "closed" ? "ongoing" : "closed";
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
  const [outsourcing, setOutsourcing] = useState<ProjectDetailOutsourcing[]>([]);
  const [cashflow, setCashflow] = useState<ProjectDetailCashflowPoint[]>([]);
  const [cogsMonthly, setCogsMonthly] = useState<ProjectDetailCogsPoint[]>([]);
  const [salesMonthly, setSalesMonthly] = useState<ProjectDetailSalesPoint[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cfPrefilled, setCfPrefilled] = useState(false);

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
  }, [projectName]);

  useEffect(() => {
    if (detail && !loaded && !(cfRef != null && cfQuery.isLoading)) {
      setOverview(detail.overview ?? EMPTY_OVERVIEW);
      setProgress(detail.progress);
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
          }));
        setCashflow(cfRows);
        setCfPrefilled(cfRows.length > 0);
      }
      setCogsMonthly(detail.cogsMonthly ?? []);
      setSalesMonthly(detail.salesMonthly ?? []);
      setLoaded(true);
    }
  }, [detail, loaded, cfRef, cfQuery.isLoading, cfQuery.data]);

  const updateAt = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, i: number, patch: Partial<T>) =>
    setter((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  // 자금수지 표를 사용자가 직접 수정하면 prefill 상태 해제 → 이후 저장부터 실제 데이터로 저장
  const editCashflow: React.Dispatch<React.SetStateAction<ProjectDetailCashflowPoint[]>> = (action) => {
    setCfPrefilled(false);
    setCashflow(action);
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

  const pendingRef = useRef(false);
  const queuedRef = useRef(false);
  const [cardMsgs, setCardMsgs] = useState<Record<string, string | null>>({});

  const save = (card?: string) => {
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
      overview,
      progress: progressRows,
      milestones: milestones.filter((m) => m.label.trim() !== ""),
      costEstimation: estRows,
      costBudget: costBudget.filter((c) => c.item.trim() !== ""),
      costBudgetMonthly: costBudgetMonthly.filter((r) => r.plan != null || r.actual != null),
      outsourcing: outsourcing.filter((o) => o.trade.trim() !== ""),
      // 자금수지 Excel prefill을 아직 수정하지 않았다면 저장하지 않음(향후 Excel 갱신 반영 유지)
      cashflow: cfPrefilled ? [] : cashflow.filter((c) => c.year > 0 && c.month >= 1 && c.month <= 12),
      cogsMonthly: cogsMonthly.filter((c) => c.year > 0 && c.month >= 1 && c.month <= 12),
      salesMonthly: salesMonthly.filter((s) => s.year > 0 && s.month >= 1 && s.month <= 12),
      photos: [],
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
        onSuccess: () => {
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
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }
    const t = setTimeout(() => saveRef.current(), 1000);
    return () => clearTimeout(t);
  }, [loaded, overview, progress, milestones, costEstimation, costBudget, costBudgetMonthly, outsourcing, cashflow, cogsMonthly, salesMonthly]);


  if (isLoading && !loaded) {
    return <div style={{ ...cardStyle, textAlign: "center", color: AG.mutedForeground, fontSize: "14px" }}>{t("common:loading")}</div>;
  }

  const nowYear = new Date().getFullYear();

  // 카드별 저장 버튼 + 결과 메시지가 있는 섹션 헤더
  const cardHead = (label: string, key: string) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
      <span style={sectionTitle}>{label}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
        {cardMsgs[key] && (
          <span style={{ fontSize: "13px", color: cardMsgs[key] === t("common:saveSucceeded") ? AG.accentForeground : "#e0655c" }}>
            {cardMsgs[key]}
          </span>
        )}
        <button
          onClick={() => save(key)}
          disabled={mutation.isPending}
          style={{
            padding: "4px 14px",
            fontSize: "13px",
            fontWeight: 600,
            backgroundColor: AG.secondary,
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: mutation.isPending ? "wait" : "pointer",
            opacity: mutation.isPending ? 0.6 : 1,
          }}
        >
          {t("common:save")}
        </button>
      </span>
    </div>
  );

  // 공통: 월별 매출 (매출 탭) — 표시 순서가 시공/용역 탭 순서에 따라 달라 별도 정의
  const salesMonthlyCard = (
    <div style={cardStyle}>
      {cardHead(service ? t("projectDataEntryTab:salesMonthlyTitleService") : t("projectDataEntryTab:salesMonthlyTitleConstruction"), "salesMonthly")}
      <div data-tbl="salesMonthly" onKeyDown={makeArrowNav("salesMonthly")}>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
        <thead>
          <tr>
            <th style={th}>{t("common:year")}</th>
            <th style={th}>{t("projectDataEntryTab:monthColumn")}</th>
            <th style={th}>{t("projectDataEntryTab:salesPlanVnd")}</th>
            <th style={th}>{t("projectDataEntryTab:salesActualVnd")}</th>
            <th style={{ ...th, width: "36px" }}></th>
          </tr>
        </thead>
        <tbody>
          {salesMonthly.map((s, i) => (
            <tr key={i}>
              <td style={tdCell}><NumInput value={s.year} onChange={(v) => updateAt(setSalesMonthly, i, { year: v ?? 0 })} data-row={i} data-col={0} /></td>
              <td style={tdCell}><NumInput value={s.month} onChange={(v) => updateAt(setSalesMonthly, i, { month: v ?? 0 })} data-row={i} data-col={1} /></td>
              <td style={tdCell}><VndInput valueKUsd={s.plan} onChange={(v) => updateAt(setSalesMonthly, i, { plan: v })} data-row={i} data-col={2} /></td>
              <td style={tdCell}><VndInput valueKUsd={s.actual} onChange={(v) => updateAt(setSalesMonthly, i, { actual: v })} data-row={i} data-col={3} /></td>
              <td style={{ ...tdCell, textAlign: "center" }}><DelBtn onClick={() => removeAt(setSalesMonthly, i)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <button
        style={addBtn}
        onClick={() => {
          const last = salesMonthly[salesMonthly.length - 1];
          const next = last
            ? last.month >= 12
              ? { year: last.year + 1, month: 1 }
              : { year: last.year, month: last.month + 1 }
            : { year: new Date().getFullYear(), month: 1 };
          setSalesMonthly((rows) => [...rows, { ...next, plan: null, actual: null }]);
        }}
      >
        <Plus size={12} /> {t("projectDataEntryTab:addMonth")}
      </button>
      <div style={{ fontSize: "12px", color: AG.mutedForeground, marginTop: "6px" }}>
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
      <div style={{ fontSize: "12px", color: AG.mutedForeground, marginTop: "6px" }}>
        {t("projectDataEntryTab:cogsMonthlyNote")}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "14px", color: "#333" }}>
          <b>{projectName}</b> {t("projectDataEntryTab:headerDescPart1")} <b>VND</b> {t("projectDataEntryTab:headerDescPart2")} <b>%</b>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {statusMsg && (
            <span style={{ fontSize: "13px", color: statusMsg === t("projectDataEntryTab:statusChangeFailed") ? "#e0655c" : AG.accentForeground, fontWeight: 600 }}>
              {statusMsg}
            </span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "10px",
                backgroundColor: currentStatus === "closed" ? "#f3d9d5" : "#d8ecdc",
                color: currentStatus === "closed" ? "#a83a2a" : "#2f6b3d",
              }}
            >
              {currentStatus === "closed" ? t("common:closed") : t("common:inProgress")}
            </span>
            <button
              onClick={toggleStatus}
              disabled={statusMutation.isPending || mrProjectsQuery.isLoading}
              title={t("projectDataEntryTab:statusToggleTooltip")}
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: AG.secondary,
                backgroundColor: "#fff",
                border: "1px solid #b9c6d8",
                borderRadius: "6px",
                padding: "5px 10px",
                cursor: statusMutation.isPending ? "wait" : "pointer",
                opacity: statusMutation.isPending ? 0.7 : 1,
              }}
            >
              {statusMutation.isPending
                ? t("projectDataEntryTab:changingStatus")
                : currentStatus === "closed"
                  ? t("projectDataEntryTab:changeToOngoing")
                  : t("projectDataEntryTab:changeToClosed")}
            </button>
          </div>
          {saveMsg && (
            <span style={{ fontSize: "13px", color: saveMsg === t("common:saveSucceeded") ? AG.accentForeground : "#e0655c", fontWeight: 600 }}>
              {saveMsg}
            </span>
          )}
          <button
            onClick={() => save()}
            disabled={mutation.isPending}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: AG.secondary,
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: mutation.isPending ? "wait" : "pointer",
              opacity: mutation.isPending ? 0.7 : 1,
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
        <span style={sectionTitle}>{t("projectDataEntryTab:overviewTitle")}</span>
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
        <div style={{ fontSize: "12px", color: AG.mutedForeground, marginTop: "6px" }}>
          {t("projectDataEntryTab:overviewCostRateNote")}
        </div>
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
                <td style={tdCell}><NumInput value={p.year} onChange={(v) => updateAt(setProgress, i, { year: v ?? 0 })} data-row={i} data-col={0} /></td>
                <td style={tdCell}><NumInput value={p.month} onChange={(v) => updateAt(setProgress, i, { month: v ?? 0 })} data-row={i} data-col={1} /></td>
                <td style={tdCell}><NumInput value={p.planPct} onChange={(v) => updateAt(setProgress, i, { planPct: v })} data-row={i} data-col={2} /></td>
                <td style={tdCell}><NumInput value={p.actualPct} onChange={(v) => updateAt(setProgress, i, { actualPct: v })} data-row={i} data-col={3} /></td>
                <td style={tdCell}><NumInput value={p.planCumPct} onChange={(v) => updateAt(setProgress, i, { planCumPct: v })} data-row={i} data-col={4} /></td>
                <td style={tdCell}><NumInput value={p.actualCumPct} onChange={(v) => updateAt(setProgress, i, { actualCumPct: v })} data-row={i} data-col={5} /></td>
                <td style={{ ...tdCell, textAlign: "center" }}><DelBtn onClick={() => removeAt(setProgress, i)} /></td>
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
            setProgress((rows) => [...rows, { ...next, planPct: null, actualPct: null, planCumPct: null, actualCumPct: null }]);
          }}
        >
          <Plus size={12} /> {t("projectDataEntryTab:addMonth")}
        </button>
      </div>

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
      {/* 시공: 매출 탭 순서(공정 다음) */}
      {salesMonthlyCard}
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
              <th style={th}>Cash Confirmed (A) (VND)</th>
              <th style={th}>Cash Collection (B) (VND)</th>
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
        <div style={{ fontSize: "12px", color: AG.mutedForeground, marginTop: "6px" }}>
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
                  <td style={{ ...tdCell, fontSize: "13px", padding: "5px 6px", color: "#333" }}>
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
                        style={{ fontSize: "13px", padding: "3px 4px", border: "1px solid #ccd6e3", borderRadius: "3px" }}
                      />
                    ) : (
                      <span style={{ fontSize: "12px", color: "#aaa" }}>-</span>
                    )}
                  </td>
                  <td style={tdCell}><VndInput valueKUsd={e.contractAmount} onChange={(v) => updateAt(setCostEstimation, i, { contractAmount: v })} data-row={i} data-col={0} /></td>
                  <td style={tdCell}><VndInput valueKUsd={e.costAmount} onChange={(v) => updateAt(setCostEstimation, i, { costAmount: v })} data-row={i} data-col={1} /></td>
                  <td style={{ ...tdCell, textAlign: "center" }}>
                    {isCompletion && completionCount > 1 && (
                      <button
                        onClick={() => setCostEstimation((rows) => rows.filter((_, j) => j !== i))}
                        style={{ border: "none", background: "none", cursor: "pointer", color: "#e0655c", padding: "2px" }}
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
          style={{ marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: AG.primary, border: "1px dashed #9db6d8", borderRadius: "4px", padding: "3px 8px", background: "none", cursor: "pointer" }}
        >
          <Plus size={12} /> {t("projectDataEntryTab:addCompletionForecast")}
        </button>
        <div style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>
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
        <div style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>
          {t("projectDataEntryTab:costBudgetNote")}
        </div>
        <div data-tbl="costBudget" onKeyDown={makeArrowNav("costBudget")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "4px" }}>
          <thead>
            <tr>
              <th style={th}>{t("projectDataEntryTab:itemColumn")}</th>
              <th style={th}>{t("projectDataEntryTab:budgetVnd")}</th>
              <th style={th}>{t("projectDataEntryTab:progressPaymentPlanVnd")}</th>
              <th style={th}>{t("projectDataEntryTab:progressPaymentActualVnd")}</th>
            </tr>
          </thead>
          <tbody>
            {costBudget.map((c, i) => (
              <tr key={c.item}>
                <td style={{ ...tdCell, fontSize: "13px", padding: "5px 6px", color: "#333", fontWeight: 600 }}>{c.item}</td>
                <td style={tdCell}><VndInput valueKUsd={c.budget} onChange={(v) => updateAt(setCostBudget, i, { budget: v })} data-row={i} data-col={0} /></td>
                <td style={tdCell}><VndInput valueKUsd={c.plan} onChange={(v) => updateAt(setCostBudget, i, { plan: v })} data-row={i} data-col={1} /></td>
                <td style={tdCell}><VndInput valueKUsd={c.actual} onChange={(v) => updateAt(setCostBudget, i, { actual: v })} data-row={i} data-col={2} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* 월별 계획/실적 */}
        <div style={{ marginTop: "10px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: AG.primary, marginBottom: "4px" }}>
            {t("projectDataEntryTab:monthlyPlanActualYear", { year: REPORT_YEAR })}
          </div>
          <div style={{ fontSize: "11px", color: "#777", marginBottom: "6px" }}>
            {t("projectDataEntryTab:monthlyPlanActualNote")}
          </div>
          {(["Common", "Expense 1", "Expense 2", "외주성"] as const).map((item) => {
            const getCbm = (month: number, field: "plan" | "actual") =>
              costBudgetMonthly.find((r) => r.item === item && r.year === REPORT_YEAR && r.month === month)?.[field] ?? null;
            const setCbm = (month: number, field: "plan" | "actual", value: number | null) =>
              setCostBudgetMonthly((rows) => {
                const idx = rows.findIndex((r) => r.item === item && r.year === REPORT_YEAR && r.month === month);
                if (idx >= 0) return rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r));
                return [...rows, { item, year: REPORT_YEAR, month, plan: null, actual: null, [field]: value }];
              });
            const tblKey = `cbm-${item}`;
            return (
              <div key={item} style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: AG.foreground, marginBottom: "4px" }}>
                  {item === "외주성" ? t("projectDataEntryTab:outsourcingItem") : item}
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
                        <td style={{ ...tdCell, textAlign: "center", fontSize: "13px", color: "#555", padding: "3px 4px" }}>{t("projectDataEntryTab:monthSuffix", { month })}</td>
                        <td style={tdCell}><VndInput valueKUsd={getCbm(month, "plan")} onChange={(v) => setCbm(month, "plan", v)} data-row={month - 1} data-col={0} /></td>
                        <td style={tdCell}><VndInput valueKUsd={getCbm(month, "actual")} onChange={(v) => setCbm(month, "actual", v)} data-row={month - 1} data-col={1} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            );
          })}
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
              <th style={{ ...th, width: "36px" }}></th>
            </tr>
          </thead>
          <tbody>
            {outsourcing.map((o, i) => (
              <tr key={i}>
                <td style={tdCell}>
                  <select
                    value={o.tradeGroup ?? ""}
                    onChange={(ev) => updateAt(setOutsourcing, i, { tradeGroup: ev.target.value || null })}
                    style={{ width: "100%", fontSize: "13px", padding: "3px 2px", border: "1px solid #ccd6e3", borderRadius: "3px", backgroundColor: "#fff" }}
                  >
                    <option value="">-</option>
                    {TRADE_GROUPS.map((g) => (
                      <option key={g} value={g}>{t(`projectDataEntryTab:${TRADE_GROUP_LABEL_KEY[g]}`)}</option>
                    ))}
                  </select>
                </td>
                <td style={tdCell}><TextInput value={o.trade} onChange={(v) => updateAt(setOutsourcing, i, { trade: v ?? "" })} placeholder={t("projectDataEntryTab:tradePlaceholder")} data-row={i} data-col={0} /></td>
                <td style={tdCell}><TextInput value={o.vendor} onChange={(v) => updateAt(setOutsourcing, i, { vendor: v })} data-row={i} data-col={1} /></td>
                <td style={tdCell}><TextInput value={o.category} onChange={(v) => updateAt(setOutsourcing, i, { category: v })} placeholder={t("projectDataEntryTab:categoryPlaceholder")} data-row={i} data-col={2} /></td>
                <td style={tdCell}><TextInput value={o.contractDate} onChange={(v) => updateAt(setOutsourcing, i, { contractDate: v })} placeholder="'24.12.31" data-row={i} data-col={3} /></td>
                <td style={tdCell}><TextInput value={o.changeNo} onChange={(v) => updateAt(setOutsourcing, i, { changeNo: v })} data-row={i} data-col={4} /></td>
                <td style={tdCell}><VndInput valueKUsd={o.budget} onChange={(v) => updateAt(setOutsourcing, i, { budget: v })} data-row={i} data-col={5} /></td>
                <td style={tdCell}><VndInput valueKUsd={o.executedBudget} onChange={(v) => updateAt(setOutsourcing, i, { executedBudget: v })} data-row={i} data-col={6} /></td>
                <td style={tdCell}><VndInput valueKUsd={o.resolved} onChange={(v) => updateAt(setOutsourcing, i, { resolved: v })} data-row={i} data-col={7} /></td>
                <td style={tdCell}><VndInput valueKUsd={o.thisMonth} onChange={(v) => updateAt(setOutsourcing, i, { thisMonth: v })} data-row={i} data-col={8} /></td>
                <td style={tdCell}><VndInput valueKUsd={o.accum} onChange={(v) => updateAt(setOutsourcing, i, { accum: v })} data-row={i} data-col={9} /></td>
                <td style={{ ...tdCell, textAlign: "center" }}><DelBtn onClick={() => removeAt(setOutsourcing, i)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <button
          style={addBtn}
          onClick={() =>
            setOutsourcing((rows) => [
              ...rows,
              { tradeGroup: null, trade: "", vendor: null, category: null, contractDate: null, changeNo: null, budget: null, executedBudget: null, resolved: null, thisMonth: null, accum: null },
            ])
          }
        >
          <Plus size={12} /> {t("projectDataEntryTab:addTrade")}
        </button>
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
            editCashflow((rows) => [...rows, { ...next, cashIn: null, cashOut: null, equivalent: null }]);
          }}
        >
          <Plus size={12} /> {t("projectDataEntryTab:addMonth")}
        </button>
        <div style={{ fontSize: "12px", color: AG.mutedForeground, marginTop: "6px" }}>
          {t("projectDataEntryTab:cashflowNote")}
        </div>
        {cfPrefilled && (
          <div style={{ fontSize: "12px", color: AG.primary, marginTop: "4px", fontWeight: 600 }}>
            {t("projectDataEntryTab:cashflowPrefilledNote")}
          </div>
        )}
      </div>

    </div>
  );
}
