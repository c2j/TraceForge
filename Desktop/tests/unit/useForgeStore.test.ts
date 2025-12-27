import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useForgeStore } from '../../src/stores/useForgeStore';
import type { Project, Script, Kernel, Execution } from '../../src/types';

// Mock Tauri invoke function
const mockInvoke = vi.fn();
(global as any).__TAURI__ = { invoke: mockInvoke };

describe('useForgeStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useForgeStore.setState({
      projects: [],
      scripts: [],
      kernels: [],
      executions: [],
      scenarios: [],
      pages: [],
      actions: [],
      currentProject: null,
      currentScript: null,
      currentKernel: null,
      currentExecution: null,
      projectsLoading: false,
      scriptsLoading: false,
      kernelsLoading: false,
      executionsLoading: false,
      language: 'en',
      sidebarCollapsed: false,
      activeTab: null,
      tabs: [],
      notifications: [],
      selectedNode: null,
      treeData: [],
      locators: [],
      parameters: [],
      dataTables: [],
      dataRows: [],
      engineConnected: false,
      enginePort: 54321,
      runningEngines: [],
      scriptFilter: {},
      executionFilter: {},
      executionSteps: [],
    });
    mockInvoke.mockClear();
  });

  describe('Project Actions', () => {
    it('should load projects successfully', async () => {
      const mockProjects: Project[] = [
        { id: '1', name: 'Test Project 1', version: '1.0.0', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: '2', name: 'Test Project 2', version: '1.0.0', created_at: '2024-01-01', updated_at: '2024-01-01' },
      ];
      mockInvoke.mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useForgeStore());

      await act(async () => {
        await result.current.loadProjects();
      });

      expect(result.current.projects).toEqual(mockProjects);
      expect(result.current.projectsLoading).toBe(false);
    });

    it('should create a new project', async () => {
      const newProjectId = 'new-project-id';
      mockInvoke.mockResolvedValue(newProjectId);

      const { result } = renderHook(() => useForgeStore());

      await act(async () => {
        const id = await result.current.createProject('New Project', '1.0.0', 'Test description');
        expect(id).toBe(newProjectId);
      });

      expect(mockInvoke).toHaveBeenCalledWith('create_project', {
        name: 'New Project',
        version: '1.0.0',
        description: 'Test description',
      });
    });

    it('should update an existing project', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const mockProjects: Project[] = [
        { id: '1', name: 'Updated Project', version: '2.0.0', created_at: '2024-01-01', updated_at: '2024-01-02' },
      ];
      mockInvoke.mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useForgeStore());

      await act(async () => {
        await result.current.updateProject('1', { name: 'Updated Project', version: '2.0.0' });
      });

      expect(mockInvoke).toHaveBeenCalledWith('update_project', {
        id: '1',
        name: 'Updated Project',
        version: '2.0.0',
      });
    });

    it('should delete a project', async () => {
      mockInvoke.mockResolvedValue(undefined);
      mockInvoke.mockResolvedValue([]);

      const { result } = renderHook(() => useForgeStore());

      await act(async () => {
        await result.current.deleteProject('1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('delete_project', { id: '1' });
    });

    it('should set current project', () => {
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        version: '1.0.0',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const { result } = renderHook(() => useForgeStore());

      act(() => {
        result.current.setCurrentProject(mockProject);
      });

      expect(result.current.currentProject).toEqual(mockProject);
    });
  });

  describe('Script Actions', () => {
    it('should load scripts for a project', async () => {
      const mockScripts: Script[] = [
        { id: '1', project_id: 'proj-1', name: 'Script 1', priority: 'P1', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: '2', project_id: 'proj-1', name: 'Script 2', priority: 'P2', created_at: '2024-01-01', updated_at: '2024-01-01' },
      ];
      mockInvoke.mockResolvedValue(mockScripts);

      const { result } = renderHook(() => useForgeStore());

      await act(async () => {
        await result.current.loadScripts('proj-1');
      });

      expect(result.current.scripts).toEqual(mockScripts);
      expect(result.current.scriptsLoading).toBe(false);
    });

    it('should create a new script', async () => {
      const newScriptId = 'new-script-id';
      mockInvoke.mockResolvedValueOnce(newScriptId);
      mockInvoke.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useForgeStore());

      await act(async () => {
        const id = await result.current.createScript('proj-1', 'New Script', 'P1', 'Test script');
        expect(id).toBe(newScriptId);
      });

      expect(mockInvoke).toHaveBeenCalledWith('create_script', {
        projectId: 'proj-1',
        name: 'New Script',
        priority: 'P1',
        description: 'Test script',
      });
    });

    it('should set script filter', () => {
      const { result } = renderHook(() => useForgeStore());

      act(() => {
        result.current.setScriptFilter({ priority: 'P1', status: 'ACTIVE' });
      });

      expect(result.current.scriptFilter).toEqual({ priority: 'P1', status: 'ACTIVE' });
    });
  });

  describe('Kernel Actions', () => {
    it('should load kernels', async () => {
      const mockKernels: Kernel[] = [
        { id: '1', name: 'Chrome 86', executable_path: '/path/to/chrome', version: '86.0.4240.198', is_default_agent: true, created_at: '2024-01-01' },
        { id: '2', name: 'Chrome Latest', executable_path: '/path/to/chrome-latest', version: '120.0.0', is_default_agent: false, created_at: '2024-01-01' },
      ];
      mockInvoke.mockResolvedValue(mockKernels);

      const { result } = renderHook(() => useForgeStore());

      await act(async () => {
        await result.current.loadKernels();
      });

      expect(result.current.kernels).toEqual(mockKernels);
      expect(result.current.kernelsLoading).toBe(false);
    });

    it('should detect kernels automatically', async () => {
      const mockDetectedKernels: Kernel[] = [
        { id: 'detected-1', name: 'Auto-detected Chrome', executable_path: '/usr/bin/chrome', version: '120.0.0', is_default_agent: false, created_at: '2024-01-01' },
      ];
      mockInvoke.mockResolvedValueOnce(mockDetectedKernels);

      const { result } = renderHook(() => useForgeStore());

      await act(async () => {
        const kernels = await result.current.detectKernels();
        expect(kernels).toEqual(mockDetectedKernels);
      });

      expect(mockInvoke).toHaveBeenCalledWith('detect_kernels', undefined);
    });

    it('should set default kernel', async () => {
      mockInvoke.mockResolvedValue(undefined);
      mockInvoke.mockResolvedValue([]);

      const { result } = renderHook(() => useForgeStore());

      await act(async () => {
        await result.current.setDefaultKernel('kernel-1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('update_kernel', {
        id: 'kernel-1',
        is_default_agent: true,
      });
    });

    it('should delete a kernel', async () => {
      mockInvoke.mockResolvedValue(undefined);
      mockInvoke.mockResolvedValue([]);

      const { result } = renderHook(() => useForgeStore());

      await act(async () => {
        await result.current.deleteKernel('kernel-1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('delete_kernel', { id: 'kernel-1' });
    });
  });

  describe('Execution Actions', () => {
    it('should load executions for a script', async () => {
      const mockExecutions: Execution[] = [
        { id: '1', script_id: 'script-1', kernel_id: 'kernel-1', status: 'COMPLETED', started_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-01T00:01:00Z' },
        { id: '2', script_id: 'script-1', kernel_id: 'kernel-2', status: 'RUNNING', started_at: '2024-01-01T00:02:00Z' },
      ];
      mockInvoke.mockResolvedValue(mockExecutions);

      const { result } = renderHook(() => useForgeStore());

      await act(async () => {
        await result.current.loadExecutions('script-1');
      });

      expect(result.current.executions).toEqual(mockExecutions);
      expect(result.current.executionsLoading).toBe(false);
    });

    it('should get consolidated results by kernel', async () => {
      const mockExecutions: Execution[] = [
        { id: '1', script_id: 'script-1', kernel_id: 'kernel-1', status: 'COMPLETED', started_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-01T00:01:00Z' },
        { id: '2', script_id: 'script-1', kernel_id: 'kernel-2', status: 'COMPLETED', started_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-01T00:01:00Z' },
        { id: '3', script_id: 'script-1', kernel_id: 'kernel-1', status: 'FAILED', started_at: '2024-01-01T00:02:00Z', completed_at: '2024-01-01T00:03:00Z' },
      ];
      mockInvoke.mockResolvedValue(mockExecutions);

      const { result } = renderHook(() => useForgeStore());

      await act(async () => {
        const results = await result.current.getConsolidatedResults('script-1', ['1', '2', '3']);
        expect(results).toBeInstanceOf(Map);
        expect(results.get('kernel-1')?.length).toBe(2);
        expect(results.get('kernel-2')?.length).toBe(1);
      });
    });
  });

  describe('UI Actions', () => {
    it('should toggle sidebar', () => {
      const { result } = renderHook(() => useForgeStore());

      expect(result.current.sidebarCollapsed).toBe(false);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarCollapsed).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarCollapsed).toBe(false);
    });

    it('should add a tab', () => {
      const { result } = renderHook(() => useForgeStore());

      act(() => {
        result.current.addTab({ id: 'tab-1', title: 'Test Tab', content: 'Content', closable: true });
      });

      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0].id).toBe('tab-1');
      expect(result.current.activeTab).toBe('tab-1');
    });

    it('should not add duplicate tab', () => {
      const { result } = renderHook(() => useForgeStore());
      const tab = { id: 'tab-1', title: 'Test Tab', content: 'Content', closable: true };

      act(() => {
        result.current.addTab(tab);
        result.current.addTab(tab);
      });

      expect(result.current.tabs).toHaveLength(1);
    });

    it('should remove a tab', () => {
      const { result } = renderHook(() => useForgeStore());

      act(() => {
        result.current.addTab({ id: 'tab-1', title: 'Tab 1', content: 'Content 1', closable: true });
        result.current.addTab({ id: 'tab-2', title: 'Tab 2', content: 'Content 2', closable: true });
        result.current.setActiveTab('tab-1');
        result.current.removeTab('tab-1');
      });

      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0].id).toBe('tab-2');
      expect(result.current.activeTab).toBe('tab-2');
    });

    it('should add notification', () => {
      const { result } = renderHook(() => useForgeStore());

      act(() => {
        result.current.addNotification({ type: 'success', title: 'Test', message: 'Test message' });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('success');
      expect(result.current.notifications[0].read).toBe(false);
    });

    it('should mark notification as read', () => {
      const { result } = renderHook(() => useForgeStore());

      let notifId: string;
      act(() => {
        result.current.addNotification({ type: 'info', title: 'Test', message: 'Test message' });
      });

      act(() => {
        notifId = result.current.notifications[0].id;
        result.current.markNotificationRead(notifId);
      });

      expect(result.current.notifications[0].read).toBe(true);
    });

    it('should clear all notifications', () => {
      const { result } = renderHook(() => useForgeStore());

      act(() => {
        result.current.addNotification({ type: 'info', title: 'Test', message: 'Message 1' });
        result.current.addNotification({ type: 'success', title: 'Test', message: 'Message 2' });
      });

      expect(result.current.notifications).toHaveLength(2);

      act(() => {
        result.current.clearNotifications();
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should set language', () => {
      const { result } = renderHook(() => useForgeStore());

      act(() => {
        result.current.setLanguage('zh');
      });

      expect(result.current.language).toBe('zh');
    });

    it('should set selected node', () => {
      const { result } = renderHook(() => useForgeStore());
      const node = { id: 'node-1', name: 'Test Node', type: 'script' as const, children: [] };

      act(() => {
        result.current.setSelectedNode(node);
      });

      expect(result.current.selectedNode).toEqual(node);
    });
  });

  describe('Tree Actions', () => {
    it('should build tree data from projects', () => {
      const mockProjects: Project[] = [
        { id: '1', name: 'Project 1', version: '1.0.0', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: '2', name: 'Project 2', version: '1.0.0', created_at: '2024-01-01', updated_at: '2024-01-01' },
      ];

      const { result } = renderHook(() => useForgeStore());

      act(() => {
        result.current.buildTreeData();
      });

      expect(result.current.treeData).toHaveLength(0);

      act(() => {
        useForgeStore.setState({ projects: mockProjects });
        result.current.buildTreeData();
      });

      expect(result.current.treeData).toHaveLength(2);
      expect(result.current.treeData[0].name).toBe('Project 1');
    });
  });
});
