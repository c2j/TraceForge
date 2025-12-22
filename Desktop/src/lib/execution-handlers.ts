// WebSocket message handlers for script execution
// Handles execute_script, execution_started, execution_completed, etc.

import { WSMessage, MessageTypes } from './ws-client';
import { log } from './logger';
import { errorHandler } from './errors';

export interface ExecuteScriptData {
  script_id: string;
  script_name: string;
  project_id: string;
  kernel_id?: string;
  parameters?: Record<string, any>;
  options?: {
    headless?: boolean;
    timeout?: number;
    retry_count?: number;
  };
}

export interface ExecutionStartedData {
  execution_id: string;
  script_id: string;
  start_time: string;
  kernel_id: string;
  trace_id: string;
}

export interface ExecutionProgressData {
  execution_id: string;
  step_id: string;
  step_number: number;
  step_name: string;
  status: 'running' | 'passed' | 'failed' | 'skipped';
  timestamp: string;
  duration_ms?: number;
  screenshot_url?: string;
}

export interface ExecutionCompletedData {
  execution_id: string;
  script_id: string;
  end_time: string;
  duration_ms: number;
  status: 'passed' | 'failed' | 'skipped';
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
  skipped_steps: number;
  results?: Array<{
    step_id: string;
    status: string;
    duration_ms: number;
    screenshot_url?: string;
  }>;
}

export interface ExecutionFailedData {
  execution_id: string;
  script_id: string;
  end_time: string;
  error_message: string;
  error_code?: string;
  failed_step_id?: string;
  trace_id?: string;
}

export interface ExecutionEventHandlers {
  onExecutionStarted?: (data: ExecutionStartedData) => void;
  onExecutionProgress?: (data: ExecutionProgressData) => void;
  onExecutionCompleted?: (data: ExecutionCompletedData) => void;
  onExecutionFailed?: (data: ExecutionFailedData) => void;
}

class ExecutionEventHandler {
  private handlers: ExecutionEventHandlers;

  constructor(handlers: ExecutionEventHandlers) {
    this.handlers = handlers;
  }

  /**
   * Register all execution event handlers with a WebSocket client
   */
  register(client: any): void {
    // Handle execution started
    client.on(MessageTypes.EXECUTION_STARTED, (message: WSMessage) => {
      try {
        log.info('Execution started', { trace_id: message.trace_id, message });
        const data = message as WSMessage & { data: ExecutionStartedData };
        this.handlers.onExecutionStarted?.(data.data);
      } catch (error) {
        errorHandler.fromUnknown(error, 'Failed to handle execution_started event');
      }
    });

    // Handle execution progress
    client.on(MessageTypes.EXECUTION_PROGRESS, (message: WSMessage) => {
      try {
        log.debug('Execution progress', { trace_id: message.trace_id, message });
        const data = message as WSMessage & { data: ExecutionProgressData };
        this.handlers.onExecutionProgress?.(data.data);
      } catch (error) {
        errorHandler.fromUnknown(error, 'Failed to handle execution_progress event');
      }
    });

    // Handle execution completed
    client.on(MessageTypes.EXECUTION_COMPLETED, (message: WSMessage) => {
      try {
        log.info('Execution completed', { trace_id: message.trace_id, message });
        const data = message as WSMessage & { data: ExecutionCompletedData };
        this.handlers.onExecutionCompleted?.(data.data);
      } catch (error) {
        errorHandler.fromUnknown(error, 'Failed to handle execution_completed event');
      }
    });

    // Handle execution failed
    client.on(MessageTypes.EXECUTION_FAILED, (message: WSMessage) => {
      try {
        log.error('Execution failed', { trace_id: message.trace_id, message });
        const data = message as WSMessage & { data: ExecutionFailedData };
        this.handlers.onExecutionFailed?.(data.data);
      } catch (error) {
        errorHandler.fromUnknown(error, 'Failed to handle execution_failed event');
      }
    });

    log.info('Execution event handlers registered');
  }

  /**
   * Unregister all execution event handlers
   */
  unregister(client: any): void {
    client.off(MessageTypes.EXECUTION_STARTED, this.handleExecutionStarted);
    client.off(MessageTypes.EXECUTION_PROGRESS, this.handleExecutionProgress);
    client.off(MessageTypes.EXECUTION_COMPLETED, this.handleExecutionCompleted);
    client.off(MessageTypes.EXECUTION_FAILED, this.handleExecutionFailed);
  }

  // Store bound handlers for unregistering
  private handleExecutionStarted = (message: WSMessage) => {
    try {
      log.info('Execution started', { trace_id: message.trace_id, message });
      const data = message as WSMessage & { data: ExecutionStartedData };
      this.handlers.onExecutionStarted?.(data.data);
    } catch (error) {
      errorHandler.fromUnknown(error, 'Failed to handle execution_started event');
    }
  };

  private handleExecutionProgress = (message: WSMessage) => {
    try {
      log.debug('Execution progress', { trace_id: message.trace_id, message });
      const data = message as WSMessage & { data: ExecutionProgressData };
      this.handlers.onExecutionProgress?.(data.data);
    } catch (error) {
      errorHandler.fromUnknown(error, 'Failed to handle execution_progress event');
    }
  };

  private handleExecutionCompleted = (message: WSMessage) => {
    try {
      log.info('Execution completed', { trace_id: message.trace_id, message });
      const data = message as WSMessage & { data: ExecutionCompletedData };
      this.handlers.onExecutionCompleted?.(data.data);
    } catch (error) {
      errorHandler.fromUnknown(error, 'Failed to handle execution_completed event');
    }
  };

  private handleExecutionFailed = (message: WSMessage) => {
    try {
      log.error('Execution failed', { trace_id: message.trace_id, message });
      const data = message as WSMessage & { data: ExecutionFailedData };
      this.handlers.onExecutionFailed?.(data.data);
    } catch (error) {
      errorHandler.fromUnknown(error, 'Failed to handle execution_failed event');
    }
  };
}

/**
 * Create an execution event handler with the given callbacks
 */
export function createExecutionEventHandler(handlers: ExecutionEventHandlers): ExecutionEventHandler {
  return new ExecutionEventHandler(handlers);
}

/**
 * Helper function to send execution commands to the engine
 */
export function sendExecutionCommand(client: any, command: string, data?: any): void {
  try {
    log.debug('Sending execution command', { command, data });
    client.send(command, data || {});
  } catch (error) {
    errorHandler.fromUnknown(error, 'Failed to send execution command');
  }
}

/**
 * Execute a script on the engine
 */
export function executeScript(
  client: any,
  scriptId: string,
  options?: {
    kernelId?: string;
    parameters?: Record<string, any>;
    headless?: boolean;
    timeout?: number;
    retry_count?: number;
  }
): void {
  const data: ExecuteScriptData = {
    script_id: scriptId,
    script_name: '', // Will be filled by the backend
    project_id: '', // Will be filled by the backend
    kernel_id: options?.kernelId,
    parameters: options?.parameters,
    options: {
      headless: options?.headless ?? true,
      timeout: options?.timeout ?? 30000,
      retry_count: options?.retry_count ?? 0,
    },
  };

  sendExecutionCommand(client, MessageTypes.EXECUTE_SCRIPT, data);
}

/**
 * Stop a running execution
 */
export function stopExecution(client: any, executionId: string): void {
  sendExecutionCommand(client, 'stop_execution', { execution_id: executionId });
}

/**
 * Pause a running execution
 */
export function pauseExecution(client: any, executionId: string): void {
  sendExecutionCommand(client, 'pause_execution', { execution_id: executionId });
}

/**
 * Resume a paused execution
 */
export function resumeExecution(client: any, executionId: string): void {
  sendExecutionCommand(client, 'resume_execution', { execution_id: executionId });
}
