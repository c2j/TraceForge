// Logging utility for TraceForge Desktop
// Integrates with tauri-plugin-log for structured logging

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  trace_id?: string;
}

// Get current trace ID from WebSocket client
function getCurrentTraceId(): string | undefined {
  try {
    const wsClient = require('./ws-client').getForgeWSClient();
    return wsClient?.lastTraceId;
  } catch {
    return undefined;
  }
}

// Format log entry
function formatLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    trace_id: getCurrentTraceId(),
  };
}

// Console logging for development
function consoleLog(level: LogLevel, message: string, data?: any) {
  const entry = formatLogEntry(level, message, data);
  const output = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;

  switch (level) {
    case 'trace':
      console.trace(output, data);
      break;
    case 'debug':
      console.debug(output, data);
      break;
    case 'info':
      console.info(output, data);
      break;
    case 'warn':
      console.warn(output, data);
      break;
    case 'error':
      console.error(output, data);
      break;
  }
}

// Export logging functions
export const log = {
  trace: (message: string, data?: any) => {
    consoleLog('trace', message, data);
    // In production, would send to tauri-plugin-log
    // window.__TAURI__.log.trace(message, data);
  },

  debug: (message: string, data?: any) => {
    consoleLog('debug', message, data);
    // window.__TAURI__.log.debug(message, data);
  },

  info: (message: string, data?: any) => {
    consoleLog('info', message, data);
    // window.__TAURI__.log.info(message, data);
  },

  warn: (message: string, data?: any) => {
    consoleLog('warn', message, data);
    // window.__TAURI__.log.warn(message, data);
  },

  error: (message: string, data?: any) => {
    consoleLog('error', message, data);
    // window.__TAURI__.log.error(message, data);
  },

  // Structured logging with context
  withContext: (context: string) => {
    return {
      trace: (message: string, data?: any) => log.trace(`[${context}] ${message}`, data),
      debug: (message: string, data?: any) => log.debug(`[${context}] ${message}`, data),
      info: (message: string, data?: any) => log.info(`[${context}] ${message}`, data),
      warn: (message: string, data?: any) => log.warn(`[${context}] ${message}`, data),
      error: (message: string, data?: any) => log.error(`[${context}] ${message}`, data),
    };
  },
};

// Performance logging
export const performanceLog = {
  start: (label: string) => {
    console.time(label);
  },

  end: (label: string) => {
    console.timeEnd(label);
  },

  measure: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    performanceLog.start(label);
    try {
      const result = await fn();
      performanceLog.end(label);
      return result;
    } catch (error) {
      performanceLog.end(label);
      throw error;
    }
  },
};

// WebSocket event logging
export const wsLog = log.withContext('WebSocket');

// Database operation logging
export const dbLog = log.withContext('Database');

// Engine operation logging
export const engineLog = log.withContext('Engine');

// UI event logging
export const uiLog = log.withContext('UI');

// User action logging
export const userLog = log.withContext('UserAction');

// Error logging helper
export const errorLog = {
  log: (error: Error | any, context?: string) => {
    log.error('Error occurred', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context,
    });
  },

  withContext: (context: string) => {
    return {
      log: (error: Error | any) => errorLog.log(error, context),
    };
  },
};
