import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Tauri API
(global as any).__TAURI__ = {
  invoke: vi.fn(),
  dialog: {
    open: vi.fn(),
    save: vi.fn(),
    confirm: vi.fn(),
  },
  fs: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readDir: vi.fn(),
    exists: vi.fn(),
  },
  path: {
    resolve: vi.fn(),
    join: vi.fn(),
    basename: vi.fn(),
    dirname: vi.fn(),
  },
  shell: {
    open: vi.fn(),
  },
  window: {
    getCurrent: vi.fn(() => ({
      listen: vi.fn(),
      emit: vi.fn(),
    })),
  },
  convertFileSrc: vi.fn((src: string, protocol: string) => `${protocol}://${src}`),
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
