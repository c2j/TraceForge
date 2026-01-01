import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TFLayout } from './components/TFLayout';
import ForgeDashboard from './pages/ForgeDashboard';
import ForgeRecorder from './pages/ForgeRecorder';
import ForgeEditor from './pages/ForgeEditor';
import ForgeResults from './pages/ForgeResults';
import ForgeNodes from './pages/ForgeNodes';
import ForgeKernels from './pages/ForgeKernels';
import ForgeSettings from './pages/ForgeSettings';
import ForgeScenarios from './pages/ForgeScenarios';
import { useDbStore } from './stores/dbStore';
import { useForgeStore } from './stores/useForgeStore';
import { isTauriEnvironment } from './lib/tauri';

const App: React.FC = () => {
  const { loadProjects, loadKernels, initializeDb } = useDbStore();
  const { loadKernels: loadEngineKernels, detectKernels, addKernelFromPath } = useForgeStore();
  const [tauriDetected, setTauriDetected] = useState(false);
  const [initializing, setInitializing] = useState(false);

  // 检测 Tauri 环境
  useEffect(() => {
    isTauriEnvironment().then(detected => {
      setTauriDetected(detected);
      if (detected) {
        console.log('[App] ✅ Running in Tauri environment');
      } else {
        console.log('[App] ❌ Not in Tauri environment (browser mode)');
      }
    });
  }, []);

  // 初始化应用
  useEffect(() => {
    if (!tauriDetected) {
      console.warn('[App] Tauri environment not detected, skipping initialization');
      return;
    }

    if (initializing) return;

    const initApp = async () => {
      try {
        console.log('[App] Initializing application...');
        setInitializing(true);

        await initializeDb();
        await loadProjects();
        await loadKernels();
        await loadEngineKernels();

        try {
          console.log('[App] Auto-detecting Chrome kernels...');
          const detected = await detectKernels();
          console.log(`[App] Found ${detected.length} kernels, checking compatibility...`);

          let addedCount = 0;
          let skippedCount = 0;

          for (const kernel of detected) {
            if (kernel.is_compatible) {
              try {
                const result = await addKernelFromPath(kernel.executable_path);
                if (result) {
                  console.log(`[App] ✅ Added compatible kernel: ${kernel.name} (${kernel.version})`);
                  addedCount++;
                } else {
                  console.log(`[App] ⏭️  Skipped existing kernel: ${kernel.name} (${kernel.version})`);
                  skippedCount++;
                }
              } catch (e) {
                console.error(`[App] ❌ Failed to add kernel:`, e);
              }
            } else {
              console.log(`[App] ⏭️  Skipped incompatible kernel: ${kernel.name} (version: ${kernel.version})`);
              skippedCount++;
            }
          }

          console.log(`[App] Kernel detection summary: ${addedCount} added, ${skippedCount} skipped`);

          await loadKernels();
          await loadEngineKernels();
        } catch (e) {
          console.log('[App] No kernels auto-detected:', e);
        }

        console.log('[App] ✅ Application initialized successfully');
      } catch (e) {
        console.error('[App] ❌ Initialization failed:', e);
      } finally {
        setInitializing(false);
      }
    };

    initApp();
  }, [tauriDetected]);

  if (!tauriDetected) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/" element={<TFLayout />}>
            <Route index element={<div className="p-8 text-center h-screen flex flex-col items-center justify-center bg-background">
              <h1 className="text-3xl font-bold text-white mb-4">TraceForge</h1>
              <div className="p-6 bg-surface border border-slate-700 rounded-lg max-w-lg">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-yellow-400 font-medium">Tauri Environment Not Detected</p>
                </div>
                <p className="text-slate-400 text-sm mb-6">
                  The application is running in browser mode. TraceForge requires Tauri desktop environment to access native features (database, file system, Chrome integration).
                </p>

                <div className="bg-slate-800 p-4 rounded text-left mb-4">
                  <p className="text-slate-300 text-sm font-medium mb-2">📋 Quick Start:</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-primary font-mono text-xs">1.</span>
                      <div>
                        <p className="text-slate-400 text-xs">Stop current server (Ctrl+C)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary font-mono text-xs">2.</span>
                      <div>
                        <p className="text-slate-400 text-xs">Run correct command:</p>
                        <code className="text-primary text-sm font-mono block mt-1">
                          npm run tauri:dev
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 p-4 rounded text-left mb-4">
                  <p className="text-slate-400 text-xs mb-2">❓ What's the difference?</p>
                  <ul className="text-slate-500 text-xs space-y-1 list-disc list-inside">
                    <li><span className="text-slate-400 font-mono">npm run dev</span> - Frontend only (browser)</li>
                    <li><span className="text-slate-400 font-mono">npm run tauri:dev</span> - Full desktop app</li>
                  </ul>
                </div>

                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded text-sm"
                  >
                    Retry Detection
                  </button>
                  <a
                    href="https://tauri.app/v1/guides/getting-started/setup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm inline-flex items-center"
                  >
                    Install Tauri CLI
                  </a>
                </div>
              </div>
            </div>} />
          </Route>
        </Routes>
      </HashRouter>
    );
  }

  if (initializing) {
    return (
      <div className="p-8 text-center h-screen flex flex-col items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-slate-400 mt-4">Initializing TraceForge...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<TFLayout />}>
          <Route index element={<ForgeDashboard />} />
          <Route path="scenarios" element={<ForgeScenarios />} />
          <Route path="recorder" element={<ForgeRecorder />} />
          <Route path="editor" element={<ForgeEditor />} />
          <Route path="results" element={<ForgeResults />} />
          <Route path="nodes" element={<ForgeNodes />} />
          <Route path="kernels" element={<ForgeKernels />} />
          <Route path="settings" element={<ForgeSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
