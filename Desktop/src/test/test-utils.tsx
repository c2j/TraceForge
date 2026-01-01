import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { vi } from 'vitest';

// Custom render function that wraps components with necessary providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withRouter?: boolean;
  withStore?: boolean;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { withRouter = false, withStore = false, ...renderOptions } = options;

  // Add any necessary providers here
  // For now, just use default render
  const rendered = render(ui, renderOptions);

  return {
    ...rendered,
    // Add any additional utilities here
  };
}

// Re-export everything from RTL
export * from '@testing-library/react';

// Mock data generators for testing
export const mockProject = (overrides = {}) => ({
  id: 'proj-1',
  name: 'Test Project',
  version: '1.0.0',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  description: '',
  ...overrides,
});

export const mockScript = (overrides = {}) => ({
  id: 'script-1',
  project_id: 'proj-1',
  name: 'Test Script',
  priority: 'P1',
  description: '',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const mockKernel = (overrides = {}) => ({
  id: 'kernel-1',
  name: 'Chrome 86',
  executable_path: '/path/to/chrome',
  version: '86.0.4240.198',
  is_default_agent: false,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const mockExecution = (overrides = {}) => ({
  id: 'exec-1',
  script_id: 'script-1',
  kernel_id: 'kernel-1',
  status: 'COMPLETED',
  started_at: '2024-01-01T00:00:00Z',
  completed_at: '2024-01-01T00:01:00Z',
  error_message: null,
  trace_path: null,
  ...overrides,
});

export const mockScenario = (overrides = {}) => ({
  id: 'scenario-1',
  script_id: 'script-1',
  name: 'Test Scenario',
  priority: 'P1',
  order_index: 0,
  description: '',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const mockPage = (overrides = {}) => ({
  id: 'page-1',
  scenario_id: 'scenario-1',
  name: 'Test Page',
  order_index: 0,
  entry_url: 'https://example.com',
  default_wait: '5000',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const mockAction = (overrides = {}) => ({
  id: 'action-1',
  page_id: 'page-1',
  name: 'Click Button',
  action_type: 'click',
  order_index: 0,
  timeout_ms: 30000,
  wait_after: null,
  screenshot_enabled: true,
  description: '',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const mockLocator = (overrides = {}) => ({
  id: 'locator-1',
  action_id: 'action-1',
  locator_type: 'css',
  value: '.button',
  priority: 1,
  is_fallback: false,
  description: '',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const mockNotification = (overrides = {}) => ({
  id: 'notif-1',
  type: 'success' as const,
  title: 'Test Notification',
  message: 'Test message',
  timestamp: '2024-01-01T00:00:00Z',
  read: false,
  ...overrides,
});

// Wait for async operations to complete
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Mock Tauri dialog responses
export const mockDialogOpen = (filePath: string) => {
  const tauri = window.__TAURI__ as any;
  if (tauri?.dialog) {
    tauri.dialog.open = vi.fn().mockResolvedValue(filePath);
  }
};

export const mockDialogSave = (filePath: string) => {
  const tauri = window.__TAURI__ as any;
  if (tauri?.dialog) {
    tauri.dialog.save = vi.fn().mockResolvedValue(filePath);
  }
};

// Mock Tauri invoke responses
export const mockInvoke = (command: string, returnValue: any) => {
  const tauri = window.__TAURI__ as any;
  if (tauri?.invoke) {
    tauri.invoke.mockImplementation((cmd: string) => {
      if (cmd === command) {
        return returnValue;
      }
      return undefined;
    });
  }
};
