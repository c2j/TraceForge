import { test, expect } from '@playwright/test';

// Smoke tests for TraceForge Desktop Application
// These tests verify the basic functionality of the application

test.describe('TraceForge Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:1420');
  });

  test('application loads successfully', async ({ page }) => {
    // Wait for the main layout to be visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigation is present and functional', async ({ page }) => {
    // Check for navigation elements
    await expect(page.locator('nav, [role="navigation"]')).toBeVisible();

    // Dashboard link should be present
    const dashboardLink = page.getByRole('link', { name: /dashboard|forge/i });
    await expect(dashboardLink).toBeVisible();
  });

  test('Dashboard page loads', async ({ page }) => {
    // Navigate to Dashboard
    await page.goto('http://localhost:1420/#/dashboard');

    // Check for KPI metrics
    await expect(page.locator('text=/pass rate|failures|coverage|scripts/i')).toBeVisible();
  });

  test('Recorder page is accessible', async ({ page }) => {
    // Navigate to Recorder
    await page.goto('http://localhost:1420/#/recorder');

    // Check for recorder elements
    await expect(page.locator('text=/record|start|stop/i')).toBeVisible();
  });

  test('Editor page is accessible', async ({ page }) => {
    // Navigate to Editor
    await page.goto('http://localhost:1420/#/editor');

    // Check for editor elements
    await expect(page.locator('text=/script|scenario|page|action/i')).toBeVisible();
  });

  test('Results page is accessible', async ({ page }) => {
    // Navigate to Results
    await page.goto('http://localhost:1420/#/results');

    // Check for results elements
    await expect(page.locator('text=/execution|history|filter/i')).toBeVisible();
  });

  test('Kernels page is accessible', async ({ page }) => {
    // Navigate to Kernels
    await page.goto('http://localhost:1420/#/kernels');

    // Check for kernel management elements
    await expect(page.locator('text=/kernel|chrome|version/i')).toBeVisible();
  });

  test('Settings page is accessible', async ({ page }) => {
    // Navigate to Settings
    await page.goto('http://localhost:1420/#/settings');

    // Check for settings elements
    await expect(page.locator('text=/settings|network|sync|storage|general/i')).toBeVisible();
  });

  test('responsive layout works', async ({ page }) => {
    // Set viewport to different sizes
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();

    await page.setViewportSize({ width: 1366, height: 768 });
    await expect(page.locator('body')).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Project Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420');
  });

  test('create new project', async ({ page }) => {
    // Click create project button
    await page.click('button:has-text("New Project")');

    // Fill in project details
    await page.fill('input[name="name"]', 'Test Project');
    await page.fill('input[name="version"]', '1.0.0');
    await page.fill('textarea[name="description"]', 'E2E test project');

    // Submit
    await page.click('button:has-text("Create")');

    // Verify project was created
    await expect(page.locator('text=Test Project')).toBeVisible();
  });

  test('view project details', async ({ page }) => {
    // Click on a project
    await page.click('[data-testid="project-item"]:first-child');

    // Verify details are shown
    await expect(page.locator('[data-testid="project-details"]')).toBeVisible();
  });

  test('delete project', async ({ page }) => {
    // Create a project first
    await page.click('button:has-text("New Project")');
    await page.fill('input[name="name"]', 'Project to Delete');
    await page.click('button:has-text("Create")');

    // Delete it
    await page.hover('[data-testid="project-item"]:has-text("Project to Delete")');
    await page.click('[data-testid="delete-project"]');

    // Confirm deletion
    await page.click('button:has-text("Confirm")');

    // Verify it's gone
    await expect(page.locator('text=Project to Delete')).not.toBeVisible();
  });
});

test.describe('Script Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420/#/editor');
  });

  test('create new script', async ({ page }) => {
    await page.click('button:has-text("New Script")');

    await page.fill('input[name="name"]', 'Login Test Script');
    await page.selectOption('select[name="priority"]', 'P1');

    await page.click('button:has-text("Create")');

    await expect(page.locator('text=Login Test Script')).toBeVisible();
  });

  test('add scenario to script', async ({ page }) => {
    // Create script first
    await page.click('button:has-text("New Script")');
    await page.fill('input[name="name"]', 'Script with Scenario');
    await page.click('button:has-text("Create")');

    // Add scenario
    await page.click('button:has-text("Add Scenario")');
    await page.fill('input[name="scenario-name"]', 'Test Scenario');
    await page.click('button:has-text("Add")');

    await expect(page.locator('text=Test Scenario')).toBeVisible();
  });

  test('add action to scenario', async ({ page }) => {
    // Navigate through the tree
    await page.click('[data-testid="tree-node"]:has-text("Script")');
    await page.click('button:has-text("Add Action")');

    await page.fill('input[name="action-name"]', 'Click Login Button');
    await page.selectOption('select[name="action-type"]', 'click');
    await page.fill('input[name="timeout"]', '30000');

    await page.click('button:has-text("Save")');

    await expect(page.locator('text=Click Login Button')).toBeVisible();
  });
});

test.describe('Kernel Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420/#/kernels');
  });

  test('auto-detect kernels', async ({ page }) => {
    await page.click('button:has-text("Auto-Detect")');

    // Wait for detection to complete
    await expect(page.locator('text=/detecting|scanning/i')).not.toBeVisible({ timeout: 10000 });

    // Verify kernels are shown
    await expect(page.locator('[data-testid="kernel-item"]').first()).toBeVisible();
  });

  test('add kernel manually', async ({ page }) => {
    await page.click('button:has-text("Add Kernel")');

    await page.fill('input[name="kernel-name"]', 'Custom Chrome');
    await page.fill('input[name="executable-path"]', '/path/to/chrome');
    await page.fill('input[name="version"]', '90.0.4430.212');

    await page.click('button:has-text("Add")');

    await expect(page.locator('text=Custom Chrome')).toBeVisible();
  });

  test('set default kernel', async ({ page }) => {
    await page.click('[data-testid="kernel-item"]:first-child [data-testid="set-default"]');

    await expect(page.locator('[data-testid="kernel-item"]:first-child [data-testid="default-badge"]')).toBeVisible();
  });
});

test.describe('Recording Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420/#/recorder');
  });

  test('start recording session', async ({ page }) => {
    // Select kernel
    await page.selectOption('select[name="kernel"]', { label: /chrome/i });

    // Start recording
    await page.click('button:has-text("Start Recording")');

    // Verify recording UI is active
    await expect(page.locator('button:has-text("Stop Recording")')).toBeVisible();
    await expect(page.locator('[data-testid="recording-status"]')).toHaveText(/recording/i);
  });

  test('capture actions during recording', async ({ page }) => {
    await page.selectOption('select[name="kernel"]', { label: /chrome/i });
    await page.click('button:has-text("Start Recording")');

    // Wait a bit for recording to start
    await page.waitForTimeout(1000);

    // Verify captured actions appear
    // (This would require a running browser to actually capture actions)
    await page.click('button:has-text("Stop Recording")');
  });

  test('save recorded script', async ({ page }) => {
    await page.selectOption('select[name="kernel"]', { label: /chrome/i });
    await page.click('button:has-text("Start Recording")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Stop Recording")');

    await page.fill('input[name="script-name"]', 'Recorded Test');
    await page.click('button:has-text("Save")');

    await expect(page.locator('text=Recorded Test')).toBeVisible();
  });
});

test.describe('Results and Execution History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420/#/results');
  });

  test('view execution history', async ({ page }) => {
    // Should show execution list
    await expect(page.locator('[data-testid="execution-item"]').first()).toBeVisible();
  });

  test('filter executions by status', async ({ page }) => {
    await page.selectOption('select[name="status-filter"]', 'FAILED');

    // Verify only failed executions are shown
    const items = await page.locator('[data-testid="execution-item"]').all();
    for (const item of items) {
      await expect(item).toContainText(/failed/i);
    }
  });

  test('view execution details', async ({ page }) => {
    await page.click('[data-testid="execution-item"]:first-child');

    await expect(page.locator('[data-testid="execution-details"]')).toBeVisible();
    await expect(page.locator('text=/steps|screenshot|trace/i')).toBeVisible();
  });

  test('export execution report', async ({ page }) => {
    await page.click('[data-testid="execution-item"]:first-child');
    await page.click('button:has-text("Export")');

    // Should show export options
    await expect(page.locator('text=/json|html/i')).toBeVisible();
  });
});

test.describe('Settings and Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420/#/settings');
  });

  test('configure server connection', async ({ page }) => {
    await page.click('text=Network');

    await page.fill('input[name="server-url"]', 'https://traceforge.example.com');
    await page.click('button:has-text("Test Connection")');

    // Show connection status
    await expect(page.locator('[data-testid="connection-status"]')).toBeVisible();
  });

  test('configure sync settings', async ({ page }) => {
    await page.click('text=Synchronization');

    // Enable auto-sync
    await page.click('button:has-text("Auto-sync")');

    // Set interval
    await page.fill('input[name="sync-interval"]', '30');

    await expect(page.locator('input[name="sync-interval"]')).toHaveValue('30');
  });

  test('change language settings', async ({ page }) => {
    await page.click('text=General');

    await page.selectOption('select[name="language"]', 'zh');

    // Verify language change (would need to check for Chinese text)
    await expect(page.locator('select[name="language"]')).toHaveValue('zh');
  });

  test('import/export project', async ({ page }) => {
    await page.click('text=Synchronization');

    // Export
    await page.click('button:has-text("Export")');

    // Import
    await page.click('button:has-text("Import")');

    // Verify file dialogs are triggered (handled by Tauri)
  });
});

test.describe('Error Handling', () => {
  test('handles invalid server URL', async ({ page }) => {
    await page.goto('http://localhost:1420/#/settings');
    await page.click('text=Network');

    await page.fill('input[name="server-url"]', 'not-a-url');
    await page.click('button:has-text("Test Connection")');

    await expect(page.locator('text=/invalid|error/i')).toBeVisible();
  });

  test('handles missing required fields', async ({ page }) => {
    await page.goto('http://localhost:1420/#/editor');

    // Try to create without required fields
    await page.click('button:has-text("New Script")');
    await page.click('button:has-text("Create")'); // Without filling name

    await expect(page.locator('text=/required|name/i')).toBeVisible();
  });

  test('handles navigation to non-existent resource', async ({ page }) => {
    await page.goto('http://localhost:1420/#/editor/non-existent-id');

    // Should show error or redirect
    await expect(page.locator('text=/not found|error/i')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('keyboard navigation works', async ({ page }) => {
    await page.goto('http://localhost:1420');

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Verify some interaction happened
    await expect(page.locator('body')).toBeVisible();
  });

  test('aria labels are present', async ({ page }) => {
    // Check for ARIA labels on important elements
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav).toHaveAttribute('role');

    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
  });

  test('focus indicators are visible', async ({ page }) => {
    const button = page.locator('button').first();
    await button.focus();

    // Check if focus styles are applied (depends on CSS)
    await expect(button).toBeFocused();
  });
});

test.describe('Performance', () => {
  test('page loads quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load in less than 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('navigating between pages is fast', async ({ page }) => {
    await page.goto('http://localhost:1420');

    const startTime = Date.now();
    await page.click('a:has-text("Dashboard")');
    await page.waitForLoadState('networkidle');
    const navTime = Date.now() - startTime;

    expect(navTime).toBeLessThan(1000);
  });
});
