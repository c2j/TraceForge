import React, { useState } from 'react';
import { 
  Pause, Square, Plus, Target, Camera, Save, X, 
  MousePointer, ChevronDown, Clock, MoveRight,
  MonitorPlay, Trash2, Edit2, AlertCircle
} from 'lucide-react';

const ForgeRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(true);

  // Mock Data
  const logs = [
    { time: '14:30:01', level: 'INFO', msg: 'Started recording session' },
    { time: '14:30:02', level: 'INFO', msg: 'Detected navigation to /login' },
    { time: '14:30:04', level: 'INFO', msg: 'Click action recorded on button[name="Login"]' },
    { time: '14:30:05', level: 'DEBUG', msg: 'Auto-injected wait_for networkidle' },
    { time: '14:30:05', level: 'INFO', msg: 'Detected navigation to /dashboard' },
  ];

  const scenarios = [
    {
      id: 's1', name: 'Scenario 1: Purchase Flow', pages: [
        { 
          id: 'p1', name: 'Page 1: /login', active: false, steps: [
            { id: '1', type: 'fill', desc: 'fill username "user@example.com"', target: '#username' },
            { id: '2', type: 'fill', desc: 'fill password "********"', target: '#password' },
            { id: '3', type: 'click', desc: 'click "Login"', target: 'button.login' },
          ]
        },
        {
          id: 'p2', name: 'Page 2: /search', active: true, steps: [
            { id: '4', type: 'fill', desc: 'fill "#kw" with "Laptop"', target: '#kw' },
            { id: '5', type: 'press', desc: 'press Enter', target: '' },
            { id: '6', type: 'wait', desc: 'wait_for networkidle', target: '' },
            { id: '7', type: 'hover', desc: 'hover ".item-card-1"', target: '.item-card-1' },
          ]
        }
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Control Bar */}
      <div className="h-14 bg-surface border-b border-slate-700 flex items-center justify-between px-4 shadow-md z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-red-900/30 border border-red-500/50 rounded-full">
            <div className={`w-2 h-2 rounded-full bg-red-500 ${isRecording ? 'animate-pulse' : ''}`}></div>
            <span className="text-red-400 font-mono text-sm">02:15</span>
          </div>
          
          <div className="flex gap-1">
            <button className="p-2 hover:bg-slate-700 rounded text-slate-300" title="Pause">
              <Pause className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-slate-700 rounded text-red-400" title="Stop">
              <Square className="w-5 h-5 fill-current" />
            </button>
          </div>

          <div className="h-6 w-px bg-slate-700 mx-2"></div>

          <div className="flex gap-2">
            <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-200">
               <Plus className="w-4 h-4" /> Scenario
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-200">
               <Target className="w-4 h-4" /> Assert
            </button>
             <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-200">
               <Camera className="w-4 h-4" /> Screenshot
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>Kernel:</span>
            <span className="flex items-center text-white cursor-pointer hover:bg-slate-700 px-2 py-1 rounded">
              Chrome 86 <ChevronDown className="w-3 h-3 ml-1" />
            </span>
          </div>
          <button className="px-4 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded">Cancel</button>
          <button className="px-4 py-1.5 text-sm bg-primary hover:bg-blue-600 text-white rounded font-medium flex items-center gap-2">
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Scenario Tree */}
        <div className="w-[40%] bg-surface/50 border-r border-slate-700 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {scenarios.map(sc => (
              <div key={sc.id} className="border border-slate-700 rounded bg-slate-800/50 overflow-hidden">
                <div className="p-2 bg-slate-800 border-b border-slate-700 font-medium text-sm flex items-center gap-2">
                  <span className="text-primary">SCENARIO</span>
                  {sc.name}
                </div>
                <div className="p-2 space-y-3">
                  {sc.pages.map(page => (
                    <div key={page.id} className={`rounded border ${page.active ? 'border-primary/50 bg-primary/5' : 'border-slate-700 bg-slate-900/50'}`}>
                      <div className="px-3 py-2 border-b border-dashed border-slate-700/50 text-xs font-mono text-slate-400 flex justify-between items-center">
                        <span>{page.name}</span>
                        {page.active && <span className="text-primary text-[10px] px-1 border border-primary/30 rounded">ACTIVE</span>}
                      </div>
                      <div className="p-2 space-y-1">
                        {page.steps.map(step => (
                          <div key={step.id} className="group flex items-center gap-2 text-xs text-slate-300 p-1.5 hover:bg-slate-700/50 rounded cursor-pointer">
                            <span className="text-slate-500 w-4">{step.id}.</span>
                            <span className={`px-1 rounded text-[10px] font-bold uppercase w-12 text-center 
                              ${step.type === 'click' ? 'bg-blue-900/50 text-blue-400' : 
                                step.type === 'wait' ? 'bg-purple-900/50 text-purple-400' :
                                step.type === 'assert' ? 'bg-yellow-900/50 text-yellow-400' :
                                'bg-slate-700 text-slate-400'}`}>
                              {step.type}
                            </span>
                            <span className="truncate flex-1">{step.desc}</span>
                            <div className="hidden group-hover:flex gap-1">
                              <Trash2 className="w-3 h-3 text-slate-500 hover:text-red-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Action Toolbar */}
          <div className="p-2 border-t border-slate-700 bg-surface grid grid-cols-4 gap-1">
            <button className="flex flex-col items-center justify-center py-2 hover:bg-slate-700 rounded text-xs text-slate-400">
              <Plus className="w-4 h-4 mb-1" /> Add Page
            </button>
            <button className="flex flex-col items-center justify-center py-2 hover:bg-slate-700 rounded text-xs text-slate-400">
              <MoveRight className="w-4 h-4 mb-1" /> Navigate
            </button>
            <button className="flex flex-col items-center justify-center py-2 hover:bg-slate-700 rounded text-xs text-slate-400">
              <Clock className="w-4 h-4 mb-1" /> Wait
            </button>
            <button className="flex flex-col items-center justify-center py-2 hover:bg-slate-700 rounded text-xs text-slate-400">
              <MousePointer className="w-4 h-4 mb-1" /> Manual
            </button>
          </div>
        </div>

        {/* Right: Preview Area */}
        <div className="flex-1 flex flex-col bg-black relative">
          {/* Browser Mockup Header */}
          <div className="bg-slate-800 p-2 flex items-center gap-2 border-b border-slate-700">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
            </div>
            <div className="flex-1 bg-slate-900 rounded px-3 py-1 text-xs text-slate-400 font-mono truncate">
              http://localhost:3000/search
            </div>
          </div>
          
          {/* Main Preview */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-neutral-900">
             <img src="https://picsum.photos/800/600" alt="Preview" className="max-w-full max-h-full opacity-80" />
             {/* Mock Highlight Box */}
             <div className="absolute top-1/2 left-1/3 w-32 h-10 border-2 border-red-500 bg-red-500/10 flex items-center justify-center">
                <span className="bg-red-500 text-white text-[10px] absolute -top-4 left-0 px-1">.item-card-1</span>
             </div>
             
             {/* Timeline Scrubber Mock */}
             <div className="absolute bottom-4 left-4 right-4 h-12 bg-slate-900/90 rounded border border-slate-700 flex items-center px-4 gap-4 backdrop-blur-sm">
                <MonitorPlay className="w-4 h-4 text-slate-400" />
                <div className="flex-1 h-1 bg-slate-700 rounded relative">
                   <div className="absolute left-0 top-0 bottom-0 w-[70%] bg-primary rounded"></div>
                   <div className="absolute left-[70%] top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow cursor-pointer hover:scale-110 transition-transform"></div>
                </div>
                <span className="text-xs text-slate-400 font-mono">00:15</span>
             </div>
          </div>
        </div>
      </div>

      {/* Bottom Log */}
      <div className="h-32 bg-slate-950 border-t border-slate-700 flex flex-col font-mono text-xs">
         <div className="bg-surface px-2 py-1 text-slate-500 border-b border-slate-800 flex justify-between">
           <span>Event Log</span>
           <span className="hover:text-white cursor-pointer"><X className="w-3 h-3" /></span>
         </div>
         <div className="flex-1 overflow-y-auto p-2 space-y-1">
           {logs.map((log, i) => (
             <div key={i} className="flex gap-2 hover:bg-white/5 px-1">
               <span className="text-slate-500">[{log.time}]</span>
               <span className={`${log.level === 'INFO' ? 'text-blue-400' : 'text-yellow-400'}`}>{log.level}</span>
               <span className="text-slate-300">{log.msg}</span>
             </div>
           ))}
           <div className="flex gap-2 px-1 animate-pulse">
             <span className="text-slate-500">[14:30:06]</span>
             <span className="text-slate-500">...</span>
           </div>
         </div>
      </div>
    </div>
  );
};

export default ForgeRecorder;