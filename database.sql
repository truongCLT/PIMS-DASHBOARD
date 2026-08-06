-- ============================================================
-- 1. BẢNG DỮ LIỆU TỶ GIÁ (FX Rates)
-- ============================================================
CREATE TABLE IF NOT EXISTS fx_rates (
    currency TEXT PRIMARY KEY CHECK (currency IN ('USD', 'KRW', 'VND')),
    rate DOUBLE PRECISION NOT NULL CHECK (rate > 0),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. NHÓM BẢNG ZAFUMU / CASHFLOW (cf_*)
-- ============================================================
CREATE TABLE IF NOT EXISTS cf_projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    division TEXT NOT NULL,
    item_name_in TEXT,
    item_name_out TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT cf_projects_name_division_uq UNIQUE (name, division)
);

CREATE TABLE IF NOT EXISTS cf_monthly_amounts (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES cf_projects(id) ON DELETE CASCADE,
    flow_type TEXT NOT NULL,
    bucket TEXT NOT NULL DEFAULT 'month',
    month DATE NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    CONSTRAINT cf_monthly_amounts_uq UNIQUE (project_id, flow_type, bucket, month)
);

-- ============================================================
-- 3. NHÓM BẢNG SALES & COST / DOANH THU - CHI PHÍ (sc_*)
-- ============================================================
CREATE TABLE IF NOT EXISTS sc_sites (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    biz_type TEXT,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sc_monthly (
    id SERIAL PRIMARY KEY,
    site_id INT NOT NULL REFERENCES sc_sites(id) ON DELETE CASCADE,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    metric TEXT NOT NULL CHECK (metric IN ('revenue','cogs','repair_allowance','site_cost','hq_transfer','sga','employees')),
    amount_vnd NUMERIC(20, 2),
    amount_usd NUMERIC(18, 4),
    CONSTRAINT sc_monthly_uq UNIQUE (site_id, year, month, metric)
);

-- ============================================================
-- 4. NHÓM BẢNG MANAGEMENT REPORT / BÁO CÁO QUẢN TRỊ (mr_*)
-- ============================================================
CREATE TABLE IF NOT EXISTS mr_projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    site_code TEXT,
    group_label TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'closed'))
);

CREATE TABLE IF NOT EXISTS mr_monthly (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES mr_projects(id) ON DELETE CASCADE,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    scenario TEXT NOT NULL CHECK (scenario IN ('plan', 'actual')),
    metric TEXT NOT NULL CHECK (metric IN ('revenue', 'cogs')),
    amount_usd NUMERIC(18, 4) NOT NULL,
    CONSTRAINT mr_monthly_uq UNIQUE (project_id, year, month, scenario, metric)
);

CREATE TABLE IF NOT EXISTS mr_annual (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES mr_projects(id) ON DELETE CASCADE,
    year INT NOT NULL,
    scenario TEXT NOT NULL CHECK (scenario IN ('plan', 'actual', 'forecast')),
    metric TEXT NOT NULL CHECK (metric IN ('revenue', 'cogs')),
    amount_usd NUMERIC(18, 4) NOT NULL,
    CONSTRAINT mr_annual_uq UNIQUE (project_id, year, scenario, metric)
);

CREATE TABLE IF NOT EXISTS mr_pnl (
    id SERIAL PRIMARY KEY,
    year INT NOT NULL,
    line_code TEXT NOT NULL,
    line_label TEXT NOT NULL,
    scenario TEXT NOT NULL CHECK (scenario IN ('plan', 'actual')),
    month INT CHECK (month IS NULL OR (month BETWEEN 1 AND 12)),
    amount_usd NUMERIC(18, 4) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT mr_pnl_uq UNIQUE (year, line_code, scenario, month)
);

CREATE TABLE IF NOT EXISTS mr_comments (
    id SERIAL PRIMARY KEY,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    section TEXT NOT NULL CHECK (section IN ('analysis', 'outlook')),
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mr_import_history (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    filename TEXT NOT NULL,
    year INT NOT NULL,
    snapshot JSONB NOT NULL
);

-- ============================================================
-- 5. NHÓM BẢNG PROJECT DETAIL / CHI TIẾT DỰ ÁN (pd_*)
-- ============================================================
CREATE TABLE IF NOT EXISTS pd_overview (
    id SERIAL PRIMARY KEY,
    project_name TEXT NOT NULL UNIQUE,
    contract_amount NUMERIC(18, 4),
    start_date TEXT,
    end_date TEXT,
    client TEXT,
    scale TEXT,
    as_of_month TEXT,
    scope TEXT,
    revenue_annual_target NUMERIC(18, 4),
    revenue_total NUMERIC(18, 4),
    cash_confirmed NUMERIC(18, 4),
    cash_collection NUMERIC(18, 4)
);

CREATE TABLE IF NOT EXISTS pd_progress_monthly (
    id SERIAL PRIMARY KEY,
    project_name TEXT NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    plan_pct NUMERIC(9, 4),
    actual_pct NUMERIC(9, 4),
    plan_cum_pct NUMERIC(9, 4),
    actual_cum_pct NUMERIC(9, 4),
    CONSTRAINT pd_progress_monthly_uq UNIQUE (project_name, year, month)
);

CREATE TABLE IF NOT EXISTS pd_milestones (
    id SERIAL PRIMARY KEY,
    project_name TEXT NOT NULL,
    label TEXT NOT NULL,
    plan_start TEXT,
    plan_end TEXT,
    actual_start TEXT,
    actual_end TEXT,
    sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS pd_milestones_project_idx ON pd_milestones(project_name);

CREATE TABLE IF NOT EXISTS pd_cost_estimation (
    id SERIAL PRIMARY KEY,
    project_name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('bidding', 'execution', 'completion')),
    contract_amount NUMERIC(18, 4),
    cost_amount NUMERIC(18, 4),
    year INT,
    month INT,
    CONSTRAINT pd_cost_estimation_uq UNIQUE NULLS NOT DISTINCT (project_name, kind, year, month)
);

CREATE TABLE IF NOT EXISTS pd_cost_budget (
    id SERIAL PRIMARY KEY,
    project_name TEXT NOT NULL,
    category TEXT,
    item TEXT NOT NULL,
    budget NUMERIC(18, 4),
    plan NUMERIC(18, 4),
    actual NUMERIC(18, 4),
    sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS pd_cost_budget_project_idx ON pd_cost_budget(project_name);

CREATE TABLE IF NOT EXISTS pd_cost_budget_monthly (
    id SERIAL PRIMARY KEY,
    project_name TEXT NOT NULL,
    item TEXT NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    plan NUMERIC(18, 4),
    actual NUMERIC(18, 4),
    CONSTRAINT pd_cost_budget_monthly_uq UNIQUE (project_name, item, year, month)
);

CREATE TABLE IF NOT EXISTS pd_cashflow_monthly (
    id SERIAL PRIMARY KEY,
    project_name TEXT NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    cash_in NUMERIC(18, 4),
    cash_out NUMERIC(18, 4),
    equivalent NUMERIC(18, 4),
    CONSTRAINT pd_cashflow_monthly_uq UNIQUE (project_name, year, month)
);

CREATE TABLE IF NOT EXISTS pd_cogs_monthly (
    id SERIAL PRIMARY KEY,
    project_name TEXT NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    acct_cogs NUMERIC(18, 4),
    wip_cogs NUMERIC(18, 4),
    CONSTRAINT pd_cogs_monthly_uq UNIQUE (project_name, year, month)
);

CREATE TABLE IF NOT EXISTS pd_sales_monthly (
    id SERIAL PRIMARY KEY,
    project_name TEXT NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    plan NUMERIC(18, 4),
    actual NUMERIC(18, 4),
    CONSTRAINT pd_sales_monthly_uq UNIQUE (project_name, year, month)
);

CREATE TABLE IF NOT EXISTS pd_photos (
    id SERIAL PRIMARY KEY,
    project_name TEXT NOT NULL,
    object_path TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS pd_photos_project_idx ON pd_photos(project_name);

CREATE TABLE IF NOT EXISTS pd_outsourcing (
    id SERIAL PRIMARY KEY,
    project_name TEXT NOT NULL,
    trade_group TEXT,
    trade TEXT NOT NULL,
    vendor TEXT,
    category TEXT,
    contract_date TEXT,
    change_no TEXT,
    budget NUMERIC(18, 4),
    executed_budget NUMERIC(18, 4),
    resolved NUMERIC(18, 4),
    this_month NUMERIC(18, 4),
    accum NUMERIC(18, 4),
    sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS pd_outsourcing_project_idx ON pd_outsourcing(project_name);

CREATE TABLE IF NOT EXISTS pd_comments (
    id SERIAL PRIMARY KEY,
    project_name TEXT NOT NULL,
    tab TEXT NOT NULL CHECK (tab IN ('overview','progress','costing','outsourcing','cashflow','saleprofit','budget','service')),
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pd_comments_project_tab_idx ON pd_comments(project_name, tab);
