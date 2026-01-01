// TraceForge Desktop TypeScript Type Definitions
// Version: 1.0.0

export interface Project {
  id: string;
  name: string;
  version: string;
  description?: string;
  created_at: string;
  updated_at: string;
  sync_enabled: boolean;
  last_sync_at?: string;
}

export interface Script {
  id: string;
  project_id: string;
  name: string;
  version: string;
  priority: 'P0' | 'P1' | 'P2';
  description?: string;
  created_at: string;
  updated_at: string;
  last_executed_at?: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  scenarios: Scenario[];
  data_driven?: DataDrivenConfig;
}

export interface Scenario {
  id: string;
  script_id: string;
  name: string;
  priority: 'P0' | 'P1' | 'P2';
  description?: string;
  order_index: number;
  pages: Page[];
}

export interface Page {
  id: string;
  scenario_id: string;
  name: string;
  entry_url?: string;
  default_wait?: 'load' | 'networkidle' | 'domcontentloaded';
  order_index: number;
  actions: Action[];
}

export interface Action {
  id: string;
  page_id: string;
  name: string;
  action_type: 'navigate' | 'click' | 'fill' | 'hover' | 'wait' | 'assert' | 'screenshot' | 'scroll' | 'keyboard';
  order_index: number;
  timeout_ms: number;
  wait_after?: string;
  screenshot_enabled: boolean;
  parameters: Parameter[];
  locators: LocatorStrategy[];
}

export interface LocatorStrategy {
  id: string;
  action_id: string;
  locator_type: 'role' | 'text' | 'css' | 'xpath' | 'id';
  value: string;
  priority: number;
  is_fallback: boolean;
  description?: string;
}

export interface Parameter {
  id: string;
  action_id: string;
  key: string;
  value: string;
  data_type: 'string' | 'number' | 'boolean' | 'url' | 'variable';
}

export interface Kernel {
  id: string;
  name: string;
  executable_path: string;
  version: string;
  is_compatible: boolean;
  is_default_record: boolean;
  is_default_agent: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  added_at: string;
  last_tested_at?: string;
}

export interface Execution {
  id: string;
  script_id: string;
  kernel_id: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'RUNNING';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  data_row_index?: number;
  trace_path?: string;
  error_message?: string;
  steps: ExecutionStep[];
}

export interface ExecutionStep {
  id: string;
  execution_id: string;
  action_id: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  started_at: string;
  completed_at: string;
  duration_ms?: number;
  screenshot_path?: string;
  log_output?: string;
  error_message?: string;
}

export interface DataTable {
  id: string;
  script_id: string;
  name: string;
  source_type: 'CSV' | 'EXCEL' | 'MANUAL';
  file_path?: string;
  columns: string[];
  created_at: string;
  updated_at: string;
  rows: DataRow[];
}

export interface DataRow {
  id: string;
  data_table_id: string;
  row_index: number;
  json_data: Record<string, string>;
}

export interface DataDrivenConfig {
  enabled: boolean;
  data_source: string;
  variables: DataVariable[];
}

export interface DataVariable {
  name: string;
  column: string;
}

// WebSocket Message Types
export interface WSMessage {
  id: string;
  type: 'request' | 'response' | 'event' | 'error';
  action: string;
  timestamp: string;
  trace_id: string;
  payload?: any;
}

export interface RecordingEvent {
  action: Action;
  screenshot?: string;
  timestamp: string;
}

export interface ExecutionEvent {
  execution_id: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'RUNNING';
  current_step?: number;
  total_steps?: number;
  step_results?: ExecutionStep[];
  screenshots?: Array<{
    step_id: string;
    data: string;
  }>;
}

// UI State Types
export interface EngineState {
  connected: boolean;
  port?: number;
  currentSession?: string;
  error?: string;
}

export interface DBState {
  projects: Project[];
  scripts: Script[];
  kernels: Kernel[];
  executions: Execution[];
  loading: boolean;
  error?: string;
}

export interface SyncState {
  server_url?: string;
  connected: boolean;
  last_sync?: string;
  pending_changes: number;
  conflicts: SyncConflict[];
}

export interface SyncConflict {
  script_id: string;
  local_modified: string;
  server_modified: string;
  local_version: string;
  server_version: string;
}

// Component Props Types
export interface TreeNode {
  id: string;
  name: string;
  type: 'scenario' | 'page' | 'action';
  children?: TreeNode[];
  data?: any;
}

export interface ScreenshotViewerProps {
  screenshot?: string;
  stepId?: string;
  onHighlight?: (selector: string) => void;
}

export interface KernelSelectorProps {
  selectedKernelId?: string;
  onSelect: (kernelId: string) => void;
  allowMultiple?: boolean;
}

export interface EditorProps {
  scriptId: string;
  onSave: (script: Script) => void;
  onExecute: (script: Script, options: ExecutionOptions) => void;
}

export interface ExecutionOptions {
  kernel_id: string;
  headless: boolean;
  start_from_scenario?: string;
  start_from_page?: string;
  data_row_index?: number;
}

// Dashboard Types
export interface DashboardMetrics {
  pass_rate: number;
  failures: number;
  coverage: number;
  scripts: number;
  trend_data: TrendData[];
}

export interface TrendData {
  date: string;
  pass: number;
  fail: number;
  skip: number;
}
