// ============================================================================
// TraceForge Desktop - Keyboard Shortcuts Hook
// Provides global keyboard shortcuts for navigation and common actions
// ============================================================================

import { useEffect, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  description: string;
  handler: () => void;
  disabled?: boolean;
}

export interface ShortcutGroup {
  name: string;
  shortcuts: KeyboardShortcut[];
}

// Global shortcuts registry
let globalShortcuts: Map<string, KeyboardShortcut[]> = new Map();

/**
 * Hook to register keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  deps: any[] = []
) {
  const handlersRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    // Store handlers by key combination
    const handlerMap = handlersRef.current;

    shortcuts.forEach(shortcut => {
      if (shortcut.disabled) return;

      const keyCombo = getKeyCombo(shortcut);
      handlerMap.set(keyCombo, shortcut.handler);
    });

    // Register globally
    const groupId = Math.random().toString(36);
    globalShortcuts.set(groupId, shortcuts);

    return () => {
      // Cleanup
      globalShortcuts.delete(groupId);
      handlersRef.current.clear();
    };
  }, deps);
}

/**
 * Get a unique key combination string for a shortcut
 */
function getKeyCombo(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrlKey) parts.push('ctrl');
  if (shortcut.metaKey) parts.push('meta');
  if (shortcut.altKey) parts.push('alt');
  if (shortcut.shiftKey) parts.push('shift');

  parts.push(shortcut.key.toLowerCase());

  return parts.join('+');
}

/**
 * Check if a keyboard event matches a shortcut
 */
function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  return (
    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
    !!event.ctrlKey === !!shortcut.ctrlKey &&
    !!event.metaKey === !!shortcut.metaKey &&
    !!event.altKey === !!shortcut.altKey &&
    !!event.shiftKey === !!shortcut.shiftKey
  );
}

/**
 * Global keyboard event listener
 */
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (event) => {
    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.getAttribute('contenteditable') === 'true'
    ) {
      return;
    }

    // Check all registered shortcuts
    for (const [_groupId, shortcuts] of globalShortcuts) {
      for (const shortcut of shortcuts) {
        if (shortcut.disabled) continue;

        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.handler();
          return;
        }
      }
    }
  }, { capture: true });
}

/**
 * Predefined shortcut groups for TraceForge
 */
export const traceforgeShortcuts: ShortcutGroup[] = [
  {
    name: 'Navigation',
    shortcuts: [
      {
        key: 'g',
        ctrlKey: true,
        description: 'Go to Dashboard',
        handler: () => {
          window.location.hash = '#/dashboard';
        },
      },
      {
        key: 'r',
        ctrlKey: true,
        description: 'Go to Recorder',
        handler: () => {
          window.location.hash = '#/recorder';
        },
      },
      {
        key: 'e',
        ctrlKey: true,
        description: 'Go to Editor',
        handler: () => {
          window.location.hash = '#/editor';
        },
      },
      {
        key: 't',
        ctrlKey: true,
        description: 'Go to Results (TesT results)',
        handler: () => {
          window.location.hash = '#/results';
        },
      },
      {
        key: 'k',
        ctrlKey: true,
        description: 'Go to Kernels',
        handler: () => {
          window.location.hash = '#/kernels';
        },
      },
      {
        key: ',',
        ctrlKey: true,
        description: 'Go to Settings',
        handler: () => {
          window.location.hash = '#/settings';
        },
      },
    ],
  },
  {
    name: 'Editor Actions',
    shortcuts: [
      {
        key: 'n',
        ctrlKey: true,
        description: 'New Script',
        handler: () => {
          // Trigger new script action
          window.dispatchEvent(new CustomEvent('shortcut:new-script'));
        },
      },
      {
        key: 's',
        ctrlKey: true,
        description: 'Save',
        handler: () => {
          // Trigger save action
          window.dispatchEvent(new CustomEvent('shortcut:save'));
        },
      },
      {
        key: 'z',
        ctrlKey: true,
        description: 'Undo',
        handler: () => {
          // Trigger undo action
          window.dispatchEvent(new CustomEvent('shortcut:undo'));
        },
      },
      {
        key: 'y',
        ctrlKey: true,
        description: 'Redo',
        handler: () => {
          // Trigger redo action
          window.dispatchEvent(new CustomEvent('shortcut:redo'));
        },
      },
      {
        key: 'd',
        ctrlKey: true,
        description: 'Duplicate selected item',
        handler: () => {
          window.dispatchEvent(new CustomEvent('shortcut:duplicate'));
        },
      },
      {
        key: 'Delete',
        description: 'Delete selected item',
        handler: () => {
          window.dispatchEvent(new CustomEvent('shortcut:delete'));
        },
      },
    ],
  },
  {
    name: 'Execution',
    shortcuts: [
      {
        key: 'F5',
        description: 'Run script',
        handler: () => {
          window.dispatchEvent(new CustomEvent('shortcut:run'));
        },
      },
      {
        key: 'F10',
        description: 'Step over',
        handler: () => {
          window.dispatchEvent(new CustomEvent('shortcut:step-over'));
        },
      },
      {
        key: 'F9',
        description: 'Toggle breakpoint',
        handler: () => {
          window.dispatchEvent(new CustomEvent('shortcut:toggle-breakpoint'));
        },
      },
      {
        key: '.',
        ctrlKey: true,
        description: 'Stop execution',
        handler: () => {
          window.dispatchEvent(new CustomEvent('shortcut:stop'));
        },
      },
    ],
  },
  {
    name: 'Search',
    shortcuts: [
      {
        key: 'f',
        ctrlKey: true,
        description: 'Find in script',
        handler: () => {
          window.dispatchEvent(new CustomEvent('shortcut:find'));
        },
      },
      {
        key: 'p',
        ctrlKey: true,
        shiftKey: true,
        description: 'Command palette',
        handler: () => {
          window.dispatchEvent(new CustomEvent('shortcut:command-palette'));
        },
      },
    ],
  },
  {
    name: 'View',
    shortcuts: [
      {
        key: 'b',
        ctrlKey: true,
        description: 'Toggle sidebar',
        handler: () => {
          window.dispatchEvent(new CustomEvent('shortcut:toggle-sidebar'));
        },
      },
      {
        key: '=',
        ctrlKey: true,
        description: 'Zoom in',
        handler: () => {
          document.dispatchEvent(new CustomEvent('shortcut:zoom-in'));
        },
      },
      {
        key: '-',
        ctrlKey: true,
        description: 'Zoom out',
        handler: () => {
          document.dispatchEvent(new CustomEvent('shortcut:zoom-out'));
        },
      },
      {
        key: '0',
        ctrlKey: true,
        description: 'Reset zoom',
        handler: () => {
          document.dispatchEvent(new CustomEvent('shortcut:zoom-reset'));
        },
      },
    ],
  },
];

/**
 * Hook to use all TraceForge shortcuts
 */
export function useTraceForgeShortcuts() {
  useKeyboardShortcuts(
    traceforgeShortcuts.flatMap(group => group.shortcuts)
  );
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrlKey) parts.push('⌃');
  if (shortcut.metaKey) parts.push('⌘');
  if (shortcut.altKey) parts.push('⌥');
  if (shortcut.shiftKey) parts.push('⇧');

  // Format key
  let key = shortcut.key;
  if (key === ' ') key = 'Space';
  if (key === 'Delete') key = 'Del';
  if (key === 'Escape') key = 'Esc';

  // Capitalize
  key = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();

  parts.push(key);

  return parts.join(' ');
}

/**
 * Detect platform-specific modifier key
 */
export function getPlatformModifierKey(): 'ctrl' | 'meta' {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'meta' : 'ctrl';
}

/**
 * Get platform-specific key label
 */
export function getModifierKeyLabel(): string {
  return getPlatformModifierKey() === 'meta' ? '⌘' : 'Ctrl';
}

export default useKeyboardShortcuts;
