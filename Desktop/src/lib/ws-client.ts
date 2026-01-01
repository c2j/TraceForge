// WebSocket client for ForgeEngine communication
// Implements ForgeWS protocol v1.0.0

import { invoke } from './tauri';

export type WSStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WSMessage {
  type: string;
  timestamp: string;
  trace_id?: string;
  [key: string]: any;
}

export interface ForgeWSConfig {
  host: string;
  port: number;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

export type MessageHandler = (message: WSMessage) => void;
export type StatusHandler = (status: WSStatus, error?: string) => void;

class ForgeWSClient {
  private ws: WebSocket | null = null;
  private config: ForgeWSConfig;
  private status: WSStatus = 'disconnected';
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private statusHandlers: Set<StatusHandler> = new Set();
  private reconnectAttempts = 0;
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private traceIdCounter = 0;

  constructor(config: ForgeWSConfig) {
    this.config = {
      maxReconnectAttempts: 5,
      reconnectInterval: 3000,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  /**
   * Connect to the ForgeEngine WebSocket server
   */
  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.setStatus('connecting');

    try {
      const port = await this.getAvailablePort();
      await this.spawnEngine(port);

      const wsUrl = `ws://${this.config.host}:${port}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[ForgeWS] Connected to engine at', wsUrl);
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[ForgeWS] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[ForgeWS] Connection error:', error);
        this.setStatus('error', 'WebSocket connection error');
      };

      this.ws.onclose = () => {
        console.log('[ForgeWS] Connection closed');
        this.setStatus('disconnected');
        this.stopHeartbeat();
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[ForgeWS] Failed to connect:', error);
      this.setStatus('error', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.stopReconnect();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Send a message to the server
   */
  send(type: string, data: any): void {
    if (this.status !== 'connected' || !this.ws) {
      throw new Error('WebSocket is not connected');
    }

    const message: WSMessage = {
      type,
      timestamp: new Date().toISOString(),
      trace_id: this.generateTraceId(),
      ...data,
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Register a handler for a specific message type
   */
  on(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
  }

  /**
   * Remove a message handler
   */
  off(type: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(type);
      }
    }
  }

  /**
   * Register a status change handler
   */
  onStatus(handler: StatusHandler): void {
    this.statusHandlers.add(handler);
  }

  /**
   * Remove a status change handler
   */
  offStatus(handler: StatusHandler): void {
    this.statusHandlers.delete(handler);
  }

  /**
   * Get current connection status
   */
  getStatus(): WSStatus {
    return this.status;
  }

  // Private methods

  private setStatus(status: WSStatus, error?: string): void {
    this.status = status;
    this.statusHandlers.forEach(handler => handler(status, error));
  }

  private handleMessage(message: WSMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }

    // Also handle by wildcard '*' handlers
    const wildcardHandlers = this.messageHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => handler(message));
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = window.setInterval(() => {
      if (this.status === 'connected' && this.ws) {
        this.send('ping', {});
      }
    }, this.config.heartbeatInterval!);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      console.error('[ForgeWS] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[ForgeWS] Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(error => {
        console.error('[ForgeWS] Reconnection failed:', error);
      });
    }, this.config.reconnectInterval);
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${++this.traceIdCounter}`;
  }

  private async getAvailablePort(): Promise<number> {
    try {
      return await invoke<number>('get_available_port');
    } catch (error) {
      // Fallback to random port in range 30000-50000
      return Math.floor(Math.random() * 20000) + 30000;
    }
  }

  private async spawnEngine(port: number): Promise<void> {
    try {
      await invoke('spawn_engine', { port });
    } catch (error) {
      console.error('[ForgeWS] Failed to spawn engine:', error);
      throw error;
    }
  }
}

// Export singleton instance
let wsClientInstance: ForgeWSClient | null = null;

export function createForgeWSClient(config: ForgeWSConfig): ForgeWSClient {
  const client = new ForgeWSClient(config);
  wsClientInstance = client;
  return client;
}

export function getForgeWSClient(): ForgeWSClient | null {
  return wsClientInstance;
}

// Convenience exports for common operations
export async function connectToEngine(host = 'localhost', port = 3000): Promise<ForgeWSClient> {
  const client = createForgeWSClient({ host, port });
  await client.connect();
  return client;
}

export function disconnectFromEngine(): void {
  if (wsClientInstance) {
    wsClientInstance.disconnect();
    wsClientInstance = null;
  }
}

// Standard message types for ForgeWS protocol
export const MessageTypes = {
  // Recording
  START_RECORDING: 'start_recording',
  STOP_RECORDING: 'stop_recording',
  STEP_CAPTURED: 'step_captured',
  SCREENSHOT_CAPTURED: 'screenshot_captured',

  // Execution
  EXECUTE_SCRIPT: 'execute_script',
  EXECUTION_STARTED: 'execution_started',
  EXECUTION_PROGRESS: 'execution_progress',
  EXECUTION_COMPLETED: 'execution_completed',
  EXECUTION_FAILED: 'execution_failed',

  // Engine
  PING: 'ping',
  PONG: 'pong',
  ENGINE_STATUS: 'engine_status',

  // Errors
  ERROR: 'error',
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes];
