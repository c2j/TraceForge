import React, { useState, useEffect } from 'react';
import { useForgeStore } from '../stores/useForgeStore';
import { Chrome, CheckCircle, XCircle, Clock, Image as ImageIcon, Download, Filter } from 'lucide-react';

interface MultiKernelResultsProps {
  scriptId: string;
  executionIds?: string[];
}

interface KernelResult {
  kernelId: string;
  kernelName: string;
  kernelVersion: string;
  executions: any[];
  passed: number;
  failed: number;
  running: number;
}

const MultiKernelResults: React.FC<MultiKernelResultsProps> = ({ scriptId, executionIds }) => {
  const { kernels, getConsolidatedResults } = useForgeStore();
  const [resultsByKernel, setResultsByKernel] = useState<Map<string, any[]>>(new Map());
  const [selectedKernel, _setSelectedKernel] = useState<string | null>(null);
  const [selectedExecution, _setSelectedExecution] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed' | 'running'>('all');

  useEffect(() => {
    loadConsolidatedResults();
    // Poll for updates every 2 seconds
    const interval = setInterval(loadConsolidatedResults, 2000);
    return () => clearInterval(interval);
  }, [scriptId, executionIds]);

  const loadConsolidatedResults = async () => {
    try {
      const results = await getConsolidatedResults(scriptId, executionIds || []);
      setResultsByKernel(results);
    } catch (error) {
      console.error('Failed to load consolidated results:', error);
    }
  };

  const getKernelResults = (): KernelResult[] => {
    const kernelResults: KernelResult[] = [];

    for (const [kernelId, execs] of resultsByKernel.entries()) {
      const kernel = kernels.find(k => k.id === kernelId);
      if (!kernel) continue;

      const passed = execs.filter((e: any) => e.status === 'COMPLETED').length;
      const failed = execs.filter((e: any) => e.status === 'FAILED').length;
      const running = execs.filter((e: any) => e.status === 'RUNNING').length;

      kernelResults.push({
        kernelId,
        kernelName: kernel.name,
        kernelVersion: kernel.version,
        executions: execs,
        passed,
        failed,
        running,
      });
    }

    return kernelResults.sort((a, b) => a.kernelName.localeCompare(b.kernelName));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'RUNNING':
        return <Clock className="w-4 h-4 text-blue-400 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">PASSED</span>;
      case 'FAILED':
        return <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold">FAILED</span>;
      case 'RUNNING':
        return <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold">RUNNING</span>;
      default:
        return <span className="bg-slate-500/20 text-slate-400 px-2 py-1 rounded text-xs font-bold">PENDING</span>;
    }
  };

  const kernelResults = getKernelResults();
  const totalPassed = kernelResults.reduce((sum, kr) => sum + kr.passed, 0);
  const totalFailed = kernelResults.reduce((sum, kr) => sum + kr.failed, 0);
  const totalRunning = kernelResults.reduce((sum, kr) => sum + kr.running, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Multi-Kernel Test Results</h2>
          <p className="text-sm text-slate-400">Consolidated view across {kernelResults.length} kernel(s)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadConsolidatedResults}
            className="bg-surface border border-slate-600 hover:border-slate-500 text-white px-3 py-2 rounded flex items-center gap-2 text-sm"
          >
            <Filter className="w-4 h-4" /> Refresh
          </button>
          <button className="bg-surface border border-slate-600 hover:border-slate-500 text-white px-3 py-2 rounded flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-surface border border-slate-700 rounded-lg p-4">
          <div className="text-sm text-slate-400 mb-1">Total Kernels</div>
          <div className="text-2xl font-bold text-white">{kernelResults.length}</div>
        </div>
        <div className="bg-surface border border-green-900/30 rounded-lg p-4">
          <div className="text-sm text-green-400 mb-1">Passed</div>
          <div className="text-2xl font-bold text-green-400">{totalPassed}</div>
        </div>
        <div className="bg-surface border border-red-900/30 rounded-lg p-4">
          <div className="text-sm text-red-400 mb-1">Failed</div>
          <div className="text-2xl font-bold text-red-400">{totalFailed}</div>
        </div>
        <div className="bg-surface border border-blue-900/30 rounded-lg p-4">
          <div className="text-sm text-blue-400 mb-1">Running</div>
          <div className="text-2xl font-bold text-blue-400">{totalRunning}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-primary text-white'
              : 'bg-surface border border-slate-700 text-slate-400 hover:border-slate-600'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter('passed')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            statusFilter === 'passed'
              ? 'bg-green-600 text-white'
              : 'bg-surface border border-slate-700 text-slate-400 hover:border-slate-600'
          }`}
        >
          Passed
        </button>
        <button
          onClick={() => setStatusFilter('failed')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            statusFilter === 'failed'
              ? 'bg-red-600 text-white'
              : 'bg-surface border border-slate-700 text-slate-400 hover:border-slate-600'
          }`}
        >
          Failed
        </button>
        <button
          onClick={() => setStatusFilter('running')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            statusFilter === 'running'
              ? 'bg-blue-600 text-white'
              : 'bg-surface border border-slate-700 text-slate-400 hover:border-slate-600'
          }`}
        >
          Running
        </button>
      </div>

      {/* Comparison Matrix */}
      <div className="bg-surface border border-slate-700 rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 bg-slate-800/50 border-b border-slate-700">
          <div className="col-span-4 px-4 py-3 text-sm font-medium text-white">Kernel</div>
          <div className="col-span-2 px-4 py-3 text-sm font-medium text-white text-center">Passed</div>
          <div className="col-span-2 px-4 py-3 text-sm font-medium text-white text-center">Failed</div>
          <div className="col-span-2 px-4 py-3 text-sm font-medium text-white text-center">Running</div>
          <div className="col-span-2 px-4 py-3 text-sm font-medium text-white text-center">Status</div>
        </div>

        {kernelResults.map((kr) => (
          <div
            key={kr.kernelId}
            className="grid grid-cols-12 border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors"
          >
            <div className="col-span-4 px-4 py-3">
              <div className="flex items-center gap-2">
                <Chrome className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-white">{kr.kernelName}</div>
                  <div className="text-xs text-slate-500">{kr.kernelVersion}</div>
                </div>
              </div>
            </div>
            <div className="col-span-2 px-4 py-3 text-center">
              <span className="text-green-400 font-medium">{kr.passed}</span>
            </div>
            <div className="col-span-2 px-4 py-3 text-center">
              <span className="text-red-400 font-medium">{kr.failed}</span>
            </div>
            <div className="col-span-2 px-4 py-3 text-center">
              <span className="text-blue-400 font-medium">{kr.running}</span>
            </div>
            <div className="col-span-2 px-4 py-3 flex items-center justify-center">
              {kr.running > 0 ? (
                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold">RUNNING</span>
              ) : kr.failed > 0 ? (
                <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold">FAILED</span>
              ) : kr.passed > 0 ? (
                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">PASSED</span>
              ) : (
                <span className="bg-slate-500/20 text-slate-400 px-2 py-1 rounded text-xs font-bold">PENDING</span>
              )}
            </div>
          </div>
        ))}

        {kernelResults.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-500">
            No execution results yet. Start a multi-kernel test to see results here.
          </div>
        )}
      </div>

      {/* Execution Details */}
      {selectedKernel && (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-white mb-4">Execution Details</h3>
          <div className="bg-surface border border-slate-700 rounded-lg overflow-hidden">
            {kernelResults
              .find(kr => kr.kernelId === selectedKernel)
              ?.executions.map((execution) => (
                <div
                  key={execution.id}
                  className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(execution.status)}
                    <div>
                      <div className="text-sm text-white">
                        Execution: {execution.id.slice(0, 8)}...
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(execution.started_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(execution.status)}
                    {execution.screenshot_path && (
                      <button className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-400 hover:text-white">
                        <ImageIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Screenshot Comparison */}
      {selectedExecution && (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-white mb-4">Screenshot Comparison</h3>
          <div className="grid grid-cols-2 gap-4">
            {kernelResults.map((kr) => (
              <div key={kr.kernelId} className="bg-surface border border-slate-700 rounded-lg p-4">
                <div className="text-sm font-medium text-white mb-2">{kr.kernelName}</div>
                <div className="aspect-video bg-slate-800 rounded flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-slate-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiKernelResults;
