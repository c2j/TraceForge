// ============================================================================
// TraceForge Desktop - TypeScript Types
// Matches database schema in src-tauri/database/schema.sql
// ============================================================================

// ============================================================================
// Common Types
// ============================================================================

export type ScriptStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type TestPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type ExecutionStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type StepStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';
export type ActionType = 'NAVIGATE' | 'CLICK' | 'HOVER' | 'FILL' | 'SELECT' | 'ASSERT' | 'WAIT' | 'EXTRACT' | 'EXECUTE';
export type LocatorType = 'CSS' | 'XPATH' | 'TEXT' | 'ARIA' | 'TEST_ID' | 'ROLE' | 'DATA';
export type KernelStatus = 'ACTIVE' | 'INACTIVE' | 'DEPRECATED';
export type SourceType = 'CSV' | 'EXCEL' | 'JSON' | 'DATABASE';
export type DataType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE';

// ============================================================================
// Core Entities
// ============================================================================

export interface Project {
  id: string;
  name: string;
  version: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  sync_enabled: boolean;
  last_sync_at: string | null;
}

export interface Kernel {
  id: string;
  name: string;
  executable_path: string;
  version: string;
  is_compatible: boolean;
  is_default_record: boolean;
  is_default_agent: boolean;
  status: KernelStatus;
  added_at: string;
  last_tested_at: string | null;
}

export interface Script {
  id: string;
  project_id: string;
  name: string;
  version: string;
  priority: TestPriority;
  description: string | null;
  created_at: string;
  updated_at: string;
  last_executed_at: string | null;
  status: ScriptStatus;
}

export interface Scenario {
  id: string;
  script_id: string;
  name: string;
  priority: TestPriority;
  description: string | null;
  order_index: number;
}

export interface Page {
  id: string;
  scenario_id: string;
  name: string;
  entry_url: string | null;
  default_wait: string | null;
  order_index: number;
}

export interface Action {
  id: string;
  page_id: string;
  name: string;
  action_type: ActionType;
  order_index: number;
  timeout_ms: number;
  wait_after: string | null;
  screenshot_enabled: boolean;
}

export interface Locator {
  id: string;
  action_id: string;
  locator_type: LocatorType;
  value: string;
  priority: number;
  is_fallback: boolean;
  description: string | null;
}

export interface Parameter {
  id: string;
  action_id: string;
  key: string;
  value: string;
  data_type: DataType;
}

export interface Execution {
  id: string;
  script_id: string;
  kernel_id: string;
  status: ExecutionStatus;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  data_row_index: number | null;
  trace_path: string | null;
  error_message: string | null;
}

export interface ExecutionStep {
  id: string;
  execution_id: string;
  action_id: string;
  status: StepStatus;
  started_at: string;
  completed_at: string;
  duration_ms: number | null;
  screenshot_path: string | null;
  log_output: string | null;
  error_message: string | null;
}

export interface DataTable {
  id: string;
  script_id: string;
  name: string;
  source_type: SourceType;
  file_path: string | null;
  columns: string; // JSON string of column definitions
  created_at: string;
  updated_at: string;
}

export interface DataRow {
  id: string;
  data_table_id: string;
  row_index: number;
  values: string; // JSON string of row values
}

// ============================================================================
// Nested/Composite Types for UI
// ============================================================================

export interface ScriptWithScenarios extends Script {
  scenarios?: Scenario[];
}

export interface ScenarioWithPages extends Scenario {
  pages?: PageWithActions[];
}

export interface PageWithActions extends Page {
  actions?: ActionWithLocators[];
}

export interface ActionWithLocators extends Action {
  locators?: Locator[];
  parameters?: Parameter[];
}

export interface FullScriptTree {
  script: Script;
  scenarios: ScenarioWithPages[];
}

export interface ExecutionWithSteps extends Execution {
  steps?: ExecutionStep[];
  script?: Script;
  kernel?: Kernel;
}

// ============================================================================
// Form/DTO Types
// ============================================================================

export interface CreateProjectDto {
  name: string;
  version: string;
  description?: string;
}

export interface UpdateProjectDto {
  name?: string;
  version?: string;
  description?: string;
}

export interface CreateScriptDto {
  project_id: string;
  name: string;
  priority: TestPriority;
  description?: string;
}

export interface UpdateScriptDto {
  name?: string;
  description?: string;
  status?: ScriptStatus;
}

export interface CreateScenarioDto {
  script_id: string;
  name: string;
  priority: TestPriority;
  description?: string;
  order_index: number;
}

export interface CreatePageDto {
  scenario_id: string;
  name: string;
  entry_url?: string;
  default_wait?: string;
  order_index: number;
}

export interface CreateActionDto {
  page_id: string;
  name: string;
  action_type: ActionType;
  timeout_ms: number;
  wait_after?: string;
  screenshot_enabled?: boolean;
  order_index: number;
}

export interface CreateLocatorDto {
  action_id: string;
  locator_type: LocatorType;
  value: string;
  priority: number;
  is_fallback?: boolean;
  description?: string;
}

export interface CreateParameterDto {
  action_id: string;
  key: string;
  value: string;
  data_type: DataType;
}

export interface CreateExecutionDto {
  script_id: string;
  kernel_id: string;
}

export interface UpdateExecutionDto {
  status: ExecutionStatus;
  error_message?: string;
  trace_path?: string;
}

// ============================================================================
// Engine/Connection Types
// ============================================================================

export interface EngineStatus {
  engine_id: string;
  kernel_id: string;
  status: 'IDLE' | 'BUSY' | 'STOPPED' | 'ERROR';
  connected: boolean;
  uptime_ms: number;
}

export interface EngineLogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  source: string;
}

export interface WebSocketMessage {
  type: 'ENGINE_STATUS' | 'EXECUTION_UPDATE' | 'LOG' | 'ERROR' | 'HANDSHAKE' | 'RESPONSE';
  payload: unknown;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface TreeNode {
  id: string;
  name: string;
  type: 'project' | 'script' | 'scenario' | 'page' | 'action';
  children?: TreeNode[];
  expanded?: boolean;
  selected?: boolean;
}

export interface TabState {
  id: string;
  title: string;
  type: 'script' | 'execution' | 'settings';
  closable: boolean;
  active: boolean;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// ============================================================================
// Filter/Query Types
// ============================================================================

export interface ProjectFilter {
  search?: string;
  sync_enabled?: boolean;
}

export interface ScriptFilter {
  project_id?: string;
  status?: ScriptStatus;
  priority?: TestPriority;
  search?: string;
}

export interface ExecutionFilter {
  script_id?: string;
  kernel_id?: string;
  status?: ExecutionStatus;
  date_from?: string;
  date_to?: string;
}

// ============================================================================
// Export Types
// ============================================================================

export interface ExportOptions {
  format: 'JSON' | 'CSV' | 'YAML';
  include_data?: boolean;
  include_results?: boolean;
}

export interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
}
