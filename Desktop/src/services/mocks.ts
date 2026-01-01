// Mock types for testing
interface TestStep {
  id: number;
  name: string;
  status: 'PASS' | 'FAIL';
  duration: string;
  time: string;
  screenshot?: string | null;
  error?: string | null;
}

interface TestResult {
  id: string;
  status: 'PASS' | 'FAIL';
  project: string;
  script: string;
  duration: string;
  kernel: string;
  time: string;
  steps: TestStep[];
}

// Mock Data for Scenarios
export const MOCK_SCENARIOS = [
  {
    id: '1',
    name: 'Purchase Flow - Guest',
    project: 'E-Commerce v2.1',
    tags: ['Smoke', 'P0'],
    lastRun: '10 mins ago',
    status: 'PASS',
    steps: 12,
  },
  {
    id: '2',
    name: 'Purchase Flow - Registered',
    project: 'E-Commerce v2.1',
    tags: ['Regression', 'P1'],
    lastRun: '2 hours ago',
    status: 'PASS',
    steps: 15,
  },
  {
    id: '3',
    name: 'Login - Invalid Credentials',
    project: 'E-Commerce v2.1',
    tags: ['Negative'],
    lastRun: '1 day ago',
    status: 'FAIL',
    steps: 4,
  },
  {
    id: '4',
    name: 'Admin Dashboard Access',
    project: 'E-Commerce v2.1',
    tags: ['Security'],
    lastRun: 'Never',
    status: 'IDLE',
    steps: 8,
  },
  {
    id: '5',
    name: 'Product Search',
    project: 'E-Commerce v2.0',
    tags: ['Search', 'Performance'],
    lastRun: '3 days ago',
    status: 'PASS',
    steps: 6,
  },
]

// Mock Data for Results
export const MOCK_RESULTS: TestResult[] = [
  {
    id: '1',
    status: 'PASS',
    project: 'E-Commerce v2.1',
    script: 'TC001 Login Flow',
    duration: '12s',
    kernel: 'Chrome 86',
    time: '10 mins ago',
    steps: [
      { id: 1, name: 'Navigate to /login', status: 'PASS', duration: '1.2s', time: '10:00:01' },
      {
        id: 2,
        name: 'Fill username "user@example.com"',
        status: 'PASS',
        duration: '0.5s',
        time: '10:00:02',
      },
      {
        id: 3,
        name: 'Fill password "********"',
        status: 'PASS',
        duration: '0.5s',
        time: '10:00:03',
      },
      { id: 4, name: 'Click "Sign In"', status: 'PASS', duration: '0.8s', time: '10:00:04' },
      {
        id: 5,
        name: 'Assert URL contains "/dashboard"',
        status: 'PASS',
        duration: '0.1s',
        time: '10:00:05',
      },
    ],
  },
  {
    id: '2',
    status: 'FAIL',
    project: 'E-Commerce v2.1',
    script: 'TC002 Payment Gateway',
    duration: '45s',
    kernel: 'Chrome Latest',
    time: '12 mins ago',
    steps: [
      { id: 1, name: 'Navigate to /checkout', status: 'PASS', duration: '2.5s', time: '10:05:00' },
      {
        id: 2,
        name: 'Select Payment "Credit Card"',
        status: 'PASS',
        duration: '0.8s',
        time: '10:05:03',
      },
      {
        id: 3,
        name: 'Click "Pay Now"',
        status: 'FAIL',
        duration: '30.0s',
        time: '10:05:04',
        error:
          'TimeoutError: Element button[data-testid="pay-submit"] not visible after 30000ms\n    at Page.click (test/payment.spec.ts:45:12)',
      },
    ],
  },
  {
    id: '3',
    status: 'PASS',
    project: 'E-Commerce v2.0',
    script: 'TC003 Search Items',
    duration: '15s',
    kernel: 'Chrome 86',
    time: '2 hours ago',
    steps: [],
  },
]

// Mock Data for Recorder Logs
export const MOCK_LOGS = [
  { time: '14:30:01', level: 'INFO', msg: 'Started recording session' },
  { time: '14:30:02', level: 'INFO', msg: 'Detected navigation to /login' },
  { time: '14:30:04', level: 'INFO', msg: 'Click action recorded on button[name="Login"]' },
  { time: '14:30:05', level: 'DEBUG', msg: 'Auto-injected wait_for networkidle' },
  { time: '14:30:05', level: 'INFO', msg: 'Detected navigation to /dashboard' },
]

// Mock Data for Recorder Scenarios
export const MOCK_RECORDER_SCENARIOS = [
  {
    id: 's1',
    name: 'Scenario 1: Purchase Flow',
    pages: [
      {
        id: 'p1',
        name: 'Page 1: /login',
        active: false,
        steps: [
          { id: '1', type: 'fill', desc: 'fill username "user@example.com"', target: '#username' },
          { id: '2', type: 'fill', desc: 'fill password "********"', target: '#password' },
          { id: '3', type: 'click', desc: 'click "Login"', target: 'button.login' },
        ],
      },
      {
        id: 'p2',
        name: 'Page 2: /search',
        active: true,
        steps: [
          { id: '4', type: 'fill', desc: 'fill "#kw" with "Laptop"', target: '#kw' },
          { id: '5', type: 'press', desc: 'press Enter', target: '' },
          { id: '6', type: 'wait', desc: 'wait_for networkidle', target: '' },
          { id: '7', type: 'hover', desc: 'hover ".item-card-1"', target: '.item-card-1' },
        ],
      },
    ],
  },
]
