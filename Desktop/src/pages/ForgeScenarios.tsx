import React, { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Search, Plus, Play, Edit, MoreVertical, FileText, Filter, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForgeStore } from '../stores/useForgeStore';

const ForgeScenarios: React.FC = () => {
  const { t } = useTranslation();
  const { scenarios, scripts, loadScenarios, loadScripts, createScenario } = useForgeStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newScenario, setNewScenario] = useState({ name: '', priority: 'P0', scriptId: '', description: '' });

  useEffect(() => {
    loadScripts();
    loadScenarios();
  }, [loadScripts, loadScenarios]);

  const getScriptName = (scriptId: string): string => {
    const script = scripts.find(s => s.id === scriptId);
    return script?.name || 'Unknown Script';
  };

  const getLastRun = (_scenarioId: string): string => {
    return 'Never';
  };

  const getScenarioStatus = (_scenarioId: string): 'PASS' | 'FAIL' | 'IDLE' => {
    return 'IDLE';
  };

  const handleCreateScenario = async () => {
    if (!newScenario.name.trim()) {
      alert('Please enter a scenario name');
      return;
    }
    if (!newScenario.scriptId) {
      alert('Please select a script first');
      return;
    }
    try {
      await createScenario(newScenario.scriptId, newScenario.name, newScenario.priority, 0, newScenario.description);
      setShowCreateModal(false);
      setNewScenario({ name: '', priority: 'P0', scriptId: '', description: '' });
      await loadScenarios();
    } catch (error) {
      alert(`Failed to create scenario: ${error}`);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold text-white mb-1">{t('scenarios.title')}</h1>
           <p className="text-slate-400 text-sm">Manage, edit and execute your test suites.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded text-sm shadow-lg shadow-blue-900/50"
        >
          <Plus className="w-4 h-4" /> {t('scenarios.create')}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4 bg-surface p-3 rounded-lg border border-slate-700">
         <div className="flex items-center gap-3 w-full max-w-md">
             <div className="relative flex-1">
                 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                 <input
                   type="text"
                   placeholder={t('scenarios.search')}
                   className="w-full bg-slate-800 border border-slate-600 rounded pl-9 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
                 />
             </div>
             <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-slate-300 hover:text-white text-sm">
                <Filter className="w-4 h-4" /> Filter
             </button>
         </div>
      </div>

      {/* List */}
      <div className="bg-surface border border-slate-700 rounded-lg overflow-hidden flex-1 shadow-lg">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-xs uppercase font-medium text-slate-500 border-b border-slate-700">
            <tr>
              <th className="px-6 py-4 font-semibold">{t('scenarios.columns.name')}</th>
              <th className="px-6 py-4 font-semibold">{t('scenarios.columns.project')}</th>
              <th className="px-6 py-4 font-semibold">{t('scenarios.columns.tags')}</th>
              <th className="px-6 py-4 font-semibold">{t('scenarios.columns.lastRun')}</th>
              <th className="px-6 py-4 font-semibold">{t('scenarios.columns.status')}</th>
              <th className="px-6 py-4 font-semibold text-right">{t('scenarios.columns.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {(scenarios || []).map((scenario) => (
              <tr key={scenario.id} className="hover:bg-slate-700/30 transition-colors group">
                <td className="px-6 py-4">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-900/20 rounded text-blue-400">
                         <FileText className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-200 group-hover:text-primary transition-colors cursor-pointer">{scenario.name}</span>
                   </div>
                </td>
                <td className="px-6 py-4 text-slate-400">{getScriptName(scenario.script_id)}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-1 flex-wrap">
                    <span key={scenario.priority} className="px-2 py-0.5 rounded-full bg-slate-700 text-[10px] text-slate-300 border border-slate-600">
                      {scenario.priority}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400 text-xs font-mono">{getLastRun(scenario.id)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold border inline-block min-w-[50px] text-center ${
                      getScenarioStatus(scenario.id) === 'PASS' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
                      getScenarioStatus(scenario.id) === 'FAIL' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                      'border-slate-500/30 bg-slate-500/10 text-slate-400'
                  }`}>
                    {getScenarioStatus(scenario.id)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Link to="/results" className="p-2 hover:bg-green-500/20 text-slate-400 hover:text-green-400 rounded transition-colors" title={t('scenarios.actions.run')}>
                         <Play className="w-4 h-4" />
                      </Link>
                      <Link to="/editor" className="p-2 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 rounded transition-colors" title={t('scenarios.actions.edit')}>
                         <Edit className="w-4 h-4" />
                      </Link>
                      <button className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors">
                         <MoreVertical className="w-4 h-4" />
                      </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Scenario Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-surface border border-slate-700 rounded-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">{t('scenarios.create')}</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Script *</label>
                <select
                  value={newScenario.scriptId}
                  onChange={(e) => setNewScenario({ ...newScenario, scriptId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- Select a script --</option>
                  {(scripts || []).map(script => (
                    <option key={script.id} value={script.id}>{script.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Scenario Name *</label>
                <input
                  type="text"
                  value={newScenario.name}
                  onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
                  placeholder="Enter scenario name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                <select
                  value={newScenario.priority}
                  onChange={(e) => setNewScenario({ ...newScenario, priority: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
                >
                  <option value="P0">P0 - Critical</option>
                  <option value="P1">P1 - High</option>
                  <option value="P2">P2 - Medium</option>
                  <option value="P3">P3 - Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={newScenario.description}
                  onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-primary resize-none"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateScenario}
                className="px-4 py-2 rounded text-sm bg-primary hover:bg-blue-600 text-white transition-colors"
              >
                Create Scenario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgeScenarios;
