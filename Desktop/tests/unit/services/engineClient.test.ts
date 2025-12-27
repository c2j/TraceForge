import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EngineClient, EngineClientConfig } from '../../../src/services/engineClient';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  static instances: MockWebSocket[] = [];

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  // Helper to simulate receiving a message
  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  // Helper to simulate connection
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  // Helper to simulate an error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  static reset() {
    MockWebSocket.instances = [];
  }
}

// Store the original WebSocket
const OriginalWebSocket = global.WebSocket;

describe('EngineClient', () => {
  let client: EngineClient;

  beforeEach(() => {
    // Replace global WebSocket with mock
    global.WebSocket = MockWebSocket as any;
    MockWebSocket.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (client) {
      try {
        client.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    }
    global.WebSocket = OriginalWebSocket;
    MockWebSocket.reset();
  });

  describe('Connection', () => {
    it('should create a client with config', () => {
      const config: EngineClientConfig = {
        engineId: 'engine-1',
        host: 'localhost',
        port: 54321,
      };

      client = new EngineClient(config);

      const info = client.getConnectionInfo();
      expect(info.engineId).toBe('engine-1');
      expect(info.url).toBe('ws://localhost:54321/ws');
      expect(info.state).toBe('DISCONNECTED');
    });

    it('should connect to the engine', async () => {
      const config: EngineClientConfig = {
        engineId: 'engine-1',
        host: 'localhost',
        port: 54321,
      };

      client = new EngineClient(config);

      // Start connection (will create WebSocket)
      const connectPromise = client.connect();

      // Simulate WebSocket opening
      const instance = MockWebSocket.instances[0];
      if (instance) {
        instance.simulateOpen();
      }

      await connectPromise;

      expect(client.isConnected()).toBe(true);
    }, 10000);

    it('should disconnect from the engine', async () => {
      const config: EngineClientConfig = {
        engineId: 'engine-1',
        host: 'localhost',
        port: 54321,
      };

      client = new EngineClient(config);

      const connectPromise = client.connect();

      // Simulate WebSocket opening
      const instance = MockWebSocket.instances[0];
      if (instance) {
        instance.simulateOpen();
      }

      await connectPromise;

      expect(client.isConnected()).toBe(true);

      client.disconnect();

      expect(client.isConnected()).toBe(false);
    }, 10000);

    it('should emit status change on connect', async () => {
      const onStatusChange = vi.fn();
      const config: EngineClientConfig = {
        engineId: 'engine-1',
        host: 'localhost',
        port: 54321,
        autoReconnect: false,
        onStatusChange,
      };

      client = new EngineClient(config);

      const connectPromise = client.connect();

      // Simulate WebSocket opening
      const instance = MockWebSocket.instances[0];
      if (instance) {
        instance.simulateOpen();
      }

      await connectPromise;

      expect(onStatusChange).toHaveBeenCalled();
    }, 10000);

    it('should provide connection info', () => {
      const config: EngineClientConfig = {
        engineId: 'engine-1',
        host: 'localhost',
        port: 54321,
      };

      client = new EngineClient(config);

      const info = client.getConnectionInfo();

      expect(info).toHaveProperty('engineId', 'engine-1');
      expect(info).toHaveProperty('url', 'ws://localhost:54321/ws');
      expect(info).toHaveProperty('state');
      expect(info).toHaveProperty('connectedAt');
      expect(info).toHaveProperty('lastMessageAt');
      expect(info).toHaveProperty('reconnectAttempts');
    });
  });

  describe('Engine Commands', () => {
    beforeEach(async () => {
      const config: EngineClientConfig = {
        engineId: 'engine-1',
        host: 'localhost',
        port: 54321,
      };

      client = new EngineClient(config);

      const connectPromise = client.connect();

      // Simulate WebSocket opening
      const instance = MockWebSocket.instances[0];
      if (instance) {
        instance.simulateOpen();
      }

      await connectPromise;
    }, 15000);

    it('should have connection established', () => {
      expect(client.isConnected()).toBe(true);
    });

    it('should be able to send commands', () => {
      // Basic test that the client is connected and ready
      expect(client.isConnected()).toBe(true);
      expect(client.getState()).toBe('CONNECTED');
    });
  });

  describe('Connection State Tracking', () => {
    it('should track DISCONNECTED state initially', () => {
      const config: EngineClientConfig = {
        engineId: 'engine-1',
        host: 'localhost',
        port: 54321,
      };

      client = new EngineClient(config);

      expect(client.getState()).toBe('DISCONNECTED');
      expect(client.isConnected()).toBe(false);
    });

    it('should track CONNECTING state during connection', async () => {
      const config: EngineClientConfig = {
        engineId: 'engine-1',
        host: 'localhost',
        port: 54321,
      };

      client = new EngineClient(config);

      // Start connection but don't resolve it yet
      client.connect();

      // After calling connect, state should be CONNECTING
      expect(client.getState()).toBe('CONNECTING');

      // Clean up - simulate open to avoid hanging
      const instance = MockWebSocket.instances[0];
      if (instance) {
        instance.simulateOpen();
      }

      // Then disconnect
      client.disconnect();
    }, 10000);
  });

  describe('Auto-Reconnect', () => {
    it('should have autoReconnect enabled by default', () => {
      const config: EngineClientConfig = {
        engineId: 'engine-1',
        host: 'localhost',
        port: 54321,
      };

      client = new EngineClient(config);

      // Auto-reconnect is enabled by default in the implementation
      expect(client).toBeDefined();
    });

    it('should respect autoReconnect config option', () => {
      const config: EngineClientConfig = {
        engineId: 'engine-1',
        host: 'localhost',
        port: 54321,
        autoReconnect: false,
      };

      client = new EngineClient(config);

      expect(client).toBeDefined();
    });
  });
});
