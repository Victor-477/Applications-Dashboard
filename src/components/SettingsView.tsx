import { useEffect, useMemo, useState } from 'react';
import { Download, Pencil, RefreshCw, Settings, Trash2, X } from 'lucide-react';
import { AppState, AppConfig, SystemLogLine } from '../types';
import { Translation } from '../i18n';

type SettingsTab = 'apps' | 'logs' | 'general';
type ExportFormat = 'csv' | 'txt' | 'json' | 'ndjson' | 'log';

interface SettingsViewProps {
  refreshKey: number;
  onEdit: (config: AppConfig) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleEnabled: (id: string, enabled: boolean) => Promise<void>;
  t: Translation;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function SettingsView({ refreshKey, onEdit, onDelete, onToggleEnabled, t }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('apps');
  const [apps, setApps] = useState<AppState[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLogLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportSource, setExportSource] = useState('all');
  const [exportLimitMode, setExportLimitMode] = useState<'all' | 'latest'>('all');
  const [exportLimit, setExportLimit] = useState(100);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [clearAfterDownload, setClearAfterDownload] = useState(false);

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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [refreshKey]);

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'apps', label: t.settings.enableApps },
    { id: 'logs', label: t.settings.systemLogs },
    { id: 'general', label: t.settings.general },
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

  const formatOptions: { value: ExportFormat; label: string }[] = [
    { value: 'csv', label: 'CSV' },
    { value: 'txt', label: 'TXT' },
    { value: 'json', label: 'JSON' },
    { value: 'ndjson', label: 'NDJSON' },
    { value: 'log', label: 'LOG' },
  ];

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
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <div className="border border-gray-200 bg-gray-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.totalApps}</p>
              <p className="mt-3 text-3xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <div className="border border-gray-200 bg-gray-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.visibleApps}</p>
              <p className="mt-3 text-3xl font-bold text-green-600">{summary.visible}</p>
            </div>
            <div className="border border-gray-200 bg-gray-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.disabledApps}</p>
              <p className="mt-3 text-3xl font-bold text-gray-500">{summary.disabled}</p>
            </div>
            <div className="border border-gray-200 bg-white p-5 sm:col-span-3">
              <div className="flex items-center gap-3 text-gray-700">
                <Settings className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-semibold">Control Panel - Applications Dashboard</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {isExportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <div className="w-full max-w-lg bg-white shadow-2xl ring-1 ring-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t.settings.exportTitle}</h3>
                <p className="mt-1 text-sm text-gray-500">{t.settings.exportDescription}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsExportOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                title={t.form.cancel}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.logQuantity}</span>
                <div className="grid grid-cols-[1fr_120px] gap-3">
                  <select
                    value={exportLimitMode}
                    onChange={event => setExportLimitMode(event.target.value as 'all' | 'latest')}
                    className="border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500"
                  >
                    <option value="all">{t.settings.allLogs}</option>
                    <option value="latest">{t.settings.latestLogs}</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    disabled={exportLimitMode === 'all'}
                    value={exportLimit}
                    onChange={event => setExportLimit(Number(event.target.value))}
                    className="border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.instanceFilter}</span>
                <select
                  value={exportSource}
                  onChange={event => setExportSource(event.target.value)}
                  className="w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500"
                >
                  <option value="all">{t.settings.allInstances}</option>
                  {apps.map(app => (
                    <option key={app.config.id} value={app.config.id}>{app.config.name}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.logFormat}</span>
                <select
                  value={exportFormat}
                  onChange={event => setExportFormat(event.target.value as ExportFormat)}
                  className="w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500"
                >
                  {formatOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="flex items-center justify-between border border-gray-200 px-3 py-3">
                <span className="text-sm font-medium text-gray-700">{t.settings.clearAfterDownload}</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={clearAfterDownload}
                  onChange={event => setClearAfterDownload(event.target.checked)}
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setIsExportOpen(false)}
                className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-300"
              >
                {t.form.cancel}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                {t.settings.confirmDownload}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
