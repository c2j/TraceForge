import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Bug, RefreshCw, Home, FileWarning } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component for catching and handling React errors
 * Catches errors in child components and displays a user-friendly error message
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to error tracking service (e.g., Sentry)
    if (window.__SENTRY__ && window.__SENTRY__.captureException) {
      window.__SENTRY__.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      const error = this.state.error;
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-surface border border-slate-700 rounded-lg p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <FileWarning className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
                <p className="text-slate-400 mt-1">
                  {error?.message || 'An unexpected error occurred'}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-slate-300">
                We apologize for the inconvenience. The application has encountered
                an error and cannot continue. You can try refreshing the page or
                returning to the home screen.
              </p>

              {isDevelopment && error && (
                <details className="bg-slate-800 rounded-lg p-4">
                  <summary className="cursor-pointer text-sm font-medium text-slate-300 mb-2">
                    Error Details (Development Mode)
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div className="bg-slate-900 rounded p-3">
                      <code className="text-sm text-red-400 whitespace-pre-wrap">
                        {error.toString()}
                      </code>
                    </div>
                    {this.state.errorInfo && (
                      <div className="bg-slate-900 rounded p-3">
                        <code className="text-xs text-slate-400 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </code>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-2 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <Bug className="w-4 h-4" />
                  Error ID: <code className="text-slate-300">
                    {Date.now().toString(36).toUpperCase()}
                  </code>
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-primary hover:bg-blue-600 text-white py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-xs text-slate-500 text-center">
                If this problem persists, please contact support with the Error ID above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Hook for error handling in functional components
 * Can be used to wrap async operations
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error handled by useErrorHandler:', error, errorInfo);

    // Log to error tracking service
    if (window.__SENTRY__ && window.__SENTRY__.captureException) {
      window.__SENTRY__.captureException(error);
    }

    // You could also show a toast notification here
    // by integrating with your notification system
  };
}

// Extend Window interface for Sentry
declare global {
  interface Window {
    __SENTRY__?: {
      captureException: (error: Error, context?: any) => void;
    };
  }
}

export default ErrorBoundary;
