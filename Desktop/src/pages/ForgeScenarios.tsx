import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Search, Plus, Play, Edit, MoreVertical, FileText, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

const mockScenarios = [
  { id: '1', name: 'Purchase Flow - Guest', project: 'E-Commerce v2.1', tags: ['Smoke', 'P0'], lastRun: '10 mins ago', status: 'PASS' },
  { id: '2', name: 'Purchase Flow - Registered', project: 'E-Commerce v2.1', tags: ['Regression', 'P1'], lastRun: '2 hours ago', status: 'PASS' },
  { id: '3', name: 'Login - Invalid Credentials', project: 'E-Commerce v2.1', tags: ['Negative'], lastRun: '1 day ago', status: 'FAIL' },
  { id: '4', name: 'Admin Dashboard Access', project: 'E-Commerce v2.1', tags: ['Security'], lastRun: 'Never', status: 'IDLE' },
  { id: '5', name: 'Product Search', project: 'E-Commerce v2.0', tags: ['Search', 'Performance'], lastRun: '3 days ago', status: 'PASS' },
];

const ForgeScenarios: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold text-white mb-1">{t('scenarios.title')}</h1>
           <p className="text-slate-400 text-sm">Manage, edit and execute your test suites.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded text-sm shadow-lg shadow-blue-900/50">
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
            {mockScenarios.map((scenario) => (
              <tr key={scenario.id} className="hover:bg-slate-700/30 transition-colors group">
                <td className="px-6 py-4">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-900/20 rounded text-blue-400">
                         <FileText className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-200 group-hover:text-primary transition-colors cursor-pointer">{scenario.name}</span>
                   </div>
                </td>
                <td className="px-6 py-4 text-slate-400">{scenario.project}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-1 flex-wrap">
                    {scenario.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-700 text-[10px] text-slate-300 border border-slate-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400 text-xs font-mono">{scenario.lastRun}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold border inline-block min-w-[50px] text-center ${
                      scenario.status === 'PASS' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
                      scenario.status === 'FAIL' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                      'border-slate-500/30 bg-slate-500/10 text-slate-400'
                  }`}>
                    {scenario.status}
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
    </div>
  );
};

export default ForgeScenarios;