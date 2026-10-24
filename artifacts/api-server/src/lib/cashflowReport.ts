import { queryOracle } from "./oraclePool";

/**
 * PIMSVINA "Cash Flow > Report > Cash Flow Report" (Level = Summary/Detail)와 같은 숫자를 경영현황판
 * 자금수지 팝업에 그대로 보여주기 위한 조회/집계.
 *
 * SQL은 pimsvina 저장소 site/jsp/cf/report/cf_report_cashflowreport_q_2q.jsp에서 사용자 권한
 * (AUTH_SITE/AUTH_COMPANY) 조건과 코멘트 컬럼만 뺀 것이다 — 금액/분류/환율 규칙은 원문 그대로이므로
 * JSP 쪽 SQL이 바뀌면 여기도 같이 맞춰야 한다. 화면 측 규칙(cf_report_cashflowreport_q.xfdl):
 *   - Actual Month 이하 달 = ACTUAL(거래 EQ.USD, USD 단위), 이후 달 = 승인(PLANSTATUS='A')된 PLAN(천 USD 단위)
 *   - Cash Balance = INITIALBALANCE(기초 잔액) + 월별 (Income - Outcome) 누계, 월말 값
 *   - Total = 모든 Group Business Line(Business Activities / Financing and Investment Activities /
 *     HQ Admin Expenses / Development) 합계
 * 예전 팝업은 자금수지 Excel(cf_*)의 프로젝트 행(= Business Activities)만 합산해서 Total과 달랐다.
 */

/** DECV (CATB_COMPANYSTRUCT.COMPCODE) — 경영현황판 "DECV 전체" 범위 */
export const DECV_COMPANY_CODE = "COMP0001";

const LOCKED_YYMM = (alias: string) =>
  `(SELECT MAX(L.YYMM) FROM CHTB_EXCHANGE_RATIO L WHERE L.EXCHANGE_TYPE='.' AND NVL(L.LOCKYN, 'N')='Y' AND L.YYMM<=SUBSTR(${alias}.TRANSACTIONDATE,1,6))`;

const USD_AMOUNT = (alias: string) =>
  `ROUND(CASE UPPER(NVL(${alias}.CURRENCY, 'VND'))
     WHEN 'USD' THEN NVL(${alias}.AMOUNT, 0)
     WHEN 'VND' THEN ${alias}.AMOUNT / NULLIF((SELECT MAX(R.CHGRATIO) FROM CHTB_EXCHANGE_RATIO R WHERE R.EXCHANGE_TYPE='.' AND R.YYMM=${LOCKED_YYMM(alias)} AND R.BASEMONEY='VND' AND R.CHGMONEY='USD'), 0)
     ELSE ${alias}.AMOUNT * (SELECT MAX(R.CHGRATIO) FROM CHTB_EXCHANGE_RATIO R WHERE R.EXCHANGE_TYPE='.' AND R.YYMM=${LOCKED_YYMM(alias)} AND R.BASEMONEY='VND' AND R.CHGMONEY=UPPER(${alias}.CURRENCY))
          / NULLIF((SELECT MAX(U.CHGRATIO) FROM CHTB_EXCHANGE_RATIO U WHERE U.EXCHANGE_TYPE='.' AND U.YYMM=${LOCKED_YYMM(alias)} AND U.BASEMONEY='VND' AND U.CHGMONEY='USD'), 0) END, 2)`;

// AMOUNT는 모두 USD로 맞춘다(PLAN은 천 USD로 입력되므로 x1000).
const REPORT_ROWS_SQL = `
SELECT SOURCE, FISCALYEAR, MONTHNO, GROUPCODE, GROUPNAME, CLS, SITE, SITENAME, TYPENAME, CATEGORY, SUM(AMOUNT) AS AMOUNT FROM (
  SELECT 'PLAN' AS SOURCE, D.FISCALYEAR, D.MONTHNO, NVL(G.BUSILINECODE, B.BUSILINECODE) AS GROUPCODE, NVL(G.BUSILINENAME, B.BUSILINENAME) AS GROUPNAME,
         CASE UPPER(NVL(B.CLASSIFICATION, '')) WHEN 'ADMIN' THEN 'ADMIN' WHEN 'FINANCE' THEN 'FINANCE' ELSE 'BUSINESS' END AS CLS,
         D.FLDCODE AS SITE, CASE WHEN D.FLDCODE LIKE 'GEN_%' THEN 'General' ELSE FUN_GET_FLDNAME(D.FLDCODE) END AS SITENAME,
         NVL(T.CASHFLOWTYPENAME, D.CASHFLOWTYPECODE) AS TYPENAME, D.CASHFLOWCATEGORY AS CATEGORY, D.AMOUNT * 1000 AS AMOUNT
    FROM (SELECT P.FISCALYEAR, P.FLDCODE, P.BUSILINECODE, P.CASHFLOWTYPECODE, P.CASHFLOWCATEGORY, M.MONTHNO,
                 CASE M.MONTHNO WHEN 1 THEN NVL(P.M01, 0) WHEN 2 THEN NVL(P.M02, 0) WHEN 3 THEN NVL(P.M03, 0) WHEN 4 THEN NVL(P.M04, 0) WHEN 5 THEN NVL(P.M05, 0) WHEN 6 THEN NVL(P.M06, 0)
                                WHEN 7 THEN NVL(P.M07, 0) WHEN 8 THEN NVL(P.M08, 0) WHEN 9 THEN NVL(P.M09, 0) WHEN 10 THEN NVL(P.M10, 0) WHEN 11 THEN NVL(P.M11, 0) WHEN 12 THEN NVL(P.M12, 0) END AS AMOUNT
            FROM CFTB_CASHFLOWPLAND P JOIN CFTB_CASHFLOWPLANH H ON H.FISCALYEAR = P.FISCALYEAR AND H.FLDCODE = P.FLDCODE AND NVL(H.PLANSTATUS, 'D') = 'A'
                 CROSS JOIN (SELECT LEVEL AS MONTHNO FROM DUAL CONNECT BY LEVEL <= 12) M) D
         JOIN CATB_COMPANYSTRUCT_BUSILINE CB ON CB.BUSILINECODE = D.BUSILINECODE AND NVL(CB.USEYN, 'Y') = 'Y'
         JOIN CATB_BUSILINE B ON B.BUSILINECODE = D.BUSILINECODE
         LEFT JOIN CATB_BUSILINE G ON G.BUSILINECODE = B.UPPERBUSILINECODE AND NVL(G.GRPYN, '0') IN ('Y', '1')
         LEFT JOIN CFTB_CASHFLOWTYPE T ON T.CASHFLOWTYPECODE = D.CASHFLOWTYPECODE
   WHERE CB.COMPCODE = :company AND D.FISCALYEAR BETWEEN :fromYear AND :toYear
     AND D.CASHFLOWTYPECODE IS NOT NULL AND SUBSTR(D.CASHFLOWTYPECODE, 1, 3) <> '__G'
     AND (D.FLDCODE LIKE 'GEN_%' OR EXISTS (SELECT 1 FROM CATB_COMPANYSTRUCT_PROJECT P WHERE P.COMPCODE = CB.COMPCODE AND P.FLDCODE = D.FLDCODE AND NVL(P.USEYN, 'Y') = 'Y'))
  UNION ALL
  SELECT 'ACTUAL', SUBSTR(X.TRANSACTIONDATE, 1, 4), TO_NUMBER(SUBSTR(X.TRANSACTIONDATE, 5, 2)), NVL(G.BUSILINECODE, B.BUSILINECODE), NVL(G.BUSILINENAME, B.BUSILINENAME), 'BUSINESS',
         X.SITE, FUN_GET_FLDNAME(X.SITE), NVL(X.CASHFLOWTYPENAME, T.CASHFLOWTYPENAME), DECODE(X.DEPOSITWITHDRAWAL, 'Income', 'INC', 'OUT'), ${USD_AMOUNT("X")}
    FROM CFTB_CFTRANSACTION X JOIN CFTB_CASHFLOWTYPE T ON T.CASHFLOWTYPECODE = X.CASHFLOWTYPE
         JOIN CATB_COMPANYSTRUCT_PROJECT P ON P.COMPCODE = X.COMPANY AND P.FLDCODE = X.SITE AND NVL(P.USEYN, 'Y') = 'Y'
         JOIN CATB_BUSILINE B ON B.BUSILINECODE = P.BUSILINECODE
         LEFT JOIN CATB_BUSILINE G ON G.BUSILINECODE = B.UPPERBUSILINECODE AND NVL(G.GRPYN, '0') IN ('Y', '1')
   WHERE X.COMPANY = :company AND SUBSTR(X.TRANSACTIONDATE, 1, 4) BETWEEN :fromYear AND :toYear
     AND UPPER(NVL(T.DISPLAYCASHFLOWREPORT, 'BUSILINE')) IN ('BUSILINE', 'BOTH') AND UPPER(NVL(B.CLASSIFICATION, '')) IN ('SITE', 'BUSILINE')
  UNION ALL
  SELECT 'ACTUAL', SUBSTR(X.TRANSACTIONDATE, 1, 4), TO_NUMBER(SUBSTR(X.TRANSACTIONDATE, 5, 2)), NVL(G.BUSILINECODE, B.BUSILINECODE), NVL(G.BUSILINENAME, B.BUSILINENAME), 'ADMIN',
         '', '', NVL(X.CASHFLOWTYPENAME, T.CASHFLOWTYPENAME), DECODE(X.DEPOSITWITHDRAWAL, 'Income', 'INC', 'OUT'), ${USD_AMOUNT("X")}
    FROM CFTB_CFTRANSACTION X JOIN CFTB_CASHFLOWTYPE T ON T.CASHFLOWTYPECODE = X.CASHFLOWTYPE
         JOIN CATB_COMPANYSTRUCT_BUSILINE CB ON CB.COMPCODE = X.COMPANY AND NVL(CB.USEYN, 'Y') = 'Y' JOIN CATB_BUSILINE B ON B.BUSILINECODE = CB.BUSILINECODE
         LEFT JOIN CATB_BUSILINE G ON G.BUSILINECODE = B.UPPERBUSILINECODE AND NVL(G.GRPYN, '0') IN ('Y', '1')
   WHERE X.COMPANY = :company AND SUBSTR(X.TRANSACTIONDATE, 1, 4) BETWEEN :fromYear AND :toYear
     AND UPPER(NVL(T.DISPLAYCASHFLOWREPORT, '')) = 'ADMIN' AND UPPER(NVL(B.CLASSIFICATION, '')) LIKE 'ADMIN%'
  UNION ALL
  SELECT 'ACTUAL', SUBSTR(X.TRANSACTIONDATE, 1, 4), TO_NUMBER(SUBSTR(X.TRANSACTIONDATE, 5, 2)), NVL(G.BUSILINECODE, B.BUSILINECODE), NVL(G.BUSILINENAME, B.BUSILINENAME), 'FINANCE',
         '', '', NVL(X.CASHFLOWTYPENAME, T.CASHFLOWTYPENAME), DECODE(X.DEPOSITWITHDRAWAL, 'Income', 'INC', 'OUT'), ${USD_AMOUNT("X")}
    FROM CFTB_CFTRANSACTION X JOIN CFTB_CASHFLOWTYPE T ON T.CASHFLOWTYPECODE = X.CASHFLOWTYPE
         JOIN CATB_COMPANYSTRUCT_BUSILINE CB ON CB.COMPCODE = X.COMPANY AND NVL(CB.USEYN, 'Y') = 'Y' JOIN CATB_BUSILINE B ON B.BUSILINECODE = CB.BUSILINECODE
         LEFT JOIN CATB_BUSILINE G ON G.BUSILINECODE = B.UPPERBUSILINECODE AND NVL(G.GRPYN, '0') IN ('Y', '1')
   WHERE X.COMPANY = :company AND SUBSTR(X.TRANSACTIONDATE, 1, 4) BETWEEN :fromYear AND :toYear
     AND UPPER(NVL(T.DISPLAYCASHFLOWREPORT, '')) IN ('FININVEST', 'BOTH') AND (UPPER(NVL(B.CLASSIFICATION, '')) IN ('FINANCE', 'FININVEST') OR UPPER(B.BUSILINENAME) LIKE 'FINANC%')
) SRC
GROUP BY SOURCE, FISCALYEAR, MONTHNO, GROUPCODE, GROUPNAME, CLS, SITE, SITENAME, TYPENAME, CATEGORY`;

// cf_report_cashflowreport_q_2q.jsp output2(INITIALBALANCE)와 동일 — 회사 기준(Site 필터 없음).
const OPENING_BALANCE_SQL = `
SELECT NVL((SELECT SUM(NVL(O.TOTALUSD, 0)) FROM CFTB_OPENINGBALANCE O
              JOIN CATB_COMPANYSTRUCT C ON (O.COMPANYNAME = C.COMPNAME OR O.COMPANYNAME = NVL(C.SHORTNAME, C.COMPNAME))
             WHERE C.COMPCODE = :company
               AND O.OPENINGDATE = (SELECT MAX(O2.OPENINGDATE) FROM CFTB_OPENINGBALANCE O2 WHERE O2.FLDCODE = O.FLDCODE AND O2.OPENINGDATE <= :fromDate)), 0)
     + NVL((SELECT SUM(CASE WHEN T.DEPOSITWITHDRAWAL = 'Income' THEN ${USD_AMOUNT("T")} ELSE -(${USD_AMOUNT("T")}) END)
              FROM CFTB_CFTRANSACTION T
              JOIN CATB_COMPANYSTRUCT_PROJECT P ON P.COMPCODE = T.COMPANY AND P.FLDCODE = T.SITE AND NVL(P.USEYN, 'Y') = 'Y' AND P.COMPCODE = :company
             WHERE T.TRANSACTIONDATE >= (SELECT MIN(O.OPENINGDATE) FROM CFTB_OPENINGBALANCE O
                                           JOIN CATB_COMPANYSTRUCT C ON (O.COMPANYNAME = C.COMPNAME OR O.COMPANYNAME = NVL(C.SHORTNAME, C.COMPNAME))
                                          WHERE C.COMPCODE = :company AND O.OPENINGDATE <= :fromDate)
               AND T.TRANSACTIONDATE < :fromDate), 0) AS INITIALBALANCE
  FROM DUAL`;

export interface CashflowReportRow {
  source: "PLAN" | "ACTUAL";
  year: number;
  month: number;
  groupCode: string;
  groupName: string;
  cls: "BUSINESS" | "ADMIN" | "FINANCE";
  site: string;
  siteName: string;
  typeName: string;
  category: "INC" | "OUT";
  /** USD */
  amount: number;
}

export interface CashflowReportMonthAmount {
  month: string;
  income: number;
  outcome: number;
}

export interface CashflowReportSummary {
  unit: string;
  company: string;
  actualMonth: string;
  openingBalance: number;
  total: Array<CashflowReportMonthAmount & { balance: number; isActual: boolean }>;
  groups: Array<{
    code: string;
    name: string;
    months: CashflowReportMonthAmount[];
    details: Array<{ key: string; label: string; months: CashflowReportMonthAmount[] }>;
  }>;
}

const ym = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;
const toK = (usd: number) => Math.round(usd / 10) / 100; // USD → 천 USD (소수 2자리)

/** 조회 구간(요청 월들)과, 잔액 누계를 위해 시작 연도 1월부터의 전체 월 목록 */
function monthKeys(fromYear: number, fromMonth: number, months: number) {
  const requested: string[] = [];
  let y = fromYear;
  let m = fromMonth;
  for (let i = 0; i < months; i++) {
    requested.push(ym(y, m));
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  const all: string[] = [];
  const last = requested[requested.length - 1];
  for (let idx = fromYear * 12; ; idx++) {
    const key = ym(Math.floor(idx / 12), (idx % 12) + 1);
    if (key > last) break;
    all.push(key);
  }
  return { requested, all, toYear: Number(last.slice(0, 4)) };
}

/** 순수 집계 — Oracle 결과 행 + 기초 잔액(USD)으로 응답을 만든다(테스트 가능하도록 분리). */
export function buildCashflowReportSummary(args: {
  rows: CashflowReportRow[];
  openingBalanceUsd: number;
  fromYear: number;
  fromMonth: number;
  months: number;
  actualMonth: string;
  company?: string;
}): CashflowReportSummary {
  const { rows, openingBalanceUsd, fromYear, fromMonth, months, actualMonth } = args;
  const { requested, all } = monthKeys(fromYear, fromMonth, months);
  const requestedSet = new Set(requested);
  const isPast = (key: string) => key <= actualMonth;

  // 화면과 같은 규칙: 과거(<= Actual Month) 달은 ACTUAL만, 미래 달은 PLAN만 쓴다.
  const used = rows.filter((r) => (r.source === "ACTUAL") === isPast(ym(r.year, r.month)));

  const totalByMonth = new Map<string, { inc: number; out: number }>();
  type Acc = { name: string; months: Map<string, { inc: number; out: number }> };
  const groups = new Map<string, Acc & { details: Map<string, Acc> }>();
  const add = (map: Map<string, { inc: number; out: number }>, key: string, r: CashflowReportRow) => {
    const rec = map.get(key) ?? { inc: 0, out: 0 };
    if (r.category === "INC") rec.inc += r.amount;
    else rec.out += r.amount;
    map.set(key, rec);
  };

  for (const r of used) {
    const key = ym(r.year, r.month);
    add(totalByMonth, key, r);
    // 그룹은 조회 연도에 행이 있으면 요청 구간에 금액이 없어도(예: Development는 11~12월 계획만 존재) 0으로
    // 보여준다 — PIMSVINA Summary 화면도 4개 그룹을 항상 표시한다.
    const group = groups.get(r.groupCode) ?? { name: r.groupName, months: new Map(), details: new Map() };
    groups.set(r.groupCode, group);
    if (!requestedSet.has(key)) continue;
    add(group.months, key, r);
    // 상세: 현장 단위 사업(Business Activities/Development)은 현장별, 본사 관리비/재무는 Cash Flow Type별
    // — PIMSVINA Detail 레벨 화면의 "Site" 열과 같은 단위.
    const byType = r.cls !== "BUSINESS" || !r.site;
    const detailKey = byType ? `type:${r.typeName}` : `site:${r.site}`;
    const detail = group.details.get(detailKey) ?? {
      name: byType ? r.typeName : r.siteName || r.site,
      months: new Map(),
    };
    add(detail.months, key, r);
    group.details.set(detailKey, detail);
  }

  const toMonths = (map: Map<string, { inc: number; out: number }>): CashflowReportMonthAmount[] =>
    requested.map((key) => {
      const rec = map.get(key) ?? { inc: 0, out: 0 };
      return { month: key, income: toK(rec.inc), outcome: toK(rec.out) };
    });

  // 잔액은 PIMSVINA 화면(ff_addCashBalanceRow)과 똑같이 천 USD 단위로 누계한다 — 기초 잔액과 실적 달의
  // Surplus는 천 단위로 반올림한 뒤 더하고, 계획 달은 원래 천 USD 입력값을 그대로 더한다. USD로 누계한 뒤
  // 마지막에 반올림하면 일부 달이 화면과 1씩 어긋난다.
  const roundK = (usd: number) => (usd < 0 ? -Math.round(Math.abs(usd) / 1000) : Math.round(usd / 1000));
  let running = roundK(openingBalanceUsd);
  const balanceByMonth = new Map<string, number>();
  for (const key of all) {
    const rec = totalByMonth.get(key) ?? { inc: 0, out: 0 };
    const surplusUsd = rec.inc - rec.out;
    running += isPast(key) ? roundK(surplusUsd) : surplusUsd / 1000;
    balanceByMonth.set(key, running);
  }

  const hasAmount = (months: CashflowReportMonthAmount[]) =>
    months.some((m) => m.income !== 0 || m.outcome !== 0);

  return {
    unit: "천 USD",
    company: args.company ?? "DECV",
    actualMonth,
    openingBalance: toK(openingBalanceUsd),
    total: toMonths(totalByMonth).map((p) => ({
      ...p,
      balance: Math.round((balanceByMonth.get(p.month) ?? 0) * 100) / 100,
      isActual: isPast(p.month),
    })),
    groups: [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, g]) => ({
        code,
        name: g.name,
        months: toMonths(g.months),
        details: [...g.details.entries()]
          .map(([key, d]) => ({ key, label: d.name, months: toMonths(d.months) }))
          .filter((d) => hasAmount(d.months))
          .sort((a, b) => a.label.localeCompare(b.label)),
      })),
  };
}

const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; value: CashflowReportSummary }>();

/** 현재 달(YYYY-MM) — PIMSVINA 화면의 Actual Month 기본값(ff_currentYYMM)과 동일 */
function currentYm(): string {
  const d = new Date();
  return ym(d.getFullYear(), d.getMonth() + 1);
}

export async function fetchCashflowReportSummary(params: {
  fromYear: number;
  fromMonth: number;
  months: number;
}): Promise<CashflowReportSummary> {
  const actualMonth = currentYm();
  const cacheKey = `${params.fromYear}-${params.fromMonth}-${params.months}-${actualMonth}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const { toYear } = monthKeys(params.fromYear, params.fromMonth, params.months);
  const [rawRows, openingRows] = await Promise.all([
    queryOracle(REPORT_ROWS_SQL, {
      company: DECV_COMPANY_CODE,
      fromYear: String(params.fromYear),
      toYear: String(toYear),
    }),
    queryOracle(OPENING_BALANCE_SQL, {
      company: DECV_COMPANY_CODE,
      fromDate: `${params.fromYear}0101`,
    }),
  ]);
  const rows: CashflowReportRow[] = rawRows.map((r) => ({
    source: r.source === "PLAN" ? "PLAN" : "ACTUAL",
    year: Number(r.fiscalyear),
    month: Number(r.monthno),
    groupCode: String(r.groupcode ?? ""),
    groupName: String(r.groupname ?? ""),
    cls: r.cls === "ADMIN" ? "ADMIN" : r.cls === "FINANCE" ? "FINANCE" : "BUSINESS",
    site: String(r.site ?? "").trim(),
    siteName: String(r.sitename ?? "").trim(),
    typeName: String(r.typename ?? "").trim(),
    category: r.category === "INC" ? "INC" : "OUT",
    amount: Number(r.amount) || 0,
  }));
  const value = buildCashflowReportSummary({
    rows,
    openingBalanceUsd: Number(openingRows[0]?.initialbalance) || 0,
    ...params,
    actualMonth,
  });
  cache.set(cacheKey, { at: Date.now(), value });
  return value;
}
