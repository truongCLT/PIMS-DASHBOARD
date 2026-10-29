import { describe, expect, it } from "vitest";
import { applyCashflowVndRates, buildCashflowReportSummary, type CashflowReportRow } from "./cashflowReport";

const row = (r: Partial<CashflowReportRow>): CashflowReportRow => ({
  source: "ACTUAL",
  year: 2026,
  month: 1,
  groupCode: "BL000001",
  groupName: "Business Activities",
  cls: "BUSINESS",
  site: "VH10TC1",
  siteName: "THT K8HH1 COMPLEX SITE",
  typeName: "Progress Billing",
  category: "INC",
  amount: 0,
  ...r,
});

describe("buildCashflowReportSummary", () => {
  const rows: CashflowReportRow[] = [
    row({ month: 1, amount: 13_475_450 }),
    row({ month: 1, category: "OUT", typeName: "Subcon and etc", amount: 9_409_420 }),
    row({
      month: 1,
      groupCode: "BL000007",
      groupName: "Financing and Investment Activities",
      cls: "FINANCE",
      site: "",
      siteName: "",
      typeName: "Deposit Interest",
      amount: 1_022_000,
    }),
    row({ month: 1, groupCode: "BL000010", groupName: "HQ Admin Expenses", cls: "ADMIN", site: "", siteName: "", typeName: "Admin expenses", category: "OUT", amount: 502_000 }),
    // 과거 달의 PLAN은 무시되고(실적으로 대체), 미래 달은 PLAN만 쓴다.
    row({ source: "PLAN", month: 1, amount: 99_000_000 }),
    row({ source: "ACTUAL", month: 11, amount: 5_000_000 }),
    row({ source: "PLAN", month: 11, amount: 11_306_000 }),
  ];

  const summary = buildCashflowReportSummary({
    rows,
    openingBalanceUsd: 76_334_260,
    fromYear: 2026,
    fromMonth: 1,
    months: 12,
    actualMonth: "2026-10",
  });

  it("Total은 모든 그룹(Business/Financing/Admin/Development) 합계다", () => {
    const jan = summary.total[0];
    expect(jan.income).toBeCloseTo(14_497.45, 2);
    expect(jan.outcome).toBeCloseTo(9_911.42, 2);
    expect(jan.isActual).toBe(true);
  });

  it("Cash Balance = 기초 잔액 + 월별 Surplus 누계 (실적 달은 천 단위 반올림 후 누계)", () => {
    expect(summary.openingBalance).toBeCloseTo(76_334.26, 2);
    // round(76,334.26)=76,334 + round(4,586.03)=4,586
    expect(summary.total[0].balance).toBe(80_920);
    expect(summary.total[9].balance).toBe(80_920);
    expect(summary.total[10]).toMatchObject({ month: "2026-11", income: 11_306, isActual: false });
    expect(summary.total[10].balance).toBe(92_226);
  });

  it("그룹 상세는 현장 사업은 현장별, 재무/관리비는 Cash Flow Type별로 묶는다", () => {
    const business = summary.groups.find((g) => g.code === "BL000001");
    const finance = summary.groups.find((g) => g.code === "BL000007");
    expect(business?.details.map((d) => d.label)).toEqual(["THT K8HH1 COMPLEX SITE"]);
    expect(finance?.details.map((d) => d.label)).toEqual(["Deposit Interest"]);
    expect(summary.groups.map((g) => g.name)).toEqual([
      "Business Activities",
      "Financing and Investment Activities",
      "HQ Admin Expenses",
    ]);
  });

  it("요청 구간에 금액이 없는 그룹도(예: Development 계획이 11~12월뿐) 0으로 표시한다", () => {
    const s = buildCashflowReportSummary({
      rows: [...rows, row({ source: "PLAN", month: 11, groupCode: "BL000012", groupName: "Development", category: "OUT", amount: 19_083_000 })],
      openingBalanceUsd: 0,
      fromYear: 2026,
      fromMonth: 1,
      months: 9,
      actualMonth: "2026-10",
    });
    const dev = s.groups.find((g) => g.code === "BL000012");
    expect(dev?.months.every((m) => m.income === 0 && m.outcome === 0)).toBe(true);
    expect(dev?.details).toEqual([]);
  });

  it("요청 구간 이전 달도 잔액 누계에 포함한다", () => {
    const fromApril = buildCashflowReportSummary({
      rows,
      openingBalanceUsd: 76_334_260,
      fromYear: 2026,
      fromMonth: 4,
      months: 3,
      actualMonth: "2026-10",
    });
    expect(fromApril.total.map((p) => p.month)).toEqual(["2026-04", "2026-05", "2026-06"]);
    expect(fromApril.total[0].balance).toBe(80_920);
    expect(fromApril.total[0].income).toBe(0);
  });

  it("Summary는 BOTH 유형 거래를 Financing 그룹에서 빼서 Total에 두 번 넣지 않는다", () => {
    const s = buildCashflowReportSummary({
      rows: [
        row({ amount: 1_000_000, reportType: "BOTH" }),
        row({ groupCode: "BL000007", cls: "FINANCE", site: "", reportType: "BOTH", amount: 1_000_000 }),
      ],
      openingBalanceUsd: 0,
      fromYear: 2026,
      fromMonth: 1,
      months: 1,
      actualMonth: "2026-10",
    });
    expect(s.total[0].income).toBe(1_000);
  });

  it("Site 필터: 그 현장 PLAN/Business 실적 + GEN_ 계획 + 회사 공통 Admin/Finance 실적만 쓴다", () => {
    const s = buildCashflowReportSummary({
      rows: [
        ...rows,
        row({ site: "OTHER1", amount: 7_000_000 }),
        row({ source: "PLAN", month: 11, site: "OTHER1", amount: 3_000_000 }),
        row({ source: "PLAN", month: 11, site: "GEN_DECV", cls: "ADMIN", category: "OUT", amount: 491_000 }),
      ],
      openingBalanceUsd: 0,
      fromYear: 2026,
      fromMonth: 1,
      months: 12,
      actualMonth: "2026-10",
      site: "VH10TC1",
    });
    expect(s.total[0].income).toBeCloseTo(14_497.45, 2);
    expect(s.total[10]).toMatchObject({ income: 11_306, outcome: 491 });
  });
});

describe("applyCashflowVndRates", () => {
  it("re-converts only ACTUAL rows of months that have a cash flow rate", () => {
    const rows = [
      row({ month: 9, amount: 1_000, amountUsdCcy: 200, amountVnd: 20_800_000 }),
      row({ month: 8, amount: 1_000, amountUsdCcy: 200, amountVnd: 20_800_000 }),
      row({ source: "PLAN", month: 9, amount: 5_000, amountUsdCcy: 0, amountVnd: 0 }),
    ];
    const out = applyCashflowVndRates(rows, new Map([["2026-09", 26_000]]));
    expect(out[0].amount).toBeCloseTo(200 + 800, 6);
    expect(out[1].amount).toBe(1_000);
    expect(out[2].amount).toBe(5_000);
  });
});
