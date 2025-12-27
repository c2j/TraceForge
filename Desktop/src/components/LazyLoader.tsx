// ============================================================================
// TraceForge Desktop - Lazy Loader Component
// Provides lazy loading for large data sets and expensive operations
// ============================================================================

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface LazyLoadOptions<T> {
  fetchFn: (page: number, pageSize: number) => Promise<T[]>;
  initialLoad?: boolean;
  pageSize?: number;
  threshold?: number; // Distance from bottom to trigger load (pixels)
  enabled?: boolean;
}

export interface LazyLoadResult<T> {
  items: T[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  retry: () => Promise<void>;
  refresh: () => Promise<void>;
  totalCount: number;
}

// ============================================================================
// Hook: useLazyLoad
// ============================================================================

export function useLazyLoad<T>(options: LazyLoadOptions<T>): LazyLoadResult<T> {
  const {
    fetchFn,
    initialLoad = true,
    pageSize = 50,
    threshold: _threshold = 200,
    enabled = true,
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(async (pageNum: number, append = false): Promise<void> => {
    if (!enabled || loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const newItems = await fetchFn(pageNum, pageSize);

      if (append) {
        setItems(prev => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }

      setTotalCount(prev => append ? prev + newItems.length : newItems.length);
      setHasMore(newItems.length === pageSize);
      setPage(pageNum);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [fetchFn, pageSize, enabled]);

  const loadMore = useCallback(async () => {
    if (hasMore && !loading && enabled) {
      await loadPage(page + 1, true);
    }
  }, [page, hasMore, loading, enabled, loadPage]);

  const retry = useCallback(async () => {
    await loadPage(page, false);
  }, [page, loadPage]);

  const refresh = useCallback(async () => {
    setPage(0);
    setHasMore(true);
    await loadPage(0, false);
  }, [loadPage]);

  // Initial load
  useEffect(() => {
    if (initialLoad && enabled) {
      loadPage(0, false);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled]); // Only run on mount or when enabled changes

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    retry,
    refresh,
    totalCount,
  };
}

// ============================================================================
// Hook: useInfiniteScroll
// ============================================================================

export function useInfiniteScroll(
  callback: () => void,
  enabled: boolean = true,
  threshold: number = 200
): React.RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create sentinel element
    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    sentinel.style.position = 'absolute';
    sentinel.style.bottom = '0';
    sentinel.style.left = '0';
    sentinel.style.width = '100%';
    container.appendChild(sentinel);

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          callback();
        }
      },
      {
        rootMargin: `${threshold}px`,
        root: container,
      }
    );

    observerRef.current.observe(sentinel);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (container.contains(sentinel)) {
        container.removeChild(sentinel);
      }
    };
  }, [callback, enabled, threshold]);

  return containerRef;
}

// ============================================================================
// Component: LazyLoadList
// ============================================================================

export interface LazyLoadListProps<T> {
  fetchFn: (page: number, pageSize: number) => Promise<T[]>;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  pageSize?: number;
  threshold?: number;
  emptyMessage?: string;
  errorMessage?: string;
  loadingComponent?: ReactNode;
  className?: string;
  height?: number | string;
  enabled?: boolean;
}

export function LazyLoadList<T>({
  fetchFn,
  renderItem,
  keyExtractor,
  pageSize = 50,
  threshold = 200,
  emptyMessage = 'No items found',
  errorMessage = 'Failed to load items',
  loadingComponent,
  className = '',
  height = '100%',
  enabled = true,
}: LazyLoadListProps<T>) {
  const { items, loading, error, hasMore, loadMore, retry } = useLazyLoad({
    fetchFn,
    pageSize,
    threshold,
    enabled,
  });

  const containerRef = useInfiniteScroll(() => {
    if (hasMore && !loading) {
      loadMore();
    }
  }, enabled && hasMore && !loading, threshold);

  const defaultLoadingComponent = (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="w-5 h-5 text-primary animate-spin" />
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`lazy-load-list overflow-auto ${className}`}
      style={{ height }}
    >
      {/* Items */}
      <div className="space-y-1">
        {items.map((item, index) => (
          <React.Fragment key={keyExtractor(item, index)}>
            {renderItem(item, index)}
          </React.Fragment>
        ))}
      </div>

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 text-slate-400">
          <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center p-4">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={retry}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (loadingComponent || defaultLoadingComponent)}

      {/* Has more indicator */}
      {hasMore && !loading && !error && (
        <div className="flex items-center justify-center p-2">
          <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Component: LazyImage
// ============================================================================

export interface LazyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  placeholder?: ReactNode;
  fallback?: string;
  threshold?: number;
}

export function LazyImage({
  src,
  placeholder,
  fallback,
  threshold = 100,
  alt = '',
  className = '',
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      { rootMargin: `${threshold}px` }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, threshold]);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
    if (fallback) {
      setImageSrc(fallback);
    }
  }, [fallback]);

  const defaultPlaceholder = (
    <div className={`bg-slate-800 animate-pulse ${className}`} />
  );

  if (imageSrc === null) {
    return <>{placeholder || defaultPlaceholder}</>;
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200 ${className}`}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
}

// ============================================================================
// Component: CodeSplitWrapper
// ============================================================================

export interface CodeSplitWrapperProps {
  loader: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: ReactNode;
  error?: ReactNode;
}

export function CodeSplitWrapper({
  loader,
  fallback,
  error,
}: CodeSplitWrapperProps) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    loader()
      .then(module => {
        if (!cancelled) {
          setComponent(() => module.default);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setLoadError(err as Error);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loader]);

  if (loading) {
    return <>{fallback || <div className="p-4 text-slate-400">Loading...</div>}</>;
  }

  if (loadError || !Component) {
    return <>{error || <div className="p-4 text-red-400">Failed to load component</div>}</>;
  }

  return <Component />;
}

// ============================================================================
// Utilities: Debounce and Throttle
// ============================================================================

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRunRef.current;

      if (timeSinceLastRun >= delay) {
        lastRunRef.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          lastRunRef.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastRun);
      }
    },
    [callback, delay]
  );
}

export default LazyLoadList;
