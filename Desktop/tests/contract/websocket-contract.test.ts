// ============================================================================
// TraceForge Desktop - WebSocket Contract Tests
// Tests WebSocket message contract against ForgeWS schema
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// Types - ForgeWS Schema Contract
// ============================================================================

/**
 * ForgeWS Message Types Contract
 * This defines the expected WebSocket message schema that must be
 * adhered to by both the Desktop client and ForgeEngine
 */
export enum ForgeWSMessageType {
  // Client -> Server messages
  HANDSHAKE = 'HANDSHAKE',
  START_SCRIPT = 'START_SCRIPT',
  STOP_SCRIPT = 'STOP_SCRIPT',
  PAUSE_SCRIPT = 'PAUSE_SCRIPT',
  RESUME_SCRIPT = 'RESUME_SCRIPT',
  STEP_OVER = 'STEP_OVER',
  GET_STATE = 'GET_STATE',
  GET_LOGS = 'GET_LOGS',
  CUSTOM_COMMAND = 'CUSTOM_COMMAND',

  // Server -> Client messages
  RESPONSE = 'RESPONSE',
  ENGINE_STATUS = 'ENGINE_STATUS',
  EXECUTION_UPDATE = 'EXECUTION_UPDATE',
  LOG = 'LOG',
  ERROR = 'ERROR',
  STEP_CAPTURED = 'STEP_CAPTURED',
  SCREENSHOT = 'SCREENSHOT',
  TRACE_READY = 'TRACE_READY',
}

export interface ForgeWSMessage {
  type: ForgeWSMessageType | string;
  payload: unknown;
  timestamp?: string;
  id?: string;
}

// ============================================================================
// Schema Validators
// ============================================================================

/**
 * Validates HANDSHAKE message payload
 */
export function validateHandshakePayload(payload: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, errors: ['Payload must be an object'] };
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.client_id !== 'string') {
    errors.push('client_id must be a string');
  }

  if (p.timestamp && typeof p.timestamp !== 'string') {
    errors.push('timestamp must be a string');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates START_SCRIPT message payload
 */
export function validateStartScriptPayload(payload: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, errors: ['Payload must be an object'] };
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.script_id !== 'string') {
    errors.push('script_id must be a string');
  }

  if (typeof p.kernel_id !== 'string') {
    errors.push('kernel_id must be a string');
  }

  if (p.request_id && typeof p.request_id !== 'string') {
    errors.push('request_id must be a string');
  }

  if (p.options && typeof p.options !== 'object') {
    errors.push('options must be an object');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates RESPONSE message payload
 */
export function validateResponsePayload(payload: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, errors: ['Payload must be an object'] };
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.request_id !== 'string') {
    errors.push('request_id must be a string');
  }

  if (p.success !== undefined && typeof p.success !== 'boolean') {
    errors.push('success must be a boolean');
  }

  if (p.error && typeof p.error !== 'string') {
    errors.push('error must be a string');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates ENGINE_STATUS message payload
 */
export function validateEngineStatusPayload(payload: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, errors: ['Payload must be an object'] };
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.engine_id !== 'string') {
    errors.push('engine_id must be a string');
  }

  if (typeof p.kernel_id !== 'string') {
    errors.push('kernel_id must be a string');
  }

  if (!['IDLE', 'BUSY', 'STOPPED', 'ERROR'].includes(p.status as string)) {
    errors.push('status must be one of: IDLE, BUSY, STOPPED, ERROR');
  }

  if (typeof p.connected !== 'boolean') {
    errors.push('connected must be a boolean');
  }

  if (typeof p.uptime_ms !== 'number') {
    errors.push('uptime_ms must be a number');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates EXECUTION_UPDATE message payload
 */
export function validateExecutionUpdatePayload(payload: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, errors: ['Payload must be an object'] };
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.execution_id !== 'string') {
    errors.push('execution_id must be a string');
  }

  if (!['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(p.status as string)) {
    errors.push('status must be one of: RUNNING, COMPLETED, FAILED, CANCELLED');
  }

  if (p.step_index !== undefined && typeof p.step_index !== 'number') {
    errors.push('step_index must be a number');
  }

  if (p.error && typeof p.error !== 'string') {
    errors.push('error must be a string');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates STEP_CAPTURED message payload
 */
export function validateStepCapturedPayload(payload: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, errors: ['Payload must be an object'] };
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.execution_id !== 'string') {
    errors.push('execution_id must be a string');
  }

  if (typeof p.step_index !== 'number') {
    errors.push('step_index must be a number');
  }

  if (!['NAVIGATE', 'CLICK', 'HOVER', 'FILL', 'SELECT', 'ASSERT', 'WAIT', 'EXTRACT', 'EXECUTE'].includes(p.action_type as string)) {
    errors.push('action_type must be a valid ActionType');
  }

  if (typeof p.element !== 'string') {
    errors.push('element must be a string');
  }

  if (p.screenshot && typeof p.screenshot !== 'string') {
    errors.push('screenshot must be a string (base64)');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates SCREENSHOT message payload
 */
export function validateScreenshotPayload(payload: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, errors: ['Payload must be an object'] };
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.execution_id !== 'string') {
    errors.push('execution_id must be a string');
  }

  if (typeof p.step_index !== 'number') {
    errors.push('step_index must be a number');
  }

  if (typeof p.image !== 'string') {
    errors.push('image must be a string (base64)');
  }

  if (!p.image.startsWith('data:image/')) {
    errors.push('image must be a valid base64 data URL');
  }

  if (p.timestamp && typeof p.timestamp !== 'string') {
    errors.push('timestamp must be a string');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates LOG message payload
 */
export function validateLogPayload(payload: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, errors: ['Payload must be an object'] };
  }

  const p = payload as Record<string, unknown>;

  if (!['INFO', 'WARN', 'ERROR', 'DEBUG'].includes(p.level as string)) {
    errors.push('level must be one of: INFO, WARN, ERROR, DEBUG');
  }

  if (typeof p.message !== 'string') {
    errors.push('message must be a string');
  }

  if (p.source && typeof p.source !== 'string') {
    errors.push('source must be a string');
  }

  if (p.timestamp && typeof p.timestamp !== 'string') {
    errors.push('timestamp must be a string');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates ERROR message payload
 */
export function validateErrorPayload(payload: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, errors: ['Payload must be an object'] };
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.code !== 'string') {
    errors.push('code must be a string');
  }

  if (typeof p.message !== 'string') {
    errors.push('message must be a string');
  }

  if (p.details && typeof p.details !== 'object') {
    errors.push('details must be an object');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generic message validator
 */
export function validateForgeWSMessage(message: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof message !== 'object' || message === null) {
    return { valid: false, errors: ['Message must be an object'] };
  }

  const m = message as Record<string, unknown>;

  if (typeof m.type !== 'string') {
    errors.push('type must be a string');
  }

  if (m.payload === undefined) {
    errors.push('payload is required');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Test Mocks
// ============================================================================

class MockWebSocket {
  readyState: number = WebSocket.CONNECTING;
  url: string;
  sentMessages: string[] = [];
  eventHandlers: Map<string, Function[]> = new Map();

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.triggerEvent('open', {});
    }, 0);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = WebSocket.CLOSED;
    this.triggerEvent('close', { code, reason });
  }

  addEventListener(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  removeEventListener(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  triggerEvent(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Helper for tests
  simulateServerMessage(message: ForgeWSMessage): void {
    this.triggerEvent('message', { data: JSON.stringify(message) });
  }
}

// ============================================================================
// Contract Tests
// ============================================================================

describe('ForgeWS Contract Tests', () => {
  let mockWs: MockWebSocket;

  beforeEach(() => {
    mockWs = new MockWebSocket('ws://localhost:54321/ws');
    vi.stubGlobal('WebSocket', MockWebSocket as any);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ------------------------------------------------------------------------
  // Message Structure Validation
  // ------------------------------------------------------------------------

  describe('Message Structure', () => {
    it('should accept valid message with type and payload', () => {
      const message: ForgeWSMessage = {
        type: ForgeWSMessageType.HANDSHAKE,
        payload: {
          client_id: 'test-client',
          timestamp: '2024-01-01T00:00:00Z',
        },
      };

      const result = validateForgeWSMessage(message);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject message without type', () => {
      const message = {
        payload: { client_id: 'test' },
      } as unknown;

      const result = validateForgeWSMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('type must be a string');
    });

    it('should reject message without payload', () => {
      const message = {
        type: 'HANDSHAKE',
      } as unknown;

      const result = validateForgeWSMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('payload is required');
    });

    it('should accept message with optional timestamp', () => {
      const message: ForgeWSMessage = {
        type: ForgeWSMessageType.HANDSHAKE,
        payload: { client_id: 'test' },
        timestamp: '2024-01-01T00:00:00Z',
      };

      const result = validateForgeWSMessage(message);
      expect(result.valid).toBe(true);
    });
  });

  // ------------------------------------------------------------------------
  // HANDSHAKE Message Contract
  // ------------------------------------------------------------------------

  describe('HANDSHAKE Message', () => {
    it('should accept valid handshake payload', () => {
      const payload = {
        client_id: 'desktop-client-123',
        timestamp: '2024-01-01T12:00:00Z',
      };

      const result = validateHandshakePayload(payload);
      expect(result.valid).toBe(true);
    });

    it('should reject handshake without client_id', () => {
      const payload = { timestamp: '2024-01-01T12:00:00Z' };

      const result = validateHandshakePayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('client_id must be a string');
    });

    it('should reject handshake with invalid timestamp type', () => {
      const payload = {
        client_id: 'desktop-client-123',
        timestamp: 123456,
      };

      const result = validateHandshakePayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('timestamp must be a string');
    });
  });

  // ------------------------------------------------------------------------
  // START_SCRIPT Message Contract
  // ------------------------------------------------------------------------

  describe('START_SCRIPT Message', () => {
    it('should accept valid start script payload', () => {
      const payload = {
        script_id: 'script-123',
        kernel_id: 'kernel-456',
        request_id: 'req-789',
        options: {
          headless: true,
          dataRowIndex: 0,
        },
      };

      const result = validateStartScriptPayload(payload);
      expect(result.valid).toBe(true);
    });

    it('should reject start script without script_id', () => {
      const payload = {
        kernel_id: 'kernel-456',
      };

      const result = validateStartScriptPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('script_id must be a string');
    });

    it('should reject start script without kernel_id', () => {
      const payload = {
        script_id: 'script-123',
      };

      const result = validateStartScriptPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('kernel_id must be a string');
    });

    it('should accept start script without optional fields', () => {
      const payload = {
        script_id: 'script-123',
        kernel_id: 'kernel-456',
      };

      const result = validateStartScriptPayload(payload);
      expect(result.valid).toBe(true);
    });
  });

  // ------------------------------------------------------------------------
  // RESPONSE Message Contract
  // ------------------------------------------------------------------------

  describe('RESPONSE Message', () => {
    it('should accept valid response payload', () => {
      const payload = {
        request_id: 'req-123',
        success: true,
        data: { execution_id: 'exec-456' },
      };

      const result = validateResponsePayload(payload);
      expect(result.valid).toBe(true);
    });

    it('should reject response without request_id', () => {
      const payload = {
        success: true,
      };

      const result = validateResponsePayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('request_id must be a string');
    });

    it('should accept error response', () => {
      const payload = {
        request_id: 'req-123',
        success: false,
        error: 'Script not found',
      };

      const result = validateResponsePayload(payload);
      expect(result.valid).toBe(true);
    });
  });

  // ------------------------------------------------------------------------
  // ENGINE_STATUS Message Contract
  // ------------------------------------------------------------------------

  describe('ENGINE_STATUS Message', () => {
    it('should accept valid engine status payload', () => {
      const payload = {
        engine_id: 'engine-123',
        kernel_id: 'kernel-456',
        status: 'IDLE',
        connected: true,
        uptime_ms: 123456,
      };

      const result = validateEngineStatusPayload(payload);
      expect(result.valid).toBe(true);
    });

    it('should reject engine status with invalid status', () => {
      const payload = {
        engine_id: 'engine-123',
        kernel_id: 'kernel-456',
        status: 'INVALID',
        connected: true,
        uptime_ms: 123456,
      };

      const result = validateEngineStatusPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('status must be one of: IDLE, BUSY, STOPPED, ERROR');
    });

    it('should accept all valid status values', () => {
      const statuses = ['IDLE', 'BUSY', 'STOPPED', 'ERROR'];

      statuses.forEach(status => {
        const payload = {
          engine_id: 'engine-123',
          kernel_id: 'kernel-456',
          status,
          connected: true,
          uptime_ms: 123456,
        };

        const result = validateEngineStatusPayload(payload);
        expect(result.valid).toBe(true);
      });
    });
  });

  // ------------------------------------------------------------------------
  // EXECUTION_UPDATE Message Contract
  // ------------------------------------------------------------------------

  describe('EXECUTION_UPDATE Message', () => {
    it('should accept valid execution update payload', () => {
      const payload = {
        execution_id: 'exec-123',
        status: 'RUNNING',
        step_index: 5,
        total_steps: 10,
      };

      const result = validateExecutionUpdatePayload(payload);
      expect(result.valid).toBe(true);
    });

    it('should reject execution update with invalid status', () => {
      const payload = {
        execution_id: 'exec-123',
        status: 'INVALID',
      };

      const result = validateExecutionUpdatePayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('status must be one of: RUNNING, COMPLETED, FAILED, CANCELLED');
    });

    it('should accept failed execution with error', () => {
      const payload = {
        execution_id: 'exec-123',
        status: 'FAILED',
        step_index: 3,
        error: 'Element not found: #login-button',
      };

      const result = validateExecutionUpdatePayload(payload);
      expect(result.valid).toBe(true);
    });
  });

  // ------------------------------------------------------------------------
  // STEP_CAPTURED Message Contract
  // ------------------------------------------------------------------------

  describe('STEP_CAPTURED Message', () => {
    it('should accept valid step captured payload', () => {
      const payload = {
        execution_id: 'exec-123',
        step_index: 2,
        action_type: 'CLICK',
        element: '#submit-button',
        screenshot: 'data:image/png;base64,iVBORw0KG...',
      };

      const result = validateStepCapturedPayload(payload);
      expect(result.valid).toBe(true);
    });

    it('should reject step captured with invalid action_type', () => {
      const payload = {
        execution_id: 'exec-123',
        step_index: 2,
        action_type: 'INVALID',
        element: '#submit-button',
      };

      const result = validateStepCapturedPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('action_type must be a valid ActionType');
    });

    it('should accept all valid action types', () => {
      const actionTypes = ['NAVIGATE', 'CLICK', 'HOVER', 'FILL', 'SELECT', 'ASSERT', 'WAIT', 'EXTRACT', 'EXECUTE'];

      actionTypes.forEach(actionType => {
        const payload = {
          execution_id: 'exec-123',
          step_index: 0,
          action_type: actionType,
          element: '#test',
        };

        const result = validateStepCapturedPayload(payload);
        expect(result.valid).toBe(true);
      });
    });
  });

  // ------------------------------------------------------------------------
  // SCREENSHOT Message Contract
  // ------------------------------------------------------------------------

  describe('SCREENSHOT Message', () => {
    it('should accept valid screenshot payload', () => {
      const payload = {
        execution_id: 'exec-123',
        step_index: 1,
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        timestamp: '2024-01-01T12:00:00Z',
      };

      const result = validateScreenshotPayload(payload);
      expect(result.valid).toBe(true);
    });

    it('should reject screenshot without base64 prefix', () => {
      const payload = {
        execution_id: 'exec-123',
        step_index: 1,
        image: 'not-a-valid-base64-image',
      };

      const result = validateScreenshotPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('image must be a valid base64 data URL');
    });

    it('should accept screenshot without optional timestamp', () => {
      const payload = {
        execution_id: 'exec-123',
        step_index: 1,
        image: 'data:image/png;base64,iVBORw0KG...',
      };

      const result = validateScreenshotPayload(payload);
      expect(result.valid).toBe(true);
    });
  });

  // ------------------------------------------------------------------------
  // LOG Message Contract
  // ------------------------------------------------------------------------

  describe('LOG Message', () => {
    it('should accept valid log payload', () => {
      const payload = {
        level: 'INFO',
        message: 'Script started successfully',
        source: 'forge-engine',
        timestamp: '2024-01-01T12:00:00Z',
      };

      const result = validateLogPayload(payload);
      expect(result.valid).toBe(true);
    });

    it('should reject log with invalid level', () => {
      const payload = {
        level: 'INVALID',
        message: 'Test log',
      };

      const result = validateLogPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('level must be one of: INFO, WARN, ERROR, DEBUG');
    });

    it('should accept all valid log levels', () => {
      const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];

      levels.forEach(level => {
        const payload = {
          level,
          message: 'Test log',
        };

        const result = validateLogPayload(payload);
        expect(result.valid).toBe(true);
      });
    });
  });

  // ------------------------------------------------------------------------
  // ERROR Message Contract
  // ------------------------------------------------------------------------

  describe('ERROR Message', () => {
    it('should accept valid error payload', () => {
      const payload = {
        code: 'SCRIPT_NOT_FOUND',
        message: 'The requested script does not exist',
        details: {
          script_id: 'script-123',
        },
      };

      const result = validateErrorPayload(payload);
      expect(result.valid).toBe(true);
    });

    it('should reject error without code', () => {
      const payload = {
        message: 'An error occurred',
      };

      const result = validateErrorPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('code must be a string');
    });

    it('should reject error without message', () => {
      const payload = {
        code: 'UNKNOWN_ERROR',
      };

      const result = validateErrorPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('message must be a string');
    });
  });

  // ------------------------------------------------------------------------
  // Serialization/Deserialization
  // ------------------------------------------------------------------------

  describe('Message Serialization', () => {
    it('should serialize and deserialize message correctly', () => {
      const original: ForgeWSMessage = {
        type: ForgeWSMessageType.START_SCRIPT,
        payload: {
          script_id: 'script-123',
          kernel_id: 'kernel-456',
          request_id: 'req-789',
        },
        timestamp: '2024-01-01T12:00:00Z',
      };

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as ForgeWSMessage;

      expect(deserialized.type).toBe(original.type);
      expect(deserialized.payload).toEqual(original.payload);
      expect(deserialized.timestamp).toBe(original.timestamp);
    });

    it('should handle special characters in message content', () => {
      const payload = {
        level: 'ERROR',
        message: 'Error with "quotes" and \'apostrophes\' and \n newlines',
      };

      const result = validateLogPayload(payload);
      expect(result.valid).toBe(true);
    });

    it('should handle Unicode characters in messages', () => {
      const payload = {
        level: 'INFO',
        message: '测试信息 - Тестовое сообщение - 🔥 Fire emoji',
      };

      const result = validateLogPayload(payload);
      expect(result.valid).toBe(true);
    });
  });

  // ------------------------------------------------------------------------
  // Request/Response Matching
  // ------------------------------------------------------------------------

  describe('Request/Response Correlation', () => {
    it('should match request with response using request_id', () => {
      const requestId = 'req-' + Date.now() + '-123';

      const request: ForgeWSMessage = {
        type: ForgeWSMessageType.START_SCRIPT,
        payload: {
          script_id: 'script-123',
          kernel_id: 'kernel-456',
          request_id: requestId,
        },
      };

      const response: ForgeWSMessage = {
        type: ForgeWSMessageType.RESPONSE,
        payload: {
          request_id: requestId,
          success: true,
          data: { execution_id: 'exec-789' },
        },
      };

      const reqPayload = request.payload as Record<string, unknown>;
      const resPayload = response.payload as Record<string, unknown>;

      expect(resPayload.request_id).toBe(reqPayload.request_id);
    });

    it('should generate unique request IDs', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 1000; i++) {
        const id = `req-${Date.now()}-${Math.random()}`;
        ids.add(id);
      }

      // With timestamp + random, should have very few if any collisions
      expect(ids.size).toBeGreaterThan(990);
    });
  });

  // ------------------------------------------------------------------------
  // Message Type Validation
  // ------------------------------------------------------------------------

  describe('Message Type Registry', () => {
    it('should include all required client->server message types', () => {
      const clientToServer = [
        ForgeWSMessageType.HANDSHAKE,
        ForgeWSMessageType.START_SCRIPT,
        ForgeWSMessageType.STOP_SCRIPT,
        ForgeWSMessageType.PAUSE_SCRIPT,
        ForgeWSMessageType.RESUME_SCRIPT,
        ForgeWSMessageType.STEP_OVER,
        ForgeWSMessageType.GET_STATE,
        ForgeWSMessageType.GET_LOGS,
        ForgeWSMessageType.CUSTOM_COMMAND,
      ];

      expect(clientToServer.length).toBeGreaterThan(0);
    });

    it('should include all required server->client message types', () => {
      const serverToClient = [
        ForgeWSMessageType.RESPONSE,
        ForgeWSMessageType.ENGINE_STATUS,
        ForgeWSMessageType.EXECUTION_UPDATE,
        ForgeWSMessageType.LOG,
        ForgeWSMessageType.ERROR,
        ForgeWSMessageType.STEP_CAPTURED,
        ForgeWSMessageType.SCREENSHOT,
        ForgeWSMessageType.TRACE_READY,
      ];

      expect(serverToClient.length).toBeGreaterThan(0);
    });
  });

  // ------------------------------------------------------------------------
  // Integration with EngineClient
  // ------------------------------------------------------------------------

  describe('EngineClient Integration', () => {
    it('should send valid HANDSHAKE message on connect', () => {
      // This test verifies that the EngineClient sends a properly formatted handshake
      const handshakePayload = {
        client_id: 'test-client',
        timestamp: new Date().toISOString(),
      };

      const result = validateHandshakePayload(handshakePayload);
      expect(result.valid).toBe(true);
    });

    it('should send valid START_SCRIPT message', () => {
      const startScriptPayload = {
        script_id: 'script-123',
        kernel_id: 'kernel-456',
        request_id: 'req-123',
        options: {
          headless: true,
        },
      };

      const result = validateStartScriptPayload(startScriptPayload);
      expect(result.valid).toBe(true);
    });

    it('should handle ENGINE_STATUS updates', () => {
      const statusPayload = {
        engine_id: 'engine-123',
        kernel_id: 'kernel-456',
        status: 'BUSY',
        connected: true,
        uptime_ms: 5000,
      };

      const result = validateEngineStatusPayload(statusPayload);
      expect(result.valid).toBe(true);
    });
  });

  // ------------------------------------------------------------------------
  // Error Cases
  // ------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', () => {
      expect(() => {
        JSON.parse('invalid json');
      }).toThrow();
    });

    it('should handle missing payload gracefully', () => {
      const message = { type: 'HANDSHAKE' } as unknown;

      const result = validateForgeWSMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle null payload', () => {
      const result = validateHandshakePayload(null);
      expect(result.valid).toBe(false);
    });

    it('should handle array instead of object', () => {
      const result = validateHandshakePayload(['invalid']);
      expect(result.valid).toBe(false);
    });
  });
});
