import { create } from 'zustand';
import type { Project, Script, Kernel, Execution } from '../lib/types';

// Helper to invoke Tauri commands
const invoke = async <T>(cmd: string, args?: unknown): Promise<T> => {
  if (window.__TAURI__?.invoke) {
    return window.__TAURI__.invoke(cmd, args);
  }
  throw new Error('Tauri not available');
};

interface DbStore {
  // State
  projects: Project[];
  scripts: Script[];
  kernels: Kernel[];
  executions: Execution[];
  currentProject: Project | null;
  currentScript: Script | null;
  isInitialized: boolean;

  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;

  setScripts: (scripts: Script[]) => void;
  addScript: (script: Script) => void;
  updateScript: (id: string, updates: Partial<Script>) => void;
  removeScript: (id: string) => void;

  setKernels: (kernels: Kernel[]) => void;
  addKernel: (kernel: Kernel) => void;
  updateKernel: (id: string, updates: Partial<Kernel>) => void;
  removeKernel: (id: string) => void;

  setExecutions: (executions: Execution[]) => void;
  addExecution: (execution: Execution) => void;
  updateExecution: (id: string, updates: Partial<Execution>) => void;

  setCurrentProject: (project: Project | null) => void;
  setCurrentScript: (script: Script | null) => void;

  // Async actions
  initializeDb: () => Promise<void>;
  loadProjects: () => Promise<void>;
  createProject: (name: string, version: string) => Promise<string>;
  loadScripts: (projectId?: string) => Promise<void>;
  createScript: (name: string, projectId: string) => Promise<string>;
  loadKernels: () => Promise<void>;
  createKernel: (name: string, version: string, executablePath: string) => Promise<string>;
  loadExecutions: (projectId?: string) => Promise<void>;
}

export const useDbStore = create<DbStore>((set, get) => ({
  // Initial state
  projects: [],
  scripts: [],
  kernels: [],
  executions: [],
  currentProject: null,
  currentScript: null,
  isInitialized: false,

  // Synchronous actions
  setProjects: (projects) => set({ projects }),
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    })),

  setScripts: (scripts) => set({ scripts }),
  addScript: (script) =>
    set((state) => ({ scripts: [...state.scripts, script] })),
  updateScript: (id, updates) =>
    set((state) => ({
      scripts: state.scripts.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
  removeScript: (id) =>
    set((state) => ({
      scripts: state.scripts.filter((s) => s.id !== id),
      currentScript: state.currentScript?.id === id ? null : state.currentScript,
    })),

  setKernels: (kernels) => set({ kernels }),
  addKernel: (kernel) =>
    set((state) => ({ kernels: [...state.kernels, kernel] })),
  updateKernel: (id, updates) =>
    set((state) => ({
      kernels: state.kernels.map((k) =>
        k.id === id ? { ...k, ...updates } : k
      ),
    })),
  removeKernel: (id) =>
    set((state) => ({
      kernels: state.kernels.filter((k) => k.id !== id),
    })),

  setExecutions: (executions) => set({ executions }),
  addExecution: (execution) =>
    set((state) => ({ executions: [...state.executions, execution] })),
  updateExecution: (id, updates) =>
    set((state) => ({
      executions: state.executions.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentScript: (script) => set({ currentScript: script }),

  // Async actions
  initializeDb: async () => {
    try {
      await invoke('init_database', { dbLabel: 'traceforge.db' });
      set({ isInitialized: true });
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  },

  loadProjects: async () => {
    try {
      const result = await invoke<Project[]>('get_projects', {
        dbLabel: 'traceforge.db',
      });
      set({ projects: result });
    } catch (error) {
      console.error('Failed to load projects:', error);
      throw error;
    }
  },

  createProject: async (name: string, version: string) => {
    try {
      const projectId = await invoke<string>('create_project', {
        dbLabel: 'traceforge.db',
        name,
        version,
      });

      const newProject: Project = {
        id: projectId,
        name,
        version,
        sync_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      get().addProject(newProject);
      return projectId;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  },

  loadScripts: async (projectId?: string) => {
    try {
      // In a real implementation, this would filter by projectId
      // For now, we'll just get all scripts
      const result = await invoke<Script[]>('get_scripts', {
        dbLabel: 'traceforge.db',
        projectId: projectId || null,
      });
      set({ scripts: result });
    } catch (error) {
      console.error('Failed to load scripts:', error);
      throw error;
    }
  },

  createScript: async (name: string, projectId: string) => {
    try {
      const scriptId = await invoke<string>('create_script', {
        dbLabel: 'traceforge.db',
        name,
        projectId,
      });

      const newScript: Script = {
        id: scriptId,
        name,
        project_id: projectId,
        version: '1.0.0',
        priority: 'P1',
        status: 'DRAFT',
        description: '',
        scenarios: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      get().addScript(newScript);
      return scriptId;
    } catch (error) {
      console.error('Failed to create script:', error);
      throw error;
    }
  },

  loadKernels: async () => {
    try {
      const result = await invoke<Kernel[]>('get_kernels', {
        dbLabel: 'traceforge.db',
      });
      set({ kernels: result });
    } catch (error) {
      console.error('Failed to load kernels:', error);
      throw error;
    }
  },

  createKernel: async (name: string, version: string, executablePath: string) => {
    try {
      const kernelId = await invoke<string>('create_kernel', {
        dbLabel: 'traceforge.db',
        name,
        version,
        executablePath,
      });

      const newKernel: Kernel = {
        id: kernelId,
        name,
        version,
        executable_path: executablePath,
        is_compatible: true,
        is_default_record: false,
        is_default_agent: false,
        status: 'ACTIVE',
        added_at: new Date().toISOString(),
      };

      get().addKernel(newKernel);
      return kernelId;
    } catch (error) {
      console.error('Failed to create kernel:', error);
      throw error;
    }
  },

  loadExecutions: async (projectId?: string) => {
    try {
      const result = await invoke<Execution[]>('get_executions', {
        dbLabel: 'traceforge.db',
        projectId: projectId || null,
      });
      set({ executions: result });
    } catch (error) {
      console.error('Failed to load executions:', error);
      throw error;
    }
  },
}));
