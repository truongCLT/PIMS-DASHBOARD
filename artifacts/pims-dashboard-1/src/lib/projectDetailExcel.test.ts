import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import type { ProjectDetail } from "@workspace/api-client-react";
import { downloadProjectDetailTemplate, parseProjectDetailWorkbook } from "./projectDetailExcel";

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

    const overview = workbook.addWorksheet("0.개요");
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

    const budget = workbook.addWorksheet("6.예산집행");
    budget.addRow(["Level 1", "Level 2", "비고", "예산(Bil.VND)", "누계 계획(Bil.VND)", "누계 실적(Bil.VND)"]);
    budget.addRow(["Direct Cost", "Common", "", 1.25, 0.5, 0.25]);

    const cashflow = workbook.addWorksheet("8.월별자금");
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
      budget: 1_250_000_000, // budget은 VND 원본(fromVndRaw) — 1.25 Bil.VND = 1,250,000,000
      plan: 3, // 누계 계획/실적은 확인용 컬럼일 뿐, 업로드 시 기존 값을 그대로 보존
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
    const budget = workbook.addWorksheet("6.예산집행");
    budget.addRow(["구분", "항목", "예산(Bil.VND)", "계획(Bil.VND)", "실적(Bil.VND)"]);
    budget.addRow(["Direct Cost", "Common", 1, 0.5, 0.25]);
    const cashflow = workbook.addWorksheet("8.월별자금");
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

  it("imports construction process cost plans by trade group and keeps other monthly budget items", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("4.공정별월간원가");
    sheet.addRow([
      "연도", "월",
      "대공종 계획", "대공종 실적", "건축 계획", "건축 실적", "기계 계획", "기계 실적", "전기 계획", "전기 실적",
      "토목 계획", "토목 실적", "조경 계획", "조경 실적", "경비 계획", "경비 실적",
    ]);
    sheet.addRow([2026, 1, 2, 99, 1.5, 99, null, null, null, null, null, null, null, null, 3, 99]);

    const existing = emptyDetail();
    existing.costBudgetMonthly = [
      { item: "Common", year: 2026, month: 1, plan: 5e9, actual: 7e9 },
      { item: "Expense 1", year: 2026, month: 1, plan: 1e9, actual: null },
      { item: "Contingency", year: 2026, month: 1, plan: 4e9, actual: 1e9 },
    ];

    const parsed = await parseProjectDetailWorkbook(await workbookFile(workbook), existing, FX_RATE_VND, undefined, "시공");
    const find = (item: string) => parsed.costBudgetMonthly?.find((r) => r.item === item && r.year === 2026 && r.month === 1);

    expect(find("Common")).toMatchObject({ plan: 2e9, actual: 7e9 });
    expect(find("외주 건축")).toMatchObject({ plan: 1.5e9, actual: null });
    expect(find("외주 기계")).toBeUndefined();
    // 경비 = 외주 경비 + Expense 1 + Expense 2 → 외주 경비 = 3 - 1
    expect(find("외주 경비")?.plan).toBe(2e9);
    expect(find("Expense 1")?.plan).toBe(1e9);
    expect(find("Contingency")).toMatchObject({ plan: 4e9, actual: 1e9 });
  });
});
describe("project detail Excel download → upload round trip", () => {
  async function downloadAsFile(detail: ProjectDetail, sectionTitles: Record<string, string>): Promise<File> {
    let captured: Blob | null = null;
    const g = globalThis as unknown as { document?: unknown };
    const prevDocument = g.document;
    const prevCreate = URL.createObjectURL;
    const prevRevoke = URL.revokeObjectURL;
    g.document = { createElement: () => ({ click() {} }) };
    URL.createObjectURL = (blob: Blob) => {
      captured = blob;
      return "blob:test";
    };
    URL.revokeObjectURL = () => {};
    try {
      await downloadProjectDetailTemplate("TEST", detail, FX_RATE_VND, "시공", undefined, "ko", sectionTitles);
    } finally {
      g.document = prevDocument;
      URL.createObjectURL = prevCreate;
      URL.revokeObjectURL = prevRevoke;
    }
    return new File([await captured!.arrayBuffer()], "download.xlsx");
  }

  function sampleDetail(): ProjectDetail {
    const detail = emptyDetail();
    detail.overview.startDate = "2026-01-01";
    detail.overview.endDate = "2026-06-30";
    detail.progress = [{ year: 2026, month: 1, planPct: 1, actualPct: 0.5, planCumPct: 1, actualCumPct: 0.5 }];
    detail.costBudgetMonthly = [
      { item: "Common", year: 2026, month: 1, plan: 2_000_000_000, actual: 1_500_000_000 },
      { item: "외주 건축", year: 2026, month: 2, plan: 3_000_000_000, actual: null },
      { item: "외주 경비", year: 2026, month: 1, plan: 500_000_000, actual: 100_000_000 },
      { item: "Expense 1", year: 2026, month: 1, plan: 1_000_000_000, actual: 200_000_000 },
      { item: "Contingency", year: 2026, month: 1, plan: 4_000_000_000, actual: 1_000_000_000 },
    ];
    detail.salesMonthly = [{ year: 2026, month: 1, plan: 100, actual: 90 }];
    detail.cashflow = [{ year: 2026, month: 1, cashIn: 80, cashOut: 40, equivalent: 120, confirmedProgress: 20 }];
    return detail;
  }

  const sortRows = (rows: ProjectDetail["costBudgetMonthly"]) =>
    [...(rows ?? [])].sort((a, b) => `${a.item}${a.year}${a.month}`.localeCompare(`${b.item}${b.year}${b.month}`));

  for (const [name, titles] of [
    ["with web section banners (as ProjectDashboard sends)", {
      overview: "0. Overview", progress: "1. Progress", milestones: "3. Milestones", costEstimation: "5. Cost Rate",
      costBudget: "6. Budget", outsourcing: "7. Outsourcing", cashflow: "8. Cashflow", salesMonthly: "2. Sales",
    }],
    ["with a banner on every sheet", {
      overview: "0", progress: "1", milestones: "3", costEstimation: "5", costBudget: "6",
      outsourcing: "7", cashflow: "8", salesMonthly: "2", costBudgetMonthly: "4. 공정별 원가 계획/실적",
    }],
    ["without banners", {}],
  ] as const) {
    it(`re-uploads an unmodified download without changing cost data (${name})`, async () => {
      const detail = sampleDetail();
      const parsed = await parseProjectDetailWorkbook(await downloadAsFile(detail, titles), detail, FX_RATE_VND, undefined, "시공");
      expect(sortRows(parsed.costBudgetMonthly)).toEqual(sortRows(detail.costBudgetMonthly));
      expect(parsed.cashflow[0]).toMatchObject({ cashIn: 80, cashOut: 40 });
    });
  }

  it("applies a plan typed into the downloaded sheet 4", async () => {
    const detail = sampleDetail();
    const file = await downloadAsFile(detail, {});
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const ws = wb.worksheets.find((s) => s.name.startsWith("4."))!;
    // 2행 = 2026년 1월. 기계 계획(7열) = 1.25 Bil.VND 입력, 경비 계획(15열) = 2 Bil.VND로 수정
    expect(ws.getRow(2).getCell(1).value).toBe(2026);
    expect(ws.getRow(2).getCell(15).value).toBe(1.5); // 외주 경비 0.5 + Expense 1 1.0
    ws.getRow(2).getCell(7).value = 1.25;
    ws.getRow(2).getCell(15).value = 2;
    const edited = await workbookFile(wb);

    const parsed = await parseProjectDetailWorkbook(edited, detail, FX_RATE_VND, undefined, "시공");
    const find = (item: string) => parsed.costBudgetMonthly?.find((r) => r.item === item && r.year === 2026 && r.month === 1);
    expect(find("외주 기계")?.plan).toBe(1_250_000_000);
    expect(find("외주 경비")?.plan).toBe(1_000_000_000);
    expect(find("Expense 1")?.plan).toBe(1_000_000_000);
    expect(find("Contingency")).toMatchObject({ plan: 4_000_000_000, actual: 1_000_000_000 });
  });
});
