// ============================================================================
// TraceForge Desktop - Sync Store for Server Synchronization
// Handles team collaboration and server sync operations
// ============================================================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export type SyncStatus = 'IDLE' | 'CONNECTING' | 'SYNCING' | 'CONFLICT' | 'ERROR' | 'OFFLINE';
export type ConflictResolution = 'keep_local' | 'use_server' | 'manual_merge';

export interface SyncConflict {
  id: string;
  type: 'script' | 'project' | 'execution';
  local_id: string;
  server_id: string;
  local_version: string;
  server_version: string;
  local_modified_at: string;
  server_modified_at: string;
  resolved: boolean;
}

export interface SyncOperation {
  id: string;
  type: 'push' | 'pull' | 'delete';
  entity_type: 'script' | 'project' | 'execution';
  entity_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
  created_at: string;
  completed_at?: string;
}

export interface ServerConnection {
  url: string;
  connected: boolean;
  last_sync_at: string | null;
  last_ping: string | null;
  user_id: string | null;
  username: string | null;
}

export interface SyncState {
  // Connection
  serverUrl: string;
  syncStatus: SyncStatus;
  serverConnection: ServerConnection | null;

  // Conflicts
  conflicts: SyncConflict[];

  // Operations queue
  pendingOperations: SyncOperation[];
  completedOperations: SyncOperation[];

  // Settings
  autoSync: boolean;
  syncInterval: number; // minutes
  resolveConflictsAutomatically: boolean;
  defaultResolution: ConflictResolution;

  // UI State
  showSyncDialog: boolean;
  syncProgress: number; // 0-100
  syncMessage: string;

  // Actions
  setServerUrl: (url: string) => void;
  testConnection: (url: string) => Promise<boolean>;
  sync: () => Promise<void>;
  pushToServer: (entityType: string, entityId: string) => Promise<void>;
  pullFromServer: (entityType: string, entityId?: string) => Promise<void>;
  resolveConflict: (conflictId: string, resolution: ConflictResolution) => Promise<void>;
  resolveAllConflicts: (resolution: ConflictResolution) => Promise<void>;
  addPendingOperation: (operation: Omit<SyncOperation, 'id' | 'created_at' | 'status'>) => void;
  clearCompletedOperations: () => void;
  setAutoSync: (enabled: boolean) => void;
  setSyncInterval: (minutes: number) => void;
  setShowSyncDialog: (show: boolean) => void;
  exportProject: (projectId: string, format: 'json' | 'yaml') => Promise<void>;
  importProject: (filePath: string) => Promise<void>;
  uploadExecutionResults: (executionId: string) => Promise<void>;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useSyncStore = create<SyncState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        serverUrl: '',
        syncStatus: 'IDLE',
        serverConnection: null,
        conflicts: [],
        pendingOperations: [],
        completedOperations: [],
        autoSync: false,
        syncInterval: 15,
        resolveConflictsAutomatically: false,
        defaultResolution: 'keep_local',
        showSyncDialog: false,
        syncProgress: 0,
        syncMessage: '',

        // ======================================================================
        // Connection Actions
        // ======================================================================

        setServerUrl: (url) => set({ serverUrl: url }),

        testConnection: async (url) => {
          set({ syncStatus: 'CONNECTING' });
          try {
            // Simulate connection test
            await new Promise(resolve => setTimeout(resolve, 1000));

            // In production, this would make an actual HTTP request to the server
            const success = !!url && url.length > 0;

            if (success) {
              set({
                syncStatus: 'IDLE',
                serverConnection: {
                  url,
                  connected: true,
                  last_sync_at: null,
                  last_ping: new Date().toISOString(),
                  user_id: 'user-123',
                  username: 'Test User',
                },
              });
            } else {
              set({ syncStatus: 'ERROR' });
            }

            return success;
          } catch (error) {
            console.error('Connection test failed:', error);
            set({ syncStatus: 'ERROR' });
            return false;
          }
        },

        // ======================================================================
        // Sync Actions
        // ======================================================================

        sync: async () => {
          const { serverUrl, pendingOperations } = get();

          if (!serverUrl) {
            set({ syncStatus: 'OFFLINE', syncMessage: 'No server configured' });
            return;
          }

          set({ syncStatus: 'SYNCING', syncProgress: 0, syncMessage: 'Starting sync...' });

          try {
            // Process pending operations
            const totalOps = pendingOperations.length;
            let completedOps = 0;

            for (const op of pendingOperations) {
              set({
                syncMessage: `Processing ${op.type} operation for ${op.entity_type}...`,
                syncProgress: Math.round((completedOps / Math.max(totalOps, 1)) * 100)
              });

              // Simulate operation processing
              await new Promise(resolve => setTimeout(resolve, 500));

              set((state) => ({
                pendingOperations: state.pendingOperations.filter(o => o.id !== op.id),
                completedOperations: [
                  { ...op, status: 'completed' as const, completed_at: new Date().toISOString() } as SyncOperation,
                  ...state.completedOperations,
                ].slice(0, 100), // Keep only last 100 completed operations
              }));

              completedOps++;
            }

            set({
              syncStatus: 'IDLE',
              syncProgress: 100,
              syncMessage: 'Sync completed successfully',
              serverConnection: {
                ...get().serverConnection!,
                last_sync_at: new Date().toISOString(),
              } as ServerConnection,
            });
          } catch (error) {
            console.error('Sync failed:', error);
            set({
              syncStatus: 'ERROR',
              syncMessage: `Sync failed: ${error}`,
            });
          }
        },

        pushToServer: async (entityType, entityId) => {
          const { serverUrl } = get();
          if (!serverUrl) {
            throw new Error('No server configured');
          }

          const operation: Omit<SyncOperation, 'id' | 'created_at' | 'status'> = {
            type: 'push',
            entity_type: entityType as any,
            entity_id: entityId,
          };

          get().addPendingOperation(operation);

          if (get().autoSync) {
            await get().sync();
          }
        },

        pullFromServer: async (entityType, entityId) => {
          const { serverUrl } = get();
          if (!serverUrl) {
            throw new Error('No server configured');
          }

          // Add pull operation to queue
          const operation: Omit<SyncOperation, 'id' | 'created_at' | 'status'> = {
            type: 'pull',
            entity_type: entityType as any,
            entity_id: entityId || '*',
          };

          get().addPendingOperation(operation);

          if (get().autoSync) {
            await get().sync();
          }
        },

        // ======================================================================
        // Conflict Resolution Actions
        // ======================================================================

        resolveConflict: async (conflictId, _resolution) => {
          try {
            // Simulate conflict resolution
            await new Promise(resolve => setTimeout(resolve, 500));

            set((state) => ({
              conflicts: state.conflicts.map(c =>
                c.id === conflictId ? { ...c, resolved: true } : c
              ),
            }));

            // Remove resolved conflicts
            setTimeout(() => {
              set((state) => ({
                conflicts: state.conflicts.filter(c => c.id !== conflictId),
              }));
            }, 1000);
          } catch (error) {
            console.error('Failed to resolve conflict:', error);
            throw error;
          }
        },

        resolveAllConflicts: async (resolution) => {
          const { conflicts } = get();

          for (const conflict of conflicts) {
            await get().resolveConflict(conflict.id, resolution);
          }
        },

        // ======================================================================
        // Operations Queue Actions
        // ======================================================================

        addPendingOperation: (operation) => {
          const newOp: SyncOperation = {
            ...operation,
            id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            created_at: new Date().toISOString(),
            status: 'pending',
          };

          set((state) => ({
            pendingOperations: [...state.pendingOperations, newOp],
          }));
        },

        clearCompletedOperations: () => {
          set({ completedOperations: [] });
        },

        // ======================================================================
        // Settings Actions
        // ======================================================================

        setAutoSync: (enabled) => set({ autoSync: enabled }),

        setSyncInterval: (minutes) => set({ syncInterval: minutes }),

        setShowSyncDialog: (show) => set({ showSyncDialog: show }),

        // ======================================================================
        // Import/Export Actions
        // ======================================================================

        exportProject: async (projectId, format) => {
          set({ syncStatus: 'SYNCING', syncMessage: 'Exporting project...' });

          try {
            // In production, this would call Tauri to export the project
            const data = {
              project_id: projectId,
              exported_at: new Date().toISOString(),
              format,
            };

            // Simulate export
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (window.__TAURI__?.dialog) {
              const filePath = await window.__TAURI__.dialog.save({
                defaultPath: `project-${projectId}.${format}`,
                filters: [
                  { name: format.toUpperCase(), extensions: [format] },
                  { name: 'All Files', extensions: ['*'] },
                ],
              });

              if (filePath && window.__TAURI__?.fs) {
                await window.__TAURI__.fs.writeFile(
                  filePath,
                  JSON.stringify(data, null, 2)
                );
              }
            }

            set({ syncStatus: 'IDLE', syncMessage: 'Project exported successfully' });
          } catch (error) {
            set({ syncStatus: 'ERROR', syncMessage: `Export failed: ${error}` });
            throw error;
          }
        },

        importProject: async (_filePath) => {
          set({ syncStatus: 'SYNCING', syncMessage: 'Importing project...' });

          try {
            // In production, this would parse and import the project
            await new Promise(resolve => setTimeout(resolve, 1000));

            set({ syncStatus: 'IDLE', syncMessage: 'Project imported successfully' });
          } catch (error) {
            set({ syncStatus: 'ERROR', syncMessage: `Import failed: ${error}` });
            throw error;
          }
        },

        uploadExecutionResults: async (executionId) => {
          const { serverUrl } = get();
          if (!serverUrl) {
            throw new Error('No server configured');
          }

          set({ syncStatus: 'SYNCING', syncMessage: 'Uploading execution results...' });

          try {
            // Add to operations queue
            get().addPendingOperation({
              type: 'push',
              entity_type: 'execution',
              entity_id: executionId,
            });

            await get().sync();
          } catch (error) {
            set({ syncStatus: 'ERROR', syncMessage: `Upload failed: ${error}` });
            throw error;
          }
        },
      }),
      {
        name: 'traceforge-sync-store',
        partialize: (state) => ({
          serverUrl: state.serverUrl,
          autoSync: state.autoSync,
          syncInterval: state.syncInterval,
          defaultResolution: state.defaultResolution,
        }),
      }
    ),
    { name: 'SyncStore' }
  )
);
