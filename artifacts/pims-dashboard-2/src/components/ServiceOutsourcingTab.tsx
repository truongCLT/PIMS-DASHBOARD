import React from "react";
import { useTranslation } from "react-i18next";
import { useProjectDetail, fmtPct, ratioPct } from "../lib/projectDetailData";
import { useMoney } from "../lib/displayUnit";
import { tokens as aquaTokens } from "@workspace/aqua-glass";
const AG = aquaTokens.color.light;

const thStyle: React.CSSProperties = {
  backgroundColor: AG.background,
  color: AG.foreground,
  fontSize: "13px",
  fontWeight: 700,
  padding: "10px 8px",
  border: `1px solid ${AG.border}`,
  textAlign: "center",
  verticalAlign: "middle",
  whiteSpace: "pre-line",
};

const tdStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#222",
  padding: "10px 8px",
  border: `1px solid ${AG.border}`,
  verticalAlign: "top",
  backgroundColor: "#fff",
};

const tdCenter: React.CSSProperties = { ...tdStyle, textAlign: "center" };
const tdRight: React.CSSProperties = { ...tdStyle, textAlign: "right" };

export function ServiceOutsourcingTab({ projectName }: { projectName: string }) {
  const { t } = useTranslation(["serviceOutsourcingTab", "common"]);
  const { detail, isLoading } = useProjectDetail(projectName);
  const { fmtMoney } = useMoney();
  const rows = detail?.outsourcing ?? [];

  const sum = {
    budget: rows.some((r) => r.budget != null) ? rows.reduce((a, r) => a + (r.budget ?? 0), 0) : null,
    resolved: rows.some((r) => r.resolved != null) ? rows.reduce((a, r) => a + (r.resolved ?? 0), 0) : null,
    thisMonth: rows.some((r) => r.thisMonth != null) ? rows.reduce((a, r) => a + (r.thisMonth ?? 0), 0) : null,
    accum: rows.some((r) => r.accum != null) ? rows.reduce((a, r) => a + (r.accum ?? 0), 0) : null,
  };

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: `1px solid ${AG.border}`,
        borderRadius: "8px",
        padding: "12px",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: "13%" }} rowSpan={2}>{t("serviceOutsourcingTab:tradeType")}</th>
            <th style={thStyle} rowSpan={2}>{t("serviceOutsourcingTab:vendorName")}</th>
            <th style={thStyle} rowSpan={2}>{t("serviceOutsourcingTab:category")}</th>
            <th style={thStyle} rowSpan={2}>{t("serviceOutsourcingTab:firstContractDate")}</th>
            <th style={thStyle} rowSpan={2}>{t("serviceOutsourcingTab:changeContractNo")}</th>
            <th style={thStyle} rowSpan={2}>{t("serviceOutsourcingTab:budgetA")}</th>
            <th style={{ ...thStyle, width: "12%" }} rowSpan={2}>{t("serviceOutsourcingTab:resolvedAmountB")}</th>
            <th style={thStyle} rowSpan={2}>{t("serviceOutsourcingTab:resolvedRateBA")}</th>
            <th style={thStyle} colSpan={3}>{t("serviceOutsourcingTab:progressStatus")}</th>
          </tr>
          <tr>
            <th style={{ ...thStyle, width: "11%" }}>{t("serviceOutsourcingTab:thisMonth")}</th>
            <th style={{ ...thStyle, width: "11%" }}>{t("serviceOutsourcingTab:cumulativeC")}</th>
            <th style={{ ...thStyle, width: "11%" }}>{t("serviceOutsourcingTab:rateCB")}</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td style={{ ...tdCenter, color: AG.mutedForeground }} colSpan={11}>
                {t("common:loading")}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td style={{ ...tdCenter, color: AG.mutedForeground, padding: "24px 10px" }} colSpan={11}>
                {t("serviceOutsourcingTab:noData")}
              </td>
            </tr>
          ) : (
            <>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{r.trade || "-"}</td>
                  <td style={tdCenter}>{r.vendor ?? "-"}</td>
                  <td style={{ ...tdCenter, whiteSpace: "pre-line" }}>
                    {r.category ? r.category.split("").join("\n") : "-"}
                  </td>
                  <td style={tdCenter}>{r.contractDate ?? "-"}</td>
                  <td style={tdCenter}>{r.changeNo ?? "-"}</td>
                  <td style={tdRight}>{fmtMoney(r.budget)}</td>
                  <td style={tdRight}>{fmtMoney(r.resolved)}</td>
                  <td style={tdCenter}>{fmtPct(ratioPct(r.resolved, r.budget))}</td>
                  <td style={tdRight}>{fmtMoney(r.thisMonth)}</td>
                  <td style={tdRight}>{fmtMoney(r.accum)}</td>
                  <td style={tdRight}>{fmtPct(ratioPct(r.accum, r.resolved))}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{t("common:total")}</td>
                <td style={tdCenter}></td>
                <td style={tdCenter}></td>
                <td style={tdCenter}></td>
                <td style={tdCenter}></td>
                <td style={{ ...tdRight, fontWeight: 600 }}>{fmtMoney(sum.budget)}</td>
                <td style={{ ...tdRight, fontWeight: 600 }}>{fmtMoney(sum.resolved)}</td>
                <td style={{ ...tdCenter, fontWeight: 600 }}>{fmtPct(ratioPct(sum.resolved, sum.budget))}</td>
                <td style={{ ...tdRight, fontWeight: 600 }}>{fmtMoney(sum.thisMonth)}</td>
                <td style={{ ...tdRight, fontWeight: 600 }}>{fmtMoney(sum.accum)}</td>
                <td style={{ ...tdRight, fontWeight: 600 }}>{fmtPct(ratioPct(sum.accum, sum.resolved))}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
