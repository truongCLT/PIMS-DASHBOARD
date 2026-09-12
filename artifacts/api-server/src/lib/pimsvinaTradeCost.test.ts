import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  mapPimsvinaTradeItem,
  parsePimsvinaKusd,
  preservePimsvinaActualSource,
  findStalePimsvinaTradeCosts,
  tradeCostKey,
  tradeCostScope,
  sumPimsvinaKusdValues,
} from "./pimsvinaTradeCost";
import { ORACLE_DASHBOARD_QUERIES } from "./pimsvinaOracleQueries";

describe("PIMSVINA monthly trade cost", () => {
  it("maps only explicit ERP trade names to the six report items", () => {
    expect(mapPimsvinaTradeItem("건축공사")).toBe("외주 건축");
    expect(mapPimsvinaTradeItem("기계설비")).toBe("외주 기계");
    expect(mapPimsvinaTradeItem("전기공사")).toBe("외주 전기");
    expect(mapPimsvinaTradeItem("토목공사")).toBe("외주 토목");
    expect(mapPimsvinaTradeItem("조경공사")).toBe("외주 조경");
    expect(mapPimsvinaTradeItem("현장 경비")).toBe("외주 경비");
    expect(mapPimsvinaTradeItem("Mechanical")).toBe("외주 기계");
    expect(mapPimsvinaTradeItem("Cảnh quan")).toBe("외주 조경");
  });

  it("rejects unknown and ambiguous labels instead of allocating totals", () => {
    expect(mapPimsvinaTradeItem("기타 외주")).toBeNull();
    expect(mapPimsvinaTradeItem("기계 전기 통합")).toBeNull();
    expect(mapPimsvinaTradeItem("")).toBeNull();
  });

  it("accepts only the kUSD value explicitly converted by Oracle", () => {
    expect(parsePimsvinaKusd(1000)).toBe(1000);
    expect(parsePimsvinaKusd(-25.5)).toBe(-25.5);
    expect(parsePimsvinaKusd(null)).toBeNull();
  });

  it("keeps ERP ownership for plan-only saves and releases it on actual edits", () => {
    expect(preservePimsvinaActualSource("pimsvina", "12.5", 12.5)).toBe("pimsvina");
    expect(preservePimsvinaActualSource("pimsvina", "12.5", 13)).toBeNull();
    expect(preservePimsvinaActualSource(null, "12.5", 12.5)).toBeNull();
  });

  it("clears missing ERP values only in the explicitly covered project-year", () => {
    const projectA = {
      projectName: "Project A",
      item: "외주 건축",
      year: 2026,
      month: 1,
      actualSource: "pimsvina",
    };
    const projectB = {
      projectName: "Project B",
      item: "외주 건축",
      year: 2026,
      month: 1,
      actualSource: "pimsvina",
    };
    const stale = findStalePimsvinaTradeCosts(
      [projectA, projectB],
      new Set<string>(),
      new Set([tradeCostScope(projectA)]),
    );
    expect(stale).toEqual([projectA]);
    expect(stale.map(tradeCostKey)).not.toContain(tradeCostKey(projectB));
  });

  it("never clears stale values when either ERP snapshot query failed", () => {
    const existing = [{
      projectName: "Project A",
      item: "외주 건축",
      year: 2026,
      month: 1,
      actualSource: "pimsvina",
    }];
    expect(
      findStalePimsvinaTradeCosts(
        existing,
        new Set(),
        new Set([tradeCostScope(existing[0])]),
        false,
      ),
    ).toEqual([]);
  });

  it("does not coerce a missing Oracle conversion to zero", () => {
    expect(sumPimsvinaKusdValues([10, null, 20])).toBeNull();
    expect(sumPimsvinaKusdValues([10, -2.5])).toBe(7.5);
    const existing = {
      projectName: "Project A",
      item: "외주 건축",
      year: 2026,
      month: 1,
      actualSource: "pimsvina",
    };
    expect(
      findStalePimsvinaTradeCosts(
        [existing],
        new Set([tradeCostKey(existing)]),
        new Set([tradeCostScope(existing)]),
        true,
      ),
    ).toEqual([]);
  });

  it("queries monthly actuals with site, trade, and period identifiers", () => {
    const query =
      ORACLE_DASHBOARD_QUERIES["dashboard_pd_trade_cost_monthly_1q.jsp"].sql;
    expect(query).toContain("S.FLDCODE AS FLDCODE");
    expect(query).toContain("T.ORDCONTTYPECODE AS TRADE_CODE");
    expect(query).toContain("T.ORDCONTTYPENAME AS TRADE");
    expect(query).toContain("S.YYMM");
    expect(query).toContain("CAST('VND' AS VARCHAR2(3)) AS SOURCE_CURRENCY");
    expect(query).toContain("SUM(NVL(S.PRGSAMT, 0)) AS ACTUAL_VND");
    expect(query).toContain("AS ACTUAL_KUSD");
    expect(query).toContain("B.LASTYN = '1'");
    expect(query).not.toMatch(/PERCENT|ALLOCAT/i);
    const scopeQuery =
      ORACLE_DASHBOARD_QUERIES["dashboard_pd_trade_cost_scopes_1q.jsp"].sql;
    expect(scopeQuery).toContain("SELECT DISTINCT");
    expect(scopeQuery).toContain("P.FLDCODE AS FLDCODE");
    expect(scopeQuery).toContain("AS SITE_CODE");
    expect(scopeQuery).toContain("P.BASEYYMM");
  });

  it("updates only actual so a manual monthly plan remains intact", () => {
    const syncSource = readFileSync(
      "artifacts/api-server/src/routes/pimsvinaSync.ts",
      "utf8",
    );
    const tradeSync = syncSource.slice(
      syncSource.indexOf("// 11b. Sync monthly actual cost"),
      syncSource.indexOf("// 12. Sync Project Detail Cashflow"),
    );
    expect(tradeSync).toContain('actualSource: "pimsvina"');
    expect(tradeSync).not.toMatch(/set:\s*\{[^}]*plan/s);
    expect(tradeSync).toContain("resolveTradeProjectName(item)");
    expect(tradeSync).not.toContain("await resolveProjectName(item)");
  });
});