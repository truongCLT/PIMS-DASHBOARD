import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, Upload, ArrowLeft, ArrowRight } from "lucide-react";
import {
  usePutProjectdetail,
  requestUploadUrl,
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
  ProjectDetailPhoto,
} from "@workspace/api-client-react";
import { useProjectDetail, getGetProjectdetailQueryKey } from "../lib/projectDetailData";
import { REPORT_YEAR } from "../lib/mgmtreportData";
import { getMrCashflowRef } from "../data/mrProjectLinks";

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #d0dce8",
  borderRadius: "6px",
  padding: "10px 12px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#1a3a6b",
};

const th: React.CSSProperties = {
  backgroundColor: "#eef2f7",
  color: "#1a2d4d",
  fontSize: "11px",
  fontWeight: 700,
  border: "1px solid #c8d2de",
  padding: "6px",
  textAlign: "center",
};

const tdCell: React.CSSProperties = {
  border: "1px solid #d5dce6",
  padding: "2px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  outline: "none",
  fontSize: "11px",
  padding: "5px 6px",
  boxSizing: "border-box",
  backgroundColor: "transparent",
};

const addBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "11px",
  color: "#1e6fdd",
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
  return (
    <button
      onClick={onClick}
      title="행 삭제"
      style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#c0392b" }}
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

const FIXED_BUDGET_ITEMS = ["Common", "Expense 1"];

const TRADE_GROUPS = ["공통", "토목", "건축", "기계", "전기", "조경"];

const EST_KINDS: { kind: "bidding" | "execution" | "completion"; label: string }[] = [
  { kind: "bidding", label: "Bidding (수주 시)" },
  { kind: "execution", label: "Execution Budgeting (실행예산)" },
  { kind: "completion", label: "Estimated Completion (준공 전망)" },
];

export function ProjectDataEntryTab({ projectName, service = false }: { projectName: string; service?: boolean }) {
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
          setStatusMsg(next === "closed" ? "종료로 변경되었습니다." : "진행중으로 변경되었습니다.");
          queryClient.invalidateQueries({ queryKey: getListMgmtreportProjectsQueryKey() });
        },
        onError: () => setStatusMsg("상태 변경에 실패했습니다."),
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
  const [photos, setPhotos] = useState<ProjectDetailPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
          return found
            ? { ...found, category: "Direct Cost", item }
            : { category: "Direct Cost", item, budget: null, plan: null, actual: null };
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
      setPhotos(detail.photos);
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
        errors.push(`공정률 ${rowNo}번째 행: 연도(${p.year})는 2000~2100 사이여야 합니다.`);
      }
      if (!Number.isInteger(p.month) || p.month < 1 || p.month > 12) {
        errors.push(`공정률 ${rowNo}번째 행: 월(${p.month})은 1~12 사이여야 합니다.`);
      } else {
        const key = `${p.year}-${p.month}`;
        const prev = seen.get(key);
        if (prev != null) {
          errors.push(`공정률 ${rowNo}번째 행: ${p.year}년 ${p.month}월이 ${prev}번째 행과 중복됩니다.`);
        } else {
          seen.set(key, rowNo);
        }
      }
      (
        [
          ["planPct", "월간 계획"],
          ["actualPct", "월간 실적"],
          ["planCumPct", "누계 계획"],
          ["actualCumPct", "누계 실적"],
        ] as const
      ).forEach(([field, label]) => {
        const v = p[field];
        if (v != null && (v < 0 || v > 100)) {
          errors.push(`공정률 ${rowNo}번째 행: ${label}(${v}%)은 0~100 사이여야 합니다.`);
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
        report("준공 전망(Estimated Completion)에서 기준월이 없는 행은 1건만 입력할 수 있습니다. 기준월을 지정해 주세요.");
        return;
      }
      const seen = new Set<string>();
      for (const c of completions) {
        if (c.year == null || c.month == null) continue;
        const key = `${c.year}-${c.month}`;
        if (seen.has(key)) {
          report(`준공 전망(Estimated Completion)에 같은 기준월(${c.year}.${String(c.month).padStart(2, "0")})이 중복 입력되었습니다.`);
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
      photos: photos.filter((p) => p.objectPath.trim() !== ""),
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
          report("저장되었습니다.");
          queryClient.invalidateQueries({ queryKey: getGetProjectdetailQueryKey({ projectName }) });
        },
        onError: (err: unknown) => {
          const serverMsg =
            typeof err === "object" && err != null && "data" in err
              ? (err as { data?: { error?: string } | null }).data?.error
              : undefined;
          report(serverMsg || "저장에 실패했습니다. 다시 시도해 주세요.");
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
  }, [loaded, overview, progress, milestones, costEstimation, costBudget, costBudgetMonthly, outsourcing, cashflow, cogsMonthly, photos]);

  const uploadPhotos = async (files: FileList) => {
    setPhotoMsg(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          setPhotoMsg(`이미지 파일만 업로드할 수 있습니다: ${file.name}`);
          continue;
        }
        const { uploadURL, objectPath } = await requestUploadUrl({
          name: file.name,
          size: file.size,
          contentType: file.type,
        });
        const putRes = await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!putRes.ok) throw new Error(`upload failed (${putRes.status})`);
        setPhotos((rows) => [...rows, { objectPath }]);
      }
      setPhotoMsg("사진이 추가되었습니다. 상단 '저장' 버튼을 눌러야 반영됩니다.");
    } catch {
      setPhotoMsg("사진 업로드에 실패했습니다. 관리자 로그인 상태를 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const movePhoto = (i: number, dir: -1 | 1) =>
    setPhotos((rows) => {
      const j = i + dir;
      if (j < 0 || j >= rows.length) return rows;
      const next = [...rows];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  if (isLoading && !loaded) {
    return <div style={{ ...cardStyle, textAlign: "center", color: "#8a97a8", fontSize: "12px" }}>불러오는 중…</div>;
  }

  const nowYear = new Date().getFullYear();

  // 카드별 저장 버튼 + 결과 메시지가 있는 섹션 헤더
  const cardHead = (label: string, key: string) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
      <span style={sectionTitle}>{label}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
        {cardMsgs[key] && (
          <span style={{ fontSize: "11px", color: cardMsgs[key] === "저장되었습니다." ? "#3e7d4c" : "#c0392b" }}>
            {cardMsgs[key]}
          </span>
        )}
        <button
          onClick={() => save(key)}
          disabled={mutation.isPending}
          style={{
            padding: "4px 14px",
            fontSize: "11px",
            fontWeight: 600,
            backgroundColor: "#2e4568",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: mutation.isPending ? "wait" : "pointer",
            opacity: mutation.isPending ? 0.6 : 1,
          }}
        >
          저장
        </button>
      </span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "12px", color: "#333" }}>
          <b>{projectName}</b> 프로젝트의 공정/원가/외주 데이터를 입력합니다. 금액 입력: <b>VND</b> (저장 시 천 USD 자동 변환), 공정률 단위: <b>%</b>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {statusMsg && (
            <span style={{ fontSize: "11px", color: statusMsg.includes("실패") ? "#c0392b" : "#3e7d4c", fontWeight: 600 }}>
              {statusMsg}
            </span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "10px",
                backgroundColor: currentStatus === "closed" ? "#f3d9d5" : "#d8ecdc",
                color: currentStatus === "closed" ? "#a83a2a" : "#2f6b3d",
              }}
            >
              {currentStatus === "closed" ? "종료" : "진행중"}
            </span>
            <button
              onClick={toggleStatus}
              disabled={statusMutation.isPending || mrProjectsQuery.isLoading}
              title="프로젝트 진행 상태 전환"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#2e4568",
                backgroundColor: "#fff",
                border: "1px solid #b9c6d8",
                borderRadius: "6px",
                padding: "5px 10px",
                cursor: statusMutation.isPending ? "wait" : "pointer",
                opacity: statusMutation.isPending ? 0.7 : 1,
              }}
            >
              {statusMutation.isPending
                ? "변경 중…"
                : currentStatus === "closed"
                  ? "진행중으로 변경"
                  : "종료로 변경"}
            </button>
          </div>
          {saveMsg && (
            <span style={{ fontSize: "11px", color: saveMsg.startsWith("저장되") ? "#3e7d4c" : "#c0392b", fontWeight: 600 }}>
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
              backgroundColor: "#2e4568",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: mutation.isPending ? "wait" : "pointer",
              opacity: mutation.isPending ? 0.7 : 1,
            }}
          >
            <Save size={13} />
            {mutation.isPending ? "저장 중…" : "전체 저장"}
          </button>
        </div>
      </div>

      {/* 0. 개요 정보 */}
      {!service && (
      <>
      <div style={cardStyle}>
        <span style={sectionTitle}>0. 개요 정보 (개요 탭)</span>
        <div data-tbl="overview" onKeyDown={makeArrowNav("overview")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>도급액 (VND)</th>
              <th style={th}>공사 시작일</th>
              <th style={th}>공사 종료일</th>
              <th style={th}>발주처</th>
              <th style={th}>공사규모</th>
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
                  placeholder="예: OO개발(주)"
                  onChange={(e) => setOverview((o) => ({ ...o, client: e.target.value === "" ? null : e.target.value }))}
                  style={inputStyle}
                />
              </td>
              <td style={tdCell}>
                <input
                  type="text"
                  value={overview.scale ?? ""}
                  placeholder="예: B2~35F 3개동, 공동주택 500세대"
                  onChange={(e) => setOverview((o) => ({ ...o, scale: e.target.value === "" ? null : e.target.value }))}
                  style={inputStyle}
                />
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ fontSize: "10px", color: "#8a97a8", marginTop: "6px" }}>
          입찰(Bidding)·실행예산 금액은 아래 "3. 원가율" 표에 입력하면 개요 탭에 함께 반영됩니다.
        </div>
        </div>
      </div>

      {/* 1. 월별 공정률 */}
      <div style={cardStyle}>
        {cardHead("1. 월별 공정률 (공정 탭)", "progress")}
        <div data-tbl="progress" onKeyDown={makeArrowNav("progress")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>연도</th>
              <th style={th}>월</th>
              <th style={th}>월간 계획(%)</th>
              <th style={th}>월간 실적(%)</th>
              <th style={th}>누계 계획(%)</th>
              <th style={th}>누계 실적(%)</th>
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
          <Plus size={12} /> 월 추가
        </button>
      </div>

      {/* 2. 마일스톤 */}
      <div style={cardStyle}>
        {cardHead("2. 마일스톤 (공정 탭)", "milestones")}
        <div data-tbl="milestones" onKeyDown={makeArrowNav("milestones")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>항목명</th>
              <th style={th}>계획 시작</th>
              <th style={th}>계획 종료</th>
              <th style={th}>실적 시작</th>
              <th style={th}>실적 종료</th>
              <th style={{ ...th, width: "36px" }}></th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m, i) => (
              <tr key={i}>
                <td style={tdCell}><TextInput value={m.label} onChange={(v) => updateAt(setMilestones, i, { label: v ?? "" })} placeholder="예: 착공" data-row={i} data-col={0} /></td>
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
          <Plus size={12} /> 마일스톤 추가
        </button>
      </div>
      </>
      )}

      {/* 용역: 개요 정보 */}
      {service && (
      <div style={cardStyle}>
        {cardHead("0. 개요 정보 (개요 탭)", "overview")}
        <div data-tbl="svcOverview" onKeyDown={makeArrowNav("svcOverview")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>도급액 (VND)</th>
              <th style={th}>수행 시작일</th>
              <th style={th}>수행 종료일</th>
              <th style={th}>발주처</th>
              <th style={th}>수행내용</th>
              <th style={th}>작성 기준월</th>
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
                <TextInput value={overview.client} placeholder="예: DAEWOO NHON TRACH" onChange={(v) => setOverview((o) => ({ ...o, client: v }))} data-row={0} data-col={1} />
              </td>
              <td style={tdCell}>
                <TextInput value={overview.scope} placeholder="예: 인허가, 프리콘 보고서 제출" onChange={(v) => setOverview((o) => ({ ...o, scope: v }))} data-row={0} data-col={2} />
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
              <th style={th}>연간 매출 목표 (VND)</th>
              <th style={th}>누계 매출 실적 (VND)</th>
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
        <div style={{ fontSize: "10px", color: "#8a97a8", marginTop: "6px" }}>
          개요 탭의 프로젝트 정보·Revenue·Cash 카드에 반영됩니다. Outstanding은 (A)-(B)로 자동 계산됩니다.
        </div>
        </div>
      </div>
      )}

      {/* 3. 원가율 */}
      <div style={cardStyle}>
        {cardHead(service ? "1. 도급액·원가 (개요)" : "3. 원가율 (원가 탭)", "costEstimation")}
        <div data-tbl="costEst" onKeyDown={makeArrowNav("costEst")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>구분</th>
              <th style={th}>기준월</th>
              <th style={th}>도급액 (VND)</th>
              <th style={th}>원가 (VND)</th>
              <th style={{ ...th, width: "30px" }}></th>
            </tr>
          </thead>
          <tbody>
            {costEstimation.map((e, i) => {
              const isCompletion = e.kind === "completion";
              const completionCount = costEstimation.filter((r) => r.kind === "completion").length;
              return (
                <tr key={`${e.kind}-${i}`}>
                  <td style={{ ...tdCell, fontSize: "11px", padding: "5px 6px", color: "#333" }}>
                    {EST_KINDS.find((k) => k.kind === e.kind)?.label ?? e.kind}
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
                        style={{ fontSize: "11px", padding: "3px 4px", border: "1px solid #ccd6e3", borderRadius: "3px" }}
                      />
                    ) : (
                      <span style={{ fontSize: "10px", color: "#aaa" }}>-</span>
                    )}
                  </td>
                  <td style={tdCell}><VndInput valueKUsd={e.contractAmount} onChange={(v) => updateAt(setCostEstimation, i, { contractAmount: v })} data-row={i} data-col={0} /></td>
                  <td style={tdCell}><VndInput valueKUsd={e.costAmount} onChange={(v) => updateAt(setCostEstimation, i, { costAmount: v })} data-row={i} data-col={1} /></td>
                  <td style={{ ...tdCell, textAlign: "center" }}>
                    {isCompletion && completionCount > 1 && (
                      <button
                        onClick={() => setCostEstimation((rows) => rows.filter((_, j) => j !== i))}
                        style={{ border: "none", background: "none", cursor: "pointer", color: "#c0392b", padding: "2px" }}
                        title="삭제"
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
          style={{ marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#4472c4", border: "1px dashed #9db6d8", borderRadius: "4px", padding: "3px 8px", background: "none", cursor: "pointer" }}
        >
          <Plus size={12} /> 준공 전망(월별) 추가
        </button>
        <div style={{ fontSize: "10px", color: "#777", marginTop: "4px" }}>
          Estimated Completion은 기준월별로 여러 건 입력할 수 있습니다. 원가 탭에서는 조회 기간 마지막 월 이하의 가장 최근 기준월 값이 표시됩니다.
        </div>
      </div>

      {/* 4. 예산 집행 현황 */}
      <div style={cardStyle}>
        {cardHead(service ? "2. 예산 집행 현황 (예산집행 탭)" : "4. 예산 집행 현황 (원가 탭)", "costBudget")}
        <div style={{ fontSize: "10px", color: "#777", marginTop: "4px" }}>
          Direct Cost 중 Common·Expense 1만 여기서 입력합니다. 외주성 예산·집행 실적은 아래 "외주/자재" 표에서 자동 집계됩니다.
        </div>
        <div data-tbl="costBudget" onKeyDown={makeArrowNav("costBudget")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "4px" }}>
          <thead>
            <tr>
              <th style={th}>항목</th>
              <th style={th}>예산 (VND)</th>
              <th style={th}>기성 계획 (VND)</th>
              <th style={th}>기성 실적 (VND)</th>
            </tr>
          </thead>
          <tbody>
            {costBudget.map((c, i) => (
              <tr key={c.item}>
                <td style={{ ...tdCell, fontSize: "11px", padding: "5px 6px", color: "#333", fontWeight: 600 }}>{c.item}</td>
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
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#4472c4", marginBottom: "4px" }}>
            월별 계획 / 실적 ({REPORT_YEAR}년)
          </div>
          <div style={{ fontSize: "9px", color: "#777", marginBottom: "6px" }}>
            선택한 월에 따라 Budget Execution Status 카드에 표시됩니다. 외주성도 입력 가능합니다.
          </div>
          {(["Common", "Expense 1", "외주성"] as const).map((item) => {
            const getCbm = (month: number, field: "plan" | "actual") =>
              costBudgetMonthly.find((r) => r.item === item && r.year === REPORT_YEAR && r.month === month)?.[field] ?? null;
            const setCbm = (month: number, field: "plan" | "actual", value: number | null) =>
              setCostBudgetMonthly((rows) => {
                const idx = rows.findIndex((r) => r.item === item && r.year === REPORT_YEAR && r.month === month);
                if (idx >= 0) return rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r));
                return [...rows, { item, year: REPORT_YEAR, month, plan: null, actual: null, [field]: value }];
              });
            return (
              <div key={item} style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#1a2d4d", marginBottom: "4px" }}>{item}</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, width: "44px" }}>월</th>
                      <th style={th}>계획 Plan (VND)</th>
                      <th style={th}>실적 Actual (VND)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <tr key={month}>
                        <td style={{ ...tdCell, textAlign: "center", fontSize: "11px", color: "#555", padding: "3px 4px" }}>{month}월</td>
                        <td style={tdCell}><VndInput valueKUsd={getCbm(month, "plan")} onChange={(v) => setCbm(month, "plan", v)} /></td>
                        <td style={tdCell}><VndInput valueKUsd={getCbm(month, "actual")} onChange={(v) => setCbm(month, "actual", v)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. 외주/자재 */}
      <div style={cardStyle}>
        {cardHead(service ? "3. 외주/자재 (외주 탭)" : "5. 외주/자재 (외주 탭)", "outsourcing")}
        <div data-tbl="outsourcing" onKeyDown={makeArrowNav("outsourcing")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>대공종</th>
              <th style={th}>세부공종</th>
              <th style={th}>업체명</th>
              <th style={th}>구분</th>
              <th style={th}>최초 계약일</th>
              <th style={th}>변경 차수</th>
              <th style={th}>예산(A) (VND)</th>
              <th style={th}>집행예산 (VND)</th>
              <th style={th}>결의금액(B) (VND)</th>
              <th style={th}>기성 이번달 (VND)</th>
              <th style={th}>기성 누계(C) (VND)</th>
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
                    style={{ width: "100%", fontSize: "11px", padding: "3px 2px", border: "1px solid #ccd6e3", borderRadius: "3px", backgroundColor: "#fff" }}
                  >
                    <option value="">-</option>
                    {TRADE_GROUPS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </td>
                <td style={tdCell}><TextInput value={o.trade} onChange={(v) => updateAt(setOutsourcing, i, { trade: v ?? "" })} placeholder="예: 토공사" data-row={i} data-col={0} /></td>
                <td style={tdCell}><TextInput value={o.vendor} onChange={(v) => updateAt(setOutsourcing, i, { vendor: v })} data-row={i} data-col={1} /></td>
                <td style={tdCell}><TextInput value={o.category} onChange={(v) => updateAt(setOutsourcing, i, { category: v })} placeholder="용역/외주" data-row={i} data-col={2} /></td>
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
          <Plus size={12} /> 공종 추가
        </button>
      </div>

      {/* 6. 월별 자금 */}
      <div style={cardStyle}>
        {cardHead(service ? "4. 월별 자금 (자금 탭)" : "6. 월별 자금 (자금 탭)", "cashflow")}
        <div data-tbl="cashflow" onKeyDown={makeArrowNav("cashflow")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>연도</th>
              <th style={th}>월</th>
              <th style={th}>수입 Cash in (VND)</th>
              <th style={th}>지출 Cash out (VND)</th>
              <th style={th}>보유 현금 Equivalent (VND)</th>
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
          <Plus size={12} /> 월 추가
        </button>
        <div style={{ fontSize: "10px", color: "#8a97a8", marginTop: "6px" }}>
          지출은 양수로 입력하세요(차트에서 자동으로 아래 방향 표시). VND 기준으로 입력하면 저장 시 천 USD로 자동 변환됩니다.
        </div>
        {cfPrefilled && (
          <div style={{ fontSize: "10px", color: "#1e6fdd", marginTop: "4px", fontWeight: 600 }}>
            자금수지 Excel(DB)에 저장된 데이터를 불러왔습니다. 표를 수정하면 이 프로젝트의 자금 데이터로 저장되며, 이후에는 저장된 값이 우선 표시됩니다.
          </div>
        )}
      </div>

      {/* 용역: 월별 매출원가 */}
      {service && (
      <div style={cardStyle}>
        {cardHead("5. 월별 매출원가 (매출 탭)", "cogsMonthly")}
        <div data-tbl="cogsMonthly" onKeyDown={makeArrowNav("cogsMonthly")}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>연도</th>
              <th style={th}>월</th>
              <th style={th}>회계 매출원가 (VND)</th>
              <th style={th}>집행 매출원가 (WIP) (VND)</th>
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
          <Plus size={12} /> 월 추가
        </button>
        <div style={{ fontSize: "10px", color: "#8a97a8", marginTop: "6px" }}>
          매출 탭의 Cost(회계 vs 집행 매출원가) 차트에 반영됩니다. VND 기준으로 입력하면 저장 시 천 USD로 자동 변환됩니다.
        </div>
      </div>
      )}

      {/* 7. 현장 사진 */}
      {!service && (
      <div style={cardStyle}>
        {cardHead("7. 현장 사진 (개요 탭)", "photos")}
        <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) void uploadPhotos(e.target.files);
            }}
          />
          <button
            style={{ ...addBtn, marginTop: 0, opacity: uploading ? 0.6 : 1 }}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={12} /> {uploading ? "업로드 중…" : "사진 업로드"}
          </button>
          {photoMsg && (
            <span style={{ fontSize: "11px", color: photoMsg.includes("실패") || photoMsg.includes("만") ? "#c0392b" : "#3e7d4c", fontWeight: 600 }}>
              {photoMsg}
            </span>
          )}
        </div>
        {photos.length === 0 ? (
          <div style={{ fontSize: "11px", color: "#8a97a8", marginTop: "10px" }}>
            업로드된 사진이 없습니다. 사진이 없으면 개요 탭에 기본 이미지가 표시됩니다.
          </div>
        ) : (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
            {photos.map((p, i) => (
              <div key={`${p.objectPath}-${i}`} style={{ border: "1px solid #d5dce6", borderRadius: "6px", padding: "6px", width: "160px" }}>
                <img
                  src={`/api/storage${p.objectPath}`}
                  alt={`현장 사진 ${i + 1}`}
                  style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "4px", backgroundColor: "#eef2f7" }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                  <span style={{ fontSize: "10px", color: "#8a97a8" }}>{i + 1}번</span>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <button
                      title="앞으로"
                      onClick={() => movePhoto(i, -1)}
                      disabled={i === 0}
                      style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", padding: "3px", color: i === 0 ? "#c9d2dd" : "#1e6fdd" }}
                    >
                      <ArrowLeft size={13} />
                    </button>
                    <button
                      title="뒤로"
                      onClick={() => movePhoto(i, 1)}
                      disabled={i === photos.length - 1}
                      style={{ background: "none", border: "none", cursor: i === photos.length - 1 ? "default" : "pointer", padding: "3px", color: i === photos.length - 1 ? "#c9d2dd" : "#1e6fdd" }}
                    >
                      <ArrowRight size={13} />
                    </button>
                    <DelBtn onClick={() => removeAt(setPhotos, i)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: "10px", color: "#8a97a8", marginTop: "6px" }}>
          첫 번째 사진이 개요 탭에 가장 먼저 표시됩니다. 순서 변경/삭제 후에도 상단 '저장' 버튼을 눌러야 반영됩니다.
        </div>
      </div>
      )}
    </div>
  );
}
