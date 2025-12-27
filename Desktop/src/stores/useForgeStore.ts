// ============================================================================
// TraceForge Desktop - Main Zustand Store
// State management for all domain entities
// ============================================================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Language } from '../locales';
import {
  Project,
  Script,
  Scenario,
  Page,
  Action,
  Locator,
  Parameter,
  Kernel,
  Execution,
  ExecutionStep,
  DataTable,
  DataRow,
  ScriptFilter,
  ExecutionFilter,
  TreeNode,
  TabState,
  Notification,
} from '../types';

// ============================================================================
// Main Store Interface
// ============================================================================

interface ForgeState {
  // UI State
  language: Language;
  sidebarCollapsed: boolean;
  activeTab: string | null;
  tabs: TabState[];
  notifications: Notification[];
  selectedNode: TreeNode | null;
  treeData: TreeNode[];

  // Projects
  projects: Project[];
  currentProject: Project | null;
  projectsLoading: boolean;

  // Scripts
  scripts: Script[];
  currentScript: Script | null;
  scriptsLoading: boolean;
  scriptFilter: ScriptFilter;

  // Scenarios
  scenarios: Scenario[];
  currentScenario: Scenario | null;

  // Pages
  pages: Page[];
  currentPage: Page | null;

  // Actions
  actions: Action[];
  currentAction: Action | null;

  // Locators & Parameters
  locators: Locator[];
  parameters: Parameter[];

  // Kernels
  kernels: Kernel[];
  currentKernel: Kernel | null;
  kernelsLoading: boolean;
  runningEngines: string[];

  // Executions
  executions: Execution[];
  currentExecution: Execution | null;
  executionsLoading: boolean;
  executionFilter: ExecutionFilter;
  executionSteps: ExecutionStep[];

  // Data Tables
  dataTables: DataTable[];
  dataRows: DataRow[];

  // Connection State
  engineConnected: boolean;
  enginePort: number;
  isConnected: boolean; // Alias for engineConnected - synced in setEngineConnected
  currentUser: string | null;

  // Actions - Projects
  loadProjects: () => Promise<void>;
  createProject: (name: string, version: string, description?: string) => Promise<string>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;

  // Actions - Scripts
  loadScripts: (projectId?: string) => Promise<void>;
  createScript: (projectId: string, name: string, priority: string, description?: string) => Promise<string>;
  updateScript: (id: string, data: Partial<Script>) => Promise<void>;
  deleteScript: (id: string) => Promise<void>;
  setCurrentScript: (script: Script | null) => void;
  setScriptFilter: (filter: ScriptFilter) => void;

  // Actions - Scenarios
  loadScenarios: (scriptId?: string) => Promise<void>;
  createScenario: (scriptId: string, name: string, priority: string, orderIndex: number, description?: string) => Promise<string>;
  updateScenario: (id: string, data: Partial<Scenario>) => Promise<void>;
  deleteScenario: (id: string) => Promise<void>;

  // Actions - Pages
  loadPages: (scenarioId?: string) => Promise<void>;
  createPage: (scenarioId: string, name: string, orderIndex: number, entryUrl?: string, defaultWait?: string) => Promise<string>;
  updatePage: (id: string, data: Partial<Page>) => Promise<void>;
  deletePage: (id: string) => Promise<void>;

  // Actions - Actions
  loadActions: (pageId?: string) => Promise<void>;
  createAction: (pageId: string, name: string, actionType: string, orderIndex: number, timeoutMs: number, waitAfter?: string, screenshotEnabled?: boolean) => Promise<string>;
  updateAction: (id: string, data: Partial<Action>) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;

  // Actions - Locators
  loadLocators: (actionId?: string) => Promise<void>;
  createLocator: (actionId: string, locatorType: string, value: string, priority: number, isFallback?: boolean, description?: string) => Promise<string>;
  updateLocator: (id: string, data: Partial<Locator>) => Promise<void>;
  deleteLocator: (id: string) => Promise<void>;

  // Actions - Parameters
  loadParameters: (actionId?: string) => Promise<void>;
  createParameter: (actionId: string, key: string, value: string, dataType: string) => Promise<string>;
  updateParameter: (id: string, data: Partial<Parameter>) => Promise<void>;
  deleteParameter: (id: string) => Promise<void>;

  // Actions - Kernels
  loadKernels: () => Promise<void>;
  createKernel: (name: string, executablePath: string, version: string) => Promise<string>;
  setCurrentKernel: (kernel: Kernel | null) => void;
  detectKernels: () => Promise<Kernel[]>;
  addKernelFromPath: (executablePath: string) => Promise<Kernel>;
  testKernelCompatibility: (kernelId: string, executablePath: string) => Promise<{passed: boolean; message: string}>;
  deleteKernel: (id: string) => Promise<void>;
  setDefaultKernel: (id: string) => Promise<void>;

  // Actions - Executions
  loadExecutions: (scriptId?: string) => Promise<void>;
  createExecution: (scriptId: string, kernelId: string) => Promise<string>;
  updateExecutionStatus: (id: string, status: string, errorMessage?: string, tracePath?: string) => Promise<void>;
  deleteExecution: (id: string) => Promise<void>;
  setCurrentExecution: (execution: Execution | null) => void;
  loadExecutionSteps: (executionId: string) => Promise<void>;
  runMultiKernelExecution: (scriptId: string, kernelIds: string[]) => Promise<string[]>;
  getConsolidatedResults: (scriptId: string, executionIds: string[]) => Promise<Map<string, Execution[]>>;

  // Actions - Data Tables
  loadDataTables: (projectId?: string) => Promise<void>;
  createDataTable: (scriptId: string, name: string, sourceType: string, columns: unknown) => Promise<string>;
  updateDataTable: (id: string, name: string) => Promise<void>;
  deleteDataTable: (id: string) => Promise<void>;
  loadDataRows: (tableId: string) => Promise<void>;
  createDataRow: (tableId: string, rowIndex: number, values: unknown) => Promise<string>;
  updateDataRow: (id: string, values: unknown) => Promise<void>;
  deleteDataRow: (id: string) => Promise<void>;

  // UI Actions
  setLanguage: (lang: Language) => void;
  toggleSidebar: () => void;
  toggleConnection: () => void;
  addTab: (tab: TabState) => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Getters (computed values)
  getProjectName: () => string | null;
  getProjectVersion: () => string | null;

  // Engine Actions
  spawnEngine: (kernelId: string) => Promise<void>;
  stopEngine: (engineId: string) => Promise<void>;
  stopAllEngines: () => Promise<void>;
  getRunningEngines: () => Promise<string[]>;
  isEngineRunning: (engineId: string) => Promise<boolean>;
  getEngineStatus: (engineId: string) => Promise<unknown>;
  restartEngine: (engineId: string) => Promise<void>;
  getEngineLogs: (engineId: string) => Promise<string>;
  sendEngineCommand: (engineId: string, command: string) => Promise<void>;

  // Tree Actions
  buildTreeData: () => void;
  setSelectedNode: (node: TreeNode | null) => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

// Helper to invoke Tauri commands
const invoke = async <T>(cmd: string, args?: unknown): Promise<T> => {
  if (window.__TAURI__?.invoke) {
    return window.__TAURI__.invoke(cmd, args);
  }
  // Mock for development
  return {} as T;
};

export const useForgeStore = create<ForgeState>()(
  devtools(
    persist(
      (set, get) => ({
        // ======================================================================
        // Initial State
        // ======================================================================

        // UI State
        language: 'en',
        sidebarCollapsed: false,
        activeTab: null,
        tabs: [],
        notifications: [],
        selectedNode: null,
        treeData: [],

        // Projects
        projects: [],
        currentProject: null,
        projectsLoading: false,

        // Scripts
        scripts: [],
        currentScript: null,
        scriptsLoading: false,
        scriptFilter: {},

        // Scenarios
        scenarios: [],
        currentScenario: null,

        // Pages
        pages: [],
        currentPage: null,

        // Actions
        actions: [],
        currentAction: null,

        // Locators & Parameters
        locators: [],
        parameters: [],

        // Kernels
        kernels: [],
        currentKernel: null,
        kernelsLoading: false,
        runningEngines: [],

        // Executions
        executions: [],
        currentExecution: null,
        executionsLoading: false,
        executionFilter: {},
        executionSteps: [],

        // Data Tables
        dataTables: [],
        dataRows: [],

        // Connection State
        engineConnected: false,
        enginePort: 54321,
        isConnected: false,
        currentUser: null,

        // ======================================================================
        // UI Actions
        // ======================================================================

        getProjectName: () => get().currentProject?.name ?? null,
        getProjectVersion: () => get().currentProject?.version ?? null,

        toggleConnection: () => {
          const connected = get().engineConnected;
          set({ engineConnected: !connected, isConnected: !connected });
        },

        // ======================================================================
        // Project Actions
        // ======================================================================

        loadProjects: async () => {
          set({ projectsLoading: true });
          try {
            const result = await invoke<unknown>('get_projects');
            const projects = result as Project[];
            set({ projects, projectsLoading: false });
          } catch (error) {
            console.error('Failed to load projects:', error);
            set({ projectsLoading: false });
          }
        },

        createProject: async (name, version, description) => {
          try {
            const id = await invoke<string>('create_project', { name, version, description });
            await get().loadProjects();
            return id;
          } catch (error) {
            console.error('Failed to create project:', error);
            throw error;
          }
        },

        updateProject: async (id, data) => {
          try {
            await invoke('update_project', { id, ...data });
            await get().loadProjects();
          } catch (error) {
            console.error('Failed to update project:', error);
            throw error;
          }
        },

        deleteProject: async (id) => {
          try {
            await invoke('delete_project', { id });
            await get().loadProjects();
          } catch (error) {
            console.error('Failed to delete project:', error);
            throw error;
          }
        },

        setCurrentProject: (project) => set({ currentProject: project }),

        // ======================================================================
        // Script Actions
        // ======================================================================

        loadScripts: async (projectId) => {
          set({ scriptsLoading: true });
          try {
            const result = await invoke<unknown>('get_scripts', { projectId });
            const scripts = result as Script[];
            set({ scripts, scriptsLoading: false });
          } catch (error) {
            console.error('Failed to load scripts:', error);
            set({ scriptsLoading: false });
          }
        },

        createScript: async (projectId, name, priority, description) => {
          try {
            const id = await invoke<string>('create_script', { projectId, name, priority, description });
            await get().loadScripts(projectId);
            return id;
          } catch (error) {
            console.error('Failed to create script:', error);
            throw error;
          }
        },

        updateScript: async (id, data) => {
          try {
            await invoke('update_script', { id, ...data });
            await get().loadScripts(get().currentScript?.project_id);
          } catch (error) {
            console.error('Failed to update script:', error);
            throw error;
          }
        },

        deleteScript: async (id) => {
          try {
            await invoke('delete_script', { id });
            await get().loadScripts(get().currentScript?.project_id);
          } catch (error) {
            console.error('Failed to delete script:', error);
            throw error;
          }
        },

        setCurrentScript: (script) => set({ currentScript: script }),

        setScriptFilter: (filter) => set({ scriptFilter: filter }),

        // ======================================================================
        // Scenario Actions
        // ======================================================================

        loadScenarios: async (scriptId) => {
          try {
            const result = await invoke<unknown>('get_scenarios', { scriptId });
            const scenarios = result as Scenario[];
            set({ scenarios });
          } catch (error) {
            console.error('Failed to load scenarios:', error);
          }
        },

        createScenario: async (scriptId, name, priority, orderIndex, description) => {
          try {
            const id = await invoke<string>('create_scenario', { scriptId, name, priority, orderIndex, description });
            await get().loadScenarios(scriptId);
            return id;
          } catch (error) {
            console.error('Failed to create scenario:', error);
            throw error;
          }
        },

        updateScenario: async (id, data) => {
          try {
            await invoke('update_scenario', { id, ...data });
            await get().loadScenarios(get().currentScenario?.script_id);
          } catch (error) {
            console.error('Failed to update scenario:', error);
            throw error;
          }
        },

        deleteScenario: async (id) => {
          try {
            await invoke('delete_scenario', { id });
            await get().loadScenarios(get().currentScenario?.script_id);
          } catch (error) {
            console.error('Failed to delete scenario:', error);
            throw error;
          }
        },

        // ======================================================================
        // Page Actions
        // ======================================================================

        loadPages: async (scenarioId) => {
          try {
            const result = await invoke<unknown>('get_pages', { scenarioId });
            const pages = result as Page[];
            set({ pages });
          } catch (error) {
            console.error('Failed to load pages:', error);
          }
        },

        createPage: async (scenarioId, name, orderIndex, entryUrl, defaultWait) => {
          try {
            const id = await invoke<string>('create_page', { scenarioId, name, orderIndex, entryUrl, defaultWait });
            await get().loadPages(scenarioId);
            return id;
          } catch (error) {
            console.error('Failed to create page:', error);
            throw error;
          }
        },

        updatePage: async (id, data) => {
          try {
            await invoke('update_page', { id, ...data });
            await get().loadPages(get().currentPage?.scenario_id);
          } catch (error) {
            console.error('Failed to update page:', error);
            throw error;
          }
        },

        deletePage: async (id) => {
          try {
            await invoke('delete_page', { id });
            await get().loadPages(get().currentPage?.scenario_id);
          } catch (error) {
            console.error('Failed to delete page:', error);
            throw error;
          }
        },

        // ======================================================================
        // Action Actions
        // ======================================================================

        loadActions: async (pageId) => {
          try {
            const result = await invoke<unknown>('get_actions', { pageId });
            const actions = result as Action[];
            set({ actions });
          } catch (error) {
            console.error('Failed to load actions:', error);
          }
        },

        createAction: async (pageId, name, actionType, orderIndex, timeoutMs, waitAfter, screenshotEnabled) => {
          try {
            const id = await invoke<string>('create_action', { pageId, name, actionType, orderIndex, timeoutMs, waitAfter, screenshotEnabled });
            await get().loadActions(pageId);
            return id;
          } catch (error) {
            console.error('Failed to create action:', error);
            throw error;
          }
        },

        updateAction: async (id, data) => {
          try {
            await invoke('update_action', { id, ...data });
            await get().loadActions(get().currentAction?.page_id);
          } catch (error) {
            console.error('Failed to update action:', error);
            throw error;
          }
        },

        deleteAction: async (id) => {
          try {
            await invoke('delete_action', { id });
            await get().loadActions(get().currentAction?.page_id);
          } catch (error) {
            console.error('Failed to delete action:', error);
            throw error;
          }
        },

        // ======================================================================
        // Locator Actions
        // ======================================================================

        loadLocators: async (actionId) => {
          try {
            const result = await invoke<unknown>('get_locators', { actionId });
            const locators = result as Locator[];
            set({ locators });
          } catch (error) {
            console.error('Failed to load locators:', error);
          }
        },

        createLocator: async (actionId, locatorType, value, priority, isFallback, description) => {
          try {
            const id = await invoke<string>('create_locator', { actionId, locatorType, value, priority, isFallback, description });
            await get().loadLocators(actionId);
            return id;
          } catch (error) {
            console.error('Failed to create locator:', error);
            throw error;
          }
        },

        updateLocator: async (id, data) => {
          try {
            await invoke('update_locator', { id, ...data });
            await get().loadLocators(get().currentAction?.id);
          } catch (error) {
            console.error('Failed to update locator:', error);
            throw error;
          }
        },

        deleteLocator: async (id) => {
          try {
            await invoke('delete_locator', { id });
            await get().loadLocators(get().currentAction?.id);
          } catch (error) {
            console.error('Failed to delete locator:', error);
            throw error;
          }
        },

        // ======================================================================
        // Parameter Actions
        // ======================================================================

        loadParameters: async (actionId) => {
          try {
            const result = await invoke<unknown>('get_parameters', { actionId });
            const parameters = result as Parameter[];
            set({ parameters });
          } catch (error) {
            console.error('Failed to load parameters:', error);
          }
        },

        createParameter: async (actionId, key, value, dataType) => {
          try {
            const id = await invoke<string>('create_parameter', { actionId, key, value, dataType });
            await get().loadParameters(actionId);
            return id;
          } catch (error) {
            console.error('Failed to create parameter:', error);
            throw error;
          }
        },

        updateParameter: async (id, data) => {
          try {
            await invoke('update_parameter', { id, ...data });
            await get().loadParameters(get().currentAction?.id);
          } catch (error) {
            console.error('Failed to update parameter:', error);
            throw error;
          }
        },

        deleteParameter: async (id) => {
          try {
            await invoke('delete_parameter', { id });
            await get().loadParameters(get().currentAction?.id);
          } catch (error) {
            console.error('Failed to delete parameter:', error);
            throw error;
          }
        },

        // ======================================================================
        // Kernel Actions
        // ======================================================================

        loadKernels: async () => {
          set({ kernelsLoading: true });
          try {
            const result = await invoke<unknown>('get_kernels');
            const kernels = result as Kernel[];
            set({ kernels, kernelsLoading: false });
          } catch (error) {
            console.error('Failed to load kernels:', error);
            set({ kernelsLoading: false });
          }
        },

        createKernel: async (name, executablePath, version) => {
          try {
            const id = await invoke<string>('create_kernel', { name, executablePath, version });
            await get().loadKernels();
            return id;
          } catch (error) {
            console.error('Failed to create kernel:', error);
            throw error;
          }
        },

        setCurrentKernel: (kernel) => set({ currentKernel: kernel }),

        detectKernels: async () => {
          try {
            const result = await invoke<unknown>('detect_kernels');
            return result as Kernel[];
          } catch (error) {
            console.error('Failed to detect kernels:', error);
            throw error;
          }
        },

        addKernelFromPath: async (executablePath) => {
          try {
            const result = await invoke<unknown>('add_kernel_from_path', { executablePath });
            const kernel = result as Kernel;

            // Add to store via create_kernel command
            await invoke('create_kernel', {
              name: kernel.name,
              executablePath: kernel.executable_path,
              version: kernel.version,
            });

            await get().loadKernels();
            return kernel;
          } catch (error) {
            console.error('Failed to add kernel from path:', error);
            throw error;
          }
        },

        testKernelCompatibility: async (kernelId, executablePath) => {
          try {
            const result = await invoke<unknown>('test_kernel_compatibility', { kernelId, executablePath });
            const testResult = result as { test_passed: boolean; test_message: string };
            return {
              passed: testResult.test_passed,
              message: testResult.test_message,
            };
          } catch (error) {
            console.error('Failed to test kernel compatibility:', error);
            throw error;
          }
        },

        deleteKernel: async (id) => {
          try {
            await invoke('delete_kernel', { id });
            await get().loadKernels();
          } catch (error) {
            console.error('Failed to delete kernel:', error);
            throw error;
          }
        },

        setDefaultKernel: async (id) => {
          try {
            await invoke('update_kernel', { id, is_default_agent: true });
            await get().loadKernels();
          } catch (error) {
            console.error('Failed to set default kernel:', error);
            throw error;
          }
        },

        // ======================================================================
        // Execution Actions
        // ======================================================================

        loadExecutions: async (scriptId) => {
          set({ executionsLoading: true });
          try {
            const result = await invoke<unknown>('get_executions', { scriptId });
            const executions = result as Execution[];
            set({ executions, executionsLoading: false });
          } catch (error) {
            console.error('Failed to load executions:', error);
            set({ executionsLoading: false });
          }
        },

        createExecution: async (scriptId, kernelId) => {
          try {
            const id = await invoke<string>('create_execution', { scriptId, kernelId });
            await get().loadExecutions(scriptId);
            return id;
          } catch (error) {
            console.error('Failed to create execution:', error);
            throw error;
          }
        },

        updateExecutionStatus: async (id, status, errorMessage, tracePath) => {
          try {
            await invoke('update_execution_status', { id, status, errorMessage, tracePath });
            await get().loadExecutions(get().currentExecution?.script_id);
          } catch (error) {
            console.error('Failed to update execution status:', error);
            throw error;
          }
        },

        deleteExecution: async (id) => {
          try {
            await invoke('delete_execution', { id });
            await get().loadExecutions(get().currentExecution?.script_id);
          } catch (error) {
            console.error('Failed to delete execution:', error);
            throw error;
          }
        },

        setCurrentExecution: (execution) => set({ currentExecution: execution }),

        loadExecutionSteps: async (executionId) => {
          try {
            const result = await invoke<unknown>('get_execution_steps', { executionId });
            const steps = result as ExecutionStep[];
            set({ executionSteps: steps });
          } catch (error) {
            console.error('Failed to load execution steps:', error);
          }
        },

        runMultiKernelExecution: async (scriptId, kernelIds) => {
          const executionIds: string[] = [];

          // Execute on all kernels in parallel
          const promises = kernelIds.map(async (kernelId) => {
            try {
              const executionId = await invoke<string>('create_execution', { scriptId, kernelId });
              // Start the execution via WebSocket/engine
              await invoke('send_engine_command', {
                port: 54321, // Default engine port
                command: 'start_script',
                args: { script_id: scriptId, kernel_id: kernelId, execution_id: executionId }
              });
              return executionId;
            } catch (error) {
              console.error(`Failed to start execution on kernel ${kernelId}:`, error);
              throw error;
            }
          });

          try {
            const results = await Promise.all(promises);
            executionIds.push(...results);

            // Reload executions to get the latest state
            await get().loadExecutions(scriptId);

            return executionIds;
          } catch (error) {
            console.error('Multi-kernel execution failed:', error);
            throw error;
          }
        },

        getConsolidatedResults: async (scriptId, executionIds) => {
          const resultsByKernel = new Map<string, Execution[]>();

          // Load all executions for this script
          await get().loadExecutions(scriptId);

          const executions = get().executions;
          const filteredExecutions = executions.filter(e => executionIds.includes(e.id));

          // Group by kernel_id
          for (const execution of filteredExecutions) {
            const kernelId = execution.kernel_id;
            if (!resultsByKernel.has(kernelId)) {
              resultsByKernel.set(kernelId, []);
            }
            resultsByKernel.get(kernelId)!.push(execution);
          }

          return resultsByKernel;
        },

        // ======================================================================
        // Data Table Actions
        // ======================================================================

        loadDataTables: async (projectId) => {
          try {
            const result = await invoke<unknown>('get_data_tables', { projectId });
            const tables = result as DataTable[];
            set({ dataTables: tables });
          } catch (error) {
            console.error('Failed to load data tables:', error);
          }
        },

        createDataTable: async (scriptId, name, sourceType, columns) => {
          try {
            const id = await invoke<string>('create_data_table', { scriptId, name, sourceType, columns });
            await get().loadDataTables();
            return id;
          } catch (error) {
            console.error('Failed to create data table:', error);
            throw error;
          }
        },

        updateDataTable: async (id, name) => {
          try {
            await invoke('update_data_table', { id, name });
            await get().loadDataTables();
          } catch (error) {
            console.error('Failed to update data table:', error);
            throw error;
          }
        },

        deleteDataTable: async (id) => {
          try {
            await invoke('delete_data_table', { id });
            await get().loadDataTables();
          } catch (error) {
            console.error('Failed to delete data table:', error);
            throw error;
          }
        },

        loadDataRows: async (tableId) => {
          try {
            const result = await invoke<unknown>('get_data_rows', { data_table_id: tableId });
            const rows = result as DataRow[];
            set({ dataRows: rows });
          } catch (error) {
            console.error('Failed to load data rows:', error);
          }
        },

        createDataRow: async (tableId, rowIndex, values) => {
          try {
            const id = await invoke<string>('create_data_row', { tableId, rowIndex, values });
            await get().loadDataRows(tableId);
            return id;
          } catch (error) {
            console.error('Failed to create data row:', error);
            throw error;
          }
        },

        updateDataRow: async (id, values) => {
          try {
            await invoke('update_data_row', { id, values });
            // Reload would need tableId from state
          } catch (error) {
            console.error('Failed to update data row:', error);
            throw error;
          }
        },

        deleteDataRow: async (id) => {
          try {
            await invoke('delete_data_row', { id });
            // Reload would need tableId from state
          } catch (error) {
            console.error('Failed to delete data row:', error);
            throw error;
          }
        },

        // ======================================================================
        // UI Actions
        // ======================================================================

        setLanguage: (lang) => set({ language: lang }),

        toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

        addTab: (tab) => set((state) => {
          const existing = state.tabs.find(t => t.id === tab.id);
          if (!existing) {
            return { tabs: [...state.tabs, tab], activeTab: tab.id };
          }
          return { activeTab: tab.id };
        }),

        removeTab: (tabId) => set((state) => {
          const newTabs = state.tabs.filter(t => t.id !== tabId);
          let newActiveTab = state.activeTab;
          if (state.activeTab === tabId && newTabs.length > 0) {
            newActiveTab = newTabs[newTabs.length - 1].id;
          } else if (newTabs.length === 0) {
            newActiveTab = null;
          }
          return { tabs: newTabs, activeTab: newActiveTab };
        }),

        setActiveTab: (tabId) => set({ activeTab: tabId }),

        addNotification: (notification) => set((state) => ({
          notifications: [
            {
              ...notification,
              id: `notif-${Date.now()}-${Math.random()}`,
              timestamp: new Date().toISOString(),
              read: false,
            },
            ...state.notifications,
          ],
        })),

        markNotificationRead: (id) => set((state) => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

        clearNotifications: () => set({ notifications: [] }),

        // ======================================================================
        // Engine Actions
        // ======================================================================

        spawnEngine: async (kernelId) => {
          try {
            await invoke('spawn_engine', { kernelId });
            const running = await get().getRunningEngines();
            set({ runningEngines: running });
          } catch (error) {
            console.error('Failed to spawn engine:', error);
            throw error;
          }
        },

        stopEngine: async (engineId) => {
          try {
            await invoke('stop_engine', { engineId });
            const running = await get().getRunningEngines();
            set({ runningEngines: running });
          } catch (error) {
            console.error('Failed to stop engine:', error);
            throw error;
          }
        },

        stopAllEngines: async () => {
          try {
            await invoke('stop_all_engines');
            set({ runningEngines: [] });
          } catch (error) {
            console.error('Failed to stop all engines:', error);
            throw error;
          }
        },

        getRunningEngines: async () => {
          try {
            const result = await invoke<string[]>('get_running_engines');
            set({ runningEngines: result });
            return result;
          } catch (error) {
            console.error('Failed to get running engines:', error);
            return [];
          }
        },

        isEngineRunning: async (engineId) => {
          try {
            return await invoke<boolean>('is_engine_running', { engineId });
          } catch (error) {
            console.error('Failed to check engine status:', error);
            return false;
          }
        },

        getEngineStatus: async (engineId) => {
          try {
            return await invoke('get_engine_status', { engineId });
          } catch (error) {
            console.error('Failed to get engine status:', error);
            throw error;
          }
        },

        restartEngine: async (engineId) => {
          try {
            await invoke('restart_engine', { engineId });
          } catch (error) {
            console.error('Failed to restart engine:', error);
            throw error;
          }
        },

        getEngineLogs: async (engineId) => {
          try {
            return await invoke<string>('get_engine_logs', { engineId });
          } catch (error) {
            console.error('Failed to get engine logs:', error);
            throw error;
          }
        },

        sendEngineCommand: async (engineId, command) => {
          try {
            await invoke('send_engine_command', { engineId, command });
          } catch (error) {
            console.error('Failed to send engine command:', error);
            throw error;
          }
        },

        // ======================================================================
        // Tree Actions
        // ======================================================================

        buildTreeData: () => {
          const { projects } = get();
          const treeData: TreeNode[] = projects.map(project => ({
            id: project.id,
            name: project.name,
            type: 'project',
            children: [],
          }));
          set({ treeData });
        },

        setSelectedNode: (node) => set({ selectedNode: node }),
      }),
      {
        name: 'traceforge-store',
        partialize: (state) => ({
          language: state.language,
          sidebarCollapsed: state.sidebarCollapsed,
          currentProject: state.currentProject,
          currentKernel: state.currentKernel,
        }),
      }
    ),
    { name: 'TraceForgeStore' }
  )
);
