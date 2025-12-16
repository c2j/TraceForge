import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Language } from '../locales';

const ForgeSettings: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">{t('settings.title')}</h1>
      
      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-primary border-b border-slate-700 pb-2">{t('settings.networkConfig')}</h2>
          <div className="grid grid-cols-2 gap-6">
             <div>
                <label className="block text-sm text-slate-400 mb-2">{t('settings.enginePortRange')}</label>
                <input type="text" defaultValue="50000-60000" className="w-full bg-surface border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-primary" />
             </div>
             <div>
                <label className="block text-sm text-slate-400 mb-2">{t('settings.serverUrl')}</label>
                <input type="text" defaultValue="https://traceforge.company.com" className="w-full bg-surface border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-primary" />
             </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-primary border-b border-slate-700 pb-2">{t('settings.storageData')}</h2>
          <div className="flex justify-between items-center bg-surface p-4 rounded border border-slate-700">
             <div>
               <div className="text-slate-200 font-medium">{t('settings.localDatabase')}</div>
               <div className="text-sm text-slate-500">~/TraceForge/data.db</div>
             </div>
             <button className="px-3 py-2 border border-slate-600 text-slate-300 rounded hover:bg-slate-700 hover:text-white text-sm">
               {t('settings.clearCache')}
             </button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-primary border-b border-slate-700 pb-2">{t('settings.defaults')}</h2>
          <div className="grid grid-cols-2 gap-6">
             <div>
                <label className="block text-sm text-slate-400 mb-2">{t('settings.defaultRecordingKernel')}</label>
                <select className="w-full bg-surface border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-primary">
                  <option>Chrome 86.0.4240.198</option>
                  <option>Chrome Latest</option>
                </select>
             </div>
             <div>
                <label className="block text-sm text-slate-400 mb-2">{t('settings.theme')}</label>
                <select className="w-full bg-surface border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-primary">
                  <option>Dark</option>
                  <option>Light</option>
                  <option>System</option>
                </select>
             </div>
             
             {/* Language Selection */}
             <div>
                <label className="block text-sm text-slate-400 mb-2">{t('settings.language')}</label>
                <select 
                  value={language}
                  onChange={handleLanguageChange}
                  className="w-full bg-surface border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-primary"
                >
                  <option value="en">English</option>
                  <option value="zh">简体中文</option>
                </select>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ForgeSettings;