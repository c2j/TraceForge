import { create } from 'zustand';
import { invoke } from '../lib/tauri';

export interface EngineNode {
  id: string;
  name: string;
  ip: string;
  status: 'ONLINE' | 'BUSY' | 'OFFLINE';
  cpuUsage: number;
  memUsage: number;
  kernels: string[];
}

export interface ExecutionState {
  id: string;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  scriptId?: string;
  projectId?: string;
  kernelId?: string;
  startTime?: string;
  endTime?: string;
  progress?: number;
}

interface EngineStore {
  // State
  nodes: EngineNode[];
  currentExecution: ExecutionState | null;
  isEngineConnected: boolean;
  engineVersion: string | null;

  // Actions
  setNodes: (nodes: EngineNode[]) => void;
  addNode: (node: EngineNode) => void;
  updateNode: (id: string, updates: Partial<EngineNode>) => void;
  removeNode: (id: string) => void;

  setCurrentExecution: (execution: ExecutionState | null) => void;
  updateExecution: (updates: Partial<ExecutionState>) => void;

  setEngineConnected: (connected: boolean) => void;
  setEngineVersion: (version: string | null) => void;

  // Async actions
  connectEngine: () => Promise<void>;
  disconnectEngine: () => Promise<void>;
  spawnExecution: (scriptId: string, kernelId: string) => Promise<void>;
  stopExecution: (executionId: string) => Promise<void>;
}

export const useEngineStore = create<EngineStore>((set, get) => ({
  // Initial state
  nodes: [],
  currentExecution: null,
  isEngineConnected: false,
  engineVersion: null,

  // Synchronous actions
  setNodes: (nodes) => set({ nodes }),
  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  updateNode: (id, updates) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...updates } : node
      ),
    })),
  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
    })),

  setCurrentExecution: (execution) => set({ currentExecution: execution }),
  updateExecution: (updates) =>
    set((state) => ({
      currentExecution: state.currentExecution
        ? { ...state.currentExecution, ...updates }
        : null,
    })),

  setEngineConnected: (connected) => set({ isEngineConnected: connected }),
  setEngineVersion: (version) => set({ engineVersion: version }),

  // Async actions
  connectEngine: async () => {
    try {
      // Connect to the ForgeEngine via WebSocket
      // This would typically invoke a Rust command to establish WebSocket connection
      await invoke('connect_engine');
      set({ isEngineConnected: true });

      // Fetch engine version
      const version = await invoke<string>('get_engine_version');
      set({ engineVersion: version });

      // Fetch available nodes
      const nodes = await invoke<EngineNode[]>('get_engine_nodes');
      set({ nodes });
    } catch (error) {
      console.error('Failed to connect to engine:', error);
      set({ isEngineConnected: false });
      throw error;
    }
  },

  disconnectEngine: async () => {
    try {
      await invoke('disconnect_engine');
      set({
        isEngineConnected: false,
        engineVersion: null,
        nodes: [],
        currentExecution: null,
      });
    } catch (error) {
      console.error('Failed to disconnect from engine:', error);
      throw error;
    }
  },

  spawnExecution: async (scriptId: string, kernelId: string) => {
    try {
      const executionId = await invoke<string>('spawn_execution', {
        scriptId,
        kernelId,
      });

      set({
        currentExecution: {
          id: executionId,
          status: 'RUNNING',
          scriptId,
          kernelId,
          startTime: new Date().toISOString(),
          progress: 0,
        },
      });

      // Update node status to BUSY
      const nodes = get().nodes.map((node) =>
        node.id === kernelId ? { ...node, status: 'BUSY' as const } : node
      );
      set({ nodes });
    } catch (error) {
      console.error('Failed to spawn execution:', error);
      throw error;
    }
  },

  stopExecution: async (executionId: string) => {
    try {
      await invoke('stop_execution', { executionId });

      set((state) => ({
        currentExecution: state.currentExecution?.id === executionId
          ? {
              ...state.currentExecution,
              status: 'FAILED' as const,
              endTime: new Date().toISOString(),
            }
          : state.currentExecution,
      }));

      // Reset node status to ONLINE
      const nodes = get().nodes.map((node) =>
        node.status === 'BUSY' ? { ...node, status: 'ONLINE' as const } : node
      );
      set({ nodes });
    } catch (error) {
      console.error('Failed to stop execution:', error);
      throw error;
    }
  },
}));
