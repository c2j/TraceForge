import React from 'react';
import { useForgeStore } from '../stores/useForgeStore';
import { Server, RefreshCw, Cpu, HardDrive } from 'lucide-react';

const ForgeNodes: React.FC = () => {
  const { nodes } = useForgeStore();

  return (
    <div className="p-8">
       <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Execution Nodes</h1>
          <p className="text-slate-400">Manage local and remote agents for distributed testing.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-400 mr-4">
             <span className="w-2 h-2 bg-green-500 rounded-full"></span> 5 Online
             <span className="w-2 h-2 bg-yellow-500 rounded-full ml-2"></span> 1 Busy
          </div>
          <button className="bg-surface hover:bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {nodes.map(node => (
           <div key={node.id} className="bg-surface border border-slate-700 rounded-lg overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                 <div className="flex items-center gap-3">
                    <Server className={`w-5 h-5 ${node.id === 'local' ? 'text-primary' : 'text-slate-400'}`} />
                    <div>
                      <h3 className="font-bold text-slate-200">{node.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">{node.ip}</p>
                    </div>
                 </div>
                 <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                   node.status === 'ONLINE' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                   node.status === 'BUSY' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' :
                   'border-slate-500/50 text-slate-400'
                 }`}>
                   {node.status}
                 </div>
              </div>
              
              <div className="p-4 space-y-4">
                 {/* CPU */}
                 <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                       <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU</span>
                       <span>{node.cpuUsage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                       <div 
                        className={`h-full rounded-full transition-all duration-500 ${node.cpuUsage > 80 ? 'bg-red-500' : 'bg-blue-500'}`} 
                        style={{ width: `${node.cpuUsage}%` }}></div>
                    </div>
                 </div>
                 
                 {/* MEM */}
                 <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                       <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> Mem</span>
                       <span>{node.memUsage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                       <div className="h-full bg-purple-500 rounded-full" style={{ width: `${node.memUsage}%` }}></div>
                    </div>
                 </div>

                 {/* Kernels */}
                 <div className="pt-2">
                    <span className="text-xs text-slate-500 block mb-1">Available Kernels</span>
                    <div className="flex flex-wrap gap-1">
                       {node.kernels.map(k => (
                         <span key={k} className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300 border border-slate-700">{k}</span>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="p-3 bg-slate-800/30 border-t border-slate-700 flex gap-2">
                  <button className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white">Maintenance</button>
                  {node.id !== 'local' && (
                    <button className="px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded text-xs border border-red-900/50">Remove</button>
                  )}
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};

export default ForgeNodes;