import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: string | null;
  pendingChanges: number;
  serverUrl: string | null;
  syncInProgress: boolean;
}

export interface SyncConflict {
  id: string;
  type: 'project' | 'script' | 'execution';
  localId: string;
  serverId: string;
  field: string;
  localValue: any;
  serverValue: any;
  timestamp: string;
}

interface SyncStore {
  // State
  syncStatus: SyncStatus;
  conflicts: SyncConflict[];
  syncHistory: Array<{
    timestamp: string;
    action: 'push' | 'pull' | 'merge';
    status: 'success' | 'failed';
    details: string;
  }>;

  // Actions
  setSyncStatus: (status: Partial<SyncStatus>) => void;
  addConflict: (conflict: SyncConflict) => void;
  resolveConflict: (conflictId: string, resolution: 'local' | 'server') => void;
  clearConflicts: () => void;

  addSyncHistory: (entry: {
    action: 'push' | 'pull' | 'merge';
    status: 'success' | 'failed';
    details: string;
  }) => void;

  // Async actions
  connectToServer: (serverUrl: string) => Promise<void>;
  disconnectFromServer: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  pushChanges: () => Promise<void>;
  pullChanges: () => Promise<void>;
  mergeChanges: () => Promise<void>;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  // Initial state
  syncStatus: {
    isOnline: false,
    lastSyncTime: null,
    pendingChanges: 0,
    serverUrl: null,
    syncInProgress: false,
  },
  conflicts: [],
  syncHistory: [],

  // Synchronous actions
  setSyncStatus: (status) =>
    set((state) => ({
      syncStatus: { ...state.syncStatus, ...status },
    })),

  addConflict: (conflict) =>
    set((state) => ({
      conflicts: [...state.conflicts, conflict],
    })),

  resolveConflict: (conflictId, resolution) => {
    const { conflicts } = get();
    const conflict = conflicts.find((c) => c.id === conflictId);

    if (conflict) {
      // Apply the resolution
      const resolvedValue = resolution === 'local' ? conflict.localValue : conflict.serverValue;

      // In a real implementation, this would update the database
      console.log(`Resolving conflict ${conflictId} with ${resolution} value:`, resolvedValue);

      // Remove the conflict
      set((state) => ({
        conflicts: state.conflicts.filter((c) => c.id !== conflictId),
      }));
    }
  },

  clearConflicts: () => set({ conflicts: [] }),

  addSyncHistory: (entry) =>
    set((state) => ({
      syncHistory: [
        {
          timestamp: new Date().toISOString(),
          ...entry,
        },
        ...state.syncHistory,
      ].slice(0, 100), // Keep only last 100 entries
    })),

  // Async actions
  connectToServer: async (serverUrl: string) => {
    try {
      await invoke('connect_sync_server', { serverUrl });
      set((state) => ({
        syncStatus: {
          ...state.syncStatus,
          isOnline: true,
          serverUrl,
        },
      }));
      get().addSyncHistory({
        action: 'push',
        status: 'success',
        details: `Connected to server: ${serverUrl}`,
      });
    } catch (error) {
      console.error('Failed to connect to sync server:', error);
      get().addSyncHistory({
        action: 'push',
        status: 'failed',
        details: `Failed to connect to server: ${serverUrl}`,
      });
      throw error;
    }
  },

  disconnectFromServer: async () => {
    try {
      await invoke('disconnect_sync_server');
      set((state) => ({
        syncStatus: {
          ...state.syncStatus,
          isOnline: false,
          serverUrl: null,
          lastSyncTime: null,
        },
        conflicts: [],
      }));
      get().addSyncHistory({
        action: 'push',
        status: 'success',
        details: 'Disconnected from server',
      });
    } catch (error) {
      console.error('Failed to disconnect from sync server:', error);
      get().addSyncHistory({
        action: 'push',
        status: 'failed',
        details: 'Failed to disconnect from server',
      });
      throw error;
    }
  },

  syncWithServer: async () => {
    const { syncStatus } = get();

    if (!syncStatus.isOnline) {
      throw new Error('Not connected to sync server');
    }

    set((state) => ({
      syncStatus: { ...state.syncStatus, syncInProgress: true },
    }));

    try {
      // Pull changes from server
      await get().pullChanges();

      // Push local changes
      await get().pushChanges();

      // Merge any conflicts
      await get().mergeChanges();

      // Update last sync time
      set((state) => ({
        syncStatus: {
          ...state.syncStatus,
          lastSyncTime: new Date().toISOString(),
          syncInProgress: false,
        },
      }));

      get().addSyncHistory({
        action: 'merge',
        status: 'success',
        details: 'Full sync completed',
      });
    } catch (error) {
      set((state) => ({
        syncStatus: { ...state.syncStatus, syncInProgress: false },
      }));
      get().addSyncHistory({
        action: 'merge',
        status: 'failed',
        details: `Sync failed: ${error}`,
      });
      throw error;
    }
  },

  pushChanges: async () => {
    try {
      await invoke('push_sync_changes');
      set((state) => ({
        syncStatus: { ...state.syncStatus, pendingChanges: 0 },
      }));
      get().addSyncHistory({
        action: 'push',
        status: 'success',
        details: 'Pushed changes to server',
      });
    } catch (error) {
      console.error('Failed to push changes:', error);
      get().addSyncHistory({
        action: 'push',
        status: 'failed',
        details: `Push failed: ${error}`,
      });
      throw error;
    }
  },

  pullChanges: async () => {
    try {
      const changes = await invoke<any[]>('pull_sync_changes');
      set((state) => ({
        syncStatus: { ...state.syncStatus, pendingChanges: changes.length },
      }));
      get().addSyncHistory({
        action: 'pull',
        status: 'success',
        details: `Pulled ${changes.length} changes from server`,
      });
    } catch (error) {
      console.error('Failed to pull changes:', error);
      get().addSyncHistory({
        action: 'pull',
        status: 'failed',
        details: `Pull failed: ${error}`,
      });
      throw error;
    }
  },

  mergeChanges: async () => {
    try {
      await invoke('merge_sync_changes');
      get().addSyncHistory({
        action: 'merge',
        status: 'success',
        details: 'Merged changes successfully',
      });
    } catch (error) {
      console.error('Failed to merge changes:', error);
      get().addSyncHistory({
        action: 'merge',
        status: 'failed',
        details: `Merge failed: ${error}`,
      });
      throw error;
    }
  },
}));
