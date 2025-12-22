import React, { useState } from 'react';
import { 
  Search, Filter, ArrowRight, Eye, ChevronLeft, 
  CheckCircle2, XCircle, Clock, Calendar, Hash,
  FileText, Image, PlayCircle, AlertOctagon, Terminal
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

// Mock Data Types
interface TestStep {
  id: number;
  name: string;
  status: 'PASS' | 'FAIL';
  duration: string;
  time: string;
  screenshot?: string;
  error?: string;
}

interface TestResult {
  id: string;
  status: 'PASS' | 'FAIL';
  project: string;
  script: string;
  duration: string;
  kernel: string;
  time: string;
  steps: TestStep[];
}

const results: TestResult[] = [
  { 
    id: '1', status: 'PASS', project: 'E-Commerce v2.1', script: 'TC001 Login Flow', duration: '12s', kernel: 'Chrome 86', time: '10 mins ago',
    steps: [
      { id: 1, name: 'Navigate to /login', status: 'PASS', duration: '1.2s', time: '10:00:01' },
      { id: 2, name: 'Fill username "user@example.com"', status: 'PASS', duration: '0.5s', time: '10:00:02' },
      { id: 3, name: 'Fill password "********"', status: 'PASS', duration: '0.5s', time: '10:00:03' },
      { id: 4, name: 'Click "Sign In"', status: 'PASS', duration: '0.8s', time: '10:00:04' },
      { id: 5, name: 'Assert URL contains "/dashboard"', status: 'PASS', duration: '0.1s', time: '10:00:05' },
    ]
  },
  { 
    id: '2', status: 'FAIL', project: 'E-Commerce v2.1', script: 'TC002 Payment Gateway', duration: '45s', kernel: 'Chrome Latest', time: '12 mins ago',
    steps: [
      { id: 1, name: 'Navigate to /checkout', status: 'PASS', duration: '2.5s', time: '10:05:00' },
      { id: 2, name: 'Select Payment "Credit Card"', status: 'PASS', duration: '0.8s', time: '10:05:03' },
      { id: 3, name: 'Click "Pay Now"', status: 'FAIL', duration: '30.0s', time: '10:05:04', error: 'TimeoutError: Element button[data-testid="pay-submit"] not visible after 30000ms\n    at Page.click (test/payment.spec.ts:45:12)' },
    ]
  },
  { 
    id: '3', status: 'PASS', project: 'E-Commerce v2.0', script: 'TC003 Search Items', duration: '15s', kernel: 'Chrome 86', time: '2 hours ago',
    steps: []
  },
];

const ForgeResults: React.FC = () => {
  const { t } = useTranslation();
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);

  const selectedResult = results.find(r => r.id === selectedResultId);

  // Detail View Component
  if (selectedResultId && selectedResult) {
    return (
      <div className="flex flex-col h-full bg-background animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Detail Header */}
        <div className="h-14 border-b border-slate-700 bg-surface flex items-center justify-between px-6 shadow-md z-20">
           <div className="flex items-center gap-4">
             <button 
               onClick={() => setSelectedResultId(null)}
               className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm pr-4 border-r border-slate-700"
             >
               <ChevronLeft className="w-4 h-4" /> {t('results.back')}
             </button>
             <h2 className="text-lg font-bold text-white flex items-center gap-3">
               {selectedResult.script}
               <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                   selectedResult.status === 'PASS' 
                   ? 'border-green-500/30 bg-green-500/10 text-green-400' 
                   : 'border-red-500/30 bg-red-500/10 text-red-400'
               }`}>
                 {selectedResult.status}
               </span>
             </h2>
           </div>
           <div className="flex gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> ID: {selectedResult.id}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {selectedResult.time}</span>
           </div>
        </div>

        {/* Detail Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Timeline & Steps (60%) */}
          <div className="w-[60%] border-r border-slate-700 overflow-y-auto p-6 bg-slate-900/50">
             
             {/* Info Cards */}
             <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-surface border border-slate-700 rounded p-3">
                   <div className="text-xs text-slate-500 mb-1">{t('results.duration')}</div>
                   <div className="text-white font-mono">{selectedResult.duration}</div>
                </div>
                <div className="bg-surface border border-slate-700 rounded p-3">
                   <div className="text-xs text-slate-500 mb-1">{t('results.kernel')}</div>
                   <div className="text-white flex items-center gap-1"><Terminal className="w-3 h-3" /> {selectedResult.kernel}</div>
                </div>
                <div className="bg-surface border border-slate-700 rounded p-3">
                   <div className="text-xs text-slate-500 mb-1">{t('dashboard.project')}</div>
                   <div className="text-white truncate">{selectedResult.project}</div>
                </div>
             </div>

             {/* Error Analysis (if Fail) */}
             {selectedResult.status === 'FAIL' && (
               <div className="mb-8 border border-red-500/30 bg-red-900/10 rounded-lg p-4">
                 <h3 className="text-red-400 font-bold flex items-center gap-2 mb-2 text-sm">
                   <AlertOctagon className="w-4 h-4" /> {t('results.errorMessage')}
                 </h3>
                 <pre className="font-mono text-xs text-red-200 overflow-x-auto whitespace-pre-wrap p-2 bg-black/30 rounded">
                   {selectedResult.steps.find(s => s.status === 'FAIL')?.error || 'Unknown error occurred during execution.'}
                 </pre>
               </div>
             )}

             {/* Steps Timeline */}
             <h3 className="text-slate-300 font-medium mb-4 text-sm uppercase tracking-wider">{t('results.steps')}</h3>
             <div className="relative space-y-0 pl-2">
                {/* Vertical Line */}
                <div className="absolute left-[15px] top-2 bottom-4 w-0.5 bg-slate-800"></div>

                {selectedResult.steps.map((step) => (
                  <div key={step.id} className="relative pl-10 pb-6 group">
                     {/* Status Node */}
                     <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-4 border-background flex items-center justify-center z-10 
                       ${step.status === 'PASS' ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}>
                        {step.status === 'PASS' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                     </div>

                     <div className="bg-surface border border-slate-700 rounded p-3 hover:border-slate-500 transition-colors shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                           <span className="font-medium text-slate-200 text-sm">{step.name}</span>
                           <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                             <Clock className="w-3 h-3" /> {step.duration}
                           </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mb-2">{step.time}</div>
                        {step.status === 'FAIL' && (
                           <div className="text-xs text-red-400 mt-2 p-2 bg-red-900/20 rounded border border-red-900/30">
                              Failed at line 45: Element not found
                           </div>
                        )}
                        {/* Inline Actions */}
                        <div className="flex gap-2 mt-2">
                           <button className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] rounded text-slate-400 flex items-center gap-1 border border-slate-700">
                             <Image className="w-3 h-3" /> {t('results.screenshot')}
                           </button>
                           <button className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] rounded text-slate-400 flex items-center gap-1 border border-slate-700">
                             <FileText className="w-3 h-3" /> Logs
                           </button>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Right: Artifacts Preview (40%) */}
          <div className="w-[40%] flex flex-col bg-background">
             <div className="p-2 bg-slate-800 border-b border-slate-700 text-xs font-medium text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> {t('results.video')}</span>
                <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">LIVE RECORDING</span>
             </div>
             <div className="aspect-video bg-black relative flex items-center justify-center border-b border-slate-700">
                <div className="text-slate-600 flex flex-col items-center">
                   <PlayCircle className="w-12 h-12 mb-2 opacity-50" />
                   <span className="text-xs">Preview Unavailable in Mock Mode</span>
                </div>
                {/* Mock Fail Overlay */}
                {selectedResult.status === 'FAIL' && (
                   <div className="absolute inset-x-0 bottom-0 bg-red-900/80 text-white text-xs p-2 text-center backdrop-blur-sm">
                      Failure detected at 00:30
                   </div>
                )}
             </div>

             <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-2 bg-slate-800 border-b border-slate-700 text-xs font-medium text-slate-400 flex items-center gap-2">
                   <Terminal className="w-4 h-4" /> {t('results.logs')}
                </div>
                <div className="flex-1 bg-slate-950 p-2 font-mono text-[10px] text-slate-400 overflow-y-auto whitespace-pre-wrap">
                   <div className="text-blue-400">[INFO] Starting test execution id={selectedResult.id}</div>
                   <div>[INFO] Environment: {selectedResult.kernel} on Windows 10</div>
                   {selectedResult.steps.map(s => (
                     <div key={s.id}>
                       <span className="text-slate-500">[{s.time.split(' ')[0]}]</span> {s.name} ... <span className={s.status === 'PASS' ? 'text-green-500' : 'text-red-500'}>{s.status}</span>
                     </div>
                   ))}
                   {selectedResult.status === 'FAIL' && (
                     <>
                       <div className="text-red-500 mt-2">[ERROR] Critical Failure Detected</div>
                       <div className="text-red-400">{selectedResult.steps.find(s=>s.status==='FAIL')?.error}</div>
                     </>
                   )}
                   <div className="text-slate-600 mt-2">--- End of Log ---</div>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // List View (Default)
  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-300">
       <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">{t('results.title')}</h1>
        <div className="flex gap-3">
           <button className="flex items-center gap-2 px-3 py-2 bg-surface border border-slate-700 rounded text-slate-300 hover:bg-slate-700 text-sm">
             <Filter className="w-4 h-4" /> {t('results.filter')}
           </button>
           <div className="relative">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
             <input type="text" placeholder={t('results.search')} className="pl-9 pr-4 py-2 bg-surface border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-primary w-64" />
           </div>
        </div>
      </div>

      <div className="bg-surface border border-slate-700 rounded-lg overflow-hidden flex-1 shadow-lg">
        <table className="w-full text-left text-sm text-slate-400">
           <thead className="bg-slate-800 text-xs uppercase font-medium text-slate-500">
             <tr>
               <th className="px-6 py-4">{t('results.status')}</th>
               <th className="px-6 py-4">{t('results.project')}</th>
               <th className="px-6 py-4">{t('results.script')}</th>
               <th className="px-6 py-4">{t('results.duration')}</th>
               <th className="px-6 py-4">{t('results.kernel')}</th>
               <th className="px-6 py-4">{t('results.time')}</th>
               <th className="px-6 py-4 text-right">{t('results.action')}</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-slate-700">
             {results.map((r) => (
               <tr 
                  key={r.id} 
                  className="hover:bg-slate-700/30 transition-colors group cursor-pointer"
                  onClick={() => setSelectedResultId(r.id)}
                >
                 <td className="px-6 py-4">
                   <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
                     r.status === 'PASS' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-400'
                   }`}>
                     {r.status}
                   </span>
                 </td>
                 <td className="px-6 py-4 text-slate-200">{r.project}</td>
                 <td className="px-6 py-4 font-medium text-white">{r.script}</td>
                 <td className="px-6 py-4 font-mono">{r.duration}</td>
                 <td className="px-6 py-4">
                   <span className="bg-slate-700 px-2 py-0.5 rounded text-xs text-slate-300">{r.kernel}</span>
                 </td>
                 <td className="px-6 py-4">{r.time}</td>
                 <td className="px-6 py-4 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedResultId(r.id); }}
                      className="text-primary hover:text-white p-2 rounded hover:bg-primary/20 transition-colors"
                      title={t('results.detailsTitle')}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                 </td>
               </tr>
             ))}
           </tbody>
        </table>
      </div>
    </div>
  );
};

export default ForgeResults;