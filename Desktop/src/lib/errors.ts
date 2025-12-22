// Error handling utilities for TraceForge Desktop
// Provides centralized error management, logging, and user feedback

import { log } from './logger';

// Error categories for better organization
export enum ErrorCategory {
  DATABASE = 'DATABASE',
  ENGINE = 'ENGINE',
  WEBSOCKET = 'WEBSOCKET',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  SYSTEM = 'SYSTEM',
  USER = 'USER',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Base error class
export class TraceForgeError extends Error {
  constructor(
    public category: ErrorCategory,
    public severity: ErrorSeverity,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TraceForgeError';
  }

  toJSON() {
    return {
      name: this.name,
      category: this.category,
      severity: this.severity,
      message: this.message,
      code: this.code,
      details: this.details,
      stack: this.stack,
    };
  }
}

// Specific error types
export class DatabaseError extends TraceForgeError {
  constructor(message: string, code?: string, details?: any) {
    super(ErrorCategory.DATABASE, ErrorSeverity.HIGH, message, code, details);
    this.name = 'DatabaseError';
  }
}

export class EngineError extends TraceForgeError {
  constructor(message: string, code?: string, details?: any) {
    super(ErrorCategory.ENGINE, ErrorSeverity.HIGH, message, code, details);
    this.name = 'EngineError';
  }
}

export class WebSocketError extends TraceForgeError {
  constructor(message: string, code?: string, details?: any) {
    super(ErrorCategory.WEBSOCKET, ErrorSeverity.MEDIUM, message, code, details);
    this.name = 'WebSocketError';
  }
}

export class NetworkError extends TraceForgeError {
  constructor(message: string, code?: string, details?: any) {
    super(ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, message, code, details);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends TraceForgeError {
  constructor(message: string, code?: string, details?: any) {
    super(ErrorCategory.VALIDATION, ErrorSeverity.LOW, message, code, details);
    this.name = 'ValidationError';
  }
}

export class SystemError extends TraceForgeError {
  constructor(message: string, code?: string, details?: any) {
    super(ErrorCategory.SYSTEM, ErrorSeverity.CRITICAL, message, code, details);
    this.name = 'SystemError';
  }
}

export class UserError extends TraceForgeError {
  constructor(message: string, code?: string, details?: any) {
    super(ErrorCategory.USER, ErrorSeverity.LOW, message, code, details);
    this.name = 'UserError';
  }
}

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Array<(error: TraceForgeError) => void> = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Register error listener
  onError(listener: (error: TraceForgeError) => void): void {
    this.errorListeners.push(listener);
  }

  // Remove error listener
  offError(listener: (error: TraceForgeError) => void): void {
    this.errorListeners = this.errorListeners.filter(l => l !== listener);
  }

  // Handle and log error
  handle(error: Error | TraceForgeError, context?: string): TraceForgeError {
    // Convert Error to TraceForgeError if needed
    const tfError = error instanceof TraceForgeError
      ? error
      : new SystemError(
          error.message,
          'UNKNOWN_ERROR',
          { originalError: error, context }
        );

    // Add context if provided
    if (context && !tfError.details) {
      tfError.details = { context };
    } else if (context && tfError.details) {
      tfError.details.context = context;
    }

    // Log the error
    log.error('Error occurred', {
      error: tfError.toJSON(),
      context,
    });

    // Notify listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(tfError);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });

    // Handle critical errors
    if (tfError.severity === ErrorSeverity.CRITICAL) {
      this.handleCriticalError(tfError);
    }

    return tfError;
  }

  // Handle critical errors
  private handleCriticalError(error: TraceForgeError): void {
    log.error('Critical error detected', { error: error.toJSON() });

    // In a real app, this might trigger a crash report
    // or show a critical error dialog
    console.error('CRITICAL ERROR:', error);

    // Could send to crash reporting service (Sentry, etc.)
    // sendCrashReport(error);
  }

  // Create error from unknown type
  fromUnknown(error: unknown, context?: string): TraceForgeError {
    if (error instanceof TraceForgeError) {
      return this.handle(error, context);
    }

    if (error instanceof Error) {
      return this.handle(
        new SystemError(error.message, 'SYSTEM_ERROR', { originalError: error }),
        context
      );
    }

    return this.handle(
      new SystemError('Unknown error occurred', 'UNKNOWN_ERROR', { error }),
      context
    );
  }

  // Validation helper
  validate(condition: any, message: string, code?: string): void {
    if (!condition) {
      throw new ValidationError(message, code);
    }
  }

  // Assert helper
  assert(condition: any, error: TraceForgeError): void {
    if (!condition) {
      throw error;
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Convenience function to handle async errors
export async function handleAsync<T>(
  promise: Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    throw errorHandler.fromUnknown(error, context);
  }
}

// Convenience function to wrap functions with error handling
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => R,
  context?: string
): (...args: T) => R {
  return (...args: T) => {
    try {
      return fn(...args);
    } catch (error) {
      throw errorHandler.fromUnknown(error, context);
    }
  };
}

// Async wrapper
export function withAsyncErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
): (...args: T) => Promise<R> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw errorHandler.fromUnknown(error, context);
    }
  };
}

// User-friendly error messages
export function getUserFriendlyMessage(error: TraceForgeError): string {
  switch (error.category) {
    case ErrorCategory.DATABASE:
      if (error.code === 'SQLITE_CONSTRAINT') {
        return 'Data validation failed. Please check your input.';
      }
      return 'Database operation failed. Please try again.';

    case ErrorCategory.ENGINE:
      return 'Test execution engine error. Please restart the application.';

    case ErrorCategory.WEBSOCKET:
      if (error.code === 'CONNECTION_REFUSED') {
        return 'Cannot connect to test engine. Please check if it is running.';
      }
      return 'Communication error with test engine.';

    case ErrorCategory.NETWORK:
      return 'Network error. Please check your connection.';

    case ErrorCategory.VALIDATION:
      return error.message;

    case ErrorCategory.SYSTEM:
      return 'System error occurred. Please restart the application.';

    case ErrorCategory.USER:
      return error.message;

    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

// Check if error is recoverable
export function isRecoverableError(error: TraceForgeError): boolean {
  return [
    ErrorSeverity.LOW,
    ErrorSeverity.MEDIUM,
  ].includes(error.severity);
}

// Get recommended action for error
export function getRecommendedAction(error: TraceForgeError): string | null {
  switch (error.category) {
    case ErrorCategory.DATABASE:
      return 'Check database connection and try again.';

    case ErrorCategory.ENGINE:
      return 'Restart the test engine and try again.';

    case ErrorCategory.WEBSOCKET:
      return 'Check engine status and connection settings.';

    case ErrorCategory.NETWORK:
      return 'Check network connection and try again.';

    case ErrorCategory.VALIDATION:
      return 'Please correct the input and try again.';

    case ErrorCategory.SYSTEM:
      return 'Restart the application to resolve this issue.';

    default:
      return null;
  }
}
