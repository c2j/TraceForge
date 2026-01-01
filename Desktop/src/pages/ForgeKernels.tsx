import React, { useState, useEffect } from 'react';
import { useForgeStore } from '../stores/useForgeStore';
import { Chrome, Search, Plus, Trash2, CheckCircle, Play, AlertCircle, FolderOpen, Loader2 } from 'lucide-react';
import { dialog } from '../lib/tauri';

const ForgeKernels: React.FC = () => {
  const { kernels, loadKernels, detectKernels, addKernelFromPath, testKernelCompatibility, deleteKernel, setDefaultKernel } = useForgeStore();
  const [detecting, setDetecting] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Map<string, { passed: boolean; message: string }>>(new Map());

  useEffect(() => {
    loadKernels();
  }, [loadKernels]);

  const handleAutoDetect = async () => {
    setDetecting(true);
    console.log('[ForgeKernels] Starting kernel detection...');
    try {
      const detected = await detectKernels();
      console.log('[ForgeKernels] Detected kernels:', detected);
      if (!Array.isArray(detected)) {
        console.warn('[ForgeKernels] detectKernels did not return an array:', detected);
        setDetecting(false);
        return;
      }
      for (const kernel of detected) {
        console.log('[ForgeKernels] Processing kernel:', kernel.name, kernel.executable_path, kernel.is_compatible);
        if (kernel.is_compatible) {
          try {
            await addKernelFromPath(kernel.executable_path);
            console.log('[ForgeKernels] Added kernel:', kernel.name);
          } catch (e) {
            console.warn('Failed to add detected kernel:', e);
          }
        }
      }
    } catch (error) {
      console.error('Failed to detect kernels:', error);
    } finally {
      setDetecting(false);
    }
  };

  const handleManualAdd = async () => {
    console.log('[ForgeKernels] Opening file picker...');
    try {
      const result = await dialog.open({
        filters: [{ name: 'Executable', extensions: ['app', 'exe', ''] }],
        multiple: false,
      });
      console.log('[ForgeKernels] File picker result:', result);
      if (result && typeof result === 'string') {
        await addKernelFromPath(result);
      }
    } catch (e) {
      console.error('File picker error:', e);
      alert('Failed to select file: ' + String(e));
    }
  };

  const handleTestKernel = async (kernelId: string, executablePath: string) => {
    setTesting(kernelId);
    try {
      const result = await testKernelCompatibility(kernelId, executablePath);
      setTestResults(prev => new Map(prev).set(kernelId, result));
    } catch (error) {
      console.error('Failed to test kernel:', error);
    } finally {
      setTesting(null);
    }
  };

  const handleDeleteKernel = async (kernelId: string) => {
    if (!confirm('Are you sure you want to delete this kernel?')) return;

    setDeleting(kernelId);
    try {
      await deleteKernel(kernelId);
      setTestResults(prev => {
        const next = new Map(prev);
        next.delete(kernelId);
        return next;
      });
    } catch (error) {
      console.error('Failed to delete kernel:', error);
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (kernelId: string) => {
    try {
      await setDefaultKernel(kernelId);
    } catch (error) {
      console.error('Failed to set default kernel:', error);
    }
  };

  const getStatusBadge = (kernel: any) => {
    const testResult = testResults.get(kernel.id);
    if (testResult) {
      return testResult.passed ? (
        <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold uppercase">Compatible</span>
      ) : (
        <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold uppercase">Incompatible</span>
      );
    }
    return kernel.is_compatible ? (
      <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold uppercase">Latest</span>
    ) : (
      <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-bold uppercase">Unknown</span>
    );
  };

  const isCompatibleKernel = (kernel: any) => {
    const testResult = testResults.get(kernel.id);
    if (testResult) return testResult.passed;
    return kernel.is_compatible;
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Kernel Manager</h1>
          <p className="text-slate-400">Manage browser versions for legacy system compatibility testing.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAutoDetect}
            disabled={detecting}
            className="bg-primary hover:bg-blue-600 disabled:bg-slate-600 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            {detecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Scanning...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" /> Auto-detect
              </>
            )}
          </button>
          <button
            onClick={handleManualAdd}
            className="bg-surface border border-slate-600 hover:border-slate-500 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Manually
          </button>
        </div>
      </div>

      {kernels.length === 0 ? (
        <div className="text-center py-16">
          <Chrome className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No kernels configured</h3>
          <p className="text-slate-500 mb-6">Auto-detect Chrome installations or add manually</p>
          <button
            onClick={handleAutoDetect}
            className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Auto-detect Kernels
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kernels.map((kernel) => {
            const isTesting = testing === kernel.id;
            const isDeleting = deleting === kernel.id;
            const testResult = testResults.get(kernel.id);

            return (
              <div
                key={kernel.id}
                className={`bg-surface border rounded-lg p-6 relative group hover:border-slate-500 transition-colors ${
                  isCompatibleKernel(kernel) ? 'border-slate-700' : 'border-red-900/50'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-lg ${isCompatibleKernel(kernel) ? 'bg-slate-800' : 'bg-red-900/20'}`}>
                    <Chrome className={`w-8 h-8 ${isCompatibleKernel(kernel) ? 'text-slate-200' : 'text-red-400'}`} />
                  </div>
                  {getStatusBadge(kernel)}
                </div>

                <h3 className="text-lg font-bold text-white mb-1">{kernel.name} {kernel.version}</h3>
                <p className="text-sm text-slate-500 font-mono mb-2 break-all truncate" title={kernel.executable_path}>
                  {kernel.executable_path}
                </p>
                <div className="flex gap-2 mb-4">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    kernel.is_default_agent ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {kernel.is_default_agent ? 'Default Agent' : 'Agent'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    kernel.is_default_record ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {kernel.is_default_record ? 'Default Record' : 'Record'}
                  </span>
                </div>

                {testResult && (
                  <div className={`mb-4 p-2 rounded text-xs ${
                    testResult.passed ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {testResult.message}
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-slate-700/50">
                  <button
                    onClick={() => handleTestKernel(kernel.id, kernel.executable_path)}
                    disabled={isTesting || isDeleting}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white py-1.5 rounded text-sm font-medium flex items-center justify-center gap-1"
                  >
                    {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Test
                  </button>
                  {!kernel.is_default_agent && (
                    <button
                      onClick={() => handleSetDefault(kernel.id)}
                      disabled={isDeleting}
                      className="p-2 text-slate-500 hover:text-green-400 hover:bg-slate-700 disabled:text-slate-600 rounded transition-colors"
                      title="Set as Default Agent"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteKernel(kernel.id)}
                    disabled={isDeleting || isTesting}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 disabled:text-slate-600 rounded transition-colors"
                    title="Delete Kernel"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add New Placeholder */}
          <div
            onClick={handleManualAdd}
            className="border-2 border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 cursor-pointer transition-all min-h-[220px]"
          >
            <FolderOpen className="w-10 h-10 mb-2" />
            <span className="font-medium">Browse for Chrome</span>
            <span className="text-xs mt-1">Select chrome.exe executable</span>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-slate-300">
            <p className="font-medium text-white mb-1">Kernel Compatibility Requirements</p>
            <p>TraceForge requires Chrome version 86.0.4240.198 or higher for compatibility with the Chrome DevTools Protocol. Incompatible kernels will not be available for script execution.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgeKernels;
