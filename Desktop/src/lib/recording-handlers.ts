// WebSocket message handlers for recording events
// Handles step_captured, screenshot, and other recording-related messages

import { WSMessage, MessageTypes } from './ws-client';
import { log } from './logger';
import { errorHandler } from './errors';

export interface StepCapturedData {
  step_id: string;
  action: string;
  locator?: string;
  value?: string;
  timestamp: string;
  url?: string;
  page_title?: string;
  screenshot_url?: string;
}

export interface ScreenshotCapturedData {
  screenshot_id: string;
  timestamp: string;
  url: string;
  viewport: {
    width: number;
    height: number;
  };
  highlights?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
  }>;
}

export interface RecordingEventHandlers {
  onStepCaptured?: (data: StepCapturedData) => void;
  onScreenshotCaptured?: (data: ScreenshotCapturedData) => void;
  onRecordingStarted?: () => void;
  onRecordingStopped?: () => void;
}

class RecordingEventHandler {
  private handlers: RecordingEventHandlers;

  constructor(handlers: RecordingEventHandlers) {
    this.handlers = handlers;
  }

  /**
   * Register all recording event handlers with a WebSocket client
   */
  register(client: any): void {
    // Handle step captured events
    client.on(MessageTypes.STEP_CAPTURED, (message: WSMessage) => {
      try {
        log.debug('Step captured event received', { message });
        const data = message as WSMessage & { data: StepCapturedData };
        this.handlers.onStepCaptured?.(data.data);
      } catch (error) {
        errorHandler.fromUnknown(error, 'Failed to handle step_captured event');
      }
    });

    // Handle screenshot captured events
    client.on(MessageTypes.SCREENSHOT_CAPTURED, (message: WSMessage) => {
      try {
        log.debug('Screenshot captured event received', { message });
        const data = message as WSMessage & { data: ScreenshotCapturedData };
        this.handlers.onScreenshotCaptured?.(data.data);
      } catch (error) {
        errorHandler.fromUnknown(error, 'Failed to handle screenshot_captured event');
      }
    });

    // Handle recording started
    client.on(MessageTypes.START_RECORDING, (message: WSMessage) => {
      try {
        log.info('Recording started', { trace_id: message.trace_id });
        this.handlers.onRecordingStarted?.();
      } catch (error) {
        errorHandler.fromUnknown(error, 'Failed to handle recording_started event');
      }
    });

    // Handle recording stopped
    client.on(MessageTypes.STOP_RECORDING, (message: WSMessage) => {
      try {
        log.info('Recording stopped', { trace_id: message.trace_id });
        this.handlers.onRecordingStopped?.();
      } catch (error) {
        errorHandler.fromUnknown(error, 'Failed to handle recording_stopped event');
      }
    });

    log.info('Recording event handlers registered');
  }

  /**
   * Unregister all recording event handlers
   */
  unregister(client: any): void {
    client.off(MessageTypes.STEP_CAPTURED, this.handleStepCaptured);
    client.off(MessageTypes.SCREENSHOT_CAPTURED, this.handleScreenshotCaptured);
    client.off(MessageTypes.START_RECORDING, this.handleRecordingStarted);
    client.off(MessageTypes.STOP_RECORDING, this.handleRecordingStopped);
  }

  // Store bound handlers for unregistering
  private handleStepCaptured = (message: WSMessage) => {
    try {
      log.debug('Step captured event received', { message });
      const data = message as WSMessage & { data: StepCapturedData };
      this.handlers.onStepCaptured?.(data.data);
    } catch (error) {
      errorHandler.fromUnknown(error, 'Failed to handle step_captured event');
    }
  };

  private handleScreenshotCaptured = (message: WSMessage) => {
    try {
      log.debug('Screenshot captured event received', { message });
      const data = message as WSMessage & { data: ScreenshotCapturedData };
      this.handlers.onScreenshotCaptured?.(data.data);
    } catch (error) {
      errorHandler.fromUnknown(error, 'Failed to handle screenshot_captured event');
    }
  };

  private handleRecordingStarted = (message: WSMessage) => {
    try {
      log.info('Recording started', { trace_id: message.trace_id });
      this.handlers.onRecordingStarted?.();
    } catch (error) {
      errorHandler.fromUnknown(error, 'Failed to handle recording_started event');
    }
  };

  private handleRecordingStopped = (message: WSMessage) => {
    try {
      log.info('Recording stopped', { trace_id: message.trace_id });
      this.handlers.onRecordingStopped?.();
    } catch (error) {
      errorHandler.fromUnknown(error, 'Failed to handle recording_stopped event');
    }
  };
}

/**
 * Create a recording event handler with the given callbacks
 */
export function createRecordingEventHandler(handlers: RecordingEventHandlers): RecordingEventHandler {
  return new RecordingEventHandler(handlers);
}

/**
 * Helper function to send recording commands to the engine
 */
export function sendRecordingCommand(client: any, command: string, data?: any): void {
  try {
    log.debug('Sending recording command', { command, data });
    client.send(command, data || {});
  } catch (error) {
    errorHandler.fromUnknown(error, 'Failed to send recording command');
  }
}

/**
 * Start recording on the engine
 */
export function startRecording(client: any, options?: {
  url?: string;
  kernel?: string;
}): void {
  sendRecordingCommand(client, MessageTypes.START_RECORDING, options);
}

/**
 * Stop recording on the engine
 */
export function stopRecording(client: any): void {
  sendRecordingCommand(client, MessageTypes.STOP_RECORDING, {});
}

/**
 * Capture a screenshot on demand
 */
export function captureScreenshot(client: any, options?: {
  highlights?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
  }>;
}): void {
  sendRecordingCommand(client, MessageTypes.SCREENSHOT_CAPTURED, options);
}
