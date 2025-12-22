import React, { useState } from 'react';
import {
  Play, Save, Database,
  ChevronRight, ChevronDown, CheckCircle2,
  AlertCircle, ExternalLink, Camera,
  Table, Plus, Trash, FileSpreadsheet,
  Target, TestTube2, X, Zap
} from 'lucide-react';
import { useForgeStore } from '../stores/useForgeStore';
import { useTranslation } from '../hooks/useTranslation';
import ScreenshotViewer from '../components/ScreenshotViewer';

const ForgeEditor: React.FC = () => {
  const { projectName } = useForgeStore();
  const { t } = useTranslation();
  const [showDataTable, setShowDataTable] = useState(false);
  const [testLocatorModal, setTestLocatorModal] = useState<{
    isOpen: boolean;
    locator: string;
    locatorType: string;
    isRunning: boolean;
    result?: {
      status: 'FOUND' | 'NOT_FOUND' | 'MULTIPLE';
      count: number;
      element?: {
        tagName: string;
        id?: string;
        className?: string;
        text?: string;
        boundingBox?: { x: number; y: number; width: number; height: number };
      };
      error?: string;
    };
  }>({
    isOpen: false,
    locator: '',
    locatorType: '',
    isRunning: false
  });
  const [locators, setLocators] = useState([
    { id: '1', type: 'role', value: 'role=button[name="Login"]', priority: 1, isActive: true },
    { id: '2', type: 'css', value: 'css=.login-btn', priority: 2, isActive: false }
  ]);
  const [showAddLocator, setShowAddLocator] = useState(false);
  const [newLocator, setNewLocator] = useState({ type: 'role', value: '' });
  const [highlightedElement, setHighlightedElement] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
  } | null>(null);

  // Mock data for table
  const [tableData] = useState([
    { id: 1, username: 'user_std', password: 'password123', expected: 'Dashboard' },
    { id: 2, username: 'user_locked', password: 'bad_password', expected: 'Error' },
    { id: 3, username: 'admin', password: 'admin_pass', expected: 'AdminPanel' },
  ]);

  // Test locator function
  const testLocator = async (locator: string, locatorType: string) => {
    setTestLocatorModal({
      isOpen: true,
      locator,
      locatorType,
      isRunning: true
    });

    // Simulate API call to test locator
    setTimeout(() => {
      const mockResult = {
        status: 'FOUND' as const,
        count: 1,
        element: {
          tagName: 'button',
          id: 'login-btn',
          className: 'btn btn-primary',
          text: 'Sign In',
          boundingBox: { x: 100, y: 200, width: 80, height: 40 }
        }
      };

      setTestLocatorModal(prev => ({
        ...prev,
        isRunning: false,
        result: mockResult
      }));
    }, 1500);
  };

  // Add new locator
  const addLocator = () => {
    if (!newLocator.value.trim()) return;

    const newId = (locators.length + 1).toString();
    const newPriority = locators.length + 1;

    setLocators([
      ...locators,
      {
        id: newId,
        type: newLocator.type,
        value: `${newLocator.type}=${newLocator.value}`,
        priority: newPriority,
        isActive: false
      }
    ]);

    setNewLocator({ type: 'role', value: '' });
    setShowAddLocator(false);
  };

  // Remove locator
  const removeLocator = (id: string) => {
    setLocators(locators.filter(l => l.id !== id));
  };

  // Reorder locator (move up/down)
  const reorderLocator = (id: string, direction: 'up' | 'down') => {
    const index = locators.findIndex(l => l.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === locators.length - 1)
    ) {
      return;
    }

    const newLocators = [...locators];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap positions
    [newLocators[index], newLocators[targetIndex]] = [newLocators[targetIndex], newLocators[index]];

    // Update priorities
    newLocators.forEach((loc, idx) => {
      loc.priority = idx + 1;
    });

    setLocators(newLocators);
  };

  // Set active locator (primary)
  const setActiveLocator = (id: string) => {
    setLocators(locators.map(l => ({
      ...l,
      isActive: l.id === id
    })));
  };

  // Highlight element on page
  const highlightElement = (element: {
    x: number;
    y: number;
    width: number;
    height: number;
    tagName?: string;
    id?: string;
  }) => {
    setHighlightedElement({
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      label: element.tagName || 'Element'
    });
  };

  // Clear highlight
  const clearHighlight = () => {
    setHighlightedElement(null);
  };

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
                      <button
                        onClick={() => setShowAddLocator(true)}
                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        {t('editor.addStrategy')}
                      </button>
                    </div>

                    {/* Add Locator Form */}
                    {showAddLocator && (
                      <div className="mb-4 p-3 bg-slate-800/50 rounded border border-slate-700">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="block text-xs text-slate-500 mb-1">Type</label>
                            <select
                              value={newLocator.type}
                              onChange={(e) => setNewLocator({ ...newLocator, type: e.target.value })}
                              className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white"
                            >
                              <option value="role">Role</option>
                              <option value="text">Text</option>
                              <option value="css">CSS</option>
                              <option value="xpath">XPath</option>
                              <option value="id">ID</option>
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-slate-500 mb-1">Value</label>
                            <input
                              type="text"
                              value={newLocator.value}
                              onChange={(e) => setNewLocator({ ...newLocator, value: e.target.value })}
                              placeholder={newLocator.type === 'role' ? 'button[name="Login"]' : '.login-btn'}
                              className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white"
                              onKeyPress={(e) => e.key === 'Enter' && addLocator()}
                            />
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={addLocator}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setShowAddLocator(false);
                                setNewLocator({ type: 'role', value: '' });
                              }}
                              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Locators List */}
                    <div className="space-y-2">
                      {locators.map((locator) => (
                        <div
                          key={locator.id}
                          className={`flex items-center gap-2 p-2 rounded border ${
                            locator.isActive
                              ? 'bg-slate-800/50 border-green-500/30'
                              : 'bg-slate-800/30 border-slate-700'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            locator.isActive ? 'bg-green-500 text-black' : 'bg-slate-600 text-white'
                          }`}>
                            {locator.priority}
                          </div>
                          <code className={`flex-1 text-xs font-mono ${
                            locator.isActive ? 'text-green-300' : 'text-slate-400'
                          }`}>
                            {locator.value}
                          </code>

                          {/* Locator Controls */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => testLocator(locator.value, locator.type)}
                              className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-white hover:bg-slate-600 flex items-center gap-1"
                              title="Test Locator"
                            >
                              <TestTube2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => reorderLocator(locator.id, 'up')}
                              className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-white hover:bg-slate-600"
                              disabled={locator.priority === 1}
                              title="Move Up"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => reorderLocator(locator.id, 'down')}
                              className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-white hover:bg-slate-600"
                              disabled={locator.priority === locators.length}
                              title="Move Down"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => setActiveLocator(locator.id)}
                              className={`text-[10px] px-2 py-0.5 rounded ${
                                locator.isActive
                                  ? 'bg-green-600 text-white'
                                  : 'bg-slate-700 text-white hover:bg-slate-600'
                              }`}
                              title="Set as Primary"
                            >
                              Primary
                            </button>
                            <button
                              onClick={() => removeLocator(locator.id)}
                              className="text-[10px] bg-red-700 px-2 py-0.5 rounded text-white hover:bg-red-600"
                              title="Remove Locator"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
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
                <div className="flex-1 flex flex-col">
                    <ScreenshotViewer
                      screenshot={{
                        id: 'step-screenshot',
                        timestamp: Date.now(),
                        url: 'https://picsum.photos/400/300',
                        viewport: { width: 400, height: 300 },
                        highlights: highlightedElement ? [{
                          x: highlightedElement.x,
                          y: highlightedElement.y,
                          width: highlightedElement.width,
                          height: highlightedElement.height,
                          label: highlightedElement.label,
                          color: '#ef4444'
                        }] : []
                      }}
                      onScreenshotCapture={() => console.log('Capture screenshot')}
                      className="flex-1"
                    />
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

      {/* Test Locator Modal */}
      {testLocatorModal.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-surface border border-slate-700 rounded-lg shadow-xl w-[600px] max-w-[90vw]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-white">Test Locator</h3>
              </div>
              <button
                onClick={() => setTestLocatorModal({ isOpen: false, locator: '', locatorType: '', isRunning: false })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {/* Locator Info */}
              <div className="mb-4 p-3 bg-slate-800 rounded border border-slate-700">
                <div className="text-xs text-slate-500 mb-1">Locator Strategy</div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded uppercase">
                    {testLocatorModal.locatorType}
                  </span>
                  <code className="text-sm text-green-300 font-mono">{testLocatorModal.locator}</code>
                </div>
              </div>

              {/* Test Result */}
              {testLocatorModal.isRunning ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-400">Testing locator...</p>
                  <p className="text-slate-500 text-sm mt-1">Checking for element on current page</p>
                </div>
              ) : testLocatorModal.result ? (
                <div className="space-y-4">
                  {/* Status */}
                  <div className={`p-4 rounded border ${
                    testLocatorModal.result.status === 'FOUND'
                      ? 'border-green-500/30 bg-green-500/10'
                      : testLocatorModal.result.status === 'NOT_FOUND'
                      ? 'border-red-500/30 bg-red-500/10'
                      : 'border-yellow-500/30 bg-yellow-500/10'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {testLocatorModal.result.status === 'FOUND' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : testLocatorModal.result.status === 'NOT_FOUND' ? (
                        <X className="w-5 h-5 text-red-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                      )}
                      <span className={`font-bold ${
                        testLocatorModal.result.status === 'FOUND'
                          ? 'text-green-400'
                          : testLocatorModal.result.status === 'NOT_FOUND'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                      }`}>
                        {testLocatorModal.result.status === 'FOUND' ? 'Element Found!' :
                         testLocatorModal.result.status === 'NOT_FOUND' ? 'Element Not Found' :
                         'Multiple Elements Found'}
                      </span>
                      <span className="text-slate-400 text-sm">({testLocatorModal.result.count} match{testLocatorModal.result.count !== 1 ? 'es' : ''})</span>
                    </div>

                    {/* Element Details */}
                    {testLocatorModal.result.element && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs text-slate-500 uppercase font-medium">Element Details:</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-slate-500">Tag:</span>
                            <span className="text-white ml-2 font-mono">{testLocatorModal.result.element.tagName}</span>
                          </div>
                          {testLocatorModal.result.element.id && (
                            <div>
                              <span className="text-slate-500">ID:</span>
                              <span className="text-white ml-2 font-mono">{testLocatorModal.result.element.id}</span>
                            </div>
                          )}
                          {testLocatorModal.result.element.className && (
                            <div className="col-span-2">
                              <span className="text-slate-500">Class:</span>
                              <span className="text-white ml-2 font-mono">{testLocatorModal.result.element.className}</span>
                            </div>
                          )}
                          {testLocatorModal.result.element.text && (
                            <div className="col-span-2">
                              <span className="text-slate-500">Text:</span>
                              <span className="text-white ml-2">{testLocatorModal.result.element.text}</span>
                            </div>
                          )}
                        </div>

                        {/* Position Info */}
                        {testLocatorModal.result.element.boundingBox && (
                          <div className="mt-3 p-2 bg-slate-800 rounded text-xs">
                            <div className="text-slate-500 mb-1">Position:</div>
                            <div className="font-mono text-slate-300">
                              x: {testLocatorModal.result.element.boundingBox.x}px,
                              y: {testLocatorModal.result.element.boundingBox.y}px,
                              width: {testLocatorModal.result.element.boundingBox.width}px,
                              height: {testLocatorModal.result.element.boundingBox.height}px
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {testLocatorModal.result.error && (
                      <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded">
                        <div className="text-red-400 text-sm font-medium mb-1">Error:</div>
                        <pre className="text-red-300 text-xs whitespace-pre-wrap">{testLocatorModal.result.error}</pre>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        // Highlight element on page
                        if (testLocatorModal.result?.element?.boundingBox) {
                          highlightElement({
                            x: testLocatorModal.result.element.boundingBox.x,
                            y: testLocatorModal.result.element.boundingBox.y,
                            width: testLocatorModal.result.element.boundingBox.width,
                            height: testLocatorModal.result.element.boundingBox.height,
                            tagName: testLocatorModal.result.element.tagName,
                            id: testLocatorModal.result.element.id
                          });
                        }
                      }}
                      disabled={!testLocatorModal.result?.element?.boundingBox}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      Highlight Element
                    </button>
                    <button
                      onClick={() => {
                        setTestLocatorModal({ isOpen: false, locator: '', locatorType: '', isRunning: false });
                        clearHighlight();
                      }}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgeEditor;