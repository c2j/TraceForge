import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useSyncStore } from '../stores/useSyncStore';
import { useForgeStore } from '../stores/useForgeStore';
import { Language } from '../locales';
import { dialog } from '../lib/tauri';
import {
  Server,
  Database,
  Globe,
  CheckCircle,
  XCircle,
  RefreshCw,
  FolderOpen,
  Upload,
  Download,
  Shield,
  Bell,
  Sliders,
  Loader2,
} from 'lucide-react';

interface TabProps {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabProps[] = [
  { id: 'network', label: 'Network', icon: <Globe className="w-4 h-4" /> },
  { id: 'sync', label: 'Synchronization', icon: <RefreshCw className="w-4 h-4" /> },
  { id: 'storage', label: 'Storage', icon: <Database className="w-4 h-4" /> },
  { id: 'general', label: 'General', icon: <Sliders className="w-4 h-4" /> },
];

const ForgeSettings: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();

  const [activeTab, setActiveTab] = useState('network');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    serverUrl,
    syncStatus,
    serverConnection,
    autoSync,
    syncInterval,
    syncProgress,
    syncMessage,
    setServerUrl,
    testConnection,
    sync,
    setAutoSync,
    setSyncInterval,
    exportProject,
    importProject,
  } = useSyncStore();

  const { projects, currentProject } = useForgeStore();
  const [localServerUrl, setLocalServerUrl] = useState(serverUrl);
  const [syncIntervalLocal, setSyncIntervalLocal] = useState(syncInterval);

  useEffect(() => {
    setLocalServerUrl(serverUrl || '');
    setSyncIntervalLocal(syncInterval);
  }, [serverUrl, syncInterval]);

  const handleTestConnection = async () => {
    if (!localServerUrl.trim()) {
      setConnectionResult({ success: false, message: 'Please enter a server URL' });
      return;
    }

    setTestingConnection(true);
    setConnectionResult(null);

    try {
      const success = await testConnection(localServerUrl);
      setConnectionResult({
        success,
        message: success ? 'Connection successful!' : 'Connection failed. Please check the URL and try again.',
      });
      if (success) {
        setServerUrl(localServerUrl);
      }
    } catch (error) {
      setConnectionResult({
        success: false,
        message: `Connection error: ${error}`,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleManualSync = async () => {
    await sync();
  };

  const getStatusIndicator = () => {
    switch (syncStatus) {
      case 'IDLE':
        return <span className="text-slate-400">Idle</span>;
      case 'CONNECTING':
        return <span className="text-blue-400">Connecting...</span>;
      case 'SYNCING':
        return <span className="text-blue-400 animate-pulse">Syncing...</span>;
      case 'CONFLICT':
        return <span className="text-yellow-400">Conflicts detected</span>;
      case 'ERROR':
        return <span className="text-red-400">Error</span>;
      case 'OFFLINE':
        return <span className="text-slate-500">Offline</span>;
      default:
        return <span className="text-slate-400">Unknown</span>;
    }
  };

  const renderNetworkTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" /> {t('settings.networkConfig')}
        </h3>
        <div className="bg-surface border border-slate-700 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{t('settings.serverUrl')}</label>
            <input
              type="text"
              value={localServerUrl}
              onChange={(e) => setLocalServerUrl(e.target.value)}
              placeholder="https://traceforge.example.com"
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-slate-500 mt-1">Enter the URL of your TraceForge Team Server</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              {testingConnection ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Testing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> Test Connection
                </>
              )}
            </button>
          </div>

          {connectionResult && (
            <div className={`flex items-center gap-2 p-3 rounded ${
              connectionResult.success
                ? 'bg-green-500/10 text-green-400'
                : 'bg-red-500/10 text-red-400'
            }`}>
              {connectionResult.success ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{connectionResult.message}</span>
            </div>
          )}

          <div className="border-t border-slate-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">Connection Status</span>
              {getStatusIndicator()}
            </div>
            {serverConnection && (
              <div className="space-y-1 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>URL:</span>
                  <span className="text-slate-400">{serverConnection.url}</span>
                </div>
                <div className="flex justify-between">
                  <span>Connected:</span>
                  <span className={serverConnection.connected ? 'text-green-400' : 'text-red-400'}>
                    {serverConnection.connected ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" /> Proxy Configuration
        </h3>
        <div className="bg-surface border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">Proxy settings will be implemented in a future update.</p>
        </div>
      </div>
    </div>
  );

  const renderSyncTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5" /> Synchronization Settings
        </h3>
        <div className="bg-surface border border-slate-700 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">Auto-sync</div>
              <div className="text-xs text-slate-500">Automatically sync changes with the server</div>
            </div>
            <button
              onClick={() => setAutoSync(!autoSync)}
              className={`w-12 h-6 rounded-full transition-colors ${
                autoSync ? 'bg-primary' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  autoSync ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Sync Interval (minutes)
            </label>
            <input
              type="number"
              value={syncIntervalLocal}
              onChange={(e) => setSyncIntervalLocal(parseInt(e.target.value) || 15)}
              onBlur={() => setSyncInterval(syncIntervalLocal)}
              min={1}
              max={1440}
              className="w-32 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-slate-500 mt-1">How often to check for updates (1-1440 minutes)</p>
          </div>

          {syncStatus === 'SYNCING' && (
            <div className="border-t border-slate-700 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white">Syncing...</span>
                <span className="text-sm text-slate-400">{syncProgress}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
              {syncMessage && (
                <p className="text-xs text-slate-500 mt-2">{syncMessage}</p>
              )}
            </div>
          )}

          <button
            onClick={handleManualSync}
            disabled={syncStatus === 'SYNCING'}
            className="w-full bg-primary hover:bg-blue-600 disabled:bg-slate-700 text-white py-2 rounded flex items-center justify-center gap-2"
          >
            {syncStatus === 'SYNCING' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" /> Sync Now
              </>
            )}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FolderOpen className="w-5 h-5" /> Import / Export
        </h3>
        <div className="bg-surface border border-slate-700 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Export Project</label>
            <div className="flex gap-2">
               <select
                 className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
                 value={currentProject?.id || ''}
               >
                 <option value="">Select project...</option>
                 {(projects || []).map((p) => (
                   <option key={p.id} value={p.id}>
                     {p.name} ({p.version})
                   </option>
                 ))}
              </select>
              <button
                onClick={() => currentProject && exportProject(currentProject.id, 'json')}
                disabled={!currentProject}
                className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <button
              onClick={async () => {
                const path = await dialog.open({
                  multiple: false,
                  filters: [
                    { name: 'TraceForge Project', extensions: ['json', 'yaml'] },
                    { name: 'All Files', extensions: ['*'] },
                  ],
                });
                if (path) importProject(path);
              }}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" /> Import Project File
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStorageTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" /> {t('settings.storageData')}
        </h3>
        <div className="bg-surface border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-medium text-white">{t('settings.localDatabase')}</div>
              <div className="text-xs text-slate-500">
                ~/.local/share/traceforge/traceforge.db
              </div>
            </div>
            <button className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm">
              Open Folder
            </button>
          </div>

          <div className="border-t border-slate-700 pt-4 space-y-3">
            <button className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm text-left px-4">
              Clear Old Executions (30+ days)
            </button>
            <button className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm text-left px-4">
              Clear Trace Files
            </button>
            <button className="w-full bg-slate-700 hover:bg-red-600 text-white py-2 rounded text-sm text-left px-4 text-red-400 hover:text-white">
              Reset Database
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sliders className="w-5 h-5" /> Cache & Storage
        </h3>
        <div className="bg-surface border border-slate-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white">Clear screenshot cache</span>
            <button className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded">
              Clear
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white">Clear log files</span>
            <button className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded">
              Clear
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white">Clear all caches</span>
            <button className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded">
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sliders className="w-5 h-5" /> {t('settings.defaults')}
        </h3>
        <div className="bg-surface border border-slate-700 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('settings.defaultRecordingKernel')}</label>
              <select className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-primary">
                <option>Chrome 86.0.4240.198</option>
                <option>Chrome Latest</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('settings.theme')}</label>
              <select className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-primary">
                <option>Dark</option>
                <option>Light</option>
                <option>System</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('settings.language')}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
              >
                <option value="en">English</option>
                <option value="zh">简体中文</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" /> {t('settings.title')} - Notifications
        </h3>
        <div className="bg-surface border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">Notification settings will be implemented in a future update.</p>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'network':
        return renderNetworkTab();
      case 'sync':
        return renderSyncTab();
      case 'storage':
        return renderStorageTab();
      case 'general':
        return renderGeneralTab();
      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">{t('settings.title')}</h1>
        <p className="text-slate-400">Configure application preferences and server connections.</p>
      </div>

      <div className="flex gap-6">
        <div className="w-56 flex-shrink-0">
          <div className="bg-surface border border-slate-700 rounded-lg overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {tab.icon}
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">{renderTabContent()}</div>
      </div>
    </div>
  );
};

export default ForgeSettings;
