// ============================================================================
// TraceForge Desktop - WebSocket Engine Client
// Handles communication with ForgeEngine instances
// ============================================================================

import { EngineStatus, EngineLogEntry, WebSocketMessage } from '../types';

// ============================================================================
// Configuration
// ============================================================================

const RECONNECT_INTERVAL = 3000; // ms
const MAX_RECONNECT_ATTEMPTS = 5;
const MESSAGE_TIMEOUT = 30000; // ms

// ============================================================================
// Types
// ============================================================================

export interface EngineClientConfig {
  engineId: string;
  host: string;
  port: number;
  autoReconnect?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onStatusChange?: (status: EngineStatus) => void;
  onError?: (error: Error) => void;
}

export type ConnectionState = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface ConnectionInfo {
  engineId: string;
  url: string;
  state: ConnectionState;
  connectedAt: Date | null;
  lastMessageAt: Date | null;
  reconnectAttempts: number;
}

// ============================================================================
// Engine Client Class
// ============================================================================

class EngineClient {
  private config: EngineClientConfig;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private pendingRequests: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = new Map();

  private connectionInfo: ConnectionInfo;

  constructor(config: EngineClientConfig) {
    this.config = {
      ...config,
      autoReconnect: config.autoReconnect ?? true,
    };
    this.connectionInfo = {
      engineId: config.engineId,
      url: this.buildUrl(config.host, config.port),
      state: 'DISCONNECTED',
      connectedAt: null,
      lastMessageAt: null,
      reconnectAttempts: 0,
    };
  }

  private buildUrl(host: string, port: number): string {
    return `ws://${host}:${port}/ws`;
  }

  // ========================================================================
  // Connection Management
  // ========================================================================

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.updateConnectionInfo('CONNECTING');

        this.ws = new WebSocket(this.connectionInfo.url);

        this.ws.onopen = () => {
          this.updateConnectionInfo('CONNECTED');
          this.connectionInfo.connectedAt = new Date();
          this.connectionInfo.reconnectAttempts = 0;

          // Send initial handshake
          this.sendHandshake();

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.connectionInfo.lastMessageAt = new Date();
          this.handleMessage(event.data);
        };

        this.ws.onclose = (_event) => {
          const wasConnected = this.connectionInfo.state === 'CONNECTED';
          this.updateConnectionInfo('DISCONNECTED');
          this.cleanup();

          if (wasConnected && this.config.autoReconnect) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.updateConnectionInfo('ERROR');
          const err = new Error(`WebSocket error: ${error}`);
          this.config.onError?.(err);
          reject(err);
        };
      } catch (error) {
        this.updateConnectionInfo('ERROR');
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.cleanup();
    this.updateConnectionInfo('DISCONNECTED');
  }

  private cleanup(): void {
    // Clear all pending timeouts
    this.messageTimeouts.forEach(timer => clearTimeout(timer));
    this.messageTimeouts.clear();

    // Reject all pending requests
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();
  }

  private scheduleReconnect(): void {
    if (this.connectionInfo.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.config.onError?.(new Error('Max reconnection attempts reached'));
      return;
    }

    this.connectionInfo.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        this.config.onError?.(error as Error);
      });
    }, RECONNECT_INTERVAL);
  }

  private updateConnectionInfo(state: ConnectionState): void {
    this.connectionInfo.state = state;

    // Notify status change
    const status: EngineStatus = {
      engine_id: this.config.engineId,
      kernel_id: '',
      status: state === 'CONNECTED' ? 'IDLE' : 'STOPPED',
      connected: state === 'CONNECTED',
      uptime_ms: this.connectionInfo.connectedAt
        ? Date.now() - this.connectionInfo.connectedAt.getTime()
        : 0,
    };

    this.config.onStatusChange?.(status);
  }

  // ========================================================================
  // Message Handling
  // ========================================================================

  private sendHandshake(): void {
    this.sendMessage({
      type: 'HANDSHAKE',
      payload: {
        client_id: this.config.engineId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      // Handle response to a pending request
      if (message.type === 'RESPONSE' && message.payload) {
        const payload = message.payload as { request_id?: string };
        if (payload.request_id && this.pendingRequests.has(payload.request_id)) {
          const timeoutId = this.messageTimeouts.get(payload.request_id);
          if (timeoutId) clearTimeout(timeoutId);

          const { resolve } = this.pendingRequests.get(payload.request_id)!;
          this.pendingRequests.delete(payload.request_id);
          this.messageTimeouts.delete(payload.request_id);
          resolve(message.payload);
          return;
        }
      }

      // Handle engine status updates
      if (message.type === 'ENGINE_STATUS') {
        this.config.onStatusChange?.(message.payload as EngineStatus);
      }

      // Forward to application handler
      this.config.onMessage?.(message);
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  }

  private sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  // ========================================================================
  // Request/Response API
  // ========================================================================

  private async sendRequest(type: string, payload: unknown): Promise<unknown> {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        this.messageTimeouts.delete(requestId);
        reject(new Error('Request timeout'));
      }, MESSAGE_TIMEOUT);

      this.messageTimeouts.set(requestId, timeoutId);
      this.pendingRequests.set(requestId, { resolve, reject });

      const payloadObj = typeof payload === 'object' && payload !== null ? payload : {};
      this.sendMessage({
        type: type as any, // Allow custom command types
        payload: { ...payloadObj, request_id: requestId },
      });
    });
  }

  // ========================================================================
  // Engine Commands
  // ========================================================================

  async startScript(scriptId: string, kernelId: string, options?: {
    dataRowIndex?: number;
    headless?: boolean;
  }): Promise<string> {
    const response = await this.sendRequest('START_SCRIPT', {
      script_id: scriptId,
      kernel_id: kernelId,
      options,
    }) as { execution_id: string };
    return response.execution_id;
  }

  async stopScript(executionId: string): Promise<void> {
    await this.sendRequest('STOP_SCRIPT', { execution_id: executionId });
  }

  async pauseScript(executionId: string): Promise<void> {
    await this.sendRequest('PAUSE_SCRIPT', { execution_id: executionId });
  }

  async resumeScript(executionId: string): Promise<void> {
    await this.sendRequest('RESUME_SCRIPT', { execution_id: executionId });
  }

  async stepOver(executionId: string): Promise<void> {
    await this.sendRequest('STEP_OVER', { execution_id: executionId });
  }

  async getExecutionState(executionId: string): Promise<unknown> {
    return this.sendRequest('GET_STATE', { execution_id: executionId });
  }

  async sendCommand(command: string, args?: Record<string, unknown>): Promise<unknown> {
    return this.sendRequest('CUSTOM_COMMAND', { command, args });
  }

  async getLogs(level?: string, limit?: number): Promise<EngineLogEntry[]> {
    const response = await this.sendRequest('GET_LOGS', { level, limit });
    return response as EngineLogEntry[];
  }

  // ========================================================================
  // Getters
  // ========================================================================

  getConnectionInfo(): ConnectionInfo {
    return { ...this.connectionInfo };
  }

  isConnected(): boolean {
    return this.connectionInfo.state === 'CONNECTED' &&
           this.ws?.readyState === WebSocket.OPEN;
  }

  getState(): ConnectionState {
    return this.connectionInfo.state;
  }
}

// ============================================================================
// Engine Client Manager
// ============================================================================

class EngineClientManager {
  private clients: Map<string, EngineClient> = new Map();

  connect(config: EngineClientConfig): EngineClient {
    const client = new EngineClient(config);
    this.clients.set(config.engineId, client);
    client.connect().catch(error => {
      console.error(`Failed to connect to engine ${config.engineId}:`, error);
    });
    return client;
  }

  disconnect(engineId: string): void {
    const client = this.clients.get(engineId);
    if (client) {
      client.disconnect();
      this.clients.delete(engineId);
    }
  }

  disconnectAll(): void {
    this.clients.forEach(client => client.disconnect());
    this.clients.clear();
  }

  getClient(engineId: string): EngineClient | undefined {
    return this.clients.get(engineId);
  }

  getAllClients(): EngineClient[] {
    return Array.from(this.clients.values());
  }

  getConnectedClients(): EngineClient[] {
    return Array.from(this.clients.values()).filter(c => c.isConnected());
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const engineClientManager = new EngineClientManager();
export { EngineClient };
