import { useEffect, useMemo, useState } from 'react';
import { Download, Globe, Globe2, LayoutGrid, List, MessageSquare, Moon, Palette, Pencil, Radar, RefreshCw, Server, Settings, Sun, Trash2, Upload, Zap } from 'lucide-react';
import ImportInstancesDialog from './settings/ImportInstancesDialog';
import LogsExportDialog, { type ExportFormat } from './settings/LogsExportDialog';
import type { ChangeEvent, FormEvent } from 'react';
import type { AppState, AppConfig, ProgramSettings, SettingsTab, SystemLogLine } from '../types';
import type { Translation } from '../i18n';

interface SettingsViewProps {
  refreshKey: number;
  initialTab: SettingsTab;
  onEdit: (config: AppConfig) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleEnabled: (id: string, enabled: boolean) => Promise<void>;
  onAppsChanged: () => Promise<void>;
  programSettings: ProgramSettings;
  onProgramSettingsChanged: (settings: ProgramSettings) => void;
  t: Translation;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function SettingsView({
  refreshKey,
  initialTab,
  onEdit,
  onDelete,
  onToggleEnabled,
  onAppsChanged,
  programSettings: currentProgramSettings,
  onProgramSettingsChanged,
  t,
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [apps, setApps] = useState<AppState[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLogLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [programSettings, setProgramSettings] = useState<ProgramSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    homepageMode: currentProgramSettings.homepageMode,
    homepageUrl: 'http://localhost',
    aiProvider: 'openai',
    aiModel: 'gpt-4o-mini',
    aiBaseUrl: '',
    aiApiKey: '',
    themeMode: currentProgramSettings.themeMode,
    accentColor: currentProgramSettings.accentColor,
    dashboardLayout: currentProgramSettings.dashboardLayout,
    aiChatEnabled: currentProgramSettings.aiChatEnabled,
    apiTesterEnabled: currentProgramSettings.apiTesterEnabled,
    connectivityTesterEnabled: currentProgramSettings.connectivityTesterEnabled,
    internalApiPort: currentProgramSettings.internalApiPort,
    internalApiRemoteAccess: currentProgramSettings.internalApiRemoteAccess,
    advancedFeaturesEnabled: currentProgramSettings.advancedFeaturesEnabled,
    webServerEnabled: currentProgramSettings.webServerEnabled,
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportSource, setExportSource] = useState('all');
  const [exportLimitMode, setExportLimitMode] = useState<'all' | 'latest'>('all');
  const [exportLimit, setExportLimit] = useState(100);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [clearAfterDownload, setClearAfterDownload] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [replaceInstances, setReplaceInstances] = useState(false);
  const [instanceImportMessage, setInstanceImportMessage] = useState('');
  const [instanceImportError, setInstanceImportError] = useState('');
  const [showCustomColorInput, setShowCustomColorInput] = useState(false);
  const [customColorDraft, setCustomColorDraft] = useState(currentProgramSettings.accentColor.replace('#', ''));
  const [homepageTemplateCustom, setHomepageTemplateCustom] = useState(false);
  const [homepageTemplateError, setHomepageTemplateError] = useState('');
  const [internalFolder, setInternalFolder] = useState<{ path: string; entries: Array<{ name: string; isDirectory: boolean; size: number }> } | null>(null);
  const [internalFolderError, setInternalFolderError] = useState('');
  const [newInternalFolderName, setNewInternalFolderName] = useState('');

  const summary = useMemo(() => {
    return apps.reduce(
      (acc, app) => {
        acc.total += 1;
        if (app.config.enabled === false) acc.disabled += 1;
        else acc.visible += 1;
        return acc;
      },
      { total: 0, visible: 0, disabled: 0 }
    );
  }, [apps]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [appsRes, logsRes] = await Promise.all([
        fetch('/api/apps/all'),
        fetch('/api/system-logs')
      ]);
      setApps(await appsRes.json());
      setSystemLogs(await logsRes.json());
      const settingsRes = await fetch('/api/settings');
      const settings = await settingsRes.json();
      setProgramSettings(settings);
      onProgramSettingsChanged(settings);
      try {
        const templateRes = await fetch('/api/homepage-template');
        const templateState = await templateRes.json();
        setHomepageTemplateCustom(Boolean(templateState.custom));
      } catch {
        setHomepageTemplateCustom(false);
      }
      try {
        const folderRes = await fetch('/api/internal-folder');
        const folderState = await folderRes.json();
        if (folderRes.ok) setInternalFolder(folderState);
      } catch { /* ignore */ }
      setSettingsForm(prev => ({
        ...prev,
        homepageMode: settings.homepageMode || 'internal',
        homepageUrl: settings.homepageUrl || 'http://localhost',
        aiProvider: settings.aiProvider || 'openai',
        aiModel: settings.aiModel || 'gpt-4o-mini',
        aiBaseUrl: settings.aiBaseUrl || '',
        aiApiKey: '',
        themeMode: settings.themeMode || 'light',
        accentColor: settings.accentColor || '#009dea',
        dashboardLayout: settings.dashboardLayout || 'cards',
        aiChatEnabled: Boolean(settings.aiChatEnabled),
        apiTesterEnabled: Boolean(settings.apiTesterEnabled),
        connectivityTesterEnabled: Boolean(settings.connectivityTesterEnabled),
        internalApiPort: Number(settings.internalApiPort) || 0,
        internalApiRemoteAccess: Boolean(settings.internalApiRemoteAccess),
        advancedFeaturesEnabled: settings.advancedFeaturesEnabled !== false,
        webServerEnabled: Boolean(settings.webServerEnabled),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [refreshKey]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setSettingsForm(prev => ({
      ...prev,
      homepageMode: currentProgramSettings.homepageMode,
      themeMode: currentProgramSettings.themeMode,
      accentColor: currentProgramSettings.accentColor,
      dashboardLayout: currentProgramSettings.dashboardLayout,
      aiChatEnabled: currentProgramSettings.aiChatEnabled,
      apiTesterEnabled: currentProgramSettings.apiTesterEnabled,
      connectivityTesterEnabled: currentProgramSettings.connectivityTesterEnabled,
      internalApiPort: currentProgramSettings.internalApiPort,
      internalApiRemoteAccess: currentProgramSettings.internalApiRemoteAccess,
      advancedFeaturesEnabled: currentProgramSettings.advancedFeaturesEnabled,
      webServerEnabled: currentProgramSettings.webServerEnabled,
    }));
    setCustomColorDraft(currentProgramSettings.accentColor.replace('#', ''));
  }, [
    currentProgramSettings.homepageMode,
    currentProgramSettings.themeMode,
    currentProgramSettings.accentColor,
    currentProgramSettings.dashboardLayout,
    currentProgramSettings.aiChatEnabled,
    currentProgramSettings.apiTesterEnabled,
    currentProgramSettings.connectivityTesterEnabled,
    currentProgramSettings.internalApiPort,
    currentProgramSettings.internalApiRemoteAccess,
    currentProgramSettings.advancedFeaturesEnabled,
    currentProgramSettings.webServerEnabled,
  ]);

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'apps', label: t.settings.enableApps },
    { id: 'logs', label: t.settings.systemLogs },
    { id: 'general', label: t.settings.general },
    { id: 'style', label: t.settings.style },
    { id: 'advanced', label: t.settings.advanced },
  ];

  const accentSwatches = [
    { color: '#009dea', label: t.settings.defaultBlue },
    { color: '#2563eb', label: t.settings.oceanBlue },
    { color: '#16a34a', label: t.settings.operationGreen },
    { color: '#dc2626', label: t.settings.alertRed },
    { color: '#9333ea', label: t.settings.signalPurple },
    { color: '#f97316', label: t.settings.energyOrange },
    { color: '#ffffff', label: t.settings.cleanWhite },
  ];

  const handleToggle = async (app: AppState) => {
    await onToggleEnabled(app.config.id, app.config.enabled === false);
    await loadSettings();
  };

  const handleDelete = async (id: string) => {
    await onDelete(id);
    await loadSettings();
  };

  const handleDownload = async () => {
    const params = new URLSearchParams({
      format: exportFormat,
      source: exportSource,
      clear: clearAfterDownload ? 'true' : 'false',
    });

    if (exportLimitMode === 'latest') {
      params.set('limit', String(Math.max(1, exportLimit)));
    }

    const response = await fetch(`/api/system-logs/export?${params.toString()}`);
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const fileNameMatch = disposition.match(/filename="([^"]+)"/);
    const fileName = fileNameMatch?.[1] || `system-logs.${exportFormat}`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setIsExportOpen(false);
    await loadSettings();
  };

  const handleBackupInstances = async () => {
    const response = await fetch('/api/apps/export');
    if (!response.ok) {
      setInstanceImportError(t.settings.instanceBackupFailed);
      return;
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const fileNameMatch = disposition.match(/filename="([^"]+)"/);
    const fileName = fileNameMatch?.[1] || 'instances-backup.json';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const importInstancesFromJsonText = async (text: string) => {
    setInstanceImportMessage('');
    setInstanceImportError('');
    setIsImporting(true);

    try {
      const payload = JSON.parse(text);
      const appsToImport = Array.isArray(payload) ? payload : payload.apps;
      if (!Array.isArray(appsToImport)) throw new Error(t.settings.importJsonInvalid);

      const response = await fetch('/api/apps/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apps: appsToImport, replace: replaceInstances }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t.settings.instanceImportFailed);

      setInstanceImportMessage(`${t.settings.instanceImportSuccess}: ${result.imported}`);
      setImportJsonText('');
      setIsImportOpen(false);
      await onAppsChanged();
      await loadSettings();
    } catch (error) {
      setInstanceImportError(`${t.settings.instanceImportFailed}: ${(error as Error).message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportInstances = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const text = await file.text();
    setImportJsonText(text);
    await importInstancesFromJsonText(text);
  };

  const handleCustomColorChange = (value: string) => {
    const sanitized = value.replace(/[^0-9a-f]/gi, '').slice(0, 6);
    setCustomColorDraft(sanitized);
    if (sanitized.length === 6) {
      setSettingsForm({ ...settingsForm, accentColor: `#${sanitized}` });
    }
  };

  const persistProgramSettings = async () => {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsForm),
    });
    const settings = await response.json();
    setProgramSettings(settings);
    onProgramSettingsChanged(settings);
    setSettingsForm(prev => ({ ...prev, aiApiKey: '' }));
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const saveProgramSettings = async (event: FormEvent) => {
    event.preventDefault();
    await persistProgramSettings();
  };

  const handleHomepageTemplateUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setHomepageTemplateError('');
    try {
      const html = await file.text();
      const response = await fetch('/api/homepage-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      });
      if (!response.ok) throw new Error('upload failed');
      const result = await response.json();
      setHomepageTemplateCustom(Boolean(result.custom));
    } catch {
      setHomepageTemplateError(t.settings.homepageUploadError);
    }
  };

  const handleHomepageTemplateReset = async () => {
    setHomepageTemplateError('');
    try {
      const response = await fetch('/api/homepage-template', { method: 'DELETE' });
      const result = await response.json();
      setHomepageTemplateCustom(Boolean(result.custom));
    } catch {
      setHomepageTemplateError(t.settings.homepageUploadError);
    }
  };

  const handleHomepagePreview = () => {
    window.open('/internal-homepage', '_blank', 'noopener,noreferrer');
  };

  const refreshInternalFolder = async () => {
    setInternalFolderError('');
    try {
      const res = await fetch('/api/internal-folder');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'load failed');
      setInternalFolder(data);
    } catch {
      setInternalFolderError(t.settings.internalFolderLoadError);
    }
  };

  const handleCreateInternalFolder = async () => {
    const name = newInternalFolderName.trim();
    if (!name) return;
    setInternalFolderError('');
    try {
      const res = await fetch('/api/internal-folder/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'create failed');
      setNewInternalFolderName('');
      await refreshInternalFolder();
    } catch {
      setInternalFolderError(t.settings.internalFolderCreateError);
    }
  };

  const handleDeleteInternalEntry = async (name: string) => {
    setInternalFolderError('');
    try {
      const res = await fetch(`/api/internal-folder/entry?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      await refreshInternalFolder();
    } catch {
      setInternalFolderError(t.settings.internalFolderDeleteError);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t.settings.title}</h2>
          <p className="mt-1 text-sm text-gray-500">{t.settings.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={loadSettings}
          className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {t.settings.reload}
        </button>
      </div>

      <div className="mb-5 flex gap-2 border-b border-gray-300">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-white shadow-sm ring-1 ring-gray-200">
        {activeTab === 'apps' && (
          <div className="divide-y divide-gray-200">
            <div className="grid grid-cols-[minmax(220px,1fr)_150px_220px] gap-4 bg-gray-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
              <span>{t.settings.appName}</span>
              <span>{t.settings.status}</span>
              <span className="text-right">{t.settings.actions}</span>
            </div>

            {apps.map(app => {
              const enabled = app.config.enabled !== false;
              return (
                <div key={app.config.id} className="grid grid-cols-[minmax(220px,1fr)_150px_220px] items-center gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{app.config.name}</p>
                    <p className="mt-1 truncate font-mono text-xs text-gray-500">{app.config.command} {app.config.args}</p>
                  </div>
                  <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                    enabled ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'
                  }`}>
                    {enabled ? t.settings.enabled : t.settings.disabled}
                  </span>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggle(app)}
                      className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      {enabled ? t.settings.disable : t.settings.enable}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(app.config)}
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
                      title={t.edit}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(app.config.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
                      title={t.delete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="flex h-full min-h-[420px] flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-3">
              <span className="text-sm font-semibold text-gray-700">{t.settings.systemLogs}</span>
              <button
                type="button"
                onClick={() => setIsExportOpen(true)}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                {t.settings.downloadCsv}
              </button>
            </div>

            {systemLogs.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-500">{t.settings.noLogs}</div>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto">
                <div className="grid min-w-[760px] grid-cols-[180px_90px_160px_minmax(280px,1fr)] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                  <span>{t.settings.date}</span>
                  <span>Type</span>
                  <span>{t.settings.source}</span>
                  <span>{t.settings.message}</span>
                </div>
                {systemLogs.map(log => (
                  <div key={log.id} className="grid min-w-[760px] grid-cols-[180px_90px_160px_minmax(280px,1fr)] gap-4 border-b border-gray-100 px-5 py-3 text-sm text-gray-700">
                    <span className="text-xs text-gray-500">{formatDate(log.timestamp)}</span>
                    <span className={`text-xs font-bold ${log.type === 'error' ? 'text-red-600' : log.type === 'system' ? 'text-blue-600' : 'text-gray-500'}`}>{log.type}</span>
                    <span className="truncate font-mono text-xs text-gray-500">{log.source}</span>
                    <span className="break-words">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'general' && (
          <div className="grid min-h-full gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <form onSubmit={saveProgramSettings} className="space-y-5">
              <section className="border border-gray-200 bg-white">
                <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                  <h3 className="text-sm font-bold text-gray-900">{t.settings.homepageCategory}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t.settings.homepageCategoryDescription}</p>
                </div>
                <div className="space-y-5 px-5 py-5">
                  <div>
                    <span className="mb-3 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.homepageMode}</span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, homepageMode: 'internal' })}
                        className={`flex items-start gap-3 border px-4 py-4 text-left transition-colors ${
                          settingsForm.homepageMode === 'internal'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Server className="mt-0.5 h-5 w-5 shrink-0" />
                        <span>
                          <span className="block text-sm font-bold">{t.settings.homepageInternal}</span>
                          <span className="mt-1 block text-xs font-medium text-gray-500">{t.settings.homepageInternalDescription}</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, homepageMode: 'custom' })}
                        className={`flex items-start gap-3 border px-4 py-4 text-left transition-colors ${
                          settingsForm.homepageMode === 'custom'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Globe2 className="mt-0.5 h-5 w-5 shrink-0" />
                        <span>
                          <span className="block text-sm font-bold">{t.settings.homepageCustom}</span>
                          <span className="mt-1 block text-xs font-medium text-gray-500">{t.settings.homepageCustomDescription}</span>
                        </span>
                      </button>
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.homepageUrl}</span>
                    <input
                      value={settingsForm.homepageUrl}
                      onChange={event => setSettingsForm({ ...settingsForm, homepageUrl: event.target.value })}
                      placeholder={t.settings.homepageUrlPlaceholder}
                      disabled={settingsForm.homepageMode === 'internal'}
                      className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </label>

                  {settingsForm.homepageMode === 'internal' && (
                    <div className="border border-gray-200 bg-gray-50 px-4 py-4">
                      <span className="block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.homepageTemplate}</span>
                      <p className="mt-1 text-xs font-medium text-gray-500">{t.settings.homepageTemplateDescription}</p>
                      <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
                        <span className={`h-2.5 w-2.5 rounded-full ${homepageTemplateCustom ? 'bg-blue-500' : 'bg-gray-400'}`} />
                        <span className="text-gray-700">
                          {homepageTemplateCustom ? t.settings.homepageTemplateCustomBadge : t.settings.homepageTemplateDefaultBadge}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <label className="flex cursor-pointer items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50">
                          <Upload className="h-4 w-4" />
                          {t.settings.homepageUpload}
                          <input type="file" accept=".html,text/html" className="hidden" onChange={handleHomepageTemplateUpload} />
                        </label>
                        <button
                          type="button"
                          onClick={handleHomepagePreview}
                          className="flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          <Globe2 className="h-4 w-4" />
                          {t.settings.homepagePreview}
                        </button>
                        {homepageTemplateCustom && (
                          <button
                            type="button"
                            onClick={handleHomepageTemplateReset}
                            className="flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t.settings.homepageReset}
                          </button>
                        )}
                      </div>
                      {homepageTemplateError && <p className="mt-2 text-sm font-semibold text-red-600">{homepageTemplateError}</p>}
                    </div>
                  )}
                </div>
              </section>

              <section className="border border-gray-200 bg-white">
                <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                  <h3 className="text-sm font-bold text-gray-900">{t.settings.advancedMasterCategory}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t.settings.advancedMasterCategoryDescription}</p>
                </div>
                <div className="px-5 py-5">
                  <label className="flex cursor-pointer items-start gap-3 border border-gray-200 bg-white px-4 py-4 transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={settingsForm.advancedFeaturesEnabled}
                      onChange={event => setSettingsForm({ ...settingsForm, advancedFeaturesEnabled: event.target.checked })}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-gray-900">{t.settings.advancedMasterToggle}</span>
                        <span className={`text-xs font-bold ${settingsForm.advancedFeaturesEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                          {settingsForm.advancedFeaturesEnabled ? t.settings.featureOn : t.settings.featureOff}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-gray-500">{t.settings.advancedMasterDescription}</p>
                    </div>
                  </label>
                </div>
              </section>

              <section className="border border-gray-200 bg-white">
                <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                  <h3 className="text-sm font-bold text-gray-900">{t.settings.internalApiCategory}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t.settings.internalApiCategoryDescription}</p>
                </div>
                <div className="space-y-5 px-5 py-5">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.internalApiPort}</span>
                    <input
                      type="number"
                      min={0}
                      max={65535}
                      value={settingsForm.internalApiPort || ''}
                      onChange={event => setSettingsForm({ ...settingsForm, internalApiPort: Number(event.target.value) || 0 })}
                      placeholder={t.settings.internalApiPortPlaceholder}
                      className="w-full max-w-xs border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <span className="mt-1.5 block text-xs font-medium text-gray-500">{t.settings.internalApiPortHelp}</span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 border border-gray-200 bg-white px-4 py-4 transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={settingsForm.internalApiRemoteAccess}
                      onChange={event => setSettingsForm({ ...settingsForm, internalApiRemoteAccess: event.target.checked })}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-gray-900">{t.settings.internalApiRemoteAccess}</span>
                        <span className={`text-xs font-bold ${settingsForm.internalApiRemoteAccess ? 'text-green-600' : 'text-gray-400'}`}>
                          {settingsForm.internalApiRemoteAccess ? t.settings.featureOn : t.settings.featureOff}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-gray-500">{t.settings.internalApiRemoteAccessDescription}</p>
                    </div>
                  </label>

                  <p className="border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    {t.settings.internalApiRestartHint}
                  </p>
                </div>
              </section>

              <section className="border border-gray-200 bg-white">
                <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                  <h3 className="text-sm font-bold text-gray-900">{t.settings.internalFolderCategory}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t.settings.internalFolderCategoryDescription}</p>
                </div>
                <div className="space-y-4 px-5 py-5">
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.internalFolderPath}</span>
                    <p className="mt-1 break-all font-mono text-xs text-gray-700">{internalFolder?.path || '-'}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={newInternalFolderName}
                      onChange={event => setNewInternalFolderName(event.target.value)}
                      placeholder={t.settings.internalFolderNewPlaceholder}
                      className="flex-1 border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleCreateInternalFolder}
                      disabled={!newInternalFolderName.trim()}
                      className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {t.settings.internalFolderCreate}
                    </button>
                  </div>

                  <div className="border border-gray-200">
                    <div className="grid grid-cols-[minmax(0,1fr)_90px_90px] border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                      <span>{t.settings.internalFolderColName}</span>
                      <span>{t.settings.internalFolderColType}</span>
                      <span className="text-right">{t.settings.internalFolderColActions}</span>
                    </div>
                    {internalFolder && internalFolder.entries.length > 0 ? (
                      internalFolder.entries.map(entry => (
                        <div key={entry.name} className="grid grid-cols-[minmax(0,1fr)_90px_90px] items-center border-b border-gray-100 px-3 py-2 text-xs">
                          <span className="truncate font-mono text-gray-800" title={entry.name}>{entry.name}</span>
                          <span className="text-gray-500">{entry.isDirectory ? t.settings.internalFolderTypeFolder : t.settings.internalFolderTypeFile}</span>
                          <span className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleDeleteInternalEntry(entry.name)}
                              className="flex h-7 w-7 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              title={t.settings.internalFolderDelete}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-xs text-gray-500">{t.settings.internalFolderEmpty}</div>
                    )}
                  </div>

                  {internalFolderError && <p className="text-xs font-semibold text-red-600">{internalFolderError}</p>}

                  <p className="border-l-2 border-blue-500 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
                    {t.settings.internalFolderNote}
                  </p>
                </div>
              </section>

              <section className="border border-gray-200 bg-white">
                <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                  <h3 className="text-sm font-bold text-gray-900">{t.settings.instancesCategory}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t.settings.instancesCategoryDescription}</p>
                </div>
                <div className="space-y-5 px-5 py-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setIsImportOpen(true)}
                      className="flex items-center justify-center gap-2 border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Upload className="h-4 w-4" />
                      {t.settings.importInstances}
                    </button>
                    <button
                      type="button"
                      onClick={handleBackupInstances}
                      className="flex items-center justify-center gap-2 border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Download className="h-4 w-4" />
                      {t.settings.backupInstances}
                    </button>
                  </div>

                  <label className="flex items-center justify-between gap-4 border border-gray-200 bg-white px-3 py-3">
                    <span>
                      <span className="block text-sm font-semibold text-gray-800">{t.settings.replaceInstances}</span>
                      <span className="mt-1 block text-xs text-gray-500">{t.settings.replaceInstancesHelp}</span>
                    </span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={replaceInstances}
                      onChange={event => setReplaceInstances(event.target.checked)}
                    />
                  </label>

                  <p className="text-xs font-medium text-gray-500">{t.settings.importInstancesHelp}</p>
                  {instanceImportMessage && <p className="text-sm font-semibold text-green-600">{instanceImportMessage}</p>}
                  {instanceImportError && <p className="text-sm font-semibold text-red-600">{instanceImportError}</p>}
                </div>
              </section>

              <div className="border border-gray-200 bg-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
                    {t.settings.saveSettings}
                  </button>
                  {settingsSaved && <span className="text-sm font-semibold text-green-600">{t.settings.settingsSaved}</span>}
                </div>
                <p className="mt-2 text-xs font-medium text-gray-500">{t.settings.saveSettingsHelp}</p>
              </div>
            </form>

            <aside className="space-y-4">
              <section className="border border-gray-200 bg-white">
                <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                  <h3 className="text-sm font-bold text-gray-900">{t.settings.overviewCategory}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t.settings.overviewCategoryDescription}</p>
                </div>
                <div className="divide-y divide-gray-200">
                  <div className="px-5 py-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.totalApps}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{summary.total}</p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.visibleApps}</p>
                    <p className="mt-2 text-3xl font-bold text-green-600">{summary.visible}</p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.disabledApps}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-500">{summary.disabled}</p>
                  </div>
                </div>
              </section>

              <section className="border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-3 text-gray-700">
                  <Settings className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-semibold">Control Panel - Applications Dashboard</p>
                    <p className="mt-1 text-xs font-medium text-gray-500">v2.9.0</p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        )}

        {activeTab === 'style' && (
          <div className="grid min-h-full gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="space-y-5">
              <div className="border border-gray-200 bg-white">
                <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                  <h3 className="text-sm font-bold text-gray-900">{t.settings.appearanceCategory}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t.settings.appearanceCategoryDescription}</p>
                </div>

                <div className="space-y-6 px-5 py-5">
                  <div>
                    <span className="mb-3 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.dashboardLayout}</span>
                    <p className="mb-3 text-xs font-medium text-gray-500">{t.settings.dashboardLayoutDescription}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, dashboardLayout: 'cards' })}
                        className={`flex items-start gap-3 border px-4 py-4 text-left transition-colors ${
                          settingsForm.dashboardLayout === 'cards'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <LayoutGrid className="mt-0.5 h-5 w-5 shrink-0" />
                        <span>
                          <span className="block text-sm font-bold">{t.settings.cardLayout}</span>
                          <span className="mt-1 block text-xs font-medium text-gray-500">{t.settings.cardLayoutDescription}</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, dashboardLayout: 'list' })}
                        className={`flex items-start gap-3 border px-4 py-4 text-left transition-colors ${
                          settingsForm.dashboardLayout === 'list'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <List className="mt-0.5 h-5 w-5 shrink-0" />
                        <span>
                          <span className="block text-sm font-bold">{t.settings.listLayout}</span>
                          <span className="mt-1 block text-xs font-medium text-gray-500">{t.settings.listLayoutDescription}</span>
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="mb-3 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.themeMode}</span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, themeMode: 'light' })}
                        className={`flex items-center gap-3 border px-4 py-4 text-left transition-colors ${
                          settingsForm.themeMode === 'light'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Sun className="h-5 w-5" />
                        <span>
                          <span className="block text-sm font-bold">{t.settings.lightTheme}</span>
                          <span className="mt-1 block text-xs font-medium text-gray-500">{t.settings.lightThemeDescription}</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, themeMode: 'dark' })}
                        className={`flex items-center gap-3 border px-4 py-4 text-left transition-colors ${
                          settingsForm.themeMode === 'dark'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Moon className="h-5 w-5" />
                        <span>
                          <span className="block text-sm font-bold">{t.settings.darkTheme}</span>
                          <span className="mt-1 block text-xs font-medium text-gray-500">{t.settings.darkThemeDescription}</span>
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="mb-3 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.accentColor}</span>
                    <div className="space-y-4">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{t.settings.predefinedColors}</p>
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-3">
                          {accentSwatches.map(({ color, label }) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                setShowCustomColorInput(false);
                                setCustomColorDraft(color.replace('#', ''));
                                setSettingsForm({ ...settingsForm, accentColor: color });
                              }}
                              className={`flex min-h-[72px] flex-col items-start justify-between border bg-white p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 ${
                                settingsForm.accentColor.toLowerCase() === color.toLowerCase()
                                  ? 'border-blue-500 ring-2 ring-blue-500/40'
                                  : 'border-gray-200'
                              }`}
                            >
                              <span
                                className="h-7 w-7 rounded border border-gray-300"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-xs font-semibold text-gray-700">{label}</span>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setShowCustomColorInput(true)}
                            className={`flex min-h-[72px] flex-col items-start justify-between border bg-white p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 ${
                              showCustomColorInput ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-gray-200'
                            }`}
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-gray-200 text-sm font-black text-gray-600">?</span>
                            <span className="text-xs font-semibold text-gray-700">{t.settings.customColor}</span>
                          </button>
                        </div>
                      </div>

                      {showCustomColorInput && (
                        <input
                          value={customColorDraft}
                          onChange={event => handleCustomColorChange(event.target.value)}
                          placeholder="009DEA"
                          maxLength={6}
                          className="w-full border border-gray-300 px-3 py-2 font-mono text-sm uppercase tracking-wide outline-none focus:border-blue-500"
                          aria-label={t.settings.customColorCode}
                        />
                      )}
                    </div>
                    <p className="mt-3 text-xs font-medium text-gray-500">{t.settings.accentColorDescription}</p>
                  </div>

                  <div className="border-t border-gray-200 pt-5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={persistProgramSettings}
                        className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                      >
                        {t.settings.saveSettings}
                      </button>
                      {settingsSaved && <span className="text-sm font-semibold text-green-600">{t.settings.settingsSaved}</span>}
                    </div>
                    <p className="mt-2 text-xs font-medium text-gray-500">{t.settings.saveSettingsHelp}</p>
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-4">
              <section className="border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-3 text-gray-700">
                  <Palette className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-semibold">{t.settings.previewTitle}</p>
                    <p className="mt-1 text-xs font-medium text-gray-500">{t.settings.previewDescription}</p>
                  </div>
                </div>
                <div className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">MariaDB</span>
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  </div>
                  <div className="my-4 h-px bg-gray-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">{t.settings.previewAction}</span>
                    <span
                      className="h-8 w-8 rounded-full"
                      style={{ backgroundColor: settingsForm.accentColor }}
                    />
                  </div>
                </div>
              </section>
            </aside>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.6fr)]">
            <section className="space-y-6">
              <section className="border border-gray-200 bg-white">
                <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                  <h3 className="text-sm font-bold text-gray-900">{t.settings.advancedCategory}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t.settings.advancedCategoryDescription}</p>
                </div>
                <div className="space-y-4 px-5 py-5">
                  <label className="flex cursor-pointer items-start gap-3 border border-gray-200 bg-white px-4 py-4 transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={settingsForm.aiChatEnabled}
                      onChange={event => setSettingsForm({ ...settingsForm, aiChatEnabled: event.target.checked })}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-gray-900">{t.settings.enableAiChat}</span>
                        <span className={`text-xs font-bold ${settingsForm.aiChatEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                          {settingsForm.aiChatEnabled ? t.settings.featureOn : t.settings.featureOff}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-gray-500">{t.settings.enableAiChatDescription}</p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 border border-gray-200 bg-white px-4 py-4 transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={settingsForm.apiTesterEnabled}
                      onChange={event => setSettingsForm({ ...settingsForm, apiTesterEnabled: event.target.checked })}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-gray-900">{t.settings.enableApiTester}</span>
                        <span className={`text-xs font-bold ${settingsForm.apiTesterEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                          {settingsForm.apiTesterEnabled ? t.settings.featureOn : t.settings.featureOff}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-gray-500">{t.settings.enableApiTesterDescription}</p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 border border-gray-200 bg-white px-4 py-4 transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={settingsForm.connectivityTesterEnabled}
                      onChange={event => setSettingsForm({ ...settingsForm, connectivityTesterEnabled: event.target.checked })}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-gray-900">{t.settings.enableConnectivity}</span>
                        <span className={`text-xs font-bold ${settingsForm.connectivityTesterEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                          {settingsForm.connectivityTesterEnabled ? t.settings.featureOn : t.settings.featureOff}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-gray-500">{t.settings.enableConnectivityDescription}</p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 border border-gray-200 bg-white px-4 py-4 transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={settingsForm.webServerEnabled}
                      onChange={event => setSettingsForm({ ...settingsForm, webServerEnabled: event.target.checked })}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-gray-900">{t.settings.enableWebServer}</span>
                        <span className={`text-xs font-bold ${settingsForm.webServerEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                          {settingsForm.webServerEnabled ? t.settings.featureOn : t.settings.featureOff}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-gray-500">{t.settings.enableWebServerDescription}</p>
                    </div>
                  </label>
                </div>
              </section>

              {settingsForm.aiChatEnabled ? (
                <section className="border border-gray-200 bg-white">
                  <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                    <h3 className="text-sm font-bold text-gray-900">{t.settings.aiCategory}</h3>
                    <p className="mt-1 text-sm text-gray-500">{t.settings.aiCategoryDescription}</p>
                  </div>
                  <div className="space-y-5 px-5 py-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.aiProvider}</span>
                        <select
                          value={settingsForm.aiProvider}
                          onChange={event => setSettingsForm({ ...settingsForm, aiProvider: event.target.value })}
                          className="w-full border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                        >
                          <option value="openai">OpenAI</option>
                          <option value="gemini">Google Gemini</option>
                          <option value="anthropic">Anthropic</option>
                          <option value="openai-compatible">OpenAI-compatible</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.aiModel}</span>
                        <input
                          value={settingsForm.aiModel}
                          onChange={event => setSettingsForm({ ...settingsForm, aiModel: event.target.value })}
                          placeholder={t.settings.aiModelPlaceholder}
                          className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                        />
                      </label>
                    </div>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.aiBaseUrl}</span>
                      <input
                        value={settingsForm.aiBaseUrl}
                        onChange={event => setSettingsForm({ ...settingsForm, aiBaseUrl: event.target.value })}
                        placeholder={t.settings.aiBaseUrlPlaceholder}
                        className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.aiApiKey}</span>
                      <input
                        type="password"
                        value={settingsForm.aiApiKey}
                        onChange={event => setSettingsForm({ ...settingsForm, aiApiKey: event.target.value })}
                        placeholder={t.settings.aiApiKeyPlaceholder}
                        className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                      {programSettings?.aiApiKeySet && <span className="mt-1.5 block text-xs font-semibold text-green-600">{t.settings.aiKeyConfigured}</span>}
                    </label>

                    <p className="border-l-2 border-blue-500 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
                      {t.settings.aiSecurityNote}
                    </p>
                  </div>
                </section>
              ) : (
                <section className="border border-dashed border-gray-300 bg-gray-50 px-5 py-6">
                  <p className="text-sm font-semibold text-gray-700">{t.settings.aiCategory}</p>
                  <p className="mt-1 text-xs font-medium text-gray-500">{t.settings.featureDisabledHint}</p>
                </section>
              )}

              <div className="border border-gray-200 bg-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={persistProgramSettings}
                    className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    {t.settings.saveSettings}
                  </button>
                  {settingsSaved && <span className="text-sm font-semibold text-green-600">{t.settings.settingsSaved}</span>}
                </div>
                <p className="mt-2 text-xs font-medium text-gray-500">{t.settings.saveSettingsHelp}</p>
              </div>
            </section>

            <aside className="space-y-4">
              <section className="border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-3 text-gray-700">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-semibold">{t.settings.enableAiChat}</p>
                    <p className={`mt-1 text-xs font-bold ${settingsForm.aiChatEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {settingsForm.aiChatEnabled ? t.settings.featureOn : t.settings.featureOff}
                    </p>
                  </div>
                </div>
              </section>
              <section className="border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-3 text-gray-700">
                  <Zap className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-semibold">{t.settings.enableApiTester}</p>
                    <p className={`mt-1 text-xs font-bold ${settingsForm.apiTesterEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {settingsForm.apiTesterEnabled ? t.settings.featureOn : t.settings.featureOff}
                    </p>
                  </div>
                </div>
              </section>
              <section className="border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-3 text-gray-700">
                  <Radar className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-semibold">{t.settings.enableConnectivity}</p>
                    <p className={`mt-1 text-xs font-bold ${settingsForm.connectivityTesterEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {settingsForm.connectivityTesterEnabled ? t.settings.featureOn : t.settings.featureOff}
                    </p>
                  </div>
                </div>
              </section>
              <section className="border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-3 text-gray-700">
                  <Globe className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-semibold">{t.settings.enableWebServer}</p>
                    <p className={`mt-1 text-xs font-bold ${settingsForm.webServerEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {settingsForm.webServerEnabled ? t.settings.featureOn : t.settings.featureOff}
                    </p>
                  </div>
                </div>
              </section>
              {!settingsForm.advancedFeaturesEnabled && (
                <section className="border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-800">{t.settings.advancedMasterHint}</p>
                </section>
              )}
            </aside>
          </div>
        )}
      </div>

      {isExportOpen && (
        <LogsExportDialog
          apps={apps}
          clearAfterDownload={clearAfterDownload}
          exportFormat={exportFormat}
          exportLimit={exportLimit}
          exportLimitMode={exportLimitMode}
          exportSource={exportSource}
          t={t}
          onClearAfterDownloadChange={setClearAfterDownload}
          onClose={() => setIsExportOpen(false)}
          onDownload={handleDownload}
          onExportFormatChange={setExportFormat}
          onExportLimitChange={setExportLimit}
          onExportLimitModeChange={setExportLimitMode}
          onExportSourceChange={setExportSource}
        />
      )}

      {isImportOpen && (
        <ImportInstancesDialog
          importJsonText={importJsonText}
          instanceImportError={instanceImportError}
          isImporting={isImporting}
          replaceInstances={replaceInstances}
          t={t}
          onClose={() => setIsImportOpen(false)}
          onFileSelected={handleImportInstances}
          onImport={() => importInstancesFromJsonText(importJsonText)}
          onImportJsonTextChange={setImportJsonText}
          onReplaceInstancesChange={setReplaceInstances}
        />
      )}
    </div>
  );
}
