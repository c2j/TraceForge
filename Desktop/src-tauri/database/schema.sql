-- TraceForge Desktop SQLite Schema
-- Version: 1.0.0
-- Created: 2025-12-16

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    version TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_enabled INTEGER DEFAULT 0,
    last_sync_at TEXT
);

-- Scripts table
CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2')),
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_executed_at TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DRAFT', 'ARCHIVED')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    script_id TEXT NOT NULL,
    name TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2')),
    description TEXT,
    order_index INTEGER NOT NULL,
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
);

-- Pages table
CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL,
    name TEXT NOT NULL,
    entry_url TEXT,
    default_wait TEXT CHECK (default_wait IN ('load', 'networkidle', 'domcontentloaded')),
    order_index INTEGER NOT NULL,
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
);

-- Actions table
CREATE TABLE IF NOT EXISTS actions (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    name TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('navigate', 'click', 'fill', 'hover', 'wait', 'assert', 'screenshot', 'scroll', 'keyboard')),
    order_index INTEGER NOT NULL,
    timeout_ms INTEGER DEFAULT 30000,
    wait_after TEXT,
    screenshot_enabled INTEGER DEFAULT 1,
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);

-- Locator Strategies table
CREATE TABLE IF NOT EXISTS locator_strategies (
    id TEXT PRIMARY KEY,
    action_id TEXT NOT NULL,
    locator_type TEXT NOT NULL CHECK (locator_type IN ('role', 'text', 'css', 'xpath', 'id')),
    value TEXT NOT NULL,
    priority INTEGER NOT NULL,
    is_fallback INTEGER DEFAULT 0,
    description TEXT,
    FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
);

-- Parameters table
CREATE TABLE IF NOT EXISTS parameters (
    id TEXT PRIMARY KEY,
    action_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'url', 'variable')),
    FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
);

-- Kernels table
CREATE TABLE IF NOT EXISTS kernels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    executable_path TEXT NOT NULL,
    version TEXT NOT NULL,
    is_compatible INTEGER DEFAULT 1,
    is_default_record INTEGER DEFAULT 0,
    is_default_agent INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ERROR')),
    added_at TEXT NOT NULL,
    last_tested_at TEXT
);

-- Executions table
CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY,
    script_id TEXT NOT NULL,
    kernel_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'SKIP', 'RUNNING')),
    started_at TEXT NOT NULL,
    completed_at TEXT,
    duration_ms INTEGER,
    data_row_index INTEGER,
    trace_path TEXT,
    error_message TEXT,
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE,
    FOREIGN KEY (kernel_id) REFERENCES kernels(id) ON DELETE CASCADE
);

-- Execution Steps table
CREATE TABLE IF NOT EXISTS execution_steps (
    id TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL,
    action_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'SKIP')),
    started_at TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    duration_ms INTEGER,
    screenshot_path TEXT,
    log_output TEXT,
    error_message TEXT,
    FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE,
    FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
);

-- Data Tables table
CREATE TABLE IF NOT EXISTS data_tables (
    id TEXT PRIMARY KEY,
    script_id TEXT NOT NULL,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('CSV', 'EXCEL', 'MANUAL')),
    file_path TEXT,
    columns TEXT NOT NULL, -- JSON array
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
);

-- Data Rows table
CREATE TABLE IF NOT EXISTS data_rows (
    id TEXT PRIMARY KEY,
    data_table_id TEXT NOT NULL,
    row_index INTEGER NOT NULL,
    json_data TEXT NOT NULL, -- JSON object
    FOREIGN KEY (data_table_id) REFERENCES data_tables(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scripts_project ON scripts(project_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_script ON scenarios(script_id);
CREATE INDEX IF NOT EXISTS idx_pages_scenario ON pages(scenario_id);
CREATE INDEX IF NOT EXISTS idx_actions_page ON actions(page_id);
CREATE INDEX IF NOT EXISTS idx_locators_action ON locator_strategies(action_id);
CREATE INDEX IF NOT EXISTS idx_params_action ON parameters(action_id);
CREATE INDEX IF NOT EXISTS idx_executions_script ON executions(script_id);
CREATE INDEX IF NOT EXISTS idx_executions_kernel ON executions(kernel_id);
CREATE INDEX IF NOT EXISTS idx_execution_steps_execution ON execution_steps(execution_id);
CREATE INDEX IF NOT EXISTS idx_data_rows_table ON data_rows(data_table_id);
