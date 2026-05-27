import { X } from 'lucide-react';
import type { AppState } from '../../types';
import type { Translation } from '../../i18n';

export type ExportFormat = 'csv' | 'txt' | 'json' | 'ndjson' | 'log';

interface LogsExportDialogProps {
  apps: AppState[];
  clearAfterDownload: boolean;
  exportFormat: ExportFormat;
  exportLimit: number;
  exportLimitMode: 'all' | 'latest';
  exportSource: string;
  t: Translation;
  onClearAfterDownloadChange: (value: boolean) => void;
  onClose: () => void;
  onDownload: () => void;
  onExportFormatChange: (value: ExportFormat) => void;
  onExportLimitChange: (value: number) => void;
  onExportLimitModeChange: (value: 'all' | 'latest') => void;
  onExportSourceChange: (value: string) => void;
}

const formatOptions: { value: ExportFormat; label: string }[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'txt', label: 'TXT' },
  { value: 'json', label: 'JSON' },
  { value: 'ndjson', label: 'NDJSON' },
  { value: 'log', label: 'LOG' },
];

export default function LogsExportDialog({
  apps,
  clearAfterDownload,
  exportFormat,
  exportLimit,
  exportLimitMode,
  exportSource,
  t,
  onClearAfterDownloadChange,
  onClose,
  onDownload,
  onExportFormatChange,
  onExportLimitChange,
  onExportLimitModeChange,
  onExportSourceChange,
}: LogsExportDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <div className="w-full max-w-lg bg-white shadow-2xl ring-1 ring-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{t.settings.exportTitle}</h3>
            <p className="mt-1 text-sm text-gray-500">{t.settings.exportDescription}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
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
                onChange={event => onExportLimitModeChange(event.target.value as 'all' | 'latest')}
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
                onChange={event => onExportLimitChange(Number(event.target.value))}
                className="border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.instanceFilter}</span>
            <select
              value={exportSource}
              onChange={event => onExportSourceChange(event.target.value)}
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
              onChange={event => onExportFormatChange(event.target.value as ExportFormat)}
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
              onChange={event => onClearAfterDownloadChange(event.target.checked)}
            />
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-300"
          >
            {t.form.cancel}
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {t.settings.confirmDownload}
          </button>
        </div>
      </div>
    </div>
  );
}
