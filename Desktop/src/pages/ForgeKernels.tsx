import React from 'react';
import { useForgeStore } from '../stores/useForgeStore';
import { Chrome, Search, Plus, Trash2, CheckCircle } from 'lucide-react';

const ForgeKernels: React.FC = () => {
  const { kernels } = useForgeStore();

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Kernel Manager</h1>
          <p className="text-slate-400">Manage browser versions for legacy system compatibility.</p>
        </div>
        <button className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Kernel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kernels.map((kernel) => (
          <div key={kernel.id} className="bg-surface border border-slate-700 rounded-lg p-6 relative group hover:border-slate-500 transition-colors">
             <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-800 rounded-lg">
                   <Chrome className="w-8 h-8 text-slate-200" />
                </div>
                {kernel.status === 'Latest' ? (
                  <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold uppercase">Latest</span>
                ) : (
                  <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold uppercase">Compatible</span>
                )}
             </div>
             
             <h3 className="text-lg font-bold text-white mb-1">{kernel.name} {kernel.version}</h3>
             <p className="text-sm text-slate-500 font-mono mb-4 break-all">{kernel.path}</p>
             
             <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700/50">
               <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-1.5 rounded text-sm font-medium">Test</button>
               {kernel.type === 'local' && (
                 <button className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors">
                   <Trash2 className="w-4 h-4" />
                 </button>
               )}
               <button className="p-2 text-slate-500 hover:text-green-400 hover:bg-slate-700 rounded transition-colors" title="Set Default">
                  <CheckCircle className="w-4 h-4" />
               </button>
             </div>
          </div>
        ))}

        {/* Add New Placeholder */}
        <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 cursor-pointer transition-all">
           <Search className="w-10 h-10 mb-2" />
           <span className="font-medium">Auto-detect Local Browser</span>
           <span className="text-xs mt-1">Select chrome.exe executable</span>
        </div>
      </div>
    </div>
  );
};

export default ForgeKernels;