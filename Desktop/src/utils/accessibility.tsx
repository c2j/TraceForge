// ============================================================================
// TraceForge Desktop - Accessibility Utilities
// Provides ARIA attributes, focus management, and screen reader support
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';

// ============================================================================
// ARIA Attribute Generators
// ============================================================================

/**
 * Get ARIA attributes for a button
 */
export function getButtonAriaProps(props: {
  label?: string;
  description?: string;
  pressed?: boolean;
  expanded?: boolean;
  disabled?: boolean;
}) {
  const ariaProps: Record<string, string | boolean> = {};

  if (props.label) ariaProps['aria-label'] = props.label;
  if (props.description) ariaProps['aria-describedby'] = props.description;
  if (props.pressed !== undefined) ariaProps['aria-pressed'] = props.pressed;
  if (props.expanded !== undefined) ariaProps['aria-expanded'] = props.expanded;
  if (props.disabled) ariaProps['aria-disabled'] = true;

  return ariaProps;
}

/**
 * Get ARIA attributes for a dialog/modal
 */
export function getDialogAriaProps(props: {
  label: string;
  description?: string;
  modalId: string;
}) {
  return {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': `${props.modalId}-label`,
    'aria-describedby': props.description ? `${props.modalId}-description` : undefined,
    id: props.modalId,
  };
}

/**
 * Get ARIA attributes for a live region (announcements to screen readers)
 */
export function getLiveRegionProps(priority: 'polite' | 'assertive' = 'polite') {
  return {
    'aria-live': priority,
    'aria-atomic': true,
    role: 'status',
  };
}

/**
 * Get ARIA attributes for a form input
 */
export function getInputAriaProps(props: {
  label: string;
  error?: string;
  description?: string;
  required?: boolean;
  invalid?: boolean;
}) {
  const inputId = props.label.toLowerCase().replace(/\s+/g, '-');
  const errorId = `${inputId}-error`;
  const descriptionId = `${inputId}-description`;

  const ariaProps: Record<string, string | boolean> = {
    'aria-label': props.label,
    'aria-required': !!props.required,
    'aria-invalid': !!props.invalid || !!props.error,
  };

  if (props.error) {
    ariaProps['aria-describedby'] = errorId;
  } else if (props.description) {
    ariaProps['aria-describedby'] = descriptionId;
  }

  return ariaProps;
}

/**
 * Get ARIA current attribute for navigation
 */
export function getNavAriaProps(current?: boolean) {
  return current ? { 'aria-current': 'page' } : {};
}

// ============================================================================
// Focus Management Hooks
// ============================================================================

/**
 * Trap focus within a component (modals, dialogs)
 */
export function useFocusTrap(enabled: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

    // Focus first element
    firstElement?.focus();

    container.addEventListener('keydown', handleTab);

    return () => {
      container.removeEventListener('keydown', handleTab);
    };
  }, [enabled]);

  return containerRef;
}

/**
 * Return focus to previous element after closing something
 */
export function useFocusReturn() {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;

    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  return previousFocusRef;
}

/**
 * Manage focus with custom ref
 */
export function useFocusManagement<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isFocused, setIsFocused] = useState(false);

  const setFocus = useCallback(() => {
    ref.current?.focus();
  }, []);

  const blur = useCallback(() => {
    ref.current?.blur();
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, []);

  return { ref, isFocused, setFocus, blur };
}

// ============================================================================
// Screen Reader Announcements
// ============================================================================

let announcerElement: HTMLElement | null = null;

/**
 * Announce message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  if (!announcerElement) {
    announcerElement = document.createElement('div');
    announcerElement.setAttribute('aria-live', priority);
    announcerElement.setAttribute('aria-atomic', 'true');
    announcerElement.setAttribute('role', 'status');
    announcerElement.style.position = 'absolute';
    announcerElement.style.left = '-10000px';
    announcerElement.style.width = '1px';
    announcerElement.style.height = '1px';
    announcerElement.style.overflow = 'hidden';
    document.body.appendChild(announcerElement);
  }

  announcerElement.setAttribute('aria-live', priority);
  announcerElement.textContent = '';

  // Use setTimeout to ensure screen readers pick up the change
  setTimeout(() => {
    if (announcerElement) {
      announcerElement.textContent = message;
    }
  }, 100);
}

/**
 * Hook for screen reader announcements
 */
export function useAnnouncer() {
  return useCallback((message: string, priority?: 'polite' | 'assertive') => {
    announce(message, priority);
  }, []);
}

// ============================================================================
// Keyboard Navigation Utilities
// ============================================================================

/**
 * Handle arrow key navigation in lists/grids
 */
export function useArrowNavigation(
  itemCount: number,
  currentIndex: number,
  onSelect: (index: number) => void,
  orientation: 'horizontal' | 'vertical' | 'both' = 'vertical',
  loop: boolean = false
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'both') {
            event.preventDefault();
            newIndex = currentIndex + 1;
            if (newIndex >= itemCount) {
              newIndex = loop ? 0 : itemCount - 1;
            }
          }
          break;

        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'both') {
            event.preventDefault();
            newIndex = currentIndex - 1;
            if (newIndex < 0) {
              newIndex = loop ? itemCount - 1 : 0;
            }
          }
          break;

        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'both') {
            event.preventDefault();
            newIndex = currentIndex + 1;
            if (newIndex >= itemCount) {
              newIndex = loop ? 0 : itemCount - 1;
            }
          }
          break;

        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'both') {
            event.preventDefault();
            newIndex = currentIndex - 1;
            if (newIndex < 0) {
              newIndex = loop ? itemCount - 1 : 0;
            }
          }
          break;

        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;

        case 'End':
          event.preventDefault();
          newIndex = itemCount - 1;
          break;

        default:
          return;
      }

      if (newIndex !== currentIndex) {
        onSelect(newIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, itemCount, onSelect, orientation, loop]);
}

/**
 * Handle roving tabindex for keyboard navigation
 */
export function useRovingTabIndex(items: { id: string }[], activeId: string) {
  const setActiveItem = useCallback((id: string) => {
    const element = document.querySelector(`[data-roving-id="${id}"]`) as HTMLElement;
    element?.focus();
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent, index: number) => {
    let newIndex = index;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        newIndex = (index + 1) % items.length;
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = (index - 1 + items.length) % items.length;
        break;

      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;

      default:
        return;
    }

    setActiveItem(items[newIndex].id);
  }, [items, setActiveItem]);

  return { handleKeyDown, activeId, setActiveItem };
}

// ============================================================================
// Visually Hidden Utilities
// ============================================================================

/**
 * Styles for visually hidden but accessible content (screen readers only)
 */
export const visuallyHiddenStyles = {
  position: 'absolute' as const,
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap' as const,
  borderWidth: 0,
};

/**
 * Component for visually hidden content
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span style={visuallyHiddenStyles}>{children}</span>;
}

// ============================================================================
// Skip Links Utility
// ============================================================================

/**
 * Get skip link attributes
 */
export function getSkipLinkProps(targetId: string) {
  return {
    href: `#${targetId}`,
    className: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded',
  };
}

// ============================================================================
// ARIA Live Region Component
// ============================================================================

export interface LiveRegionProps {
  message?: string;
  priority?: 'polite' | 'assertive';
  className?: string;
}

/**
 * Component for announcing dynamic content to screen readers
 */
export function LiveRegion({ message, priority = 'polite', className = '' }: LiveRegionProps) {
  const props = getLiveRegionProps(priority);

  return (
    <div {...props} className={className}>
      {message}
    </div>
  );
}

// ============================================================================
// Focus Visible Utility
// ============================================================================

/**
 * Detect if keyboard navigation is being used (vs mouse/touch)
 */
export function useFocusVisible() {
  const [isFocusVisible, setIsFocusVisible] = useState(false);

  useEffect(() => {
    let isUsingKeyboard = false;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only certain keys indicate keyboard navigation
      if (
        event.key === 'Tab' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight' ||
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        isUsingKeyboard = true;
      }
    };

    const handleMouseDown = () => {
      isUsingKeyboard = false;
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (isUsingKeyboard) {
        setIsFocusVisible(true);
        (event.target as HTMLElement).classList.add('focus-visible');
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      setIsFocusVisible(false);
      (event.target as HTMLElement).classList.remove('focus-visible');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return isFocusVisible;
}

export default {
  getButtonAriaProps,
  getDialogAriaProps,
  getLiveRegionProps,
  getInputAriaProps,
  getNavAriaProps,
  useFocusTrap,
  useFocusReturn,
  useFocusManagement,
  announce,
  useAnnouncer,
  useArrowNavigation,
  useRovingTabIndex,
  visuallyHiddenStyles,
  VisuallyHidden,
  getSkipLinkProps,
  LiveRegion,
  useFocusVisible,
};
