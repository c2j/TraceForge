// ============================================================================
// TraceForge Desktop - Keyboard Shortcuts Modal
// Displays all available keyboard shortcuts
// ============================================================================

import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import {
  traceforgeShortcuts,
  formatShortcut,
  useKeyboardShortcuts,
  getPlatformModifierKey,
  getModifierKeyLabel,
} from '../hooks/useKeyboardShortcuts';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const modalRef = React.useRef<HTMLDivElement>(null);

  // Keyboard shortcut to open/close this modal
  useKeyboardShortcuts([
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      handler: () => {
        onClose();
      },
      disabled: !isOpen,
    },
  ], [isOpen]);

  // Close on Escape
  useKeyboardShortcuts([
    {
      key: 'Escape',
      description: 'Close modal',
      handler: onClose,
      disabled: !isOpen,
    },
  ], [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    firstElement?.focus();
    modalRef.current.addEventListener('keydown', handleTab);

    return () => {
      modalRef.current?.removeEventListener('keydown', handleTab);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter shortcuts based on search
  const filteredShortcuts = traceforgeShortcuts.map(group => ({
    ...group,
    shortcuts: group.shortcuts.filter(shortcut =>
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.key.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(group => group.shortcuts.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        ref={modalRef}
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 id="shortcuts-title" className="text-lg font-semibold text-white">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
            aria-label="Close keyboard shortcuts"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-600 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary"
              aria-label="Search keyboard shortcuts"
            />
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {filteredShortcuts.map((group) => (
              <div key={group.name}>
                <h3 className="text-sm font-medium text-slate-400 mb-2">
                  {group.name}
                </h3>
                <div className="space-y-1">
                  {group.shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 hover:bg-slate-700 rounded"
                    >
                      <span className="text-slate-300">{shortcut.description}</span>
                      <kbd className="flex gap-1 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-slate-400">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredShortcuts.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No shortcuts found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 text-sm text-slate-400">
          <p>
            Press <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-600 rounded text-xs">?</kbd> to open this dialog anytime
          </p>
          <p className="mt-1">
            {getModifierKeyLabel()} is shown as {getModifierKeyLabel()}
            {getPlatformModifierKey() === 'meta' ? ' (⌘)' : ' (Ctrl)'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
