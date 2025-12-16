export enum TestStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  RUNNING = 'RUNNING',
  IDLE = 'IDLE',
  SKIPPED = 'SKIPPED'
}

export interface Step {
  id: string;
  type: 'navigate' | 'click' | 'fill' | 'wait' | 'hover' | 'assert' | 'screenshot';
  description: string;
  target?: string; // selector or url
  value?: string;
  status?: TestStatus;
  timestamp?: string;
}

export interface PageNode {
  id: string;
  name: string;
  url: string;
  steps: Step[];
}

export interface Scenario {
  id: string;
  name: string;
  pages: PageNode[];
}

export interface Kernel {
  id: string;
  name: string;
  version: string;
  path: string;
  status: 'Compatible' | 'Latest' | 'Outdated';
  type: 'bundled' | 'local';
}

export interface NodeAgent {
  id: string;
  name: string;
  ip: string;
  status: 'ONLINE' | 'BUSY' | 'OFFLINE';
  cpuUsage: number;
  memUsage: number;
  kernels: string[];
}

export interface ExecutionResult {
  id: string;
  project: string;
  version: string;
  scriptName: string;
  duration: string;
  kernel: string;
  status: TestStatus;
  timestamp: string;
}
