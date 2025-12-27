import React, { useState, useEffect } from 'react';
import {
  PlayCircle, PauseCircle, SkipForward, SkipBack,
  ChevronLeft, Hash, Calendar, Clock, Eye,
  Image as ImageIcon, FileText, Zap, AlertTriangle,
  BarChart3, GitCompare, Download, Maximize2,
  Search, Layers, X, ExternalLink,
  Terminal
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

// Types
interface TraceStep {
  id: string;
  action: string;
  timestamp: number;
  duration: number;
  status: 'PASS' | 'FAIL' | 'SKIP';
  screenshotPath?: string;
  domSnapshot?: {
    html: string;
    url: string;
    timestamp: number;
  };
  consoleLogs?: string[];
  networkRequests?: any[];
  errorMessage?: string;
}

interface TraceData {
  id: string;
  scriptId: string;
  scriptName: string;
  kernel: string;
  status: 'PASS' | 'FAIL' | 'RUNNING';
  startedAt: string;
  completedAt?: string;
  steps: TraceStep[];
  traceUrl?: string;
  baselineId?: string;
  visualDiff?: {
    percentage: number;
    diffImagePath: string;
    metrics: {
      pixelDiff: number;
      structuralDiff: number;
      colorDiff: number;
      layoutShift: number;
      newElements: number;
      removedElements: number;
      changedElements: number;
    };
  };
}

// Mock trace data
const mockTraces: TraceData[] = [
  {
    id: 'trace-001',
    scriptId: 'script-123',
    scriptName: 'Login Flow Test',
    kernel: 'Chrome 86',
    status: 'FAIL',
    startedAt: '2025-12-17T10:00:00Z',
    completedAt: '2025-12-17T10:00:45Z',
    steps: [
      {
        id: 'step-001',
        action: 'Navigate to /login',
        timestamp: 0,
        duration: 1200,
        status: 'PASS',
        screenshotPath: '/screenshots/step-001.png',
        domSnapshot: { html: '<html>...</html>', url: 'http://example.com/login', timestamp: Date.now() }
      },
      {
        id: 'step-002',
        action: 'Fill username field',
        timestamp: 1200,
        duration: 500,
        status: 'PASS',
        screenshotPath: '/screenshots/step-002.png',
        domSnapshot: { html: '<html>...</html>', url: 'http://example.com/login', timestamp: Date.now() }
      },
      {
        id: 'step-003',
        action: 'Fill password field',
        timestamp: 1700,
        duration: 500,
        status: 'PASS',
        screenshotPath: '/screenshots/step-003.png',
        domSnapshot: { html: '<html>...</html>', url: 'http://example.com/login', timestamp: Date.now() }
      },
      {
        id: 'step-004',
        action: 'Click "Sign In" button',
        timestamp: 2200,
        duration: 800,
        status: 'FAIL',
        screenshotPath: '/screenshots/step-004.png',
        domSnapshot: { html: '<html>...</html>', url: 'http://example.com/login', timestamp: Date.now() },
        errorMessage: 'TimeoutError: Waiting for selector "#dashboard": timeout 30000ms exceeded',
        consoleLogs: [
          '2025-12-17T10:00:04.500Z INFO: Clicked Sign In button',
          '2025-12-17T10:00:04.800Z ERROR: Navigation timeout'
        ],
        networkRequests: [
          { url: '/api/login', method: 'POST', status: 200 },
          { url: '/api/user/profile', method: 'GET', status: 401 }
        ]
      }
    ],
    traceUrl: '/traces/trace-001.zip',
    baselineId: 'baseline-001',
    visualDiff: {
      percentage: 15.3,
      diffImagePath: '/diffs/trace-001-diff.png',
      metrics: {
        pixelDiff: 12.8,
        structuralDiff: 18.5,
        colorDiff: 14.2,
        layoutShift: 22.1,
        newElements: 3,
        removedElements: 1,
        changedElements: 7
      }
    }
  },
  {
    id: 'trace-002',
    scriptId: 'script-124',
    scriptName: 'Payment Flow',
    kernel: 'Chrome Latest',
    status: 'PASS',
    startedAt: '2025-12-17T11:00:00Z',
    completedAt: '2025-12-17T11:01:30Z',
    steps: [
      {
        id: 'step-101',
        action: 'Navigate to /checkout',
        timestamp: 0,
        duration: 2500,
        status: 'PASS',
        screenshotPath: '/screenshots/step-101.png'
      },
      {
        id: 'step-102',
        action: 'Click "Pay with Card"',
        timestamp: 2500,
        duration: 800,
        status: 'PASS',
        screenshotPath: '/screenshots/step-102.png'
      }
    ],
    traceUrl: '/traces/trace-002.zip'
  }
];

const ForgeTracer: React.FC = () => {
  const { t } = useTranslation();
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showVisualDiff, setShowVisualDiff] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'custom' | 'playwright'>('custom');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionMode, setExecutionMode] = useState<'live' | 'playback'>('playback');
  const [liveExecutionSteps, setLiveExecutionSteps] = useState<TraceStep[]>([]);
  const [currentExecutionStep, setCurrentExecutionStep] = useState<number>(-1);
  const [showDomSnapshot, setShowDomSnapshot] = useState(false);
  const [selectedDomSnapshot, setSelectedDomSnapshot] = useState<any>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedError, setSelectedError] = useState<any>(null);
  const [showErrorAnalysis, setShowErrorAnalysis] = useState(false);

  const selectedTrace = mockTraces.find(t => t.id === selectedTraceId);
  const selectedStep = selectedTrace?.steps.find(s => s.id === selectedStepId);

  // Get current steps based on execution mode
  const currentSteps = executionMode === 'live' ? liveExecutionSteps : selectedTrace?.steps || [];

  // Start live execution
  const startLiveExecution = async () => {
    setIsExecuting(true);
    setExecutionMode('live');
    setLiveExecutionSteps([]);
    setCurrentExecutionStep(-1);

    // Simulate live execution
    const steps = selectedTrace?.steps || [];
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentExecutionStep(i);
      setLiveExecutionSteps(prev => [...prev, {
        ...steps[i],
        status: i === 3 ? 'FAIL' : 'PASS'
      }] as TraceStep[]);
    }
    setIsExecuting(false);
  };

  // Execute next step
  const executeNextStep = async () => {
    if (currentExecutionStep < currentSteps.length - 1) {
      setCurrentExecutionStep(prev => prev + 1);
    }
  };

  // Execute previous step
  const executePreviousStep = () => {
    if (currentExecutionStep > 0) {
      setCurrentExecutionStep(prev => prev - 1);
    }
  };

  // Pause/Resume execution
  const toggleExecution = () => {
    setIsExecuting(!isExecuting);
  };

  // View DOM snapshot
  const viewDomSnapshot = (step: TraceStep) => {
    if (step.domSnapshot) {
      setSelectedDomSnapshot(step.domSnapshot);
      setShowDomSnapshot(true);
    }
  };

  // Export execution report
  const exportReport = async (format: 'json' | 'html') => {
    if (!selectedTrace) return;

    const reportData = {
      traceId: selectedTrace.id,
      scriptId: selectedTrace.scriptId,
      scriptName: selectedTrace.scriptName,
      kernel: selectedTrace.kernel,
      status: selectedTrace.status,
      startedAt: selectedTrace.startedAt,
      completedAt: selectedTrace.completedAt,
      totalSteps: selectedTrace.steps.length,
      passedSteps: selectedTrace.steps.filter(s => s.status === 'PASS').length,
      failedSteps: selectedTrace.steps.filter(s => s.status === 'FAIL').length,
      skippedSteps: selectedTrace.steps.filter(s => s.status === 'SKIP').length,
      steps: selectedTrace.steps.map(step => ({
        id: step.id,
        action: step.action,
        timestamp: step.timestamp,
        duration: step.duration,
        status: step.status,
        screenshotPath: step.screenshotPath,
        errorMessage: step.errorMessage,
        consoleLogs: step.consoleLogs,
        networkRequests: step.networkRequests
      })),
      generatedAt: new Date().toISOString()
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trace-${selectedTrace.id}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const html = generateHtmlReport(reportData);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trace-${selectedTrace.id}-${Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Generate HTML report
  const generateHtmlReport = (data: any) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TraceForge Execution Report - ${data.scriptName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .header p {
      margin: 10px 0 0 0;
      opacity: 0.9;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-align: center;
    }
    .metric-card h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }
    .metric-card .value.pass { color: #10b981; }
    .metric-card .value.fail { color: #ef4444; }
    .metric-card .value.skip { color: #f59e0b; }
    .steps-table {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead {
      background: #f8f9fa;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      letter-spacing: 0.5px;
    }
    td {
      font-size: 14px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-badge.pass {
      background: #d1fae5;
      color: #065f46;
    }
    .status-badge.fail {
      background: #fee2e2;
      color: #991b1b;
    }
    .status-badge.skip {
      background: #fef3c7;
      color: #92400e;
    }
    .error-message {
      color: #991b1b;
      font-size: 12px;
      margin-top: 4px;
      font-family: monospace;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>TraceForge Execution Report</h1>
    <p>${data.scriptName} • ${new Date(data.generatedAt).toLocaleString()}</p>
  </div>

  <div class="metrics">
    <div class="metric-card">
      <h3>Total Steps</h3>
      <div class="value">${data.totalSteps}</div>
    </div>
    <div class="metric-card">
      <h3>Passed</h3>
      <div class="value pass">${data.passedSteps}</div>
    </div>
    <div class="metric-card">
      <h3>Failed</h3>
      <div class="value fail">${data.failedSteps}</div>
    </div>
    <div class="metric-card">
      <h3>Skipped</h3>
      <div class="value skip">${data.skippedSteps}</div>
    </div>
    <div class="metric-card">
      <h3>Kernel</h3>
      <div class="value">${data.kernel}</div>
    </div>
    <div class="metric-card">
      <h3>Status</h3>
      <div class="value ${data.status.toLowerCase()}">${data.status}</div>
    </div>
  </div>

  <div class="steps-table">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Action</th>
          <th>Timestamp</th>
          <th>Duration</th>
          <th>Status</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody>
        ${data.steps.map((step: any, idx: number) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${step.action}</td>
            <td>${(step.timestamp / 1000).toFixed(2)}s</td>
            <td>${(step.duration / 1000).toFixed(2)}s</td>
            <td><span class="status-badge ${step.status.toLowerCase()}">${step.status}</span></td>
            <td>${step.errorMessage ? `<div class="error-message">${step.errorMessage}</div>` : ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Generated by TraceForge Desktop v1.0 • ${data.traceId}</p>
  </div>
</body>
</html>
    `;
  };

  // Analyze error and provide root cause
  const analyzeError = (errorMessage: string, _step: TraceStep) => {
    const analysis = {
      error: errorMessage,
      probableCause: '',
      suggestions: [] as string[],
      severity: 'high' as 'low' | 'medium' | 'high',
      category: 'element' as 'element' | 'timeout' | 'assertion' | 'network' | 'other'
    };

    // Parse error message to determine category and cause
    if (errorMessage.includes('TimeoutError') || errorMessage.includes('timeout')) {
      analysis.category = 'timeout';
      analysis.probableCause = 'Element took too long to appear or become interactive';
      analysis.suggestions = [
        'Increase timeout value for this action',
        'Check if the page is loading correctly',
        'Verify the element locator strategy',
        'Add a wait condition before this action'
      ];
      analysis.severity = 'medium';
    } else if (errorMessage.includes('not visible') || errorMessage.includes('not found')) {
      analysis.category = 'element';
      analysis.probableCause = 'Element could not be located or is not visible';
      analysis.suggestions = [
        'Verify the locator strategy matches the current page state',
        'Check if element is hidden by CSS or overlays',
        'Ensure previous navigation/action completed successfully',
        'Try alternative locator strategies (role, text, XPath)',
        'Add explicit wait for element visibility'
      ];
      analysis.severity = 'high';
    } else if (errorMessage.includes('assertion') || errorMessage.includes('Expected')) {
      analysis.category = 'assertion';
      analysis.probableCause = 'Assertion failed - actual value does not match expected';
      analysis.suggestions = [
        'Verify the expected value is correct',
        'Check if the page state has changed',
        'Ensure element contains the expected text/attribute',
        'Update the assertion with correct expected value'
      ];
      analysis.severity = 'medium';
    } else if (errorMessage.includes('network') || errorMessage.includes('404') || errorMessage.includes('500')) {
      analysis.category = 'network';
      analysis.probableCause = 'Network request failed or returned error status';
      analysis.suggestions = [
        'Check server logs for backend errors',
        'Verify API endpoint is accessible',
        'Ensure authentication/authorization is valid',
        'Check network connectivity'
      ];
      analysis.severity = 'high';
    } else {
      analysis.category = 'other';
      analysis.probableCause = 'Unknown error occurred during execution';
      analysis.suggestions = [
        'Check console logs for additional context',
        'Review the complete error stack trace',
        'Verify the page loaded correctly',
        'Try running the step in isolation'
      ];
      analysis.severity = 'medium';
    }

    return analysis;
  };

  // Open error analysis modal
  const openErrorAnalysis = (step: TraceStep) => {
    if (step.errorMessage) {
      const analysis = analyzeError(step.errorMessage, step);
      setSelectedError({ step, analysis });
      setShowErrorAnalysis(true);
    }
  };

  // Auto-select first step when trace is selected
  useEffect(() => {
    if (selectedTrace && !selectedStepId) {
      setSelectedStepId(selectedTrace.steps[0]?.id || null);
      setCurrentTime(selectedTrace.steps[0]?.timestamp || 0);
    }
  }, [selectedTrace, selectedStepId]);

  // Playback control
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && selectedTrace) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const nextTime = prev + (100 * playbackSpeed);
          const lastStepTime = selectedTrace.steps[selectedTrace.steps.length - 1]?.timestamp || 0;
          if (nextTime > lastStepTime) {
            setIsPlaying(false);
            return lastStepTime;
          }
          return nextTime;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, selectedTrace]);

  // Update selected step based on current time
  useEffect(() => {
    if (selectedTrace) {
      const currentStep = selectedTrace.steps.find(step => {
        const stepEnd = step.timestamp + step.duration;
        return currentTime >= step.timestamp && currentTime < stepEnd;
      });
      if (currentStep && currentStep.id !== selectedStepId) {
        setSelectedStepId(currentStep.id);
      }
    }
  }, [currentTime, selectedTrace, selectedStepId]);

  // Playwright trace viewer URL
  const getPlaywrightTraceUrl = () => {
    if (!selectedTrace?.traceUrl) return null;
    // In a real implementation, this would be a local trace viewer
    return `https://trace.playwright.dev/?trace=${encodeURIComponent(selectedTrace.traceUrl)}`;
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {!selectedTraceId ? (
        // Trace List View
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">{t('tracer.title')}</h1>
            <p className="text-slate-400">{t('tracer.subtitle')}</p>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder={t('tracer.searchTraces')}
                className="w-full bg-surface border border-slate-700 rounded px-10 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="bg-surface border border-slate-700 rounded px-4 py-2 text-white text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="ALL">{t('tracer.filterAll')}</option>
              <option value="PASS">{t('tracer.filterPass')}</option>
              <option value="FAIL">{t('tracer.filterFail')}</option>
            </select>
          </div>

          {/* Trace List */}
          <div className="grid gap-4">
            {mockTraces.map(trace => (
              <div
                key={trace.id}
                className="bg-surface border border-slate-700 rounded p-4 hover:border-blue-500 cursor-pointer transition-colors"
                onClick={() => setSelectedTraceId(trace.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white">{trace.scriptName}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                        trace.status === 'PASS'
                          ? 'border-green-500/30 bg-green-500/10 text-green-400'
                          : trace.status === 'FAIL'
                          ? 'border-red-500/30 bg-red-500/10 text-red-400'
                          : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {trace.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {trace.id}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(trace.startedAt).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {trace.kernel}
                      </span>
                    </div>
                  </div>
                  {trace.visualDiff && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-orange-400">
                        <BarChart3 className="w-3 h-3" />
                        {trace.visualDiff.percentage}% diff
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>{trace.steps.length} steps</span>
                  <span>•</span>
                  <span>{trace.status === 'PASS' ? trace.steps.filter(s => s.status === 'PASS').length : trace.steps.filter(s => s.status === 'FAIL').length} {trace.status.toLowerCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Trace Detail View
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="h-14 border-b border-slate-700 bg-surface flex items-center justify-between px-6 shadow-md">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedTraceId(null)}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm pr-4 border-r border-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('tracer.back')}
              </button>
              <h2 className="text-lg font-bold text-white">{selectedTrace?.scriptName}</h2>
              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                selectedTrace?.status === 'PASS'
                  ? 'border-green-500/30 bg-green-500/10 text-green-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
              }`}>
                {selectedTrace?.status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedTrace?.visualDiff && activeView === 'custom' && (
                <button
                  onClick={() => setShowVisualDiff(!showVisualDiff)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm transition-colors"
                >
                  <GitCompare className="w-4 h-4" />
                  {t('tracer.visualDiff')}
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t('tracer.export')}
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-surface border border-slate-700 rounded shadow-lg z-50 min-w-[150px]">
                    <button
                      onClick={() => {
                        exportReport('json');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-800 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Export as JSON
                    </button>
                    <button
                      onClick={() => {
                        exportReport('html');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-800 flex items-center gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Export as HTML
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* View Tabs */}
          <div className="h-12 border-b border-slate-700 bg-surface flex items-center px-6">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveView('custom')}
                className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
                  activeView === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  {t('tracer.customView')}
                </div>
              </button>
              <button
                onClick={() => setActiveView('playwright')}
                className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
                  activeView === 'playwright'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t('tracer.playwrightTrace')}
                </div>
              </button>
            </div>
          </div>

          {/* Execution Mode Controls */}
          {activeView === 'custom' && selectedTrace && (
            <div className="h-12 border-b border-slate-700 bg-surface flex items-center px-6 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Execution Mode:</span>
                <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700">
                  <button
                    onClick={() => setExecutionMode('playback')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      executionMode === 'playback'
                        ? 'bg-slate-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Playback
                  </button>
                  <button
                    onClick={() => setExecutionMode('live')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      executionMode === 'live'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Live
                  </button>
                </div>
              </div>

              {executionMode === 'live' && (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={executePreviousStep}
                      disabled={currentExecutionStep <= 0}
                      className="flex items-center justify-center w-7 h-7 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 rounded"
                      title="Previous Step"
                    >
                      <SkipBack className="w-3 h-3 text-white" />
                    </button>
                    <button
                      onClick={toggleExecution}
                      disabled={currentExecutionStep >= currentSteps.length - 1 && isExecuting}
                      className="flex items-center justify-center w-7 h-7 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:opacity-50 rounded"
                      title={isExecuting ? "Pause" : "Execute Next Step"}
                    >
                      {isExecuting ? (
                        <PauseCircle className="w-3 h-3 text-white" />
                      ) : (
                        <PlayCircle className="w-3 h-3 text-white" />
                      )}
                    </button>
                    <button
                      onClick={executeNextStep}
                      disabled={currentExecutionStep >= currentSteps.length - 1}
                      className="flex items-center justify-center w-7 h-7 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 rounded"
                      title="Next Step"
                    >
                      <SkipForward className="w-3 h-3 text-white" />
                    </button>
                  </div>

                  {isExecuting && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-blue-400">Executing step {currentExecutionStep + 1} of {currentSteps.length}...</span>
                    </div>
                  )}

                  {!isExecuting && currentExecutionStep >= 0 && (
                    <div className="text-xs text-slate-500">
                      Step {currentExecutionStep + 1} of {currentSteps.length} completed
                    </div>
                  )}
                </>
              )}

              {executionMode === 'live' && !isExecuting && currentExecutionStep === -1 && (
                <button
                  onClick={startLiveExecution}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                >
                  <PlayCircle className="w-3 h-3" />
                  Start Live Execution
                </button>
              )}
            </div>
          )}

          {/* Main Content */}
          {activeView === 'playwright' ? (
            // Playwright Trace Viewer Full Width
            <div className="flex-1 bg-slate-900">
              {selectedTrace?.traceUrl ? (
                <iframe
                  src={getPlaywrightTraceUrl() || undefined}
                  className="w-full h-full border-0"
                  title="Playwright Trace Viewer"
                  allow="clipboard-read; clipboard-write"
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 mb-2">{t('tracer.noTraceAvailable')}</p>
                    <p className="text-slate-500 text-sm">{t('tracer.noTraceHelp')}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Custom Trace View
            <div className="flex-1 overflow-hidden flex">
              {/* Left Panel: Steps Timeline (40%) */}
              <div className="w-[40%] border-r border-slate-700 overflow-y-auto bg-slate-900/50">
              <div className="p-4 border-b border-slate-700">
                <h3 className="font-bold text-white mb-2">{t('tracer.timeline')}</h3>

                {/* Playback Controls */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded"
                  >
                    {isPlaying ? (
                      <PauseCircle className="w-4 h-4 text-white" />
                    ) : (
                      <PlayCircle className="w-4 h-4 text-white" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      const prevStep = selectedTrace?.steps.find((_s, i) =>
                        i > 0 && selectedTrace.steps[i - 1].id === selectedStepId
                      );
                      if (prevStep) {
                        setSelectedStepId(prevStep.id);
                        setCurrentTime(prevStep.timestamp);
                      }
                    }}
                    className="flex items-center justify-center w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded"
                  >
                    <SkipBack className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedTrace) return;
                      const nextStep = selectedTrace.steps.find((s, i) =>
                        i < selectedTrace.steps.length - 1 && s.id === selectedStepId
                      );
                      if (nextStep) {
                        const nextIdx = selectedTrace.steps.findIndex(s => s.id === selectedStepId) + 1;
                        if (nextIdx < selectedTrace.steps.length) {
                          setSelectedStepId(selectedTrace.steps[nextIdx].id);
                          setCurrentTime(selectedTrace.steps[nextIdx].timestamp);
                        }
                      }
                    }}
                    className="flex items-center justify-center w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded"
                  >
                    <SkipForward className="w-4 h-4 text-white" />
                  </button>
                  <select
                    className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs ml-auto"
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={4}>4x</option>
                  </select>
                </div>

                {/* Timeline Slider with Scrubbing */}
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="range"
                      min={0}
                      max={selectedTrace?.steps[selectedTrace.steps.length - 1]?.timestamp || 100}
                      value={currentTime}
                      onChange={(e) => setCurrentTime(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / (selectedTrace?.steps[selectedTrace.steps.length - 1]?.timestamp || 100)) * 100}%, #374151 ${(currentTime / (selectedTrace?.steps[selectedTrace.steps.length - 1]?.timestamp || 100)) * 100}%, #374151 100%)`
                      }}
                    />
                    {/* Step markers */}
                    {selectedTrace?.steps.map((step, _idx) => (
                      <div
                        key={step.id}
                        className="absolute top-0 w-1 h-2 bg-slate-500 transform -translate-x-1/2"
                        style={{
                          left: `${(step.timestamp / (selectedTrace.steps[selectedTrace.steps.length - 1].timestamp || 100)) * 100}%`
                        }}
                        title={step.action}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>0s</span>
                    <span className="text-blue-400 font-mono">
                      {((currentTime || 0) / 1000).toFixed(2)}s
                    </span>
                    <span>
                      {((selectedTrace?.steps[selectedTrace.steps.length - 1]?.timestamp || 100) / 1000).toFixed(2)}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Steps List */}
              <div className="p-2">
                {currentSteps.map((step, idx) => {
                  const isCurrentStep = executionMode === 'live' && idx === currentExecutionStep;
                  const isCompleted = executionMode === 'live' && idx < currentExecutionStep;

                  return (
                    <div
                      key={step.id}
                      className={`p-3 rounded mb-2 cursor-pointer transition-colors ${
                        step.id === selectedStepId || isCurrentStep
                          ? 'bg-blue-600/20 border border-blue-500/50'
                          : 'bg-surface hover:bg-slate-800'
                      } ${
                        step.status === 'FAIL' ? 'border-l-2 border-l-red-500' :
                        isCurrentStep ? 'border-l-2 border-l-blue-500' : ''
                      }`}
                      onClick={() => {
                        setSelectedStepId(step.id);
                        if (executionMode === 'playback') {
                          setCurrentTime(step.timestamp);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-500 w-8">{idx + 1}</span>
                        <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
                          isCurrentStep
                            ? 'bg-blue-500/20 text-blue-400'
                            : step.status === 'PASS' || isCompleted
                            ? 'bg-green-500/20 text-green-400'
                            : step.status === 'FAIL'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {isCurrentStep && (
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                          )}
                          {isCurrentStep ? 'RUNNING' : step.status}
                        </span>
                        <span className="text-xs text-slate-400">{(step.duration / 1000).toFixed(2)}s</span>
                      </div>
                      <div className="text-sm text-white">{step.action}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {step.domSnapshot && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              viewDomSnapshot(step);
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <Layers className="w-3 h-3" />
                            View DOM
                          </button>
                        )}
                        {step.errorMessage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openErrorAnalysis(step);
                            }}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {step.errorMessage.substring(0, 40)}...
                            <span className="text-red-300">(Analyze)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Panel: Screenshot & Details (60%) */}
            <div className="flex-1 overflow-y-auto bg-slate-900/30">
              {selectedStep ? (
                <div className="p-6">
                  {/* Screenshot Viewer */}
                  <div className="bg-surface border border-slate-700 rounded p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        {t('tracer.screenshot')}
                      </h3>
                      {selectedStep.screenshotPath && (
                        <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                          <Maximize2 className="w-3 h-3" />
                          {t('tracer.fullscreen')}
                        </button>
                      )}
                    </div>
                    <div className="aspect-video bg-slate-800 rounded flex items-center justify-center">
                      {selectedStep.screenshotPath ? (
                        <img
                          src={selectedStep.screenshotPath}
                          alt={selectedStep.action}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <div className="text-slate-500 text-sm">{t('tracer.noScreenshot')}</div>
                      )}
                    </div>
                    {selectedStep.errorMessage && (
                      <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-red-400 font-bold text-sm mb-1">
                              {t('tracer.errorDetected')}
                            </div>
                            <pre className="text-xs text-red-300 whitespace-pre-wrap">
                              {selectedStep.errorMessage}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Visual Diff (if enabled) */}
                  {showVisualDiff && selectedTrace?.visualDiff && (
                    <div className="bg-surface border border-slate-700 rounded p-4 mb-4">
                      <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                        <GitCompare className="w-4 h-4" />
                        {t('tracer.visualRegression')}
                      </h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-slate-500 mb-2">Baseline</div>
                          <div className="aspect-video bg-slate-800 rounded flex items-center justify-center">
                            <img
                              src={selectedStep.screenshotPath}
                              alt="Baseline"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-2">Current</div>
                          <div className="aspect-video bg-slate-800 rounded flex items-center justify-center relative">
                            <img
                              src={selectedStep.screenshotPath}
                              alt="Current"
                              className="max-w-full max-h-full object-contain"
                            />
                            <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-xs">
                              {selectedTrace.visualDiff.percentage}% diff
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Metrics */}
                      <div className="bg-slate-900/50 rounded p-3">
                        <h4 className="text-sm font-bold text-white mb-3">Detailed Metrics</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Pixel Difference</span>
                              <span className="text-white font-mono">{selectedTrace.visualDiff.metrics.pixelDiff}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Structural Changes</span>
                              <span className="text-white font-mono">{selectedTrace.visualDiff.metrics.structuralDiff}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Color Variance</span>
                              <span className="text-white font-mono">{selectedTrace.visualDiff.metrics.colorDiff}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Layout Shift</span>
                              <span className="text-white font-mono">{selectedTrace.visualDiff.metrics.layoutShift}%</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">New Elements</span>
                              <span className="text-green-400 font-mono">+{selectedTrace.visualDiff.metrics.newElements}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Removed Elements</span>
                              <span className="text-red-400 font-mono">-{selectedTrace.visualDiff.metrics.removedElements}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Changed Elements</span>
                              <span className="text-yellow-400 font-mono">{selectedTrace.visualDiff.metrics.changedElements}</span>
                            </div>
                            <div className="flex justify-between text-xs pt-2 border-t border-slate-700">
                              <span className="text-slate-300 font-bold">Total Diff Score</span>
                              <span className="text-orange-400 font-mono font-bold">{selectedTrace.visualDiff.percentage}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bars */}
                        <div className="mt-3 space-y-2">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-500">Overall Change</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5">
                              <div
                                className="bg-orange-500 h-1.5 rounded-full"
                                style={{ width: `${selectedTrace.visualDiff.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DOM Snapshot */}
                  {selectedStep.domSnapshot && (
                    <div className="bg-surface border border-slate-700 rounded p-4 mb-4">
                      <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        {t('tracer.domSnapshot')}
                      </h3>
                      <pre className="text-xs text-slate-400 bg-slate-900 p-3 rounded overflow-x-auto">
                        {JSON.stringify({ snapshot: selectedStep.domSnapshot }, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Console Logs */}
                  {selectedStep.consoleLogs && selectedStep.consoleLogs.length > 0 && (
                    <div className="bg-surface border border-slate-700 rounded p-4 mb-4">
                      <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                        <Terminal className="w-4 h-4" />
                        {t('tracer.consoleLogs')}
                      </h3>
                      <div className="space-y-1">
                        {selectedStep.consoleLogs.map((log, idx) => (
                          <div
                            key={idx}
                            className={`text-xs p-2 rounded font-mono ${
                              log.includes('ERROR') ? 'bg-red-500/10 text-red-300' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Network Requests */}
                  {selectedStep.networkRequests && selectedStep.networkRequests.length > 0 && (
                    <div className="bg-surface border border-slate-700 rounded p-4">
                      <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        {t('tracer.networkActivity')}
                      </h3>
                      <div className="space-y-2">
                        {selectedStep.networkRequests.map((req, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-slate-800 p-2 rounded flex items-center justify-between"
                          >
                            <span className="text-blue-400">{req.method}</span>
                            <span className="text-slate-400 flex-1 mx-2 font-mono">{req.url}</span>
                            <span className={`${
                              req.status < 400 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  {t('tracer.selectStep')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* DOM Snapshot Modal */}
      {showDomSnapshot && selectedDomSnapshot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-surface border border-slate-700 rounded-lg shadow-xl w-[900px] max-w-[95vw] h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-white">DOM Snapshot</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedDomSnapshot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open in new tab
                </a>
                <button
                  onClick={() => setShowDomSnapshot(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden flex flex-col p-4">
              <div className="mb-2 text-xs text-slate-500">
                URL: <span className="text-blue-400 font-mono">{selectedDomSnapshot.url}</span>
              </div>
              <div className="flex-1 overflow-auto bg-slate-900 rounded border border-slate-700 p-4">
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                  {selectedDomSnapshot.html}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Analysis Modal */}
      {showErrorAnalysis && selectedError && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-surface border border-slate-700 rounded-lg shadow-xl w-[700px] max-w-[95vw] max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-lg font-bold text-white">Error Analysis</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  selectedError.analysis.severity === 'high'
                    ? 'bg-red-500/20 text-red-400'
                    : selectedError.analysis.severity === 'medium'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {selectedError.analysis.severity.toUpperCase()} SEVERITY
                </span>
              </div>
              <button
                onClick={() => setShowErrorAnalysis(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Error Details */}
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                <div className="text-red-400 font-bold text-sm mb-2">Error Message</div>
                <pre className="text-xs text-red-300 whitespace-pre-wrap font-mono">
                  {selectedError.analysis.error}
                </pre>
              </div>

              {/* Root Cause Analysis */}
              <div className="p-3 bg-slate-800/50 border border-slate-700 rounded">
                <div className="text-blue-400 font-bold text-sm mb-2">Probable Cause</div>
                <p className="text-sm text-white">{selectedError.analysis.probableCause}</p>
              </div>

              {/* Category & Severity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/50 border border-slate-700 rounded">
                  <div className="text-slate-500 text-xs mb-1">Category</div>
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    selectedError.analysis.category === 'element'
                      ? 'bg-purple-500/20 text-purple-400'
                      : selectedError.analysis.category === 'timeout'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : selectedError.analysis.category === 'assertion'
                      ? 'bg-blue-500/20 text-blue-400'
                      : selectedError.analysis.category === 'network'
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {selectedError.analysis.category}
                  </span>
                </div>
                <div className="p-3 bg-slate-800/50 border border-slate-700 rounded">
                  <div className="text-slate-500 text-xs mb-1">Severity</div>
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    selectedError.analysis.severity === 'high'
                      ? 'bg-red-500/20 text-red-400'
                      : selectedError.analysis.severity === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {selectedError.analysis.severity}
                  </span>
                </div>
              </div>

              {/* Suggestions */}
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                <div className="text-green-400 font-bold text-sm mb-2">Suggested Fixes</div>
                <ul className="space-y-2">
                  {selectedError.analysis.suggestions.map((suggestion: string, idx: number) => (
                    <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Step Details */}
              <div className="p-3 bg-slate-800/50 border border-slate-700 rounded">
                <div className="text-slate-500 text-xs mb-2">Failed Step</div>
                <div className="text-sm text-white font-medium">{selectedError.step.action}</div>
                <div className="text-xs text-slate-400 mt-1">
                  Duration: {(selectedError.step.duration / 1000).toFixed(2)}s
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setShowErrorAnalysis(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedStepId(selectedError.step.id);
                  setShowErrorAnalysis(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              >
                View Step Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgeTracer;
