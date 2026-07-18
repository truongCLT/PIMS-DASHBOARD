# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB schema: `lib/db/src/schema/` — `cashflow.ts` (자금수지 cf_projects/cf_monthly_amounts), `salescost.ts` (매출/원가 sc_sites/sc_monthly), `mgmtreport.ts` (경영관리보고회 mr_projects/mr_monthly/mr_annual/mr_pnl)
- API contract: `lib/api-spec/openapi.yaml` (codegen via Orval → hooks/zod)
- API routes: `artifacts/api-server/src/routes/` (`cashflow.ts`, `salescost.ts`, `mgmtreport.ts`)
- Excel importers: `scripts/src/import-cashflow.ts`, `scripts/src/import-salescost.ts`, `scripts/src/import-mgmtreport.ts` (`pnpm --filter @workspace/scripts run import-mgmtreport [file] [year]`)
- Excel web upload (경영관리보고회/자금수지/매출·원가): parsers/apply in `artifacts/api-server/src/lib/mgmtreportImport.ts`, `cashflowImport.ts`, `salescostImport.ts` (mirror the CLI importers in `scripts/src/` — keep both in sync), shared multipart handling `excelUpload.ts` (25MB memory), admin-gated routes POST `/mgmtreport|cashflow|salescost/import/preview|apply` (full replace; cashflow needs no year), UI modal `artifacts/pims-dashboard-2/src/components/MgmtReportUploadModal.tsx` (dataset dropdown) opened from the "Excel 업로드" button in `DashboardHeader.tsx`
- pims-dashboard-2 main dashboard data: `artifacts/pims-dashboard-2/src/lib/mgmtreportData.ts` (useDashboardData hook derives KPI/실적표/차트 data from /mgmtreport/summary; Excel export reads the same snapshot)
- Project detail data (공정/원가/외주): DB schema `lib/db/src/schema/projectdetail.ts` (pd_* tables keyed by project_name), API `artifacts/api-server/src/routes/projectdetail.ts` (GET/PUT /projectdetail, PUT = full replace), client hook `artifacts/pims-dashboard-2/src/lib/projectDetailData.ts`; per-project 데이터 입력 screen at `artifacts/pims-dashboard-2/src/components/ProjectDataEntryTab.tsx` (side tab "데이터 입력"); tabs show "-" until data is entered

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- Respond to the user in Korean (pims-dashboard-2 work).
- pims-dashboard-2 Excel download must be a styled "경영실적보고" report sheet (title, embedded chart images, merged/bordered table, 실적 분석/전망 sections) — not plain data sheets. Raw data sheets follow the report sheet.
- pims-dashboard-2 PDF download must always capture at fixed desktop width (1720px) regardless of window size.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
