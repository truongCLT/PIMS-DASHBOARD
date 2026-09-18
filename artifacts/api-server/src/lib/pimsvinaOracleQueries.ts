/**
 * SQL lấy nguyên văn từ site/jsp/Common/dashboard/dashboard_*.jsp trong repo `pimsvina`
 * (d:\code\pimsvina) — dùng để query thẳng Oracle (PIMSVINA) thay vì gọi REST + JWT qua Tomcat.
 * Mỗi lần đồng bộ SQL phía JSP, phải copy lại đúng nguyên văn vào đây để tránh lệch dữ liệu.
 */

function currentYYYYMM(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export interface OracleEndpointQuery {
  sql: string;
  /** node-oracledb dùng named bind (:name), khác với `?` JDBC gốc trong JSP. */
  binds?: (params: Record<string, string>) => Record<string, unknown>;
}

export const ORACLE_DASHBOARD_QUERIES: Record<string, OracleEndpointQuery> = {
  "dashboard_pd_overview_1q.jsp": {
    // Chỉ lấy đúng 6 cột dùng trên UI (bỏ Client/Scale/Base Month/Scope/Revenue*/Cash*), không NVL
    // dự phòng giữa nhiều nguồn — Contract Amount lấy thẳng CBTB_CTRTSUMM, Start/End Date lấy thẳng
    // dòng CBTB_CONSTPERIOD mới nhất (CHGSEQ lớn nhất) theo từng dự án.
    sql: `SELECT
        A.FLDCODE AS FLDCODE,
        (SELECT MAX(FM.ACNT_FLDCODE) FROM CBTB_FLD_MAPPING FM WHERE FM.FLDCODE = A.FLDCODE) AS SITE_CODE,
        A.FLDNAME AS PROJECT_NAME,
        CT.TOTALCTRTWONAMT AS CONTRACT_AMOUNT,
        SUBSTR(NVL(CP.CTRTSTDATE, ''), 1, 4) || '-' || SUBSTR(NVL(CP.CTRTSTDATE, ''), 5, 2) || '-' || SUBSTR(NVL(CP.CTRTSTDATE, ''), 7, 2) AS START_DATE,
        SUBSTR(NVL(CP.CTRTEDDATE, ''), 1, 4) || '-' || SUBSTR(NVL(CP.CTRTEDDATE, ''), 5, 2) || '-' || SUBSTR(NVL(CP.CTRTEDDATE, ''), 7, 2) AS END_DATE
    FROM CBTB_FLDSUMM A
    LEFT JOIN CBTB_CTRTSUMM CT ON CT.FLDCODE = A.FLDCODE
    LEFT JOIN (
        SELECT FLDCODE, CTRTSTDATE, CTRTEDDATE
        FROM (SELECT P.*, ROW_NUMBER() OVER (PARTITION BY P.FLDCODE ORDER BY P.CHGSEQ DESC) AS RN FROM CBTB_CONSTPERIOD P)
        WHERE RN = 1
    ) CP ON CP.FLDCODE = A.FLDCODE
    ORDER BY SITE_CODE`,
  },

  "dashboard_pd_progress_1q.jsp": {
    // Công thức mới (thay thế công thức SRD §2-2 cũ): Monthly Actual (%) = SUM_COSTAMT / (SUM_BDGTAMT -
    // DIFF_BUDGET_VS_IMPLEMENTATION). SUM_BDGTAMT/SUM_COSTAMT lấy từ CHTB_PFMCOSTRMRK (RMRKLVL=1, đã verify
    // khớp màn hình "Cost Input Status by Execution Details"/"Cost Performance"), DIFF_BUDGET_VS_IMPLEMENTATION
    // = |SUM(Execution Budget) - SUM(Implementation Amount)| lấy từ CETB_PFMCTRTHIST (đã verify khớp màn hình
    // "Request Execution Resolution(Site)", chỉ lấy dòng CTRTCHGSEQ mới nhất mỗi ORDCONTTYPECODE - cờ TREE=0,
    // loại các ORDCONTTYPECODE có bản ghi CTRTTYPE='1' (현장)). Chỉ trả về đúng các cột: FLDCODE, SITE_CODE,
    // PROJECT_NAME, YEAR, MONTH, ACTUAL_PCT — KHÔNG còn PLAN_PCT/PLAN_CUM_PCT/ACTUAL_CUM_PCT (sync chỉ cập
    // nhật đúng actualPct, không đụng tới các trường luỹ kế/kế hoạch khác).
    sql: `WITH CTE_RMRK AS (
        SELECT A.FLDCODE, A.BASEYYMM, SUM(A.BDGTAMT) AS SUM_BDGTAMT
        FROM CHTB_PFMCOSTRMRK A
        WHERE A.RMRKLVL = 1
        GROUP BY A.FLDCODE, A.BASEYYMM
    ),
    CTE_COST AS (
        SELECT A.FLDCODE, A.BASEYYMM, SUM(A.COSTAMT) AS SUM_COSTAMT
        FROM CHTB_PFMCOSTRMRK A
        WHERE A.RMRKLVL = 1
        GROUP BY A.FLDCODE, A.BASEYYMM
    ),
    CTE_DIFF AS (
        SELECT FLDCODE, ABS(SUM(EXECUTION_BUDGET) - SUM(IMPLEMENTATION_AMT)) AS DIFF_BUDGET_VS_IMPLEMENTATION
        FROM (
            SELECT
                CASE WHEN COUNT(*) OVER (PARTITION BY A.FLDCODE, NVL(A.ORDCONTTYPECODE, 'X')) = 1 OR
                          MAX(NVL(B.CTRTCHGSEQ, 0)) OVER (PARTITION BY A.FLDCODE, NVL(A.ORDCONTTYPECODE, 'X')) = NVL(B.CTRTCHGSEQ, 0)
                     THEN 0 ELSE 1 END AS TREE,
                A.FLDCODE,
                B.BDGTAMT AS EXECUTION_BUDGET,
                B.CTRTAMT AS IMPLEMENTATION_AMT
            FROM CDTB_ORDCONTTYPE A, CETB_PFMCTRTHIST B
            WHERE A.FLDCODE = B.FLDCODE(+)
              AND A.ORDCONTTYPECODE = B.ORDCONTTYPECODE(+)
              AND NOT EXISTS (
                      SELECT 1 FROM CETB_PFMCTRTHIST
                      WHERE FLDCODE = A.FLDCODE AND ORDCONTTYPECODE = A.ORDCONTTYPECODE AND CTRTTYPE = '1'
                  )
        )
        WHERE TREE = 0
        GROUP BY FLDCODE
    ),
    CTE_MONTHLY AS (
        SELECT R.FLDCODE, R.BASEYYMM,
               C.SUM_COSTAMT / NULLIF(R.SUM_BDGTAMT - D.DIFF_BUDGET_VS_IMPLEMENTATION, 0) AS ACTUAL_PCT
        FROM CTE_RMRK R
        JOIN CTE_COST C ON C.FLDCODE = R.FLDCODE AND C.BASEYYMM = R.BASEYYMM
        JOIN CTE_DIFF D ON D.FLDCODE = R.FLDCODE
    )
    SELECT
        M.FLDCODE AS FLDCODE,
        (SELECT MAX(FM.ACNT_FLDCODE) FROM CBTB_FLD_MAPPING FM WHERE FM.FLDCODE = M.FLDCODE) AS SITE_CODE,
        FUN_GET_FLDNAME(M.FLDCODE) AS PROJECT_NAME,
        TO_NUMBER(SUBSTR(M.BASEYYMM, 1, 4)) AS YEAR,
        TO_NUMBER(SUBSTR(M.BASEYYMM, 5, 2)) AS MONTH,
        ROUND(M.ACTUAL_PCT * 100, 4) AS ACTUAL_PCT
    FROM CTE_MONTHLY M
    ORDER BY PROJECT_NAME, M.BASEYYMM`,
  },

  "dashboard_pd_outsourcing_1q.jsp": {
    sql: `SELECT
        B.FLDCODE AS FLDCODE,
        (SELECT MAX(FM.ACNT_FLDCODE) FROM CBTB_FLD_MAPPING FM WHERE FM.FLDCODE = B.FLDCODE) AS SITE_CODE,
        FUN_GET_FLDNAME(B.FLDCODE) AS PROJECT_NAME,
        T.SVCDVSCODE               AS TRADE_GROUP,
        T.ORDCONTTYPENAME          AS TRADE,
        FUN_GET_CTRT_CUST_INFO('2', B.FLDCODE, B.ORDCONTTYPECODE, B.CTRTCHGSEQ) AS VENDOR,
        T.SVCDVSCODE               AS CATEGORY,
        CASE WHEN LENGTH(B.CNSTDATE) = 8 THEN SUBSTR(B.CNSTDATE, 1, 4) || '-' || SUBSTR(B.CNSTDATE, 5, 2) || '-' || SUBSTR(B.CNSTDATE, 7, 2)
             ELSE B.CNSTDATE END AS CONTRACT_DATE,
        (SELECT NVL(SUM(TO_NUMBER(NVL(Z.CONTCHGYN, '0'))), 0)
         FROM CETB_PFMCTRTHIST Z
         WHERE Z.FLDCODE = B.FLDCODE
           AND Z.ORDCONTTYPECODE = B.ORDCONTTYPECODE
           AND Z.CTRTCHGSEQ <= B.CTRTCHGSEQ) AS CHANGE_NO,
        NVL(B.BDGTAMT, 0)          AS BUDGET,
        NVL(B.EXECAMT, 0)          AS EXECUTED_BUDGET,
        NVL(B.CTRTAMT, NVL(B.CTRTAMT_TAX, 0))      AS RESOLVED,
        NVL(S.PRGSAMT_TM, 0)       AS THIS_MONTH,
        NVL(S.PRGSAMT_AC, 0)       AS ACCUM,
        T.ORDCONTTYPECODE          AS SORT_ORDER
    FROM CDTB_ORDCONTTYPE T
    JOIN CETB_PFMCTRTHIST B
      ON B.FLDCODE = T.FLDCODE AND B.ORDCONTTYPECODE = T.ORDCONTTYPECODE
     AND B.LASTYN = '1'
    LEFT JOIN (
        SELECT FLDCODE, ORDCONTTYPECODE,
               SUM(DECODE(YYMM, TO_CHAR(SYSDATE, 'YYYYMM'), PRGSAMT, 0)) AS PRGSAMT_TM,
               SUM(PRGSAMT) AS PRGSAMT_AC
        FROM CETB_PFMSCHDHIST
        GROUP BY FLDCODE, ORDCONTTYPECODE
    ) S ON S.FLDCODE = B.FLDCODE AND S.ORDCONTTYPECODE = B.ORDCONTTYPECODE
    WHERE T.SVCDVSCODE IN ('1', '2')
      AND T.ORDCONTTYPECODE != '0000'
    ORDER BY B.FLDCODE, T.ORDCONTTYPECODE`,
  },

  "dashboard_pd_trade_cost_monthly_1q.jsp": {
    sql: `SELECT
        S.FLDCODE AS FLDCODE,
        (SELECT MAX(FM.ACNT_FLDCODE) FROM CBTB_FLD_MAPPING FM WHERE FM.FLDCODE = S.FLDCODE) AS SITE_CODE,
        FUN_GET_FLDNAME(S.FLDCODE) AS PROJECT_NAME,
        T.SVCDVSCODE AS TRADE_GROUP,
        T.ORDCONTTYPECODE AS TRADE_CODE,
        T.ORDCONTTYPENAME AS TRADE,
        TO_NUMBER(SUBSTR(S.YYMM, 1, 4)) AS YEAR,
        TO_NUMBER(SUBSTR(S.YYMM, 5, 2)) AS MONTH,
        CAST('VND' AS VARCHAR2(3)) AS SOURCE_CURRENCY,
        SUM(NVL(S.PRGSAMT, 0)) AS ACTUAL_VND,
        ROUND(
          SUM(NVL(S.PRGSAMT, 0))
          / NULLIF((
              SELECT MAX(R.CHGRATIO) KEEP (DENSE_RANK LAST ORDER BY R.YYMM)
              FROM CHTB_EXCHANGE_RATIO R
              WHERE R.EXCHANGE_TYPE = '.'
                AND R.BASEMONEY = 'VND'
                AND R.CHGMONEY = 'USD'
                AND R.YYMM <= S.YYMM
            ), 0)
          / 1000,
          8
        ) AS ACTUAL_KUSD
    FROM CETB_PFMSCHDHIST S
    JOIN CDTB_ORDCONTTYPE T
      ON T.FLDCODE = S.FLDCODE
     AND T.ORDCONTTYPECODE = S.ORDCONTTYPECODE
    JOIN CETB_PFMCTRTHIST B
      ON B.FLDCODE = S.FLDCODE
     AND B.ORDCONTTYPECODE = S.ORDCONTTYPECODE
     AND B.LASTYN = '1'
    WHERE T.SVCDVSCODE IN ('1', '2')
      AND T.ORDCONTTYPECODE != '0000'
      AND LENGTH(S.YYMM) = 6
    GROUP BY
        S.FLDCODE,
        T.SVCDVSCODE,
        T.ORDCONTTYPECODE,
        T.ORDCONTTYPENAME,
        S.YYMM
    ORDER BY S.FLDCODE, S.YYMM, T.ORDCONTTYPECODE`,
  },

  "dashboard_pd_trade_cost_scopes_1q.jsp": {
    sql: `SELECT DISTINCT
        P.FLDCODE AS FLDCODE,
        (SELECT MAX(FM.ACNT_FLDCODE) FROM CBTB_FLD_MAPPING FM WHERE FM.FLDCODE = P.FLDCODE) AS SITE_CODE,
        TO_NUMBER(SUBSTR(P.BASEYYMM, 1, 4)) AS YEAR
    FROM CHTB_PFMCOSTRMRK P
    WHERE LENGTH(P.BASEYYMM) = 6
    ORDER BY P.FLDCODE, YEAR`,
  },

  "dashboard_pd_cashflow_1q.jsp": {
    sql: `WITH ACTUAL_DATA AS (
        SELECT X.SITE AS FLDCODE, TO_NUMBER(SUBSTR(X.TRANSACTIONDATE, 1, 4)) AS YEAR, TO_NUMBER(SUBSTR(X.TRANSACTIONDATE, 5, 2)) AS MONTH,
               DECODE(X.DEPOSITWITHDRAWAL, 'Income', 'INC', 'OUT') AS CATEGORY,
               ROUND(X.AMOUNT / NULLIF((SELECT MAX(R.CHGRATIO) KEEP (DENSE_RANK LAST ORDER BY R.YYMM) FROM CHTB_EXCHANGE_RATIO R WHERE R.EXCHANGE_TYPE = '.' AND R.BASEMONEY = 'VND' AND R.CHGMONEY = 'USD' AND R.YYMM <= SUBSTR(X.TRANSACTIONDATE, 1, 6)), 0), 2) AS AMOUNT
        FROM CFTB_CFTRANSACTION X
        JOIN CFTB_CASHFLOWTYPE T ON (T.CASHFLOWTYPECODE = X.CASHFLOWTYPE OR T.CASHFLOWTYPENAME = X.CASHFLOWTYPENAME)
        JOIN CATB_COMPANYSTRUCT_PROJECT P ON P.COMPCODE = X.COMPANY AND P.FLDCODE = X.SITE AND NVL(P.USEYN, 'Y') = 'Y'
        JOIN CATB_BUSILINE B ON B.BUSILINECODE = P.BUSILINECODE
        WHERE X.SITE IS NOT NULL AND UPPER(NVL(T.DISPLAYCASHFLOWREPORT, 'BUSILINE')) IN ('BUSILINE', 'BOTH')
          AND UPPER(NVL(B.CLASSIFICATION, '')) IN ('SITE', 'BUSILINE')
    ),
    MONTHLY AS (
        SELECT FLDCODE, YEAR, MONTH,
               SUM(CASE WHEN CATEGORY = 'INC' THEN AMOUNT ELSE 0 END) AS CASH_IN,
               SUM(CASE WHEN CATEGORY = 'OUT' THEN AMOUNT ELSE 0 END) AS CASH_OUT
        FROM ACTUAL_DATA
        WHERE MONTH BETWEEN 1 AND 12
        GROUP BY FLDCODE, YEAR, MONTH
    ),
    OPENBAL AS (
        SELECT FLDCODE, TOTALUSD, ROW_NUMBER() OVER (PARTITION BY FLDCODE ORDER BY OPENINGDATE) AS RN
        FROM CFTB_OPENINGBALANCE
    )
    SELECT
        M.FLDCODE AS FLDCODE,
        (SELECT MAX(FM.ACNT_FLDCODE) FROM CBTB_FLD_MAPPING FM WHERE FM.FLDCODE = M.FLDCODE) AS SITE_CODE,
        FUN_GET_FLDNAME(M.FLDCODE) AS PROJECT_NAME,
        M.YEAR,
        M.MONTH,
        M.CASH_IN,
        M.CASH_OUT,
        NVL(OB.TOTALUSD, 0) + SUM(M.CASH_IN - M.CASH_OUT) OVER (PARTITION BY M.FLDCODE ORDER BY M.YEAR, M.MONTH) AS EQUIVALENT
    FROM MONTHLY M
    LEFT JOIN OPENBAL OB ON OB.FLDCODE = M.FLDCODE AND OB.RN = 1
    ORDER BY PROJECT_NAME, M.YEAR, M.MONTH`,
  },

  "dashboard_pd_cogs_monthly_1q.jsp": {
    sql: `WITH MONTHLY_COST_INVEST AS (
        SELECT
            I.FLDCODE,
            TO_NUMBER(SUBSTR(I.YYMM, 1, 4)) AS YEAR,
            TO_NUMBER(SUBSTR(I.YYMM, 5, 2)) AS MONTH,
            I.YYMM AS BASEYYMM,
            SUM(NVL(I.INVESTAMT, 0)) AS ACCT_COGS
        FROM CHTB_COST_INVEST I
        WHERE NVL(I.INVESTAMT, 0) > 0
        GROUP BY I.FLDCODE, I.YYMM
    ),
    MONTHLY_COST_DIRECT AS (
        SELECT
            C.FLDCODE,
            TO_NUMBER(SUBSTR(C.YYMM, 1, 4)) AS YEAR,
            TO_NUMBER(SUBSTR(C.YYMM, 5, 2)) AS MONTH,
            C.YYMM AS BASEYYMM,
            SUM(NVL(C.DEBITAMT, 0)) AS ACCT_COGS
        FROM CHTB_COST C
        WHERE NVL(C.DEBITAMT, 0) > 0
        GROUP BY C.FLDCODE, C.YYMM
    ),
    MONTHLY_ACCT_COGS AS (
        SELECT
            NVL(I.FLDCODE, D.FLDCODE) AS FLDCODE,
            NVL(I.YEAR, D.YEAR) AS YEAR,
            NVL(I.MONTH, D.MONTH) AS MONTH,
            NVL(I.BASEYYMM, D.BASEYYMM) AS BASEYYMM,
            CASE WHEN I.FLDCODE IS NOT NULL THEN I.ACCT_COGS ELSE D.ACCT_COGS END AS ACCT_COGS
        FROM MONTHLY_COST_DIRECT D
        LEFT JOIN MONTHLY_COST_INVEST I ON I.FLDCODE = D.FLDCODE AND I.BASEYYMM = D.BASEYYMM
    ),
    MONTHLY_WIP_COST AS (
        -- Tổng chi phí = Direct Cost ('A%', đã gồm Common/Expense I) + Expense II ('BWZJ%') + Contingency
        -- ('CWDD%') theo CATB_STNDCLS. Tiền tố 'ZAA/ZBA/ZCA/ZDA/ZZA' cũ SAI (không khớp bản ghi nào) nên
        -- WIP_COGS luôn ra 0 - xem comment chi tiết ở "dashboard_pd_costbudget_1q.jsp".
        SELECT
            P.FLDCODE,
            TO_NUMBER(SUBSTR(P.BASEYYMM, 1, 4)) AS YEAR,
            TO_NUMBER(SUBSTR(P.BASEYYMM, 5, 2)) AS MONTH,
            P.BASEYYMM,
            SUM(NVL(P.PFMAMT, 0)) AS WIP_COGS
        FROM CHTB_PFMCOSTRMRK P
        WHERE P.STNDCLSCODE LIKE 'A%'
           OR P.STNDCLSCODE LIKE 'BWZJ%'
           OR P.STNDCLSCODE LIKE 'CWDD%'
        GROUP BY P.FLDCODE, P.BASEYYMM
    ),
    ALL_PERIODS AS (
        SELECT FLDCODE, YEAR, MONTH, BASEYYMM FROM MONTHLY_ACCT_COGS
        UNION
        SELECT FLDCODE, YEAR, MONTH, BASEYYMM FROM MONTHLY_WIP_COST
    )
    SELECT
        AP.FLDCODE,
        (SELECT MAX(FM.ACNT_FLDCODE) FROM CBTB_FLD_MAPPING FM WHERE FM.FLDCODE = AP.FLDCODE) AS SITE_CODE,
        FUN_GET_FLDNAME(AP.FLDCODE) AS PROJECT_NAME,
        AP.YEAR,
        AP.MONTH,
        NVL(A.ACCT_COGS, 0) AS ACCT_COGS,
        NVL(W.WIP_COGS, 0) AS WIP_COGS,
        SUM(NVL(A.ACCT_COGS, 0)) OVER (PARTITION BY AP.FLDCODE, AP.YEAR ORDER BY AP.MONTH) AS CUMULATIVE_ACCT_COGS,
        SUM(NVL(W.WIP_COGS, 0)) OVER (PARTITION BY AP.FLDCODE, AP.YEAR ORDER BY AP.MONTH) AS CUMULATIVE_WIP_COGS
    FROM ALL_PERIODS AP
    LEFT JOIN MONTHLY_ACCT_COGS A ON A.FLDCODE = AP.FLDCODE AND A.BASEYYMM = AP.BASEYYMM
    LEFT JOIN MONTHLY_WIP_COST W ON W.FLDCODE = AP.FLDCODE AND W.BASEYYMM = AP.BASEYYMM
    ORDER BY PROJECT_NAME, YEAR, MONTH`,
  },

  "dashboard_pd_costbudget_1q.jsp": {
    // Công thức mới: BUDGET lấy từ CHTB_PFMCOSTRMRK.BDGTAMT (RMRKLVL=2, đã verify khớp màn hình "Cost Input
    // Status by Execution Details") của snapshot THÁNG GẦN NHẤT mỗi dự án; ACTUAL = luỹ kế COSTAMT từ tháng
    // đầu tiên có dữ liệu đến đúng tháng đó (đã verify khớp cột "Cumulative Amount" cùng màn hình). Mỗi dòng
    // RMRKLVL=2 (DETLNAME) được map vào 1 trong 5 item chuẩn của dashboard: Common Work→Common, Expense I→
    // Expense 1, Expense II→Expense 2, Contingency→Contingency, còn lại (Architectural/Mechanical/Electrical/
    // External & Landscape Works, và bất kỳ hạng mục thầu phụ nào khác chưa liệt kê) → Outsourcing (mặc định).
    sql: `WITH CTE_RMRK AS (
        SELECT A.FLDCODE, A.BASEYYMM, A.RMRKMGTNO, A.DETLNAME, A.BDGTAMT
        FROM CHTB_PFMCOSTRMRK A
        WHERE A.RMRKLVL = 2
    ),
    CTE_COST AS (
        SELECT FLDCODE, BASEYYMM, RMRKMGTNO, SUM(NVL(COSTAMT, 0)) AS COSTAMT_MONTH
        FROM CHTB_PFMCOSTRMRK
        GROUP BY FLDCODE, BASEYYMM, RMRKMGTNO
    ),
    CTE_ITEM AS (
        SELECT
            A.FLDCODE,
            A.BASEYYMM,
            CASE
                WHEN UPPER(A.DETLNAME) LIKE 'COMMON WORK%'  THEN 'Common'
                WHEN UPPER(A.DETLNAME) LIKE 'EXPENSE I%' AND UPPER(A.DETLNAME) NOT LIKE 'EXPENSE II%' THEN 'Expense 1'
                WHEN UPPER(A.DETLNAME) LIKE 'EXPENSE II%'   THEN 'Expense 2'
                WHEN UPPER(A.DETLNAME) LIKE 'CONTINGENCY%'  THEN 'Contingency'
                ELSE 'Outsourcing'
            END AS ITEM,
            CASE
                WHEN UPPER(A.DETLNAME) LIKE 'EXPENSE II%'   THEN 'Indirect Cost'
                WHEN UPPER(A.DETLNAME) LIKE 'CONTINGENCY%'  THEN 'Contingency'
                ELSE 'Direct Cost'
            END AS CATEGORY,
            A.BDGTAMT,
            C.COSTAMT_MONTH
        FROM CTE_RMRK A
        JOIN CTE_COST C ON C.FLDCODE = A.FLDCODE AND C.BASEYYMM = A.BASEYYMM AND C.RMRKMGTNO = A.RMRKMGTNO
    ),
    CTE_GROUPED AS (
        SELECT FLDCODE, BASEYYMM, ITEM, CATEGORY,
               SUM(BDGTAMT) AS BUDGET,
               SUM(COSTAMT_MONTH) AS COSTAMT_MONTH_SUM
        FROM CTE_ITEM
        GROUP BY FLDCODE, BASEYYMM, ITEM, CATEGORY
    ),
    CTE_LATEST AS (
        SELECT FLDCODE, MAX(BASEYYMM) AS MAX_BASEYYMM
        FROM CTE_GROUPED
        GROUP BY FLDCODE
    ),
    CTE_FINAL AS (
        SELECT
            G.FLDCODE, G.ITEM, G.CATEGORY, G.BUDGET,
            SUM(H.COSTAMT_MONTH_SUM) AS ACTUAL
        FROM CTE_GROUPED G
        JOIN CTE_LATEST L ON L.FLDCODE = G.FLDCODE AND L.MAX_BASEYYMM = G.BASEYYMM
        JOIN CTE_GROUPED H ON H.FLDCODE = G.FLDCODE AND H.ITEM = G.ITEM AND H.BASEYYMM <= G.BASEYYMM
        GROUP BY G.FLDCODE, G.ITEM, G.CATEGORY, G.BUDGET
    )
    SELECT
        F.FLDCODE AS FLDCODE,
        (SELECT MAX(FM.ACNT_FLDCODE) FROM CBTB_FLD_MAPPING FM WHERE FM.FLDCODE = F.FLDCODE) AS SITE_CODE,
        FUN_GET_FLDNAME(F.FLDCODE) AS PROJECT_NAME,
        F.CATEGORY AS CATEGORY,
        F.ITEM AS ITEM,
        F.BUDGET AS BUDGET,
        F.ACTUAL AS ACTUAL,
        DECODE(F.ITEM, 'Outsourcing', 1, 'Common', 2, 'Expense 1', 3, 'Expense 2', 4, 'Contingency', 5, 6) AS SORT_ORDER
    FROM CTE_FINAL F
    ORDER BY PROJECT_NAME, SORT_ORDER`,
  },

  "dashboard_pd_costbudget_monthly_1q.jsp": {
    // Item 분류는 dashboard_pd_costbudget_1q.jsp와 완전히 동일하게 맞춘다(Contingency 포함, catch-all은
    // 'Outsourcing') — 예전엔 Contingency를 NULL로 버리고 catch-all을 '외주성'으로 달리 써서 두 쿼리가
    // 같은 원본 데이터를 놓고도 서로 다른 항목 집합을 내놓는 불일치가 있었다.
    // 금액은 VND 원본 그대로 반환한다(예전엔 CHTB_EXCHANGE_RATIO로 나눠 천 USD로 환산했으나, 이 프로젝트는
    // "동기화 데이터는 항상 VND 원본 저장, 화면에서만 통화 변환" 원칙으로 통일 — dashboard_pd_costbudget_1q.jsp
    // 의 ACTUAL과 동일하게 무변환).
    sql: `WITH CTE_RMRK AS (
        SELECT A.FLDCODE, A.BASEYYMM, A.RMRKMGTNO, A.DETLNAME
        FROM CHTB_PFMCOSTRMRK A
        WHERE A.RMRKLVL = 2
    ),
    CTE_COST AS (
        SELECT FLDCODE, BASEYYMM, RMRKMGTNO, SUM(NVL(COSTAMT, 0)) AS COSTAMT_MONTH
        FROM CHTB_PFMCOSTRMRK
        GROUP BY FLDCODE, BASEYYMM, RMRKMGTNO
    ),
    CTE_ITEM AS (
        SELECT
            A.FLDCODE,
            A.BASEYYMM,
            CASE
                WHEN UPPER(A.DETLNAME) LIKE 'COMMON WORK%'  THEN 'Common'
                WHEN UPPER(A.DETLNAME) LIKE 'EXPENSE I%' AND UPPER(A.DETLNAME) NOT LIKE 'EXPENSE II%' THEN 'Expense 1'
                WHEN UPPER(A.DETLNAME) LIKE 'EXPENSE II%'   THEN 'Expense 2'
                WHEN UPPER(A.DETLNAME) LIKE 'CONTINGENCY%'  THEN 'Contingency'
                ELSE 'Outsourcing'
            END AS ITEM,
            C.COSTAMT_MONTH
        FROM CTE_RMRK A
        JOIN CTE_COST C ON C.FLDCODE = A.FLDCODE AND C.BASEYYMM = A.BASEYYMM AND C.RMRKMGTNO = A.RMRKMGTNO
    ),
    CTE_GROUPED AS (
        SELECT FLDCODE, BASEYYMM, ITEM, SUM(COSTAMT_MONTH) AS COSTAMT_MONTH_SUM
        FROM CTE_ITEM
        GROUP BY FLDCODE, BASEYYMM, ITEM
    )
    SELECT
        G.FLDCODE AS FLDCODE,
        (SELECT MAX(FM.ACNT_FLDCODE) FROM CBTB_FLD_MAPPING FM WHERE FM.FLDCODE = G.FLDCODE) AS SITE_CODE,
        FUN_GET_FLDNAME(G.FLDCODE) AS PROJECT_NAME,
        TO_NUMBER(SUBSTR(G.BASEYYMM, 1, 4)) AS YEAR,
        TO_NUMBER(SUBSTR(G.BASEYYMM, 5, 2)) AS MONTH,
        G.ITEM AS ITEM,
        ROUND(G.COSTAMT_MONTH_SUM, 2) AS ACTUAL
    FROM CTE_GROUPED G
    WHERE LENGTH(G.BASEYYMM) = 6
    ORDER BY PROJECT_NAME, G.BASEYYMM, G.ITEM`,
  },

  "dashboard_pd_costrate_settle_1q.jsp": {
    sql: `WITH
  all_flds AS ( SELECT FLDCODE FROM CBTB_FLDSUMM ),
  current_mm_calc AS ( SELECT TO_CHAR(SYSDATE,'YYYYMM') AS MM FROM DUAL ),
  target_mm_calc AS (
    SELECT af.FLDCODE, NVL(MAX(A.BASEYYMM), cmc.MM) AS MM
    FROM all_flds af
    CROSS JOIN current_mm_calc cmc
    LEFT JOIN CHTB_PFMCOSTRMRK A ON A.FLDCODE = af.FLDCODE AND A.BASEYYMM <= cmc.MM
    GROUP BY af.FLDCODE, cmc.MM
  ),
  rate_calc AS (
    SELECT af.FLDCODE, NVL(MAX(c.RATEUSD),1) AS RATE
    FROM all_flds af LEFT JOIN CBTB_CTRTSUMM c ON c.FLDCODE = af.FLDCODE
    GROUP BY af.FLDCODE
  ),
  pfmchgseq_calc AS (
    SELECT af.FLDCODE, NVL(MAX(CASE WHEN p.APPRSTSCODE='40' THEN p.PFMCHGSEQ END),0) AS SEQ
    FROM all_flds af LEFT JOIN CDTB_PFMCHGSEQ p ON p.FLDCODE = af.FLDCODE
    GROUP BY af.FLDCODE
  ),
  chain AS (
    SELECT c.FLDCODE, c.PFMCHGSEQ AS SEQ,
           CASE WHEN c.APPRSTSCODE='40' THEN SUBSTR(c.APPRDATE,1,6) ELSE SUBSTR(c.PFMCOMPDATE,1,6) END AS EFF_MM
    FROM CDTB_PFMCHGSEQ c
    JOIN pfmchgseq_calc pc ON pc.FLDCODE = c.FLDCODE AND c.PFMCHGSEQ <= pc.SEQ
  ),
  earliest_budget_month AS (
    SELECT ch.FLDCODE, ch.EFF_MM
    FROM chain ch
    WHERE ch.SEQ = (SELECT MIN(c2.SEQ) FROM chain c2 WHERE c2.FLDCODE = ch.FLDCODE)
  ),
  opt_eff AS (
    SELECT o.FLDCODE, o.PFMCHGSEQ AS SEQ, o.OPTCHGSEQ AS OPTKEY, SUBSTR(o.APPRDATE,1,6) AS EFF_MM
    FROM CDTB_OPTCHGSEQ o
    JOIN pfmchgseq_calc pc ON pc.FLDCODE = o.FLDCODE AND o.PFMCHGSEQ <= pc.SEQ
    WHERE o.APPRSTSCODE = '40'
  ),
  cbs_root AS (
    SELECT STNDCBSCODE, CONNECT_BY_ROOT STNDCBSCODE AS ROOTCODE FROM CATB_STNDCBS
    START WITH UPPERCBSCODE = '-' CONNECT BY PRIOR STNDCBSCODE = UPPERCBSCODE
  ),
  bold_raw AS (
    SELECT b.FLDCODE, b.STNDCODE, b.PFMCHGSEQ AS SEQ, NVL(b.BDGTAMT,0) AS AMT
    FROM CDTB_PFMSUM_VINA b
    JOIN pfmchgseq_calc pc ON pc.FLDCODE = b.FLDCODE AND b.PFMCHGSEQ <= pc.SEQ
    WHERE b.CURCODE = 'VND'
  ),
  init_seq AS (
    SELECT af.FLDCODE,
      CASE WHEN af.FLDCODE = 'VH10TC1' AND EXISTS (
                   SELECT 1 FROM CDTB_PFMCHGSEQ WHERE FLDCODE = af.FLDCODE AND PFMCHGSEQ = 1 AND APPRSTSCODE = '40'
                 ) THEN 1 ELSE 0 END AS SRC_SEQ
    FROM all_flds af
  ),
  bold_init AS (
    SELECT b.FLDCODE, b.STNDCODE, NVL(b.INITAMT,0) AS INITAMT
    FROM CDTB_PFMSUM_VINA b
    JOIN init_seq s ON s.FLDCODE = b.FLDCODE AND b.PFMCHGSEQ = s.SRC_SEQ
    WHERE b.CURCODE = 'VND'
  ),
  cbs_override AS (
    SELECT af.FLDCODE,
           CASE M.ROOTCODE WHEN 'A000000000000' THEN 'ZAA' WHEN 'C000000000000' THEN 'ZCA' ELSE 'ZBA' END AS STNDCODE,
           SUM(D.BDGTAMT) AS AMT
    FROM all_flds af, TABLE(FUN_GET_PFMRMRK(af.FLDCODE, 0, 0, '%', '%')) D
    JOIN cbs_root M ON D.STNDCBSCODE = M.STNDCBSCODE
    WHERE D.RMRKYN = 'Y' AND M.ROOTCODE IN ('A000000000000','B000000000000','C000000000000','H000000000000')
    GROUP BY af.FLDCODE, CASE M.ROOTCODE WHEN 'A000000000000' THEN 'ZAA' WHEN 'C000000000000' THEN 'ZCA' ELSE 'ZBA' END
  ),
  bold_val AS (
    SELECT FLDCODE, STNDCODE, SEQ, AMT FROM bold_raw WHERE SEQ <> 0
    UNION ALL
    SELECT sc.FLDCODE, sc.STNDCODE, 0 AS SEQ, COALESCE(co.AMT, bi.INITAMT, br0.AMT, 0) AS AMT
    FROM (
      SELECT FLDCODE, STNDCODE FROM bold_raw
      UNION SELECT FLDCODE, STNDCODE FROM bold_init
      UNION SELECT FLDCODE, STNDCODE FROM cbs_override
    ) sc
    LEFT JOIN cbs_override co ON co.FLDCODE = sc.FLDCODE AND co.STNDCODE = sc.STNDCODE
    LEFT JOIN bold_init bi ON bi.FLDCODE = sc.FLDCODE AND bi.STNDCODE = sc.STNDCODE
    LEFT JOIN bold_raw br0 ON br0.FLDCODE = sc.FLDCODE AND br0.STNDCODE = sc.STNDCODE AND br0.SEQ = 0
  ),
  chain_month_pick AS (
    SELECT af.FLDCODE, cm.MM AS YYMM, c.SEQ,
           ROW_NUMBER() OVER (PARTITION BY af.FLDCODE ORDER BY c.EFF_MM DESC, c.SEQ DESC) AS RN
    FROM all_flds af
    JOIN target_mm_calc cm ON cm.FLDCODE = af.FLDCODE
    JOIN chain c ON c.FLDCODE = af.FLDCODE AND c.EFF_MM IS NOT NULL AND LENGTH(c.EFF_MM) = 6 AND c.EFF_MM <= cm.MM
  ),
  picked AS ( SELECT FLDCODE, YYMM, SEQ FROM chain_month_pick WHERE RN = 1 ),
  bold_month AS (
    SELECT sc.FLDCODE, sc.STNDCODE, cm.MM AS YYMM,
      NVL((SELECT bv.AMT FROM bold_val bv WHERE bv.FLDCODE = sc.FLDCODE AND bv.STNDCODE = sc.STNDCODE AND bv.SEQ = p.SEQ), 0) AS VAL
    FROM (SELECT DISTINCT FLDCODE, STNDCODE FROM bold_val) sc
    JOIN target_mm_calc cm ON cm.FLDCODE = sc.FLDCODE
    LEFT JOIN picked p ON p.FLDCODE = sc.FLDCODE
  ),
  child_raw AS (
    SELECT A.FLDCODE, A.ORDCONTTYPECODE AS ORD, A.PFMCHGSEQ AS SEQ, NVL(A.OPTCHGSEQ,0) AS OPTKEY, M.ROOTCODE, SUM(A.BDGTAMT) AS AMT
    FROM CDTB_PFMRMRK A
    JOIN pfmchgseq_calc pc ON pc.FLDCODE = A.FLDCODE AND A.PFMCHGSEQ <= pc.SEQ
    LEFT JOIN cbs_root M ON A.STNDCBSCODE = M.STNDCBSCODE
    WHERE M.ROOTCODE IN ('A000000000000','B000000000000') AND A.ORDCONTTYPECODE IS NOT NULL
    GROUP BY A.FLDCODE, A.ORDCONTTYPECODE, A.PFMCHGSEQ, NVL(A.OPTCHGSEQ,0), M.ROOTCODE
  ),
  child_sub AS ( SELECT FLDCODE, ORD, SEQ, OPTKEY, ROOTCODE, AMT FROM child_raw ),
  child_meta AS ( SELECT FLDCODE, ORD, MAX(ROOTCODE) AS ROOTCODE FROM child_raw GROUP BY FLDCODE, ORD ),
  child_sub_hasval AS (
    SELECT FLDCODE, ORD, OPTKEY, MAX(CASE WHEN ABS(AMT) > 0.01 THEN 1 ELSE 0 END) AS HAS_VAL, MIN(SEQ) AS MIN_SEQ
    FROM child_sub GROUP BY FLDCODE, ORD, OPTKEY
  ),
  child_sub_floor AS (
    SELECT h.FLDCODE, h.ORD, h.OPTKEY, h.HAS_VAL, h.MIN_SEQ,
      CASE WHEN h.OPTKEY <> 0 THEN oe.EFF_MM ELSE NULL END AS FLOOR_MONTH,
      CASE WHEN h.OPTKEY <> 0 THEN CASE WHEN oe.EFF_MM IS NOT NULL THEN 1 ELSE 0 END ELSE 1 END AS INCLUDED
    FROM child_sub_hasval h
    LEFT JOIN opt_eff oe ON oe.FLDCODE = h.FLDCODE AND oe.SEQ = h.MIN_SEQ AND oe.OPTKEY = h.OPTKEY
  ),
  child_sub_floor2 AS (
    SELECT f.FLDCODE, f.ORD, f.OPTKEY, f.HAS_VAL, f.MIN_SEQ, f.FLOOR_MONTH, f.INCLUDED,
      CASE WHEN f.OPTKEY <> 0 THEN f.FLOOR_MONTH
           ELSE (SELECT c.EFF_MM FROM chain c WHERE c.FLDCODE = f.FLDCODE AND c.SEQ = f.MIN_SEQ)
      END AS SUBGROUP_FLOOR
    FROM child_sub_floor f
  ),
  child_floor AS (
    SELECT FLDCODE, ORD, MIN(SUBGROUP_FLOOR) AS CHILD_FLOOR_MONTH FROM child_sub_floor2
    WHERE HAS_VAL = 1 AND INCLUDED = 1 AND SUBGROUP_FLOOR IS NOT NULL GROUP BY FLDCODE, ORD
  ),
  subgroup_month AS (
    SELECT cs.FLDCODE, cs.ORD, cs.OPTKEY, cm.MM AS YYMM,
      CASE WHEN f.FLOOR_MONTH IS NOT NULL AND cm.MM < f.FLOOR_MONTH THEN 0
           ELSE NVL((SELECT cs2.AMT FROM child_sub cs2 WHERE cs2.FLDCODE = cs.FLDCODE AND cs2.ORD = cs.ORD AND cs2.OPTKEY = cs.OPTKEY AND cs2.SEQ = p.SEQ), 0)
      END AS VAL
    FROM (SELECT DISTINCT FLDCODE, ORD, OPTKEY FROM child_sub) cs
    JOIN child_sub_floor2 f ON f.FLDCODE = cs.FLDCODE AND f.ORD = cs.ORD AND f.OPTKEY = cs.OPTKEY
    JOIN target_mm_calc cm ON cm.FLDCODE = cs.FLDCODE
    LEFT JOIN picked p ON p.FLDCODE = cs.FLDCODE
    WHERE f.INCLUDED = 1
  ),
  budget_chain_vals AS ( SELECT FLDCODE, ORD, YYMM, SUM(VAL) AS VAL FROM subgroup_month GROUP BY FLDCODE, ORD, YYMM ),
  cost_rmrk AS (
    SELECT A.FLDCODE, A.ORDCONTTYPECODE AS ORD, A.BASEYYMM AS YYMM,
      SUM(A.PFMAMT + (A.BDGTQTY - A.PFMQTY) * A.PFMUNITCOST) AS VAL,
      CASE WHEN (SUM(NVL(A.PFMQTY,0)) > 0 OR SUM(NVL(A.PFMUNITCOST,0)) > 0) AND SUM(NVL(A.PFMAMT,0)) <> 0 THEN 1 ELSE 0 END AS HAS_DATA
    FROM CHTB_PFMCOSTRMRK A
    JOIN target_mm_calc cm ON cm.FLDCODE = A.FLDCODE
    WHERE A.ORDCONTTYPECODE IS NOT NULL AND A.BASEYYMM <= cm.MM
    GROUP BY A.FLDCODE, A.ORDCONTTYPECODE, A.BASEYYMM
  ),
  cost_rmrk_filtered AS (
    SELECT cr.FLDCODE, cr.ORD, cr.YYMM, cr.VAL AS VAL
    FROM cost_rmrk cr
    WHERE cr.HAS_DATA = 1
      AND cr.YYMM >= (SELECT EFF_MM FROM earliest_budget_month eb WHERE eb.FLDCODE = cr.FLDCODE)
      AND cr.YYMM >= NVL((SELECT CHILD_FLOOR_MONTH FROM child_floor cf WHERE cf.FLDCODE = cr.FLDCODE AND cf.ORD = cr.ORD), '000000')
  ),
  cost_input_joined AS (
    SELECT ord_list.FLDCODE, ord_list.ORD, cm.MM AS TARGET_MM, cr.VAL,
      ROW_NUMBER() OVER (PARTITION BY ord_list.FLDCODE, ord_list.ORD ORDER BY cr.YYMM DESC) AS RN
    FROM (SELECT DISTINCT FLDCODE, ORD FROM child_raw) ord_list
    JOIN target_mm_calc cm ON cm.FLDCODE = ord_list.FLDCODE
    LEFT JOIN cost_rmrk_filtered cr ON cr.FLDCODE = ord_list.FLDCODE AND cr.ORD = ord_list.ORD AND cr.YYMM <= cm.MM
  ),
  cost_input_vals AS ( SELECT FLDCODE, ORD, TARGET_MM AS YYMM, VAL AS COST_VAL FROM cost_input_joined WHERE RN = 1 ),
  ipc_raw AS (
    SELECT FLDCODE, ORDCONTTYPECODE AS ORD, YYMM, NVL(SUM(PRGSAMT),0) AS AMT
    FROM CETB_PFMSCHDHIST GROUP BY FLDCODE, ORDCONTTYPECODE, YYMM
  ),
  ipc_conv AS ( SELECT FLDCODE, ORD, YYMM, AMT FROM ipc_raw ),
  ipc_cumulative AS (
    SELECT ord_list.FLDCODE, ord_list.ORD, cm.MM AS TARGET_MM, NVL(SUM(ic.AMT),0) AS RUNNING, COUNT(ic.YYMM) AS CNT
    FROM (SELECT DISTINCT FLDCODE, ORD FROM ipc_raw) ord_list
    JOIN target_mm_calc cm ON cm.FLDCODE = ord_list.FLDCODE
    LEFT JOIN ipc_conv ic ON ic.FLDCODE = ord_list.FLDCODE AND ic.ORD = ord_list.ORD AND ic.YYMM <= cm.MM
    GROUP BY ord_list.FLDCODE, ord_list.ORD, cm.MM
  ),
  contract_status AS (
    SELECT A.FLDCODE, A.ORDCONTTYPECODE AS ORD, A.RQSTSTSCODE,
      CASE WHEN A.RQSTSTSCODE = '900' THEN TO_CHAR(A.UPTDATE,'YYYYMM') ELSE NULL END AS SETTLE_MM
    FROM CETB_PFMCTRTHIST A WHERE A.LASTYN = '1'
  ),
  ipc_final AS (
    SELECT ic.FLDCODE, ic.ORD, ic.TARGET_MM AS YYMM,
      CASE WHEN (ic.TARGET_MM >= (SELECT EFF_MM FROM earliest_budget_month eb WHERE eb.FLDCODE = ic.FLDCODE)
                 AND ic.TARGET_MM >= NVL((SELECT CHILD_FLOOR_MONTH FROM child_floor cf WHERE cf.FLDCODE = ic.FLDCODE AND cf.ORD = ic.ORD),'000000')
                 AND ic.CNT > 0)
           THEN ic.RUNNING ELSE NULL END AS IPC_VAL
    FROM ipc_cumulative ic
  ),
  child_months AS (
    SELECT cr.FLDCODE, cr.ORD, cm2.ROOTCODE, cm.MM AS YYMM,
      CASE
        WHEN cs.RQSTSTSCODE = '900' AND EXISTS (SELECT 1 FROM ipc_raw ir WHERE ir.FLDCODE = cr.FLDCODE AND ir.ORD = cr.ORD)
             AND (cs.SETTLE_MM IS NULL OR cm.MM >= cs.SETTLE_MM)
          THEN NVL(ifn.IPC_VAL, NVL(bcv.VAL,0))
        ELSE NVL(civ.COST_VAL, NVL(bcv.VAL,0))
      END AS VAL,
      NVL(bcv.VAL,0) AS BUDGET_VAL
    FROM (SELECT DISTINCT FLDCODE, ORD FROM child_raw) cr
    JOIN child_meta cm2 ON cm2.FLDCODE = cr.FLDCODE AND cm2.ORD = cr.ORD
    JOIN target_mm_calc cm ON cm.FLDCODE = cr.FLDCODE
    LEFT JOIN budget_chain_vals bcv ON bcv.FLDCODE = cr.FLDCODE AND bcv.ORD = cr.ORD AND bcv.YYMM = cm.MM
    LEFT JOIN cost_input_vals civ ON civ.FLDCODE = cr.FLDCODE AND civ.ORD = cr.ORD AND civ.YYMM = cm.MM
    LEFT JOIN ipc_final ifn ON ifn.FLDCODE = cr.FLDCODE AND ifn.ORD = cr.ORD AND ifn.YYMM = cm.MM
    LEFT JOIN contract_status cs ON cs.FLDCODE = cr.FLDCODE AND cs.ORD = cr.ORD
  ),
  child_agg AS (
    SELECT FLDCODE, ROOTCODE, YYMM, SUM(VAL) AS SUM_MONTH,
      SUM(CASE WHEN ABS(VAL) > 0.01 THEN BUDGET_VAL ELSE 0 END) AS SUM_BUDGET_MONTH
    FROM child_months GROUP BY FLDCODE, ROOTCODE, YYMM
  ),
  direct_other AS (
    SELECT af.FLDCODE, cm.MM AS YYMM, NVL(bm.VAL,0) - NVL(ca.SUM_BUDGET_MONTH,0) AS OTHER_VAL
    FROM all_flds af JOIN target_mm_calc cm ON cm.FLDCODE = af.FLDCODE
    LEFT JOIN bold_month bm ON bm.FLDCODE=af.FLDCODE AND bm.STNDCODE='ZAA' AND bm.YYMM=cm.MM
    LEFT JOIN child_agg ca ON ca.FLDCODE=af.FLDCODE AND ca.ROOTCODE='A000000000000' AND ca.YYMM=cm.MM
  ),
  indirect_other AS (
    SELECT af.FLDCODE, cm.MM AS YYMM, NVL(bm.VAL,0) - NVL(ca.SUM_BUDGET_MONTH,0) AS OTHER_VAL
    FROM all_flds af JOIN target_mm_calc cm ON cm.FLDCODE = af.FLDCODE
    LEFT JOIN bold_month bm ON bm.FLDCODE=af.FLDCODE AND bm.STNDCODE='ZBA' AND bm.YYMM=cm.MM
    LEFT JOIN child_agg ca ON ca.FLDCODE=af.FLDCODE AND ca.ROOTCODE='B000000000000' AND ca.YYMM=cm.MM
  ),
  direct_months AS (
    SELECT do_.FLDCODE, do_.YYMM, NVL(ca.SUM_MONTH,0) + do_.OTHER_VAL AS VAL
    FROM direct_other do_
    LEFT JOIN child_agg ca ON ca.FLDCODE=do_.FLDCODE AND ca.ROOTCODE='A000000000000' AND ca.YYMM=do_.YYMM
  ),
  indirect_months AS (
    SELECT io_.FLDCODE, io_.YYMM, NVL(ca.SUM_MONTH,0) + io_.OTHER_VAL AS VAL
    FROM indirect_other io_
    LEFT JOIN child_agg ca ON ca.FLDCODE=io_.FLDCODE AND ca.ROOTCODE='B000000000000' AND ca.YYMM=io_.YYMM
  ),
  contingency_months AS (
    SELECT af.FLDCODE, cm.MM AS YYMM, NVL(bm.VAL,0) AS VAL
    FROM all_flds af JOIN target_mm_calc cm ON cm.FLDCODE = af.FLDCODE
    LEFT JOIN bold_month bm ON bm.FLDCODE=af.FLDCODE AND bm.STNDCODE='ZCA' AND bm.YYMM=cm.MM
  ),
  site_months AS (
    SELECT dm.FLDCODE, dm.YYMM, dm.VAL + im.VAL + con.VAL AS VAL
    FROM direct_months dm
    JOIN indirect_months im ON im.FLDCODE=dm.FLDCODE AND im.YYMM=dm.YYMM
    JOIN contingency_months con ON con.FLDCODE=dm.FLDCODE AND con.YYMM=dm.YYMM
  ),
  bsns_months AS (
    SELECT af.FLDCODE, cm.MM AS YYMM, NVL(bm.VAL,0) AS VAL
    FROM all_flds af JOIN target_mm_calc cm ON cm.FLDCODE = af.FLDCODE
    LEFT JOIN bold_month bm ON bm.FLDCODE=af.FLDCODE AND bm.STNDCODE='ZZB' AND bm.YYMM=cm.MM
  ),
  dfct_months AS (
    SELECT af.FLDCODE, cm.MM AS YYMM, NVL(bm.VAL,0) AS VAL
    FROM all_flds af JOIN target_mm_calc cm ON cm.FLDCODE = af.FLDCODE
    LEFT JOIN bold_month bm ON bm.FLDCODE=af.FLDCODE AND bm.STNDCODE='ZZD' AND bm.YYMM=cm.MM
  ),
  ovhd_months AS (
    SELECT af.FLDCODE, cm.MM AS YYMM, NVL(bm.VAL,0) AS VAL
    FROM all_flds af JOIN target_mm_calc cm ON cm.FLDCODE = af.FLDCODE
    LEFT JOIN bold_month bm ON bm.FLDCODE=af.FLDCODE AND bm.STNDCODE='ZZG' AND bm.YYMM=cm.MM
  ),
  ctrt_months_raw AS (
    SELECT af.FLDCODE, cm.MM AS YYMM, NVL(bm.VAL,0) AS VAL
    FROM all_flds af JOIN target_mm_calc cm ON cm.FLDCODE = af.FLDCODE
    LEFT JOIN bold_month bm ON bm.FLDCODE=af.FLDCODE AND bm.STNDCODE='ZZL' AND bm.YYMM=cm.MM
  ),
  site_info AS (
    SELECT af.FLDCODE, NVL(MAX(F.FLDNAME),'') AS FLDNAME, NVL(MAX(C.TOTALCTRTWONAMT),0) AS TOTALCTRTWONAMT
    FROM all_flds af
    LEFT JOIN CBTB_FLDSUMM F ON F.FLDCODE = af.FLDCODE
    LEFT JOIN CBTB_CTRTSUMM C ON C.FLDCODE=af.FLDCODE
    GROUP BY af.FLDCODE
  ),
  fallback_calc AS (
    SELECT FLDCODE, CASE WHEN UPPER(FLDNAME) LIKE '%INFRA%' THEN 1 ELSE 0 END AS IS_INFRA, TOTALCTRTWONAMT AS FALLBACK_AMT
    FROM site_info
  ),
  bsns_bdg_months AS (
    SELECT sm.FLDCODE, sm.YYMM, sm.VAL + bs.VAL + df.VAL AS VAL
    FROM site_months sm
    JOIN bsns_months bs ON bs.FLDCODE=sm.FLDCODE AND bs.YYMM=sm.YYMM
    JOIN dfct_months df ON df.FLDCODE=sm.FLDCODE AND df.YYMM=sm.YYMM
  ),
  ctrt_months AS (
    SELECT cr.FLDCODE, cr.YYMM,
      CASE WHEN ABS(cr.VAL) < 0.01 THEN ROUND(CASE WHEN fc.IS_INFRA=1 THEN sm.VAL*1.1 ELSE fc.FALLBACK_AMT END, 2) ELSE cr.VAL END AS VAL
    FROM ctrt_months_raw cr
    JOIN site_months sm ON sm.FLDCODE=cr.FLDCODE AND sm.YYMM=cr.YYMM
    JOIN fallback_calc fc ON fc.FLDCODE=cr.FLDCODE
  ),
  sale_months AS (
    SELECT bb.FLDCODE, bb.YYMM, ct.VAL - bb.VAL AS VAL
    FROM bsns_bdg_months bb JOIN ctrt_months ct ON ct.FLDCODE=bb.FLDCODE AND ct.YYMM=bb.YYMM
  ),
  gp_months AS (
    SELECT ct.FLDCODE, ct.YYMM, CASE WHEN ct.VAL = 0 THEN 0 ELSE ROUND(sl.VAL/ct.VAL*100,2) END AS VAL
    FROM ctrt_months ct JOIN sale_months sl ON sl.FLDCODE=ct.FLDCODE AND sl.YYMM=ct.YYMM
  ),
  tot_months AS (
    SELECT bb.FLDCODE, bb.YYMM, bb.VAL + oh.VAL AS VAL
    FROM bsns_bdg_months bb JOIN ovhd_months oh ON oh.FLDCODE=bb.FLDCODE AND oh.YYMM=bb.YYMM
  )
  SELECT
    af.FLDCODE,
    (SELECT MAX(FM.ACNT_FLDCODE) FROM CBTB_FLD_MAPPING FM WHERE FM.FLDCODE = af.FLDCODE) AS SITE_CODE,
    FUN_GET_FLDNAME(af.FLDCODE) AS PROJECT_NAME,
    cm.MM AS YYMM,
    ROUND(bb.VAL,2) AS BUSINESS_BUDGET,
    ROUND(ct.VAL,2) AS CONTRACT_AMOUNT,
    ROUND(gp.VAL,2) AS GROSS_PROFIT_RATIO,
    rc.RATE AS RATE
  FROM all_flds af
  JOIN target_mm_calc cm ON cm.FLDCODE = af.FLDCODE
  JOIN bsns_bdg_months bb ON bb.FLDCODE = af.FLDCODE AND bb.YYMM = cm.MM
  JOIN ctrt_months ct ON ct.FLDCODE = af.FLDCODE AND ct.YYMM = cm.MM
  JOIN gp_months gp ON gp.FLDCODE = af.FLDCODE AND gp.YYMM = cm.MM
  JOIN rate_calc rc ON rc.FLDCODE = af.FLDCODE`,
  },

  "dashboard_common_siterate_1q.jsp": {
    sql: `SELECT
        A.FLDCODE,
        A.CTRTCURCODE,
        A.LCLCURCODE,
        A.BASECURCODE,
        A.RATEUSD AS RATE_USD,
        A.RATEKRW AS RATE_KRW
    FROM CBTB_CTRTSUMM A
    WHERE UPPER(A.FLDCODE) = UPPER(:site_code)`,
    binds: (params) => ({ site_code: params.site_code ?? "" }),
  },

  "dashboard_common_exchangerate_1q.jsp": {
    sql: `SELECT
        R.EXCHANGE_TYPE,
        R.BASEMONEY,
        R.CHGMONEY,
        R.YYMM,
        R.CHGRATIO AS RATE
    FROM CHTB_EXCHANGE_RATIO R
    WHERE R.EXCHANGE_TYPE = '.'
        AND R.BASEMONEY IN ('VND', 'USD', 'JYP', 'KRW')
        AND R.CHGMONEY IN ('VND', 'USD', 'JYP', 'KRW')
        AND R.YYMM = (SELECT MAX(YYMM) FROM CHTB_EXCHANGE_RATIO WHERE EXCHANGE_TYPE = '.' AND YYMM <= :as_of)
    ORDER BY R.CHGMONEY`,
    binds: (params) => ({ as_of: params.as_of || currentYYYYMM() }),
  },
};
