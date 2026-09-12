import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const displayConsumers = [
  {
    file: "src/components/OverviewTab.tsx",
    canonicalFields: ["canonicalSalesMonthly", "canonicalCogsMonthly"],
  },
  {
    file: "src/components/SaleCostTab.tsx",
    canonicalFields: ["canonicalSalesMonthly", "canonicalCogsMonthly"],
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