export const TRADE_COST_ITEMS = [
  "외주 건축",
  "외주 기계",
  "외주 전기",
  "외주 토목",
  "외주 조경",
  "외주 경비",
] as const;

export type TradeCostItem = (typeof TRADE_COST_ITEMS)[number];

const TRADE_KEYWORDS: Array<{
  item: TradeCostItem;
  patterns: RegExp[];
}> = [
  { item: "외주 건축", patterns: [/건축/i, /\barchitect/i, /\bbuilding\b/i] },
  { item: "외주 기계", patterns: [/기계/i, /\bmechanic/i, /cơ khí/i] },
  { item: "외주 전기", patterns: [/전기/i, /\belectric/i, /\bđiện\b/i] },
  { item: "외주 토목", patterns: [/토목/i, /\bcivil\b/i, /hạ tầng/i] },
  { item: "외주 조경", patterns: [/조경/i, /\blandscap/i, /cảnh quan/i] },
  { item: "외주 경비", patterns: [/경비/i, /\bsecurity\b/i, /\bguard\b/i, /bảo vệ/i] },
];

/**
 * Maps only explicit trade names. Ambiguous or unknown labels return null and
 * are shown as unmapped in preview instead of receiving an estimated share.
 */
export function mapPimsvinaTradeItem(rawTrade: unknown): TradeCostItem | null {
  const trade = String(rawTrade ?? "").trim();
  if (!trade) return null;
  const matches = TRADE_KEYWORDS.filter(({ patterns }) =>
    patterns.some((pattern) => pattern.test(trade)),
  );
  return matches.length === 1 ? matches[0].item : null;
}

export function parsePimsvinaKusd(value: unknown): number | null {
  if (value == null || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function preservePimsvinaActualSource(
  existingSource: string | null | undefined,
  existingActual: string | number | null | undefined,
  incomingActual: string | number | null | undefined,
): string | null {
  if (existingSource !== "pimsvina") return null;
  const before = existingActual == null ? null : Number(existingActual);
  const after = incomingActual == null ? null : Number(incomingActual);
  if (before == null || after == null || !Number.isFinite(before) || !Number.isFinite(after)) {
    return before === after ? "pimsvina" : null;
  }
  return Math.abs(before - after) <= 0.00000001 ? "pimsvina" : null;
}

export type TradeCostIdentity = {
  projectName: string;
  item: string;
  year: number;
  month: number;
};

export function tradeCostKey(row: TradeCostIdentity): string {
  return `${row.projectName}|${row.item}|${row.year}|${row.month}`;
}

export function tradeCostScope(
  row: Pick<TradeCostIdentity, "projectName" | "year">,
): string {
  return `${row.projectName}|${row.year}`;
}

export function findStalePimsvinaTradeCosts<T extends TradeCostIdentity & {
  actualSource?: string | null;
}>(
  existingRows: T[],
  incomingKeys: Set<string>,
  authoritativeScopes: Set<string>,
  snapshotComplete = true,
): T[] {
  if (!snapshotComplete) return [];
  return existingRows.filter(
    (row) =>
      row.actualSource === "pimsvina" &&
      authoritativeScopes.has(tradeCostScope(row)) &&
      !incomingKeys.has(tradeCostKey(row)),
  );
}

export function sumPimsvinaKusdValues(values: unknown[]): number | null {
  let total = 0;
  for (const value of values) {
    const parsed = parsePimsvinaKusd(value);
    if (parsed == null) return null;
    total += parsed;
  }
  return total;
}