/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, lazy, Suspense, type CSSProperties } from 'react';
import { ChevronDown, FileText, Globe2, Home, Info, Layers, MessageSquare, Plus, Radar, Settings, Zap } from 'lucide-react';
import AppCard from './components/AppCard';
import AppForm from './components/AppForm';
import AppListItem from './components/AppListItem';
import LogViewer from './components/LogViewer';

// Secondary views are code-split so they only load when the user opens them.
// This keeps the initial dashboard bundle small.
const AboutView = lazy(() => import('./components/AboutView'));
const AIChatView = lazy(() => import('./components/AIChatView'));
const ApiTesterView = lazy(() => import('./components/ApiTesterView'));
const ConnectivityTesterView = lazy(() => import('./components/ConnectivityTesterView'));
const PatchFilesView = lazy(() => import('./components/PatchFilesView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
import type { AppState, AppConfig, AppView, LogLine, ProgramSettings, SettingsTab } from './types';
import { isLanguage, languageOptions, translations, type Language } from './i18n';

function getInitialLanguage(): Language {
  const storedLanguage = window.localStorage.getItem('app-dashboard-language');
  return isLanguage(storedLanguage) ? storedLanguage : 'en';
}

const htmlLanguageMap: Record<Language, string> = {
  en: 'en',
  pt: 'pt-BR',
  zh: 'zh-CN',
  de: 'de',
  es: 'es',
  ja: 'ja',
};

function getAccentContrastColor(color: string) {
  const hex = color.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return '#ffffff';

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance > 165 ? '#111827' : '#ffffff';
}

function getReadableAccentColor(color: string) {
  const hex = color.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return color;

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance > 210 ? '#111827' : color;
}

const defaultProgramSettings: ProgramSettings = {
  homepageMode: 'internal',
  homepageUrl: 'http://localhost',
  aiProvider: 'openai',
  aiModel: 'gpt-4o-mini',
  aiBaseUrl: '',
  aiApiKeySet: false,
  themeMode: 'light',
  accentColor: '#009dea',
  dashboardLayout: 'cards',
  aiChatEnabled: true,
  apiTesterEnabled: false,
  connectivityTesterEnabled: false,
};

export default function App() {
  const [apps, setApps] = useState<AppState[]>([]);
  const [currentView, setCurrentView] = useState<AppView>('services');
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('apps');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppConfig | null>(null);
  const [logs, setLogs] = useState<Record<string, LogLine[]>>({});
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [settingsRefreshKey, setSettingsRefreshKey] = useState(0);
  const [programSettings, setProgramSettings] = useState<ProgramSettings>(defaultProgramSettings);
  const t = translations[language];
  const selectedLanguage = languageOptions.find(option => option.code === language)!;
  const selectedApp = apps.find(a => a.config.id === selectedAppId);
  const hasConfigOpen = isFormOpen;
  const hasTerminalOpen = currentView === 'services' && Boolean(selectedAppId) && !hasConfigOpen;
  const hasSidePanelOpen = hasConfigOpen || hasTerminalOpen;
  const contentShellClass = [
    'min-w-0 pr-1 transition-[flex-basis] duration-300',
    hasSidePanelOpen ? 'basis-[49%]' : 'basis-full',
    currentView === 'services' ? 'overflow-y-auto' : 'flex min-h-0 flex-col overflow-hidden',
  ].join(' ');
  // Redirect away from a feature view whose feature was just disabled, so the
  // user cannot end up on a hidden page (e.g. AI Chat while aiChatEnabled=false).
  useEffect(() => {
    if (currentView === 'ai' && !programSettings.aiChatEnabled) setCurrentView('services');
    if (currentView === 'apiTester' && !programSettings.apiTesterEnabled) setCurrentView('services');
    if (currentView === 'connectivity' && !programSettings.connectivityTesterEnabled) setCurrentView('services');
  }, [currentView, programSettings.aiChatEnabled, programSettings.apiTesterEnabled, programSettings.connectivityTesterEnabled]);

  const themeVars = useMemo<CSSProperties>(() => ({
    '--app-accent': programSettings.accentColor,
    '--app-accent-readable': getReadableAccentColor(programSettings.accentColor),
    '--app-accent-soft': `${programSettings.accentColor}18`,
    '--app-accent-ring': `${programSettings.accentColor}40`,
    '--app-accent-contrast': getAccentContrastColor(programSettings.accentColor),
  } as CSSProperties), [programSettings.accentColor]);

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
    fetch('/api/settings')
      .then(res => res.json())
      .then(settings => setProgramSettings({ ...defaultProgramSettings, ...settings }))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('app-dashboard-language', language);
    document.documentElement.lang = htmlLanguageMap[language];
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

  const handleAppsChanged = async () => {
    setSelectedAppId(null);
    setEditingApp(null);
    setIsFormOpen(false);
    await fetchApps();
    setSettingsRefreshKey(key => key + 1);
  };

  const handleCreateApp = async (config: Partial<AppConfig>) => {
    await fetch('/api/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    await fetchApps();
    setSettingsRefreshKey(key => key + 1);
    setIsFormOpen(false);
  };

  const handleUpdateApp = async (config: Partial<AppConfig>) => {
    if (!editingApp) return;
    await fetch(`/api/apps/${editingApp.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    await fetchApps();
    setSettingsRefreshKey(key => key + 1);
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
    await fetchApps();
    setSettingsRefreshKey(key => key + 1);
  };

  const handleStart = async (id: string) => {
    await fetch(`/api/apps/${id}/start`, { method: 'POST' });
    fetchApps();
  };

  const handleStop = async (id: string) => {
    await fetch(`/api/apps/${id}/stop`, { method: 'POST' });
    fetchApps();
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    await fetch(`/api/apps/${id}/enabled`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (!enabled && selectedAppId === id) setSelectedAppId(null);
    await fetchApps();
    setSettingsRefreshKey(key => key + 1);
  };

  const openServicesView = () => {
    setCurrentView('services');
    setIsFormOpen(false);
    setEditingApp(null);
  };

  const openSettingsView = () => {
    setSettingsInitialTab('apps');
    setCurrentView('settings');
    setSelectedAppId(null);
    setIsFormOpen(false);
    setEditingApp(null);
    setSettingsRefreshKey(key => key + 1);
  };

  const openGeneralSettings = () => {
    setSettingsInitialTab('general');
    setCurrentView('settings');
    setSelectedAppId(null);
    setIsFormOpen(false);
    setEditingApp(null);
    setSettingsRefreshKey(key => key + 1);
  };

  const openAIChatView = () => {
    setCurrentView('ai');
    setSelectedAppId(null);
    setIsFormOpen(false);
    setEditingApp(null);
  };

  const openApiTesterView = () => {
    setCurrentView('apiTester');
    setSelectedAppId(null);
    setIsFormOpen(false);
    setEditingApp(null);
  };

  const openConnectivityView = () => {
    setCurrentView('connectivity');
    setSelectedAppId(null);
    setIsFormOpen(false);
    setEditingApp(null);
  };

  const openPatchFilesView = () => {
    setCurrentView('patches');
    setSelectedAppId(null);
    setIsFormOpen(false);
    setEditingApp(null);
  };

  const openAboutView = () => {
    setCurrentView('about');
    setSelectedAppId(null);
    setIsFormOpen(false);
    setEditingApp(null);
  };

  const openHomePage = async () => {
    if (programSettings.homepageMode === 'internal') {
      window.open(new URL('/internal-homepage', window.location.origin).toString(), '_blank', 'noopener,noreferrer');
      return;
    }

    if (programSettings.homepageUrl) {
      window.open(programSettings.homepageUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    alert(t.homepageMissing);
    openGeneralSettings();
  };

  return (
    <div
      className={`theme-shell theme-${programSettings.themeMode} flex h-screen flex-col overflow-hidden bg-[#edf0f2] font-sans text-gray-900`}
      style={themeVars}
    >
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
          <div className="flex w-full flex-col items-center gap-3">
            <button
              type="button"
              onClick={openServicesView}
              className={`relative flex h-12 w-full items-center justify-center ${currentView === 'services' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              title={t.nav.home}
            >
              {currentView === 'services' && <span className="absolute left-0 h-10 w-[3px] rounded-r bg-blue-500" />}
              <Home className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={openHomePage}
              className="relative flex h-10 w-full items-center justify-center text-gray-700 transition-colors hover:text-blue-600"
              title={t.nav.homepage}
            >
              <Globe2 className="h-5 w-5" />
            </button>
            {programSettings.aiChatEnabled && (
              <button
                type="button"
                onClick={openAIChatView}
                className={`relative flex h-10 w-full items-center justify-center transition-colors hover:text-blue-600 ${currentView === 'ai' ? 'text-blue-600' : 'text-gray-700'}`}
                title={t.nav.aiChat}
              >
                {currentView === 'ai' && <span className="absolute left-0 h-10 w-[3px] rounded-r bg-blue-500" />}
                <MessageSquare className="h-5 w-5 fill-current stroke-white" />
              </button>
            )}
            {programSettings.apiTesterEnabled && (
              <button
                type="button"
                onClick={openApiTesterView}
                className={`relative flex h-10 w-full items-center justify-center transition-colors hover:text-blue-600 ${currentView === 'apiTester' ? 'text-blue-600' : 'text-gray-700'}`}
                title={t.nav.apiTester}
              >
                {currentView === 'apiTester' && <span className="absolute left-0 h-10 w-[3px] rounded-r bg-blue-500" />}
                <Zap className="h-5 w-5" />
              </button>
            )}
            {programSettings.connectivityTesterEnabled && (
              <button
                type="button"
                onClick={openConnectivityView}
                className={`relative flex h-10 w-full items-center justify-center transition-colors hover:text-blue-600 ${currentView === 'connectivity' ? 'text-blue-600' : 'text-gray-700'}`}
                title={t.nav.connectivity}
              >
                {currentView === 'connectivity' && <span className="absolute left-0 h-10 w-[3px] rounded-r bg-blue-500" />}
                <Radar className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={openPatchFilesView}
              className={`relative flex h-10 w-full items-center justify-center transition-colors hover:text-blue-600 ${currentView === 'patches' ? 'text-blue-600' : 'text-gray-700'}`}
              title={t.nav.patchFiles}
            >
              {currentView === 'patches' && <span className="absolute left-0 h-10 w-[3px] rounded-r bg-blue-500" />}
              <FileText className="h-5 w-5" />
            </button>
          </div>

          <div className="flex w-full flex-col items-center gap-3">
            <button
              type="button"
              onClick={openSettingsView}
              className={`relative flex h-10 w-full items-center justify-center transition-colors hover:text-blue-600 ${currentView === 'settings' ? 'text-blue-600' : 'text-gray-700'}`}
              title={t.settings.title}
            >
              {currentView === 'settings' && <span className="absolute left-0 h-10 w-[3px] rounded-r bg-blue-500" />}
              <Settings className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={openAboutView}
              className={`relative flex h-10 w-full items-center justify-center transition-colors hover:text-blue-600 ${currentView === 'about' ? 'text-blue-600' : 'text-gray-700'}`}
              title={t.nav.about}
            >
              {currentView === 'about' && <span className="absolute left-0 h-10 w-[3px] rounded-r bg-blue-500" />}
              <Info className="h-5 w-5" />
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 gap-6 overflow-hidden px-6 py-6">
          <div className={contentShellClass}>
            {currentView === 'settings' ? (
              <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-gray-400">…</div>}>
                <SettingsView
                  refreshKey={settingsRefreshKey}
                  initialTab={settingsInitialTab}
                  onEdit={openEditForm}
                  onDelete={handleDeleteApp}
                  onToggleEnabled={handleToggleEnabled}
                  onAppsChanged={handleAppsChanged}
                  programSettings={programSettings}
                  onProgramSettingsChanged={setProgramSettings}
                  t={t}
                />
              </Suspense>
            ) : currentView === 'ai' ? (
              <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-gray-400">…</div>}>
                <AIChatView t={t} />
              </Suspense>
            ) : currentView === 'apiTester' ? (
              <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-gray-400">…</div>}>
                <ApiTesterView t={t} />
              </Suspense>
            ) : currentView === 'connectivity' ? (
              <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-gray-400">…</div>}>
                <ConnectivityTesterView t={t} />
              </Suspense>
            ) : currentView === 'patches' ? (
              <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-gray-400">…</div>}>
                <PatchFilesView t={t} language={language} />
              </Suspense>
            ) : currentView === 'about' ? (
              <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-gray-400">…</div>}>
                <AboutView t={t} />
              </Suspense>
            ) : (
              <>
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
                  programSettings.dashboardLayout === 'list' ? (
                    <div className="min-w-0 space-y-3 pb-8">
                      {apps.map(app => (
                        <AppListItem
                          key={app.config.id}
                          app={app}
                          hasError={(logs[app.config.id] || []).some(log => log.type === 'error')}
                          isSelected={selectedAppId === app.config.id}
                          onSelect={() => setSelectedAppId(app.config.id)}
                          onStart={() => handleStart(app.config.id)}
                          onStop={() => handleStop(app.config.id)}
                          onEdit={() => openEditForm(app.config)}
                          t={t}
                        />
                      ))}
                    </div>
                  ) : (
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
                          t={t}
                        />
                      ))}
                    </div>
                  )
                ) : (
                  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-white/70 px-6 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm">
                      <Layers className="h-6 w-6" />
                    </div>
                    <h3 className="mb-1 text-sm font-semibold text-gray-800">{t.noAppsTitle}</h3>
                    <p className="max-w-xs text-xs leading-relaxed text-gray-500">{t.noAppsDescription}</p>
                  </div>
                )}
              </>
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
        <span>Control Panel - Applications Dashboard v2.6.0 - Made By Victor Samuel</span>
        <span className="flex items-center gap-5">
          <span>Running: {statusSummary.running}</span>
          <span>Stopped: {statusSummary.stopped}</span>
          <span>Failed: {statusSummary.failed}</span>
        </span>
      </footer>
    </div>
  );
}
