import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Building2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetOrgStructure,
  usePutOrgStructure,
  getGetOrgStructureQueryKey,
  useListMgmtreportProjects,
  useUpdateMgmtreportProjectDivision,
  getListMgmtreportProjectsQueryKey,
} from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import { REPORT_YEAR } from "../lib/mgmtreportData";
import { tokens as aquaTokens } from "@workspace/aqua-glass";
const AG = aquaTokens.color.light;

interface DivisionRow {
  label: string;
  businessType: "시공" | "용역";
  sortOrder: number;
}
interface CompanyRow {
  label: string;
  sortOrder: number;
  divisions: DivisionRow[];
}

export function OrgStructureEditor() {
  const { t } = useTranslation(["orgStructureEditor", "common"]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CompanyRow[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);
  const queryClient = useQueryClient();

  const orgQuery = useGetOrgStructure({ query: { enabled: open, queryKey: getGetOrgStructureQueryKey() } });
  const projectsQuery = useListMgmtreportProjects(
    { year: REPORT_YEAR },
    { query: { enabled: open, queryKey: getListMgmtreportProjectsQueryKey({ year: REPORT_YEAR }) } },
  );

  useEffect(() => {
    if (!open) return;
    setDraft(
      (orgQuery.data?.companies ?? []).map((c) => ({
        label: c.label,
        sortOrder: c.sortOrder,
        divisions: c.divisions.map((d) => ({ label: d.label, businessType: d.businessType, sortOrder: d.sortOrder })),
      })),
    );
    setError(null);
    const updatePos = () => {
      const btn = ref.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const width = 380;
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
      setPopupPos({ top: rect.bottom + 4, left });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
      document.removeEventListener("mousedown", onClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orgQuery.data]);

  const saveMutation = usePutOrgStructure({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetOrgStructureQueryKey() });
        setError(null);
      },
      onError: () => setError(t("orgStructureEditor:saveFailed")),
    },
  });

  const assignMutation = useUpdateMgmtreportProjectDivision({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getListMgmtreportProjectsQueryKey({ year: REPORT_YEAR }) });
      },
      onError: () => setError(t("orgStructureEditor:assignFailed")),
    },
  });

  if (!draft) {
    // still allow rendering the trigger button before first open
  }

  const save = () => {
    if (!draft) return;
    saveMutation.mutate({ data: { companies: draft } });
  };

  const updateCompanyLabel = (companyIdx: number, label: string) => {
    setDraft((prev) => prev && prev.map((c, i) => (i === companyIdx ? { ...c, label } : c)));
  };
  const updateDivision = (companyIdx: number, divisionIdx: number, patch: Partial<DivisionRow>) => {
    setDraft(
      (prev) =>
        prev &&
        prev.map((c, i) =>
          i === companyIdx
            ? { ...c, divisions: c.divisions.map((d, j) => (j === divisionIdx ? { ...d, ...patch } : d)) }
            : c,
        ),
    );
  };
  const addCompany = () => {
    setDraft((prev) => [...(prev ?? []), { label: t("orgStructureEditor:newCompany"), sortOrder: (prev?.length ?? 0), divisions: [] }]);
  };
  const removeCompany = (companyIdx: number) => {
    setDraft((prev) => prev && prev.filter((_, i) => i !== companyIdx));
  };
  const addDivision = (companyIdx: number) => {
    setDraft(
      (prev) =>
        prev &&
        prev.map((c, i) =>
          i === companyIdx
            ? { ...c, divisions: [...c.divisions, { label: t("orgStructureEditor:newDivision"), businessType: "시공" as const, sortOrder: c.divisions.length }] }
            : c,
        ),
    );
  };
  const removeDivision = (companyIdx: number, divisionIdx: number) => {
    setDraft(
      (prev) =>
        prev &&
        prev.map((c, i) => (i === companyIdx ? { ...c, divisions: c.divisions.filter((_, j) => j !== divisionIdx) } : c)),
    );
  };

  const unmappedProjects = (projectsQuery.data?.projects ?? []).filter((p) => !p.isGroup && p.businessType == null);
  const allDivisionOptions = (draft ?? []).flatMap((c) => c.divisions.map((d) => ({ companyLabel: c.label, ...d })));
  const orgCompanies = orgQuery.data?.companies ?? [];

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${AG.input}`,
    borderRadius: "5px",
    padding: "4px 6px",
    fontSize: "11px",
    outline: "none",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={t("orgStructureEditor:buttonTitle")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          backgroundColor: "#3f5f8a",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          padding: "7px 14px",
          fontSize: "12px",
          cursor: "pointer",
          fontWeight: "500",
        }}
      >
        <Building2 size={13} />
        {t("orgStructureEditor:buttonLabel")}
      </button>

      {open && popupPos && draft && createPortal(
        <div ref={popupRef} style={{
          position: "fixed",
          top: popupPos.top,
          left: popupPos.left,
          maxHeight: `calc(100vh - ${popupPos.top + 8}px)`,
          overflowY: "auto",
          backgroundColor: "#fff",
          border: `1px solid ${AG.input}`,
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(20,40,80,0.15)",
          zIndex: 1000,
          width: "380px",
          padding: "14px",
        }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: AG.foreground, marginBottom: "10px" }}>
            {t("orgStructureEditor:popupTitle")}
          </div>

          {draft.map((company, ci) => (
            <div key={ci} style={{ border: `1px solid ${AG.background}`, borderRadius: "6px", padding: "8px", marginBottom: "8px" }}>
              <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
                <input
                  value={company.label}
                  onChange={(e) => updateCompanyLabel(ci, e.target.value)}
                  style={{ ...inputStyle, flex: 1, fontWeight: 700 }}
                />
                <button onClick={() => removeCompany(ci)} style={{ ...inputStyle, cursor: "pointer", color: "#e0655c" }}>
                  {t("common:delete")}
                </button>
              </div>
              {company.divisions.map((division, di) => (
                <div key={di} style={{ display: "flex", gap: "4px", marginBottom: "4px", paddingLeft: "10px" }}>
                  <input
                    value={division.label}
                    onChange={(e) => updateDivision(ci, di, { label: e.target.value })}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <select
                    value={division.businessType}
                    onChange={(e) => updateDivision(ci, di, { businessType: e.target.value as "시공" | "용역" })}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="시공">{t("common:construction")}</option>
                    <option value="용역">{t("common:service")}</option>
                  </select>
                  <button onClick={() => removeDivision(ci, di)} style={{ ...inputStyle, cursor: "pointer", color: "#e0655c" }}>
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => addDivision(ci)}
                style={{ ...inputStyle, marginTop: "4px", marginLeft: "10px", cursor: "pointer", color: AG.primary }}
              >
                + {t("orgStructureEditor:addDivision")}
              </button>
            </div>
          ))}
          <button onClick={addCompany} style={{ ...inputStyle, width: "100%", cursor: "pointer", color: AG.primary, marginBottom: "10px" }}>
            + {t("orgStructureEditor:addCompany")}
          </button>

          {error && <div style={{ fontSize: "11px", color: "#e0655c", marginBottom: "8px" }}>{error}</div>}
          <button
            onClick={save}
            disabled={saveMutation.isPending}
            style={{
              width: "100%",
              padding: "8px 0",
              fontSize: "12px",
              fontWeight: 600,
              backgroundColor: AG.secondary,
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: saveMutation.isPending ? "wait" : "pointer",
              marginBottom: "12px",
            }}
          >
            {saveMutation.isPending ? t("orgStructureEditor:saving") : t("common:save")}
          </button>

          {unmappedProjects.length > 0 && (
            <div style={{ borderTop: `1px solid ${AG.background}`, paddingTop: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: AG.mutedForeground, marginBottom: "6px" }}>
                {t("orgStructureEditor:unmappedTitle", { count: unmappedProjects.length })}
              </div>
              {unmappedProjects.map((p) => (
                <div key={p.name} style={{ display: "flex", gap: "4px", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", color: "#333", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.name}>
                    {p.name}
                  </span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      const target = allDivisionOptions[idx];
                      if (!target) return;
                      const orgDivision = orgCompanies
                        .find((c) => c.label === target.companyLabel)
                        ?.divisions.find((d) => d.label === target.label);
                      if (!orgDivision) return;
                      assignMutation.mutate({ name: p.name, data: { divisionId: orgDivision.id } });
                    }}
                    style={{ ...inputStyle, cursor: "pointer", maxWidth: "140px" }}
                  >
                    <option value="" disabled>
                      {t("orgStructureEditor:selectDivision")}
                    </option>
                    {allDivisionOptions.map((d, idx) => (
                      <option key={idx} value={idx}>
                        {d.companyLabel} / {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
