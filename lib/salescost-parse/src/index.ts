import ExcelJS from "exceljs";
import { Readable } from "node:stream";

// 매출/원가 Excel parser (shared by CLI importer and API server upload).
// NOTE: 이 워크북은 ExcelJS 전체 로드(wb.xlsx.load) 시 defined-name tables로 인해
// Node 기본 힙이 OOM된다. 스트리밍 리더(피크 ~130MB)로 행 단위 파싱.
// 스트리밍 모드는 병합 셀 값을 채워주지 않으므로 alloc 시트의 Site 레이블은
// 마지막 비어있지 않은 값을 carry-forward한다.
// 시트 순서 독립성: Alloc 시트를 선 버퍼링 후 Summary 파싱 완료 후 처리한다.
//
// Sheets:
//   `Summary <year>` — Revenue/COGS/REPAIRING COST ALLOWANCE 섹션
//     col1=SITE코드, col2=카테고리, col3=사업유형, col4=현장명
//     VND: cols 5..16 (월1..12), 1000USD: cols 19..30 (repair 섹션: USD 없음)
//   `원가이체, 판관비 배부현황(1000USD)` — 현장원가/본사이체원가/판관비/인원수
//     col1=Site label, col2=항목명, cols 3..14 = 1000USD 월1..12

export class SalescostParseError extends Error {}

const ALLOC_SHEET = "원가이체, 판관비 배부현황(1000USD)";

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (o.richText) return (o.richText as { text: string }[]).map((t) => t.text).join("");
    if (typeof o.result === "string") return o.result;
    return "";
  }
  return String(v);
}

function cellNumber(v: ExcelJS.CellValue): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (typeof o.result === "number" && Number.isFinite(o.result)) return o.result;
    return null; // formula errors like #DIV/0!
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const round2 = (n: number) => Math.round(n * 100) / 100;

export type SiteRec = {
  code: string;
  name: string;
  category: string | null;
  bizType: string | null;
  sortOrder: number;
};

export type AmountRec = {
  code: string;
  metric: string;
  month: number;
  amountVnd: number | null;
  amountUsd: number | null;
};

export interface ParsedSalescost {
  year: number;
  sites: SiteRec[];
  amounts: AmountRec[];
}

const METRIC_BY_LABEL: Record<string, string> = {
  현장원가: "site_cost",
  본사이체원가: "hq_transfer",
  판관비: "sga",
  인원수: "employees",
  "아국인 인원수": "employees",
};

// Buffered alloc row: raw code candidate + label + 12 monthly USD values
type AllocRowBuf = {
  codeCandidate: string | null; // non-null only when this row changes the current site
  label: string;
  usd: (number | null)[];
};

async function parseStream(
  source: string | Readable,
  year: number,
): Promise<ParsedSalescost> {
  const summarySheet = `Summary ${year}`;

  const sites = new Map<string, SiteRec>();
  const summaryAmounts: AmountRec[] = [];
  let sortOrder = 0;
  let summaryFound = false;
  let allocFound = false;

  // Buffer for alloc rows — collected during streaming, processed after Summary is complete
  const allocBuf: AllocRowBuf[] = [];

  const ensureSite = (
    code: string,
    name: string,
    category: string | null,
    bizType: string | null,
  ) => {
    const existing = sites.get(code);
    if (!existing) {
      sites.set(code, { code, name, category, bizType, sortOrder: sortOrder++ });
    } else {
      if (!existing.category && category) existing.category = category;
      if (!existing.bizType && bizType) existing.bizType = bizType;
    }
  };

  const reader = new ExcelJS.stream.xlsx.WorkbookReader(source as string, {
    entries: "emit",
    sharedStrings: "cache",
    styles: "ignore",
    hyperlinks: "ignore",
    worksheets: "emit",
  });

  for await (const ws of reader) {
    const wsName = (ws as unknown as { name?: string }).name;

    if (wsName === summarySheet) {
      summaryFound = true;
      let section: "revenue" | "cogs" | "repair_allowance" | null = null;

      for await (const row of ws) {
        const label = norm(cellText(row.getCell(4).value));
        if (label === "Revenue") { section = "revenue"; continue; }
        if (label === "COGS") { section = "cogs"; continue; }
        if (label === "REPAIRING COST ALLOWANCE") { section = "repair_allowance"; continue; }
        if (label === "ER") { section = null; continue; }
        if (!section) continue;

        const code = norm(cellText(row.getCell(1).value));
        if (!/^SITE\d+$/i.test(code)) continue;
        const category = norm(cellText(row.getCell(2).value)) || null;
        const bizType = norm(cellText(row.getCell(3).value)) || null;
        const desc = norm(cellText(row.getCell(4).value));
        const name = desc.replace(/^SITE\d+\s*-\s*/i, "") || desc;
        ensureSite(code.toUpperCase(), name, category, bizType);

        for (let m = 1; m <= 12; m++) {
          const vnd = cellNumber(row.getCell(4 + m).value); // cols 5..16
          const usd = cellNumber(row.getCell(18 + m).value); // cols 19..30 (repair: USD absent)
          if ((vnd == null || vnd === 0) && (usd == null || usd === 0)) continue;
          summaryAmounts.push({
            code: code.toUpperCase(),
            metric: section,
            month: m,
            amountVnd: vnd ?? null,
            amountUsd: usd ?? null,
          });
        }
      }
    } else if (wsName === ALLOC_SHEET) {
      allocFound = true;
      // Buffer raw rows; col1 merged-cell carry-forward is handled during replay below
      let currentCode: string | null = null;

      for await (const row of ws) {
        const siteLabel = cellText(row.getCell(1).value);
        const m = /Site\s*(\d+)/i.exec(siteLabel);
        const codeCandidate = m ? `SITE${m[1].padStart(2, "0")}` : null;
        if (codeCandidate) currentCode = codeCandidate;

        const label = norm(cellText(row.getCell(2).value)).split("(")[0].trim();
        const usd: (number | null)[] = [];
        for (let mo = 1; mo <= 12; mo++) {
          usd.push(cellNumber(row.getCell(2 + mo).value)); // cols 3..14
        }
        // Only buffer rows that have a site context and a known label
        if (!currentCode) continue;
        allocBuf.push({ codeCandidate, label, usd });
      }
    } else {
      // Drain unrelated sheets so the reader can advance
      for await (const _ of ws) { /* drain */ }
    }
  }

  if (!summaryFound) {
    throw new SalescostParseError(
      `'${summarySheet}' 시트를 찾을 수 없습니다. 대상 연도가 맞는지, 매출/원가 취합 양식이 맞는지 확인해 주세요.`,
    );
  }
  if (!allocFound) {
    throw new SalescostParseError(
      `'${ALLOC_SHEET}' 시트를 찾을 수 없습니다. 매출/원가 취합 양식이 맞는지 확인해 주세요.`,
    );
  }

  // Replay buffered alloc rows now that `sites` is fully populated
  const allocAmounts: AmountRec[] = [];
  let replayCode: string | null = null;
  for (const row of allocBuf) {
    if (row.codeCandidate) replayCode = row.codeCandidate;
    if (!replayCode || !sites.has(replayCode)) continue;

    const metric = METRIC_BY_LABEL[row.label];
    if (!metric) continue;

    for (let mo = 0; mo < 12; mo++) {
      const usd = row.usd[mo];
      if (usd == null || usd === 0) continue;
      allocAmounts.push({ code: replayCode, metric, month: mo + 1, amountVnd: null, amountUsd: usd });
    }
  }

  const amounts = [...summaryAmounts, ...allocAmounts];

  if (sites.size === 0) {
    throw new SalescostParseError(
      "현장(SITE)을 하나도 찾지 못했습니다. Summary 시트 1열에 SITE 코드가 있는지 확인해 주세요.",
    );
  }
  if (amounts.length === 0) {
    throw new SalescostParseError(
      "월별 매출/원가 숫자를 찾지 못했습니다. Summary 시트의 값이 채워져 있는지 확인해 주세요.",
    );
  }

  return { year, sites: [...sites.values()], amounts };
}

export async function parseSalescostWorkbook(
  buffer: Buffer,
  year: number,
): Promise<ParsedSalescost> {
  try {
    return await parseStream(Readable.from(buffer), year);
  } catch (err) {
    if (err instanceof SalescostParseError) throw err;
    throw new SalescostParseError(
      "Excel 파일을 열 수 없습니다. .xlsx 형식의 파일인지 확인해 주세요.",
    );
  }
}

export async function parseSalescostFile(
  filePath: string,
  year: number,
): Promise<ParsedSalescost> {
  try {
    return await parseStream(filePath, year);
  } catch (err) {
    if (err instanceof SalescostParseError) throw err;
    throw new SalescostParseError(
      "Excel 파일을 열 수 없습니다. .xlsx 형식의 파일인지 확인해 주세요.",
    );
  }
}

export function buildSalescostPreview(parsed: ParsedSalescost) {
  const usdSum = (metric: string) =>
    round2(
      parsed.amounts
        .filter((a) => a.metric === metric && a.amountUsd != null)
        .reduce((s, a) => s + (a.amountUsd ?? 0), 0),
    );
  const sites = parsed.sites.map((s) => {
    const rows = parsed.amounts.filter((a) => a.code === s.code);
    return {
      code: s.code,
      name: s.name,
      revenueUsdTotal: round2(
        rows
          .filter((a) => a.metric === "revenue" && a.amountUsd != null)
          .reduce((x, a) => x + (a.amountUsd ?? 0), 0),
      ),
      cogsUsdTotal: round2(
        rows
          .filter((a) => a.metric === "cogs" && a.amountUsd != null)
          .reduce((x, a) => x + (a.amountUsd ?? 0), 0),
      ),
      amountCount: rows.length,
    };
  });
  return {
    year: parsed.year,
    unit: "천 USD",
    siteCount: parsed.sites.length,
    amountCount: parsed.amounts.length,
    totals: { revenueUsd: usdSum("revenue"), cogsUsd: usdSum("cogs") },
    sites,
  };
}
