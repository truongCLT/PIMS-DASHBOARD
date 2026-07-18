import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save } from "lucide-react";
import { usePutProjectdetail } from "@workspace/api-client-react";
import type {
  ProjectDetail,
  ProjectDetailOverview,
  ProjectDetailProgressPoint,
  ProjectDetailMilestone,
  ProjectDetailCostEstimation,
  ProjectDetailCostBudget,
  ProjectDetailOutsourcing,
} from "@workspace/api-client-react";
import { useProjectDetail, getGetProjectdetailQueryKey } from "../lib/projectDetailData";

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

function NumInput({ value, onChange }: { value: number | null | undefined; onChange: (v: number | null) => void }) {
  return (
    <input
      type="number"
      step="any"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      style={{ ...inputStyle, textAlign: "right" }}
    />
  );
}

function TextInput({ value, onChange, placeholder }: { value: string | null | undefined; onChange: (v: string | null) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      style={inputStyle}
    />
  );
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

const EST_KINDS: { kind: "bidding" | "execution" | "completion"; label: string }[] = [
  { kind: "bidding", label: "Bidding (수주 시)" },
  { kind: "execution", label: "Execution Budgeting (실행예산)" },
  { kind: "completion", label: "Estimated Completion (준공 전망)" },
];

export function ProjectDataEntryTab({ projectName }: { projectName: string }) {
  const { detail, isLoading } = useProjectDetail(projectName);
  const queryClient = useQueryClient();
  const mutation = usePutProjectdetail();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [overview, setOverview] = useState<ProjectDetailOverview>({ contractAmount: null, startDate: null, endDate: null });
  const [progress, setProgress] = useState<ProjectDetailProgressPoint[]>([]);
  const [milestones, setMilestones] = useState<ProjectDetailMilestone[]>([]);
  const [costEstimation, setCostEstimation] = useState<ProjectDetailCostEstimation[]>([]);
  const [costBudget, setCostBudget] = useState<ProjectDetailCostBudget[]>([]);
  const [outsourcing, setOutsourcing] = useState<ProjectDetailOutsourcing[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [projectName]);

  useEffect(() => {
    if (detail && !loaded) {
      setOverview(detail.overview ?? { contractAmount: null, startDate: null, endDate: null });
      setProgress(detail.progress);
      setMilestones(detail.milestones);
      setCostEstimation(
        EST_KINDS.map(({ kind }) => detail.costEstimation.find((e) => e.kind === kind) ?? { kind, contractAmount: null, costAmount: null }),
      );
      setCostBudget(detail.costBudget);
      setOutsourcing(detail.outsourcing);
      setLoaded(true);
    }
  }, [detail, loaded]);

  const updateAt = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, i: number, patch: Partial<T>) =>
    setter((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const removeAt = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, i: number) =>
    setter((rows) => rows.filter((_, j) => j !== i));

  const save = () => {
    setSaveMsg(null);
    const body: ProjectDetail = {
      projectName,
      unit: "천 USD",
      overview,
      progress: progress.filter((p) => p.year > 0 && p.month >= 1 && p.month <= 12),
      milestones: milestones.filter((m) => m.label.trim() !== ""),
      costEstimation: costEstimation.filter((e) => e.contractAmount != null || e.costAmount != null),
      costBudget: costBudget.filter((c) => c.item.trim() !== ""),
      outsourcing: outsourcing.filter((o) => o.trade.trim() !== ""),
    };
    mutation.mutate(
      { data: body },
      {
        onSuccess: () => {
          setSaveMsg("저장되었습니다.");
          queryClient.invalidateQueries({ queryKey: getGetProjectdetailQueryKey({ projectName }) });
        },
        onError: () => setSaveMsg("저장에 실패했습니다. 다시 시도해 주세요."),
      },
    );
  };

  if (isLoading && !loaded) {
    return <div style={{ ...cardStyle, textAlign: "center", color: "#8a97a8", fontSize: "12px" }}>불러오는 중…</div>;
  }

  const nowYear = new Date().getFullYear();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "12px", color: "#333" }}>
          <b>{projectName}</b> 프로젝트의 공정/원가/외주 데이터를 입력합니다. 금액 단위: <b>천 USD</b>, 공정률 단위: <b>%</b>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {saveMsg && (
            <span style={{ fontSize: "11px", color: saveMsg.startsWith("저장되") ? "#3e7d4c" : "#c0392b", fontWeight: 600 }}>
              {saveMsg}
            </span>
          )}
          <button
            onClick={save}
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
      <div style={cardStyle}>
        <span style={sectionTitle}>0. 개요 정보 (개요 탭)</span>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>도급액 (천 USD)</th>
              <th style={th}>공사 시작일</th>
              <th style={th}>공사 종료일</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdCell}>
                <NumInput value={overview.contractAmount} onChange={(v) => setOverview((o) => ({ ...o, contractAmount: v }))} />
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
            </tr>
          </tbody>
        </table>
        <div style={{ fontSize: "10px", color: "#8a97a8", marginTop: "6px" }}>
          입찰(Bidding)·실행예산 금액은 아래 "3. 원가율" 표에 입력하면 개요 탭에 함께 반영됩니다.
        </div>
      </div>

      {/* 1. 월별 공정률 */}
      <div style={cardStyle}>
        <span style={sectionTitle}>1. 월별 공정률 (공정 탭)</span>
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
                <td style={tdCell}><NumInput value={p.year} onChange={(v) => updateAt(setProgress, i, { year: v ?? 0 })} /></td>
                <td style={tdCell}><NumInput value={p.month} onChange={(v) => updateAt(setProgress, i, { month: v ?? 0 })} /></td>
                <td style={tdCell}><NumInput value={p.planPct} onChange={(v) => updateAt(setProgress, i, { planPct: v })} /></td>
                <td style={tdCell}><NumInput value={p.actualPct} onChange={(v) => updateAt(setProgress, i, { actualPct: v })} /></td>
                <td style={tdCell}><NumInput value={p.planCumPct} onChange={(v) => updateAt(setProgress, i, { planCumPct: v })} /></td>
                <td style={tdCell}><NumInput value={p.actualCumPct} onChange={(v) => updateAt(setProgress, i, { actualCumPct: v })} /></td>
                <td style={{ ...tdCell, textAlign: "center" }}><DelBtn onClick={() => removeAt(setProgress, i)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
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
        <span style={sectionTitle}>2. 마일스톤 (공정 탭)</span>
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
                <td style={tdCell}><TextInput value={m.label} onChange={(v) => updateAt(setMilestones, i, { label: v ?? "" })} placeholder="예: 착공" /></td>
                <td style={tdCell}><MonthInput value={m.planStart} onChange={(v) => updateAt(setMilestones, i, { planStart: v })} /></td>
                <td style={tdCell}><MonthInput value={m.planEnd} onChange={(v) => updateAt(setMilestones, i, { planEnd: v })} /></td>
                <td style={tdCell}><MonthInput value={m.actualStart} onChange={(v) => updateAt(setMilestones, i, { actualStart: v })} /></td>
                <td style={tdCell}><MonthInput value={m.actualEnd} onChange={(v) => updateAt(setMilestones, i, { actualEnd: v })} /></td>
                <td style={{ ...tdCell, textAlign: "center" }}><DelBtn onClick={() => removeAt(setMilestones, i)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          style={addBtn}
          onClick={() => setMilestones((rows) => [...rows, { label: "", planStart: null, planEnd: null, actualStart: null, actualEnd: null }])}
        >
          <Plus size={12} /> 마일스톤 추가
        </button>
      </div>

      {/* 3. 원가율 */}
      <div style={cardStyle}>
        <span style={sectionTitle}>3. 원가율 (원가 탭)</span>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>구분</th>
              <th style={th}>도급액 (천 USD)</th>
              <th style={th}>원가 (천 USD)</th>
            </tr>
          </thead>
          <tbody>
            {costEstimation.map((e, i) => (
              <tr key={e.kind}>
                <td style={{ ...tdCell, fontSize: "11px", padding: "5px 6px", color: "#333" }}>
                  {EST_KINDS.find((k) => k.kind === e.kind)?.label ?? e.kind}
                </td>
                <td style={tdCell}><NumInput value={e.contractAmount} onChange={(v) => updateAt(setCostEstimation, i, { contractAmount: v })} /></td>
                <td style={tdCell}><NumInput value={e.costAmount} onChange={(v) => updateAt(setCostEstimation, i, { costAmount: v })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. 예산 집행 현황 */}
      <div style={cardStyle}>
        <span style={sectionTitle}>4. 예산 집행 현황 (원가 탭)</span>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>분류</th>
              <th style={th}>항목</th>
              <th style={th}>예산</th>
              <th style={th}>기성 계획</th>
              <th style={th}>기성 실적</th>
              <th style={{ ...th, width: "36px" }}></th>
            </tr>
          </thead>
          <tbody>
            {costBudget.map((c, i) => (
              <tr key={i}>
                <td style={tdCell}><TextInput value={c.category} onChange={(v) => updateAt(setCostBudget, i, { category: v })} placeholder="예: Direct Cost" /></td>
                <td style={tdCell}><TextInput value={c.item} onChange={(v) => updateAt(setCostBudget, i, { item: v ?? "" })} placeholder="예: 외주비" /></td>
                <td style={tdCell}><NumInput value={c.budget} onChange={(v) => updateAt(setCostBudget, i, { budget: v })} /></td>
                <td style={tdCell}><NumInput value={c.plan} onChange={(v) => updateAt(setCostBudget, i, { plan: v })} /></td>
                <td style={tdCell}><NumInput value={c.actual} onChange={(v) => updateAt(setCostBudget, i, { actual: v })} /></td>
                <td style={{ ...tdCell, textAlign: "center" }}><DelBtn onClick={() => removeAt(setCostBudget, i)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          style={addBtn}
          onClick={() => setCostBudget((rows) => [...rows, { category: null, item: "", budget: null, plan: null, actual: null }])}
        >
          <Plus size={12} /> 항목 추가
        </button>
      </div>

      {/* 5. 외주/자재 */}
      <div style={cardStyle}>
        <span style={sectionTitle}>5. 외주/자재 (외주 탭)</span>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
          <thead>
            <tr>
              <th style={th}>공종</th>
              <th style={th}>업체명</th>
              <th style={th}>구분</th>
              <th style={th}>최초 계약일</th>
              <th style={th}>변경 차수</th>
              <th style={th}>예산(A)</th>
              <th style={th}>결의금액(B)</th>
              <th style={th}>기성 이번달</th>
              <th style={th}>기성 누계(C)</th>
              <th style={{ ...th, width: "36px" }}></th>
            </tr>
          </thead>
          <tbody>
            {outsourcing.map((o, i) => (
              <tr key={i}>
                <td style={tdCell}><TextInput value={o.trade} onChange={(v) => updateAt(setOutsourcing, i, { trade: v ?? "" })} placeholder="예: 토공사" /></td>
                <td style={tdCell}><TextInput value={o.vendor} onChange={(v) => updateAt(setOutsourcing, i, { vendor: v })} /></td>
                <td style={tdCell}><TextInput value={o.category} onChange={(v) => updateAt(setOutsourcing, i, { category: v })} placeholder="용역/외주" /></td>
                <td style={tdCell}><TextInput value={o.contractDate} onChange={(v) => updateAt(setOutsourcing, i, { contractDate: v })} placeholder="'24.12.31" /></td>
                <td style={tdCell}><TextInput value={o.changeNo} onChange={(v) => updateAt(setOutsourcing, i, { changeNo: v })} /></td>
                <td style={tdCell}><NumInput value={o.budget} onChange={(v) => updateAt(setOutsourcing, i, { budget: v })} /></td>
                <td style={tdCell}><NumInput value={o.resolved} onChange={(v) => updateAt(setOutsourcing, i, { resolved: v })} /></td>
                <td style={tdCell}><NumInput value={o.thisMonth} onChange={(v) => updateAt(setOutsourcing, i, { thisMonth: v })} /></td>
                <td style={tdCell}><NumInput value={o.accum} onChange={(v) => updateAt(setOutsourcing, i, { accum: v })} /></td>
                <td style={{ ...tdCell, textAlign: "center" }}><DelBtn onClick={() => removeAt(setOutsourcing, i)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          style={addBtn}
          onClick={() =>
            setOutsourcing((rows) => [
              ...rows,
              { trade: "", vendor: null, category: null, contractDate: null, changeNo: null, budget: null, resolved: null, thisMonth: null, accum: null },
            ])
          }
        >
          <Plus size={12} /> 공종 추가
        </button>
      </div>
    </div>
  );
}
