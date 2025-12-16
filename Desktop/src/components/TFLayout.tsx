import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  Hammer, LayoutDashboard, Video, FileEdit, 
  ListTodo, Server, Cpu, Settings, Circle, 
  ChevronRight, ChevronLeft, Wifi, WifiOff,
  GitBranch, XCircle, AlertTriangle, Check, Bell, Code2,
  FileText
} from 'lucide-react';
import { useForgeStore } from '../stores/useForgeStore';
import { useTranslation } from '../hooks/useTranslation';

export const TFLayout: React.FC = () => {
  const { isConnected, enginePort, currentUser, toggleConnection } = useForgeStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { t } = useTranslation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/scenarios', icon: FileText, label: t('nav.scenarios') },
    { path: '/recorder', icon: Video, label: t('nav.recorder') },
    { path: '/editor', icon: FileEdit, label: t('nav.editor') },
    { path: '/results', icon: ListTodo, label: t('nav.results') },
    { path: '/nodes', icon: Server, label: t('nav.nodes') },
    { path: '/kernels', icon: Cpu, label: t('nav.kernels') },
    { path: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-slate-200 overflow-hidden font-sans">
      {/* Top Title Bar */}
      <header className="h-10 bg-surface border-b border-slate-700 flex items-center justify-between px-4 text-xs select-none z-50">
        <div className="flex items-center gap-2 text-primary font-bold tracking-wider">
          <Hammer className="w-4 h-4" />
          <span>TRACEFORGE</span>
        </div>
        
        <div className="flex items-center gap-6 text-slate-400">
          <div 
            className={`flex items-center gap-2 cursor-pointer ${isConnected ? 'text-green-500' : 'text-red-500 animate-pulse'}`}
            onClick={toggleConnection}
          >
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{t('status.engine')}: {isConnected ? `${t('status.connected')} (port ${enginePort})` : t('status.disconnected')}</span>
            <Circle className={`w-2 h-2 fill-current ${isConnected ? 'animate-pulse' : ''}`} />
          </div>
          <div className="flex items-center gap-2">
            <span>{t('status.server')}: <span className="text-green-400">{t('status.online')}</span></span>
          </div>
          <div className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
            <span>{t('status.user')}: {currentUser}</span>
            <span className="text-[10px]">▼</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={`bg-surface border-r border-slate-700 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-14' : 'w-56'}`}
          onMouseEnter={() => setSidebarCollapsed(false)}
          onMouseLeave={() => setSidebarCollapsed(true)} // Optional: auto collapse
        >
          <nav className="flex-1 py-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 mx-2 rounded-md transition-colors
                  ${isActive ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'}
                `}
              >
                <item.icon className="w-5 h-5 min-w-[20px]" />
                <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                  {item.label}
                </span>
              </NavLink>
            ))}
          </nav>
          
          <div className={`p-4 border-t border-slate-700 text-xs text-slate-500 flex items-center gap-2 overflow-hidden`}>
             <div className="w-2 h-2 rounded-full bg-blue-500"></div>
             <span className={`${sidebarCollapsed ? 'hidden' : 'block'}`}>{t('status.localMode')}</span>
          </div>
          
          <button 
            className="p-2 self-end text-slate-500 hover:text-white"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
             {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-background relative">
          <Outlet />
        </main>
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-6 bg-slate-900 border-t border-slate-700 flex items-center justify-between px-3 text-[10px] select-none text-slate-500 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 hover:text-slate-300 cursor-pointer bg-blue-900/20 px-2 py-0.5 rounded text-blue-400">
            <GitBranch className="w-3 h-3" />
            <span>main*</span>
          </div>
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="flex items-center gap-1 hover:text-slate-300">
               <XCircle className="w-3 h-3 text-red-500" /> 0
            </div>
            <div className="flex items-center gap-1 hover:text-slate-300">
               <AlertTriangle className="w-3 h-3 text-yellow-500" /> 0
            </div>
          </div>
           <div className="flex items-center gap-1.5 text-slate-500 pl-2 border-l border-slate-700">
              <Check className="w-3 h-3" />
              <span>{t('status.systemReady')}</span>
           </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hover:text-slate-300 cursor-pointer">Ln 1, Col 1</div>
          <div className="hover:text-slate-300 cursor-pointer">UTF-8</div>
          <div className="flex items-center gap-1.5 hover:text-blue-400 cursor-pointer text-slate-400">
             <Code2 className="w-3 h-3" />
             <span>TypeScript</span>
          </div>
          <div className="hover:text-slate-300 cursor-pointer">
             <Bell className="w-3 h-3" />
          </div>
        </div>
      </footer>
    </div>
  );
};