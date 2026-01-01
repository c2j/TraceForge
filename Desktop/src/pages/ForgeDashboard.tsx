import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Plus, Video, ChevronDown, FileText, X } from 'lucide-react';
import { useForgeStore } from '../stores/useForgeStore';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

interface ChartData {
  name: string;
  pass: number;
  fail: number;
  skip: number;
}

const KPICard: React.FC<{ title: string; value: string; sub?: string; color?: string }> = ({ title, value, sub, color }) => (
  <div className="bg-surface p-6 rounded-lg border border-slate-700 shadow-lg hover:border-slate-600 transition-colors">
    <h3 className="text-slate-400 text-sm font-medium mb-2 uppercase tracking-wide">{title}</h3>
    <div className="flex items-baseline gap-2">
      <span className={`text-3xl font-bold ${color || 'text-white'}`}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  </div>
);

const QuickAction: React.FC<{ icon: React.ElementType; title: string; sub: string; to: string }> = ({ icon: Icon, title, sub, to }) => (
  <Link to={to} className="group bg-surface/50 border border-slate-700 p-6 rounded-lg hover:bg-surface hover:border-primary/50 transition-all cursor-pointer flex flex-col items-center text-center gap-3">
    <div className="p-3 bg-slate-800 rounded-full group-hover:bg-primary/20 group-hover:text-primary transition-colors text-slate-400">
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <h4 className="font-semibold text-slate-200 group-hover:text-white">{title}</h4>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  </Link>
);

const ForgeDashboard: React.FC = () => {
  const { getProjectName, getProjectVersion, executions, scripts, loadExecutions, loadScripts, createProject, setCurrentProject } = useForgeStore();
  const projectName = getProjectName();
  const projectVersion = getProjectVersion();
  const { t } = useTranslation();
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', version: '1.0.0', description: '' });

  useEffect(() => {
    loadScripts();
    loadExecutions();
  }, [loadScripts, loadExecutions]);

  const kpiData = useMemo(() => {
    const totalScripts = scripts?.length || 0;
    const totalExecutions = executions?.length || 0;
    const passedExecutions = executions?.filter(e => e.status === 'COMPLETED' && !e.error_message).length || 0;
    const failedExecutions = executions?.filter(e => e.status === 'FAILED').length || 0;

    const passRate = totalExecutions > 0
      ? Math.round((passedExecutions / totalExecutions) * 100)
      : 0;

    return {
      passRate: `${passRate}%`,
      passRateChange: totalExecutions > 0 ? '+0%' : '-',
      failures: failedExecutions.toString(),
      coverage: '0%',
      scripts: totalScripts.toString(),
    };
  }, [executions, scripts]);

  const chartData = useMemo((): ChartData[] => {
    const last7Days = [];
    const now = new Date();
    const executionsList = executions || [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      const dayExecutions = executionsList.filter(e => {
        const execDate = new Date(e.started_at);
        return execDate.toDateString() === date.toDateString();
      });

      const pass = dayExecutions.filter(e => e.status === 'COMPLETED' && !e.error_message).length;
      const fail = dayExecutions.filter(e => e.status === 'FAILED').length;
      const skip = dayExecutions.filter(e => e.status === 'CANCELLED').length;

      last7Days.push({
        name: dayName,
        pass,
        fail,
        skip,
      });
    }

    return last7Days;
  }, [executions]);

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      alert('Please enter a project name');
      return;
    }
    try {
      const projectId = await createProject(newProject.name, newProject.version, newProject.description || undefined);
      const now = new Date().toISOString();
      const project = {
        id: projectId,
        name: newProject.name,
        version: newProject.version,
        description: newProject.description,
        created_at: now,
        updated_at: now,
        sync_enabled: false,
        last_sync_at: null
      };
      setCurrentProject(project);
      setShowNewProjectModal(false);
      setNewProject({ name: '', version: '1.0.0', description: '' });
    } catch (error) {
      alert(`Failed to create project: ${error}`);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto flex flex-col gap-6">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-4">
          <button className="flex items-center gap-2 bg-surface border border-slate-600 px-4 py-2 rounded text-sm hover:bg-slate-700">
            <span className="text-slate-400">{t('dashboard.project')}:</span>
            <span className="font-semibold text-white">{projectName}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          <button className="flex items-center gap-2 bg-surface border border-slate-600 px-4 py-2 rounded text-sm hover:bg-slate-700">
            <span className="text-slate-400">{t('dashboard.version')}:</span>
            <span className="font-semibold text-white">{projectVersion}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="flex items-center gap-2 bg-surface border border-slate-600 px-4 py-2 rounded text-sm hover:bg-slate-700 text-white"
          >
            <Plus className="w-4 h-4" /> {t('dashboard.newProject')}
          </button>
          <Link to="/recorder" className="flex items-center gap-2 bg-primary px-4 py-2 rounded text-sm hover:bg-blue-600 text-white shadow-lg shadow-blue-900/50">
            <Video className="w-4 h-4" /> {t('dashboard.quickRecord')}
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title={t('dashboard.passRate')} value={kpiData.passRate} sub={kpiData.passRateChange} color="text-green-400" />
        <KPICard title={t('dashboard.failures')} value={kpiData.failures} color="text-red-400" />
        <KPICard title={t('dashboard.coverage')} value={kpiData.coverage} color="text-blue-400" />
        <KPICard title={t('dashboard.scripts')} value={kpiData.scripts} />
      </div>

      {/* Charts Area */}
      <div className="flex-1 min-h-[300px] bg-surface rounded-lg border border-slate-700 p-4">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-slate-300 font-medium">{t('dashboard.executionTrend')}</h3>
           <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Pass</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Fail</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-500"></div> Skip</span>
           </div>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPass" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                itemStyle={{ fontSize: 12 }}
              />
              <Area type="monotone" dataKey="pass" stroke="#22c55e" fillOpacity={1} fill="url(#colorPass)" strokeWidth={2} />
              <Area type="monotone" dataKey="fail" stroke="#ef4444" fillOpacity={1} fill="url(#colorFail)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Entry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickAction icon={Video} title={t('dashboard.startRecording')} sub={t('dashboard.startRecordingSub')} to="/recorder" />
        <QuickAction icon={FileText} title={t('nav.scenarios')} sub={t('dashboard.manageScenarios')} to="/scenarios" />
        <QuickAction icon={Plus} title={t('dashboard.newScript')} sub={t('dashboard.newScriptSub')} to="/editor" />
        <QuickAction icon={Play} title={t('dashboard.runAllLocal')} sub={t('dashboard.runAllLocalSub')} to="/results" />
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowNewProjectModal(false)}>
          <div className="bg-surface border border-slate-700 rounded-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">{t('dashboard.newProject')}</h2>
              <button onClick={() => setShowNewProjectModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Project Name *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Version</label>
                <input
                  type="text"
                  value={newProject.version}
                  onChange={(e) => setNewProject({ ...newProject, version: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
                  placeholder="1.0.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-primary resize-none"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="px-4 py-2 rounded text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="px-4 py-2 rounded text-sm bg-primary hover:bg-blue-600 text-white transition-colors"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgeDashboard;
