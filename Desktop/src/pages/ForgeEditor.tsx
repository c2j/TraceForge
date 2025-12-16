import React, { useState } from 'react';
import { 
  Play, Save, Database, LayoutTemplate, 
  ChevronRight, ChevronDown, CheckCircle2, 
  AlertCircle, ExternalLink, Camera,
  Table, Plus, Trash, FileSpreadsheet
} from 'lucide-react';
import { useForgeStore } from '../stores/useForgeStore';
import { useTranslation } from '../hooks/useTranslation';

const ForgeEditor: React.FC = () => {
  const { projectName } = useForgeStore();
  const { t } = useTranslation();
  const [showDataTable, setShowDataTable] = useState(false);

  // Mock data for table
  const [tableData, setTableData] = useState([
    { id: 1, username: 'user_std', password: 'password123', expected: 'Dashboard' },
    { id: 2, username: 'user_locked', password: 'bad_password', expected: 'Error' },
    { id: 3, username: 'admin', password: 'admin_pass', expected: 'AdminPanel' },
  ]);

  return (
    <div className="flex flex-col h-full">
      {/* Editor Toolbar */}
      <div className="h-12 border-b border-slate-700 bg-surface flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">{projectName}</span>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-slate-400">v2.1</span>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-white font-medium">TC001 - Purchase Flow</span>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700">
             <button className="px-3 py-1 text-xs bg-slate-600 text-white rounded shadow-sm">Chrome 86</button>
             <button className="px-3 py-1 text-xs text-slate-400 hover:text-white">Latest</button>
           </div>
           
           <button className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded transition-colors">
              <Play className="w-3 h-3" /> {t('editor.debugRun')}
           </button>
           
           <button 
             onClick={() => setShowDataTable(!showDataTable)}
             className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors border ${showDataTable ? 'bg-accent text-black border-accent' : 'bg-slate-700 hover:bg-slate-600 text-white border-transparent'}`}
           >
              <Database className="w-3 h-3" /> {t('editor.dataTable')}
           </button>
           
           <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-blue-600 text-white text-xs rounded transition-colors">
              <Save className="w-3 h-3" /> {t('editor.save')}
           </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Pane 1: Scenario Tree (30%) */}
        <div className="w-[30%] border-r border-slate-700 bg-slate-900/50 flex flex-col">
          <div className="p-2 border-b border-slate-700 flex justify-between items-center text-xs text-slate-400 bg-surface/50">
            <span>{t('editor.scenarioStructure').toUpperCase()}</span>
            <span className="cursor-pointer hover:text-white">{t('editor.collapseAll')}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {/* Scenario Node */}
            <div className="mb-4">
               <div className="flex items-center gap-1 text-sm font-medium text-slate-200 mb-2">
                 <ChevronDown className="w-4 h-4" /> 
                 Scenario 1: Purchase Flow (P0)
               </div>
               
               <div className="pl-4 border-l border-slate-700 ml-2 space-y-3">
                 {/* Page Node */}
                 <div className="space-y-1">
                   <div className="text-xs text-primary font-mono bg-primary/10 inline-block px-1 rounded">Page 1: /login</div>
                   <div className="pl-2 space-y-1">
                     <div className="flex items-center gap-2 text-xs p-1 hover:bg-slate-800 rounded cursor-pointer">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span className="text-slate-500 w-4">1.</span>
                        <span className="text-purple-400 font-bold uppercase text-[10px]">fill</span>
                        <span className="text-slate-300">username</span>
                     </div>
                     <div className="flex items-center gap-2 text-xs p-1 hover:bg-slate-800 rounded cursor-pointer">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span className="text-slate-500 w-4">2.</span>
                        <span className="text-purple-400 font-bold uppercase text-[10px]">fill</span>
                        <span className="text-slate-300">password</span>
                     </div>
                     <div className={`flex items-center gap-2 text-xs p-1 hover:bg-slate-800 rounded cursor-pointer ${!showDataTable ? 'bg-blue-900/20 border border-blue-500/30' : ''}`}>
                        <AlertCircle className="w-3 h-3 text-red-500" />
                        <span className="text-slate-500 w-4">3.</span>
                        <span className="text-blue-400 font-bold uppercase text-[10px]">click</span>
                        <span className="text-white">"Login"</span>
                     </div>
                   </div>
                 </div>
               </div>
            </div>

            {/* Scenario Outline Node */}
            <div className="mb-4">
               <div className={`flex items-center gap-1 text-sm font-medium mb-2 ${showDataTable ? 'text-accent' : 'text-slate-200'}`}>
                 <ChevronRight className="w-4 h-4" /> 
                 <span className="text-xs border border-accent text-accent px-1 rounded mr-1">OUTLINE</span>
                 Scenario 2: Login Variations
               </div>
               <div className="pl-4 border-l border-slate-700 ml-2 space-y-3 opacity-80">
                  <div className="space-y-1">
                     <div className="text-xs text-slate-500 font-mono">Page 1: /login</div>
                     <div className="pl-2 space-y-1">
                        <div className="flex items-center gap-2 text-xs p-1">
                          <span className="w-3 h-3 rounded-full border border-slate-600"></span>
                          <span className="text-slate-500 w-4">1.</span>
                          <span className="text-purple-400 font-bold uppercase text-[10px]">fill</span>
                          <span className="text-accent font-mono">{'<username>'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs p-1">
                          <span className="w-3 h-3 rounded-full border border-slate-600"></span>
                          <span className="text-slate-500 w-4">2.</span>
                          <span className="text-purple-400 font-bold uppercase text-[10px]">fill</span>
                          <span className="text-accent font-mono">{'<password>'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs p-1">
                          <span className="w-3 h-3 rounded-full border border-slate-600"></span>
                          <span className="text-slate-500 w-4">3.</span>
                          <span className="text-yellow-400 font-bold uppercase text-[10px]">assert</span>
                          <span className="text-slate-300">text contains <span className="text-accent font-mono">{'<expected>'}</span></span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Pane 2: Details or Data Table (40%) */}
        <div className="w-[40%] border-r border-slate-700 bg-background flex flex-col">
           {showDataTable ? (
             // Data Table View
             <div className="flex flex-col h-full animate-in fade-in duration-200">
               <div className="p-4 border-b border-slate-700 bg-surface/50">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <Table className="w-4 h-4 text-accent" />
                        <h2 className="text-sm font-bold text-white uppercase tracking-wide">{t('editor.scenarioOutline')}</h2>
                     </div>
                     <button className="flex items-center gap-1 text-xs text-primary hover:text-white transition-colors">
                        <FileSpreadsheet className="w-3 h-3" /> {t('editor.importCsv')}
                     </button>
                  </div>
                  
                  <div className="mb-2">
                     <label className="text-xs text-slate-500 font-medium mb-1 block">{t('editor.variables')}</label>
                     <div className="flex gap-2">
                        {['username', 'password', 'expected'].map(v => (
                           <span key={v} className="px-2 py-1 bg-accent/10 text-accent border border-accent/20 rounded text-xs font-mono">
                              {`<${v}>`}
                           </span>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="flex-1 overflow-auto bg-slate-900/50 p-4">
                  <div className="flex justify-between items-center mb-2">
                     <h3 className="text-xs text-slate-400 font-medium uppercase">{t('editor.examples')}</h3>
                     <button className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-600">
                        <Plus className="w-3 h-3" /> Row
                     </button>
                  </div>
                  <div className="border border-slate-700 rounded overflow-hidden">
                     <table className="w-full text-left text-xs">
                        <thead className="bg-slate-800 text-slate-400 font-medium">
                           <tr>
                              <th className="p-2 border-r border-slate-700 w-10 text-center">#</th>
                              <th className="p-2 border-r border-slate-700 text-accent">username</th>
                              <th className="p-2 border-r border-slate-700 text-accent">password</th>
                              <th className="p-2 border-r border-slate-700 text-accent">expected</th>
                              <th className="p-2 w-10 text-center"></th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 bg-slate-900">
                           {tableData.map((row, idx) => (
                              <tr key={row.id} className="group hover:bg-slate-800/50">
                                 <td className="p-2 border-r border-slate-700 text-center text-slate-500">{idx + 1}</td>
                                 <td className="p-0 border-r border-slate-700">
                                    <input type="text" defaultValue={row.username} className="w-full bg-transparent p-2 text-slate-200 focus:outline-none focus:bg-slate-800 focus:text-white" />
                                 </td>
                                 <td className="p-0 border-r border-slate-700">
                                    <input type="text" defaultValue={row.password} className="w-full bg-transparent p-2 text-slate-200 focus:outline-none focus:bg-slate-800 focus:text-white" />
                                 </td>
                                 <td className="p-0 border-r border-slate-700">
                                    <input type="text" defaultValue={row.expected} className="w-full bg-transparent p-2 text-slate-200 focus:outline-none focus:bg-slate-800 focus:text-white" />
                                 </td>
                                 <td className="p-2 text-center">
                                    <button className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <Trash className="w-3 h-3" />
                                    </button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500">
                     * Values will replace placeholders during execution.
                  </div>
               </div>
             </div>
           ) : (
             // Step Details View (Existing)
             <>
                <div className="p-4 border-b border-slate-700">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded uppercase">Click Action</span>
                    <span className="text-slate-500 text-xs">ID: step-3</span>
                  </div>
                  
                  {/* Locators Section */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-medium text-slate-300 uppercase tracking-wide">{t('editor.locators')}</label>
                      <button className="text-[10px] text-primary hover:underline">+ {t('editor.addStrategy')}</button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded border border-green-500/30">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-black font-bold">1</div>
                        <code className="flex-1 text-xs text-green-300 font-mono">role=button[name="Login"]</code>
                        <button className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-white hover:bg-slate-600">Test</button>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-slate-800/30 rounded border border-slate-700 opacity-70">
                        <div className="w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center text-[10px] text-white font-bold">2</div>
                        <code className="flex-1 text-xs text-slate-400 font-mono">css=.login-btn</code>
                      </div>
                    </div>
                  </div>

                  {/* Configuration */}
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">{t('editor.waitFor')}</label>
                        <select className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-slate-200">
                            <option>networkidle</option>
                            <option>load</option>
                            <option>domcontentloaded</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">{t('editor.timeout')}</label>
                        <input type="text" value="30000" className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-slate-200" />
                      </div>
                  </div>
                </div>

                {/* Screenshot Preview for Step */}
                <div className="flex-1 p-4 bg-slate-900/30 flex flex-col">
                    <div className="text-xs text-slate-500 mb-2 flex justify-between">
                      <span>{t('editor.stepSnapshot').toUpperCase()}</span>
                      <button className="flex items-center gap-1 hover:text-white">
                        <ExternalLink className="w-3 h-3" /> Jump to Browser
                      </button>
                    </div>
                    <div className="flex-1 border border-slate-700 bg-black rounded overflow-hidden relative group">
                      <img src="https://picsum.photos/400/300" alt="Step Snapshot" className="w-full h-full object-contain opacity-60" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-red-500 w-24 h-8 bg-red-500/20"></div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <button className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs flex items-center gap-2">
                            <Camera className="w-3 h-3" /> View Fullscreen
                          </button>
                      </div>
                    </div>
                </div>
             </>
           )}
        </div>

        {/* Pane 3: Timeline / Execution (30%) */}
        <div className="w-[30%] bg-surface border-l border-slate-700 flex flex-col">
           <div className="p-2 border-b border-slate-700 text-xs font-medium text-slate-400">
              {t('editor.executionPreview').toUpperCase()}
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Timeline Items */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 relative">
                   {i !== 3 && <div className="absolute left-[9px] top-6 bottom-[-16px] w-0.5 bg-slate-700"></div>}
                   <div className="w-5 h-5 rounded-full bg-slate-800 border-2 border-slate-600 flex-shrink-0 z-10"></div>
                   <div className="flex-1 pb-2">
                      <div className="text-xs text-slate-500 mb-1">00:0{i}.450</div>
                      <div className="bg-slate-800 rounded border border-slate-700 p-2">
                         <img src={`https://picsum.photos/150/80?random=${i}`} className="w-full h-16 object-cover rounded mb-2 opacity-70" alt="Frame" />
                         <div className="text-[10px] text-slate-400">Action: Fill finished</div>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ForgeEditor;