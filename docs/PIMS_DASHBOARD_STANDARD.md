# PIMS Dashboard 2 — 공식 기준 명세서
> **버전**: 2026-08-05 기준  
> **스크린샷**: `attached_assets/pims-dashboard-2-baseline.jpg`  
> **소스 경로**: `artifacts/pims-dashboard-2/`

이 문서는 PIMS Dashboard 2를 모든 디자인·기능 개발의 공식 기준(baseline)으로 정의합니다.  
변경 사항은 이 문서와 대조하여 검토해야 합니다.

---

## 1. 디자인 시스템 (Design Tokens)

### 1.1 색상 팔레트

| 용도 | 토큰명 | HEX | 적용 위치 |
|------|--------|-----|-----------|
| KPI 카드 배경 | `kpi.cardBg` | `#33415f` | KPI 카드 기본 배경 |
| 대시보드 캔버스 | `dashboard.bg` | `#e8edf3` | 메인 스크롤 영역 |
| 사이드바 배경 | `sidebar.bg` | `#ffffff` | 좌측 메뉴 패널 |
| 사이드바 구분선 | `sidebar.border` | `1px solid #d5dce6` | 사이드바 우측 테두리 |
| 활성 메뉴 배경 | `sidebar.activeItemBg` | `#dbe6f5` | 선택된 트리 항목 |
| 최상위 메뉴 텍스트 | `sidebar.topLevelColor` | `#1a2d4d` | 1depth 메뉴 |
| 2depth 메뉴 텍스트 | `sidebar.midLevelColor` | `#2a3d55` | 그룹명 |
| 3depth 메뉴 텍스트 | `sidebar.subLevelColor` | `#44546a` | 프로젝트명 |
| 위젯 카드 배경 | - | `#ffffff` | SalesChart 등 차트 카드 |
| 위젯 카드 테두리 | - | `1px solid #d0dce8` | 차트 카드 외곽선 |
| 차트 계획선 | `chartTheme.plan` | `#2b5cad` | 매출 계획 라인 |
| 차트 실적선 | `chartTheme.actual` | `#2e8b3d` | 매출 실적 라인 |
| 차트 달성률 | `chartTheme.rate` | `#e67e22` | 달성률 % 표시 |
| 헤더 네이비 | - | `#1a3a6b` | 프로젝트 대시보드 헤더 |
| 강조 블루 | - | `#4472c4` | 버튼, 링크 |
| 성공 녹색 | - | `#2e8b3d` | 양호 달성률 |
| 경고 주황 | - | `#e67e22` | 낮은 달성률 |
| 위험 빨강 | - | `#e74c3c` | 매우 낮은 달성률 |

### 1.2 타이포그래피

| 용도 | 폰트 패밀리 | 크기 | 굵기 |
|------|-------------|------|------|
| 전체 기본 | `'Noto Sans KR', 'Inter', sans-serif` | - | - |
| KPI 카드 제목 | 동일 | `clamp(12px,0.95vw,16px)` | 600 |
| KPI 계획/실적 수치 | 동일 | `clamp(18px,1.7vw,30px)` | 700 |
| KPI 달성률 | 동일 | `clamp(18px,1.7vw,30px)` | 700 |
| 사이드바 1depth | 동일 | `12px` | 700 |
| 사이드바 2~3depth | 동일 | `11px` | 600 / 400 |
| 위젯 타이틀 | 동일 | `13px` | 600 |

### 1.3 레이아웃 격자

```
┌─ Sidebar (170px fixed) ──┬─ Main Content (flex: 1) ───────────────────┐
│                          │  ┌─ DashboardHeader (필터 바) ────────────┐ │
│  DECV TOTAL (클릭 가능)  │  │  프로젝트 / 조회기간 / 기준 / 통화     │ │
│  └─ DECV                 │  │  단위 토글(K/1) / 다운로드 버튼        │ │
│     ├─ 시공              │  └────────────────────────────────────────┘ │
│     │  ├─ 진행중         │  ┌─ KPI Cards (flex row, gap 8px) ────────┐ │
│     │  └─ 종료           │  │  당월매출 | 당월영업이익 | 연간누적매출 | 연간누적영업이익 │ │
│     └─ 용역              │  └────────────────────────────────────────┘ │
│  TCC                     │  ┌─ Row2 (grid 1fr 1fr 330px, gap 6px) ──┐ │
│  DE HEIM                 │  │  SalesChart | ProfitChart | OrderStatus │ │
│                          │  └────────────────────────────────────────┘ │
│  [PIMS 브랜딩 이미지]    │  ┌─ Row3 (grid 1fr 1fr 330px, gap 6px) ──┐ │
│  (관리자 모드 진입 클릭) │  │  CashFlowChart | PerformanceTable | DrilldownCard │ │
│                          │  └────────────────────────────────────────┘ │
│                          │  ┌─ Row4 (grid 1fr 1fr, gap 6px) ─────────┐ │
│                          │  │  CommentPanel(실적) | CommentPanel(전망)│ │
└──────────────────────────┴──└────────────────────────────────────────┘─┘
```

### 1.4 간격(Spacing) 규칙

| 구역 | padding |
|------|---------|
| DashboardHeader wrapper | `10px 10px 0` |
| KPI Cards wrapper | `8px 10px 4px` |
| Row 2 / Row 3 grid | `4px 10px` |
| Row 4 (댓글 행) | `4px 10px 10px` |
| Grid row gap | `6px` |
| KPI Card 내부 | `12px 16px` |
| KPI Cards 간격 | `8px` |

---

## 2. 컴포넌트 명세

### 2.1 전체 관리 대시보드 (Dashboard view)

| 컴포넌트 | 파일 | 역할 |
|----------|------|------|
| `Sidebar` | `components/Sidebar.tsx` | 좌측 프로젝트 트리 네비게이션. 범위(scope) 선택 → Dashboard 데이터 필터링. 브랜딩 클릭 → 관리자 로그인 |
| `Dashboard` | `components/Dashboard.tsx` | 전체 레이아웃 컨테이너. `DashboardFilterProvider`로 하위에 필터 공급 |
| `DashboardHeader` | `components/DashboardHeader.tsx` | 프로젝트·기간·기준·통화 선택. 단위 토글(K USD ↔ USD). PDF/Excel 다운로드. 관리자: 업로드 버튼 |
| `KPICards` | `components/KPICards.tsx` | 당월 매출·영업이익 / 연간 누적 매출·영업이익 (계획·실적·달성률 표시) |
| `SalesChart` | `components/SalesChart.tsx` | 월별 매출 계획 vs. 실적/전망 라인 차트. 달성률 뱃지. 넷/리포트 토글 |
| `ProfitChart` | `components/ProfitChart.tsx` | 월별 손익 스택드 바 차트 (영업이익·판관비·영업손익). 호버 시 세부 툴팁 |
| `OrderStatus` | `components/OrderStatus.tsx` | 수주 실적 도넛 차트 + 계획·수주·잔여 수치 |
| `CashFlowChart` | `components/CashFlowChart.tsx` | 자금수지 복합 차트 (자금유입·유출 바 + 누적잔액 라인). 범위별 필터 |
| `PerformanceTable` | `components/PerformanceTable.tsx` | 경영실적 현황 표 (수주·매출·매출이익·판관비·영업이익·경상이익 — 당월누적·연간) |
| `DrilldownCard` | `components/DrilldownCard.tsx` | 상세 정보(드릴다운) — 수주 실적 요약 + 금월 주요 매출 프로젝트 목록 |
| `CommentPanel` | `components/CommentPanel.tsx` | 실적 분석 / 전망 텍스트. 관리자: 편집·저장·삭제 |

### 2.2 프로젝트 상세 대시보드

#### 시공 프로젝트 (`ProjectDashboard`)

| 탭 | 컴포넌트 | 주요 내용 |
|----|----------|-----------|
| 개요 | `OverviewTab` | 수주금액·진행률·현금 KPI / 연·누계 매출·원가율 도넛 / 프로젝트 기본정보 |
| 공정 | `ConstructionProgressTab` | 공정 진도 테이블 + Lifecycle 바 차트 |
| 매출/원가 | `SaleProfitTab` | 월별 매출·원가·이익 테이블 + 차트 |
| 외주 | `OutsourcingTab` | 외주비 예산·집행·잔액 테이블 (집행율 포함) |
| 비용 | `CostingTab` | Direct/Indirect Cost 예산 집행 현황 진척바 |
| 자금수지 | `ServiceCashflowTab` | 프로젝트 자금수지 표 |
| 데이터 입력 | `ProjectDataEntryTab` | 관리자 전용 — 공정·현금·마일스톤 등 수동 입력 (VND/USD 지원) |

#### 용역 프로젝트 (`ServiceProjectDashboard`)

| 탭 | 컴포넌트 | 주요 내용 |
|----|----------|-----------|
| 개요 | `OverviewTab` | 동일 구조 (용역용 데이터) |
| 매출/원가 | `SaleProfitTab` | 동일 |
| 외주 | `ServiceOutsourcingTab` | 용역 외주비 테이블 |
| 예산집행 | `ServiceBudgetTab` | 예산 집행 현황 진척바 |
| 자금수지 | `ServiceCashflowTab` | 동일 |
| 데이터 입력 | `ProjectDataEntryTab` | 동일 (관리자 전용) |

### 2.3 공통 유틸리티 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| `MgmtReportUploadModal` | Excel 업로드 (경영보고·자금수지·매출원가). 반영 이력 관리 및 되돌리기 |
| `FxRateEditor` | 환율 설정 (USD·VND·KRW). 관리자 전용 |
| `AdminLoginScreen` | 관리자 비밀번호 로그인 화면 |
| `PhotoPager` | 프로젝트 현장 사진 갤러리 |
| `ProjectCommentPanel` | 탭별 프로젝트 코멘트 |
| `charts.tsx` | 공유 SVG 프리미티브 (`Donut`, `MiniBar`) |

---

## 3. 기능 명세

### 3.1 글로벌 필터 (`DashboardFilters` Context)

| 필터 | 옵션 | 기본값 |
|------|------|--------|
| 프로젝트 | 전체 / 개별 프로젝트 선택 | 전체 |
| 조회 기간 | 시작월 → 종료월 (date picker) | 빈 값 |
| 조회 기준 | 월 / 연간 (PeriodMode) | 월 |
| 통화 | USD / KRW / VND | USD |
| 단위 | K USD / USD (unitIndex 0/1) | K USD (토글 On) |

### 3.2 네비게이션 범위 (Scope)

| Scope 값 | 의미 |
|----------|------|
| `전체` | DECV 전체 집계 |
| `시공` | 시공 부문 합계 |
| `용역` | 용역 부문 합계 |
| `시공-진행중` | 시공 진행 중 프로젝트만 |
| `시공-종료` | 시공 완료 프로젝트만 |
| `용역-진행중` | 용역 진행 중 프로젝트만 |
| `용역-종료` | 용역 완료 프로젝트만 |

### 3.3 내보내기 (Export)

| 형식 | 트리거 | 범위 |
|------|--------|------|
| Excel (.xlsx) | 다운로드 버튼 ▼ → Excel | 현재 필터 기준 전체 대시보드 데이터 |
| PDF | 다운로드 버튼 ▼ → PDF | `#dashboard-capture` div (KPI + 차트 + 표 영역) |
| 프로젝트 Excel 템플릿 | 프로젝트 탭 내 다운로드 버튼 | 개별 프로젝트 데이터 |

### 3.4 관리자 전용 기능 (Admin-only)

관리자 인증: 사이드바 하단 PIMS 로고 클릭 → 비밀번호 입력 (`ADMIN_PASSWORD` secret)

| 기능 | 위치 | 설명 |
|------|------|------|
| 경영보고 Excel 업로드 | DashboardHeader | 관리보고 워크북 파싱 후 API 저장 |
| 자금수지 Excel 업로드 | DashboardHeader | 자금수지 워크북 스트리밍 파싱 |
| 매출/원가 Excel 업로드 | DashboardHeader | 매출원가 워크북 파싱 |
| 반영 이력 되돌리기 | 업로드 모달 | 직전 업로드 상태로 복원 |
| 환율 설정 | DashboardHeader | USD·VND·KRW 환율 수동 조정 |
| 코멘트 편집 | CommentPanel | 실적 분석 / 전망 텍스트 편집 |
| 프로젝트 데이터 입력 | ProjectDataEntryTab | 공정률·현금·마일스톤 수동 입력 |
| 프로젝트 Excel 업로드 | ProjectDashboard | 개별 프로젝트 데이터 반영 |

### 3.5 다국어 통화 표시

| 통화 | 단위 K 기준 | 단위 1 기준 |
|------|-------------|-------------|
| USD | 천 USD | USD |
| KRW | 천 KRW | KRW |
| VND | 백만 VND | VND (소수 허용 예정) |

---

## 4. 테마 시스템

현재 적용된 5가지 테마 (우측 하단 🎨 버튼으로 전환):

| ID | 이름 | Swatch | 사이드바 | KPI 카드 | 캔버스 |
|----|------|--------|---------|---------|--------|
| `current` | 현재 (기준) | `#2e4568` | 흰색 | `#33415f` (다크 네이비) | `#e8edf3` (연청) |
| `dark-navy` | A — Dark Navy | `#00c9b1` | `#080f1c` (딥다크) | `#152236` + 틸 테두리 | `#0b1624` |
| `white-minimal` | B — Clean White | `#2563eb` | 흰색 + 파란 강조 | 흰 카드 + 파란 좌측 선 | `#f4f6fa` |
| `warm-earth` | C — Warm Earth | `#c67c3a` | `#3d2b1f` (테라코타) | 크림 카드 + 앰버 상단선 | `#f2ece3` |
| `slate-modern` | D — Slate Modern | `#06b6d4` | `#1e2d3d` (슬레이트) | 흰 카드 + 시안 좌측선 | `#eef2f8` |

> **기준 테마**: `current` — 이 문서의 모든 색상·레이아웃 명세는 `current` 테마 기준.

---

## 5. 데이터 흐름

```
API Server (artifacts/api-server, port 8080)
  ├─ GET  /api/mgmtreport/summary      → KPICards, SalesChart, ProfitChart 등
  ├─ GET  /api/mgmtreport/projects     → Sidebar 트리, 프로젝트 목록
  ├─ GET  /api/mgmtreport/comments     → CommentPanel
  ├─ GET  /api/cashflow/aggregate      → CashFlowChart
  ├─ GET  /api/fxrates                 → FxRateEditor, 통화 환산
  ├─ POST /api/mgmtreport/upload       → 경영보고 Excel 업로드 (admin)
  ├─ POST /api/cashflow/upload         → 자금수지 Excel 업로드 (admin)
  └─ POST /api/salescost/upload        → 매출원가 Excel 업로드 (admin)

Object Storage (S3-compatible)
  └─ 업로드된 데이터 JSON 영속 저장 및 이력 관리
```

---

## 6. 파일 구조 (핵심 경로)

```
artifacts/pims-dashboard-2/
├── src/
│   ├── App.tsx                    # 루트: ThemeProvider + AdminAuthProvider + 라우팅
│   ├── components/
│   │   ├── Dashboard.tsx          # 전체 대시보드 레이아웃
│   │   ├── DashboardHeader.tsx    # 필터 바 + 다운로드 + 업로드
│   │   ├── Sidebar.tsx            # 좌측 트리 네비게이션
│   │   ├── KPICards.tsx           # 상단 4개 KPI 카드
│   │   ├── SalesChart.tsx         # 매출 실적 및 전망 차트
│   │   ├── ProfitChart.tsx        # 손익현황 차트
│   │   ├── OrderStatus.tsx        # 수주 실적 현황
│   │   ├── CashFlowChart.tsx      # 자금수지 차트
│   │   ├── PerformanceTable.tsx   # 경영실적 현황 표
│   │   ├── DrilldownCard.tsx      # 상세정보 (드릴다운)
│   │   ├── CommentPanel.tsx       # 실적/전망 코멘트
│   │   ├── ProjectDashboard.tsx   # 시공 프로젝트 상세
│   │   ├── ServiceProjectDashboard.tsx  # 용역 프로젝트 상세
│   │   ├── OverviewTab.tsx        # 프로젝트 개요 탭
│   │   ├── MgmtReportUploadModal.tsx    # Excel 업로드 모달
│   │   └── ...
│   └── lib/
│       ├── theme.tsx              # 테마 컨텍스트 + 5가지 테마 정의
│       ├── dashboardFilters.tsx   # 글로벌 필터 컨텍스트
│       ├── mgmtreportData.ts      # API 데이터 가공 훅
│       ├── adminAuth.tsx          # 관리자 인증 컨텍스트
│       ├── exportDashboard.ts     # PDF/Excel 내보내기
│       └── chartTheme.ts          # 차트 색상 상수
└── vite.config.ts
```

---

## 7. 기준 스크린샷

**파일**: `attached_assets/pims-dashboard-2-baseline.jpg`  
**해상도**: 1920×1080  
**테마**: Current (기본)  
**뷰**: DECV TOTAL 전체 / K USD / 월 기준

---

*이 명세서는 PIMS Dashboard 2의 공식 기준입니다. 새 기능 개발, 디자인 변경, 타 대시보드로의 이식 시 이 문서를 기준으로 검토하십시오.*
