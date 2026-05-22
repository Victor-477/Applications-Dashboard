/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ChevronDown, Globe2, Layers, Plus, Terminal } from 'lucide-react';
import AppCard from './components/AppCard';
import AppForm from './components/AppForm';
import LogViewer from './components/LogViewer';
import { AppState, AppConfig, LogLine } from './types';
import { isLanguage, Language, languageOptions, translations } from './i18n';

function getInitialLanguage(): Language {
  const storedLanguage = window.localStorage.getItem('app-dashboard-language');
  return isLanguage(storedLanguage) ? storedLanguage : 'pt';
}

export default function App() {
  const [apps, setApps] = useState<AppState[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppConfig | null>(null);
  const [logs, setLogs] = useState<Record<string, LogLine[]>>({});
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const t = translations[language];
  const selectedLanguage = languageOptions.find(option => option.code === language)!;

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    window.localStorage.setItem('app-dashboard-language', language);
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
  }, [language]);

  useEffect(() => {
    const evtSource = new EventSource('/api/stream');
    evtSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const newLog: LogLine = {
        id: crypto.randomUUID(),
        timestamp: data.timestamp,
        type: data.type,
        message: data.message
      };
      setLogs((prev) => {
        const appLogs = prev[data.appId] || [];
        return {
          ...prev,
          [data.appId]: [...appLogs, newLog].slice(-1000)
        };
      });
    };
    return () => evtSource.close();
  }, []);

  useEffect(() => {
    if (selectedAppId && (!logs[selectedAppId] || logs[selectedAppId].length === 0)) {
        fetch(`/api/apps/${selectedAppId}/logs`)
        .then(res => res.json())
        .then(history => {
             const formattedLogs = history.map((log: any) => ({
                 id: crypto.randomUUID(),
                 ...log
             }));
             setLogs(prev => ({
                 ...prev,
                 [selectedAppId]: formattedLogs
             }));
        });
    }
  }, [selectedAppId]);

  const fetchApps = async () => {
    const res = await fetch('/api/apps');
    const data = await res.json();
    setApps(data);
    if (!selectedAppId && data.length > 0) {
      setSelectedAppId(data[0].config.id);
    }
  };

  const handleCreateApp = async (config: Partial<AppConfig>) => {
    await fetch('/api/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    fetchApps();
    setIsFormOpen(false);
  };

  const handleUpdateApp = async (config: Partial<AppConfig>) => {
    if (!editingApp) return;
    await fetch(`/api/apps/${editingApp.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    fetchApps();
    setEditingApp(null);
    setIsFormOpen(false);
  };

  const openCreateForm = () => {
    setEditingApp(null);
    setIsFormOpen(true);
  };

  const openEditForm = (config: AppConfig) => {
    setEditingApp(config);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingApp(null);
    setIsFormOpen(false);
  };

  const handleDeleteApp = async (id: string) => {
    await fetch(`/api/apps/${id}`, { method: 'DELETE' });
    if (selectedAppId === id) {
      setApps(prev => {
        const remaining = prev.filter(a => a.config.id !== id);
        if (remaining.length > 0) setSelectedAppId(remaining[0].config.id);
        else setSelectedAppId(null);
        return remaining;
      });
    }
    fetchApps();
  };

  const handleStart = async (id: string) => {
    await fetch(`/api/apps/${id}/start`, { method: 'POST' });
    fetchApps();
  };

  const handleStop = async (id: string) => {
    await fetch(`/api/apps/${id}/stop`, { method: 'POST' });
    fetchApps();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center z-20 relative">
        <div className="flex items-center space-x-3">
          <div className="bg-white p-1.5 rounded-lg text-white shadow-sm border border-gray-200">
            <img src="/ind40-logo.png" alt="Applications Dashboard" className="w-8 h-8 object-contain" />
          </div>
          <div>
             <h1 className="text-xl font-semibold tracking-tight text-gray-900 leading-tight">Applications Dashboard</h1>
             <p className="text-xs text-gray-500 font-medium">{t.appSubtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLanguageMenuOpen(prev => !prev)}
              className="flex min-w-[132px] items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500/40"
              aria-haspopup="menu"
              aria-expanded={isLanguageMenuOpen}
              title={t.language}
            >
              <span className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-gray-500" />
                {selectedLanguage.label}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            {isLanguageMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white p-1 shadow-lg z-30" role="menu">
                {languageOptions.map(option => (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => {
                      setLanguage(option.code);
                      setIsLanguageMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      option.code === language
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    role="menuitem"
                  >
                    <span>{option.label}</span>
                    <span className="text-xs font-semibold text-gray-400">{option.shortLabel}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={openCreateForm}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm focus:ring-2 focus:ring-blue-500/50"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newApp}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-[340px] shrink-0 border-r border-gray-200 bg-gray-50/50 flex flex-col z-10 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)]">
          <div className="px-5 py-4 border-b border-gray-200/50 flex items-center justify-between bg-white/50 space-x-2">
            <h2 className="text-[11px] uppercase font-bold text-gray-500 tracking-wider">{t.registeredApps}</h2>
            <div className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {apps.length}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {apps.map(app => (
              <AppCard 
                key={app.config.id}
                app={app}
                isSelected={selectedAppId === app.config.id}
                onSelect={() => setSelectedAppId(app.config.id)}
                onStart={() => handleStart(app.config.id)}
                onStop={() => handleStop(app.config.id)}
                onEdit={() => openEditForm(app.config)}
                onDelete={() => handleDeleteApp(app.config.id)}
                t={t}
              />
            ))}
            {apps.length === 0 && (
              <div className="text-center py-12 px-4 flex flex-col items-center">
                <div className="bg-white border text-gray-400 border-gray-200 rounded-full w-14 h-14 flex items-center justify-center mb-4 shadow-sm">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-gray-800 font-semibold text-sm mb-1">{t.noAppsTitle}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{t.noAppsDescription}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {selectedAppId ? (
            <LogViewer 
              app={apps.find(a => a.config.id === selectedAppId)} 
              logs={logs[selectedAppId] || []} 
              t={t}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
              <Terminal className="w-16 h-16 mb-4 text-gray-300" />
              <p className="font-medium text-gray-500">{t.noSelectedAppTitle}</p>
              <p className="text-xs mt-1">{t.noSelectedAppDescription}</p>
            </div>
          )}
        </div>
      </main>

      {isFormOpen && (
        <AppForm 
          initialConfig={editingApp}
          onClose={closeForm} 
          onSubmit={editingApp ? handleUpdateApp : handleCreateApp} 
          t={t}
        />
      )}
    </div>
  );
}
