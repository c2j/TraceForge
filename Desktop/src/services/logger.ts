// ============================================================================
// TraceForge Desktop - Logging Service
// Centralized logging with multiple transports
// ============================================================================

import { invoke, dialog, fs } from '../lib/tauri';

// ============================================================================
// Types
// ============================================================================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  context?: string;
  data?: unknown;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  source: string;
}

export type LogTransport = (entry: LogEntry) => void;

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  context?: string;
  maxBufferSize: number;
  flushInterval: number;
}

// ============================================================================
// Transport Implementations
// ============================================================================

class ConsoleTransport {
  private colors = {
    [LogLevel.DEBUG]: '\x1b[36m', // Cyan
    [LogLevel.INFO]: '\x1b[32m',  // Green
    [LogLevel.WARN]: '\x1b[33m',  // Yellow
    [LogLevel.ERROR]: '\x1b[31m', // Red
    [LogLevel.FATAL]: '\x1b[35m', // Magenta
  };
  private reset = '\x1b[0m';

  log(entry: LogEntry): void {
    const color = this.colors[entry.level];
    const prefix = `${color}[${entry.levelName}]${this.reset}`;
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const context = entry.context ? `[${entry.context}]` : '';

    const consoleMethod = this.getConsoleMethod(entry.level);

    consoleMethod(
      `${prefix} ${timestamp} ${context}`,
      entry.message,
      entry.data ?? '',
      entry.error ?? ''
    );
  }

  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return console.error;
      default:
        return console.log;
    }
  }
}

class MemoryTransport {
  private buffer: LogEntry[] = [];
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  log(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  getEntries(level?: LogLevel, since?: Date): LogEntry[] {
    let entries = [...this.buffer];

    if (level !== undefined) {
      entries = entries.filter(e => e.level >= level);
    }

    if (since) {
      entries = entries.filter(e => new Date(e.timestamp) >= since);
    }

    return entries;
  }

  getEntryCount(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = [];
  }
}

class FileTransport {
  private enabled: boolean;
  private logPath: string;

  constructor(enabled = true, logPath = 'logs/traceforge.log') {
    this.enabled = enabled;
    this.logPath = logPath;
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.enabled) return;

    // Note: File writing will be handled by Tauri backend
    // This is a placeholder for the frontend
    try {
      await invoke('write_log', {
        entry,
        path: this.logPath,
      });
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  setLogPath(path: string): void {
    this.logPath = path;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// ============================================================================
// Logger Class
// ============================================================================

class Logger {
  private config: LoggerConfig;
  private transports: LogTransport[] = [];
  private consoleTransport: ConsoleTransport;
  private memoryTransport: MemoryTransport;
  private fileTransport: FileTransport;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      enableRemote: false,
      maxBufferSize: 1000,
      flushInterval: 5000,
      ...config,
    };

    // Initialize transports
    this.consoleTransport = new ConsoleTransport();
    this.memoryTransport = new MemoryTransport(this.config.maxBufferSize);
    this.fileTransport = new FileTransport(this.config.enableFile);

    if (this.config.enableConsole) {
      this.transports.push(this.consoleTransport.log.bind(this.consoleTransport));
    }

    this.transports.push(this.memoryTransport.log.bind(this.memoryTransport));
    this.transports.push(this.fileTransport.log.bind(this.fileTransport));

    // Start auto-flush timer
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }
  }

  // ========================================================================
  // Logging Methods
  // ========================================================================

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error | unknown, data?: unknown): void {
    let errorInfo;
    if (error instanceof Error) {
      errorInfo = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.log(LogLevel.ERROR, message, data, errorInfo);
  }

  fatal(message: string, error?: Error | unknown, data?: unknown): void {
    let errorInfo;
    if (error instanceof Error) {
      errorInfo = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.log(LogLevel.FATAL, message, data, errorInfo);
  }

  private log(level: LogLevel, message: string, data?: unknown, error?: LogEntry['error']): void {
    if (level < this.config.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LogLevel[level],
      message,
      context: this.config.context,
      data,
      error,
      source: this.getSourceLocation(),
    };

    // Send to all transports
    this.transports.forEach(transport => {
      try {
        transport(entry);
      } catch (err) {
        console.error('Transport error:', err);
      }
    });
  }

  // ========================================================================
  // Configuration
  // ========================================================================

  setMinLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  setContext(context: string): void {
    this.config.context = context;
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  removeTransport(transport: LogTransport): void {
    this.transports = this.transports.filter(t => t !== transport);
  }

  // ========================================================================
  // Buffer Management
  // ========================================================================

  getEntries(level?: LogLevel, since?: Date): LogEntry[] {
    return this.memoryTransport.getEntries(level, since);
  }

  getEntryCount(): number {
    return this.memoryTransport.getEntryCount();
  }

  clearBuffer(): void {
    this.memoryTransport.clear();
  }

  // ========================================================================
  // Flush & Cleanup
  // ========================================================================

  async flush(): Promise<void> {
    // In a real implementation, this would flush any pending writes
    // For now, it's a no-op as transports write immediately
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.transports = [];
    this.memoryTransport.clear();
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private getSourceLocation(): string {
    // In a browser environment, we can't easily get source location
    // This is a simplified version
    return 'frontend';
  }

  // ========================================================================
  // Child Logger
  // ========================================================================

  child(context: string): Logger {
    const childLogger = new Logger({
      ...this.config,
      context: this.config.context ? `${this.config.context}:${context}` : context,
    });

    // Copy transports from parent
    childLogger.transports = [...this.transports];

    return childLogger;
  }
}

// ============================================================================
// Default Logger Instance
// ============================================================================

export const logger = new Logger({
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableFile: false,
  enableRemote: false,
});

// ============================================================================
// Convenience Exports
// ============================================================================

export const createLogger = (context: string): Logger => {
  return logger.child(context);
};

export const getLogs = (level?: LogLevel, since?: Date): LogEntry[] => {
  return logger.getEntries(level, since);
};

export const clearLogs = (): void => {
  logger.clearBuffer();
};

export const downloadLogs = async (): Promise<void> => {
  const logs = logger.getEntries();

  // Convert to text format
  const logText = logs.map(entry => {
    const timestamp = new Date(entry.timestamp).toISOString();
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    const errorStr = entry.error ? `\n  Error: ${entry.error.message}` : '';
    return `[${timestamp}] [${entry.levelName}]${entry.context ? ` [${entry.context}]` : ''} ${entry.message}${dataStr}${errorStr}`;
  }).join('\n');

  // Create download
  try {
    const filePath = await dialog.save({
      defaultPath: `traceforge-logs-${Date.now()}.log`,
      filters: [{
        name: 'Log Files',
        extensions: ['log'],
      }],
    });

    if (filePath) {
      await fs.writeFile(filePath, logText);
    }
  } catch {
    // Fallback for browser
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traceforge-logs-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

export { Logger };
