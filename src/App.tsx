/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ChevronDown, Globe2, Home, Layers, Plus, Settings } from 'lucide-react';
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
  const selectedApp = apps.find(a => a.config.id === selectedAppId);
  const hasConfigOpen = isFormOpen;
  const hasTerminalOpen = Boolean(selectedAppId) && !hasConfigOpen;
  const hasSidePanelOpen = hasConfigOpen || hasTerminalOpen;

  const statusSummary = apps.reduce(
    (summary, app) => {
      const appLogs = logs[app.config.id] || [];
      const hasErrors = appLogs.some(log => log.type === 'error');

      if (app.status === 'running') summary.running += 1;
      else if (hasErrors) summary.failed += 1;
      else summary.stopped += 1;

      return summary;
    },
    { running: 0, stopped: 0, failed: 0 }
  );

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
    setSelectedAppId(current => {
      if (!current) return null;
      return data.some((app: AppState) => app.config.id === current) ? current : null;
    });
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
    setSelectedAppId(null);
    setEditingApp(null);
    setIsFormOpen(true);
  };

  const openEditForm = (config: AppConfig) => {
    setSelectedAppId(config.id);
    setEditingApp(config);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingApp(null);
    setIsFormOpen(false);
  };

  const handleDeleteApp = async (id: string) => {
    await fetch(`/api/apps/${id}`, { method: 'DELETE' });
    if (selectedAppId === id) setSelectedAppId(null);
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
    <div className="flex h-screen flex-col overflow-hidden bg-[#edf0f2] font-sans text-gray-900">
      <header className="relative z-20 flex h-[94px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <img src="/ind40-logo.png" alt="Applications Dashboard" className="h-8 w-8 object-contain" />
          <div>
            <h1 className="text-[15px] font-bold leading-tight text-gray-950">Control Panel</h1>
            <p className="mt-1 text-[11px] font-medium text-gray-500">{t.appSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLanguageMenuOpen(prev => !prev)}
              className="flex min-w-[112px] items-center justify-between gap-2 rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:border-gray-200 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500/40"
              aria-haspopup="menu"
              aria-expanded={isLanguageMenuOpen}
              title={t.language}
            >
              <span className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-gray-500" />
                {selectedLanguage.shortLabel}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            {isLanguageMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-md border border-gray-200 bg-white p-1 shadow-lg" role="menu">
                {languageOptions.map(option => (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => {
                      setLanguage(option.code);
                      setIsLanguageMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition-colors ${
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
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/50"
          >
            <Plus className="h-4 w-4" />
            <span>{t.newApp}</span>
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-[58px] shrink-0 flex-col items-center justify-between border-r border-gray-200 bg-white py-6">
          <div className="flex w-full flex-col items-center gap-4">
            <button
              type="button"
              className="relative flex h-12 w-full items-center justify-center text-blue-600"
              title="Services"
            >
              <span className="absolute left-0 h-10 w-[3px] rounded-r bg-blue-500" />
              <Home className="h-6 w-6" />
            </button>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="flex h-10 w-10 items-center justify-center rounded-md text-gray-700 transition-colors hover:bg-gray-100 hover:text-blue-600"
            title={t.newApp}
          >
            <Settings className="h-5 w-5" />
          </button>
        </aside>

        <section className="flex min-w-0 flex-1 gap-6 overflow-hidden px-6 py-6">
          <div className={`min-w-0 overflow-y-auto pr-1 transition-[flex-basis] duration-300 ${hasSidePanelOpen ? 'basis-[49%]' : 'basis-full'}`}>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Services</h2>
                <p className="mt-1 text-sm text-gray-500">{t.registeredApps}</p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600 shadow-sm ring-1 ring-gray-200">
                {apps.length}
              </div>
            </div>

            {apps.length > 0 ? (
              <div className={`grid gap-6 pb-8 ${hasSidePanelOpen ? 'grid-cols-[repeat(auto-fit,minmax(240px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(258px,1fr))]'}`}>
                {apps.map(app => (
                  <AppCard
                    key={app.config.id}
                    app={app}
                    hasError={(logs[app.config.id] || []).some(log => log.type === 'error')}
                    isSelected={selectedAppId === app.config.id}
                    onSelect={() => setSelectedAppId(app.config.id)}
                    onStart={() => handleStart(app.config.id)}
                    onStop={() => handleStop(app.config.id)}
                    onEdit={() => openEditForm(app.config)}
                    onDelete={() => handleDeleteApp(app.config.id)}
                    t={t}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-white/70 px-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm">
                  <Layers className="h-6 w-6" />
                </div>
                <h3 className="mb-1 text-sm font-semibold text-gray-800">{t.noAppsTitle}</h3>
                <p className="max-w-xs text-xs leading-relaxed text-gray-500">{t.noAppsDescription}</p>
              </div>
            )}
          </div>

          {hasConfigOpen ? (
            <div className="min-w-[420px] flex-1 overflow-hidden pb-8">
              <AppForm
                initialConfig={editingApp}
                onClose={closeForm}
                onSubmit={editingApp ? handleUpdateApp : handleCreateApp}
                t={t}
              />
            </div>
          ) : hasTerminalOpen && (
            <div className="min-w-[420px] flex-1 overflow-hidden pb-8">
              <LogViewer
                app={selectedApp}
                logs={selectedAppId ? logs[selectedAppId] || [] : []}
                onClose={() => setSelectedAppId(null)}
                t={t}
              />
            </div>
          )}
        </section>
      </main>

      <footer className="flex h-[34px] shrink-0 items-center justify-between bg-black px-3 text-xs font-semibold text-white">
        <span>Control Panel - Applications Dashboard v0.0.0</span>
        <span className="flex items-center gap-5">
          <span>Running: {statusSummary.running}</span>
          <span>Stopped: {statusSummary.stopped}</span>
          <span>Failed: {statusSummary.failed}</span>
        </span>
      </footer>
    </div>
  );
}
