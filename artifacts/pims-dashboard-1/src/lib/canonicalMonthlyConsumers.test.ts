import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const displayConsumers = [
  {
    file: "src/components/OverviewTab.tsx",
    canonicalFields: ["canonicalSalesMonthly", "canonicalCogsMonthly"],
  },
  {
    // 누계 원가율은 더 이상 canonicalCogsMonthly(pd_cogs_monthly)를 쓰지 않는다 — 일부 프로젝트의
    // acctCogs가 VND/천USD 단위가 뒤섞여 저장된 레거시 데이터라 매출과 직접 나누면 안 되므로,
    // pd_cost_estimation(execution)의 costAmount/contractAmount(표준추정원가율과 동일 소스)로
    // 교체했다 — helpers.ts의 buildCostRatioLookup 참고.
    file: "src/components/SaleCostTab.tsx",
    canonicalFields: ["canonicalSalesMonthly"],
  },
  {
    file: "src/components/SaleProfitTab.tsx",
    canonicalFields: ["canonicalSalesMonthly", "canonicalCogsMonthly"],
  },
  {
    file: "src/components/ProjectReportTab.tsx",
    canonicalFields: ["canonicalSalesMonthly"],
  },
  {
    file: "src/components/ServiceReportTab.tsx",
    canonicalFields: ["canonicalSalesMonthly"],
  },
];

describe("project monthly display consumers", () => {
  for (const { file, canonicalFields } of displayConsumers) {
    it(`${file} uses display-only canonical monthly fields`, () => {
      const source = readFileSync(file, "utf8");

      for (const field of canonicalFields) {
        expect(source).toContain(field);
      }
      expect(source).not.toMatch(
        /\b(?:pdDetail|detail)(?:\?\.|\.)?(?:salesMonthly|cogsMonthly)\b/,
      );
      expect(source).not.toContain("useListSalescostSites");
    });
  }
});