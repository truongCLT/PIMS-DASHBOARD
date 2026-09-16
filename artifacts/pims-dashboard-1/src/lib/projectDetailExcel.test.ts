import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import type { ProjectDetail } from "@workspace/api-client-react";
import { parseProjectDetailWorkbook } from "./projectDetailExcel";

const FX_RATE_VND = 25_000;

function emptyDetail(): ProjectDetail {
  return {
    projectName: "TEST",
    unit: "K USD",
    overview: {
      siteCode: "SITE-OLD",
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
    },
    progress: [],
    milestones: [],
    costEstimation: [],
    costBudget: [
      { category: "Direct Cost", item: "Common", budget: 10, plan: 3, actual: 2 },
    ],
    costBudgetMonthly: [],
    outsourcing: [],
    cashflow: [],
    cogsMonthly: [],
    salesMonthly: [],
    photos: [{ objectPath: "/objects/uploads/photo.jpg" }],
  };
}

async function workbookFile(workbook: ExcelJS.Workbook): Promise<File> {
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([new Uint8Array(buffer)], "project-detail.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("project detail Excel current template", () => {
  it("imports all current overview fields, hierarchical budget, and confirmed progress", async () => {
    const workbook = new ExcelJS.Workbook();

    const overview = workbook.addWorksheet("개요");
    [
      ["현장코드", "SITE-NEW"],
      ["발주처", "Client"],
      ["착공일(YYYY-MM-DD)", "2026-01-02"],
      ["준공일(YYYY-MM-DD)", "2027-03-04"],
      ["도급액(Bil.VND)", 2.5],
      ["공사규모", "B2~20F"],
      ["위치", "HCMC"],
      ["대지면적", "1,000㎡"],
      ["연면적", "20,000㎡"],
      ["용도", "Office"],
      ["지분", "100%"],
      ["파트너사", "Partner"],
      ["계약방식", "Lump sum"],
      ["수금조건", "Monthly"],
      ["하자보증기간", "24 months"],
      ["하자보증증권", "5%"],
      ["선급금", "10%"],
      ["유보금", "5%"],
      ["VE 조건", "Shared"],
      ["작성 기준월(YYYY-MM)", "2026-09"],
      ["수행내용", "Construction"],
    ].forEach((row) => overview.addRow(row));

    const budget = workbook.addWorksheet("4.예산집행");
    budget.addRow(["Level 1", "Level 2", "비고", "예산(Bil.VND)"]);
    budget.addRow(["Direct Cost", "Common", "", 1.25]);

    const cashflow = workbook.addWorksheet("6.월별자금");
    cashflow.addRow(["연도", "월", "수입(Bil.VND)", "지출(Bil.VND)", "보유현금(Bil.VND)", "기성 확정(Bil.VND)"]);
    cashflow.addRow([2026, 9, 2, 1, 3, 0.5]);

    const existing = emptyDetail();
    const parsed = await parseProjectDetailWorkbook(
      await workbookFile(workbook),
      existing,
      FX_RATE_VND,
    );

    expect(parsed.overview).toMatchObject({
      siteCode: "SITE-NEW",
      client: "Client",
      startDate: "2026-01-02",
      endDate: "2027-03-04",
      location: "HCMC",
      siteArea: "1,000㎡",
      grossFloorArea: "20,000㎡",
      purpose: "Office",
      ownershipStake: "100%",
      partnerCompany: "Partner",
      contractMethod: "Lump sum",
      paymentTerms: "Monthly",
      defectWarrantyPeriod: "24 months",
      defectWarrantyBond: "5%",
      advancePayment: "10%",
      retention: "5%",
      veTerms: "Shared",
      asOfMonth: "2026-09",
      scope: "Construction",
    });
    expect(parsed.costBudget[0]).toMatchObject({
      category: "Direct Cost",
      item: "Common",
      budget: 50,
      plan: 3,
      actual: 2,
    });
    expect(parsed.cashflow[0]).toMatchObject({
      year: 2026,
      month: 9,
      cashIn: 80,
      cashOut: 40,
      equivalent: 120,
      confirmedProgress: 20,
    });
    expect(parsed.photos).toEqual(existing.photos);
  });

  it("continues to import the previous budget and cashflow columns", async () => {
    const workbook = new ExcelJS.Workbook();
    const budget = workbook.addWorksheet("4.예산집행");
    budget.addRow(["구분", "항목", "예산(Bil.VND)", "계획(Bil.VND)", "실적(Bil.VND)"]);
    budget.addRow(["Direct Cost", "Common", 1, 0.5, 0.25]);
    const cashflow = workbook.addWorksheet("6.월별자금");
    cashflow.addRow(["연도", "월", "수입(Bil.VND)", "지출(Bil.VND)", "보유현금(Bil.VND)"]);
    cashflow.addRow([2025, 12, 1, 2, 3]);

    const parsed = await parseProjectDetailWorkbook(
      await workbookFile(workbook),
      emptyDetail(),
      FX_RATE_VND,
    );

    expect(parsed.costBudget[0]).toMatchObject({
      budget: 40,
      plan: 20,
      actual: 10,
    });
    expect(parsed.cashflow[0].confirmedProgress).toBeNull();
  });
});