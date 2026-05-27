import { FileJson, X } from 'lucide-react';
import type { ChangeEvent } from 'react';
import type { Translation } from '../../i18n';

interface ImportInstancesDialogProps {
  importJsonText: string;
  instanceImportError: string;
  isImporting: boolean;
  replaceInstances: boolean;
  t: Translation;
  onClose: () => void;
  onFileSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  onImportJsonTextChange: (value: string) => void;
  onReplaceInstancesChange: (value: boolean) => void;
}

export default function ImportInstancesDialog({
  importJsonText,
  instanceImportError,
  isImporting,
  replaceInstances,
  t,
  onClose,
  onFileSelected,
  onImport,
  onImportJsonTextChange,
  onReplaceInstancesChange,
}: ImportInstancesDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <div className="w-full max-w-2xl bg-white shadow-2xl ring-1 ring-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{t.settings.importTitle}</h3>
            <p className="mt-1 text-sm text-gray-500">{t.settings.importDescription}</p>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
              <FileJson className="h-4 w-4" />
              {t.settings.selectJsonFile}
              <input type="file" accept=".json,application/json" onChange={onFileSelected} className="sr-only" />
            </label>
            <label className="flex items-center justify-between gap-4 border border-gray-200 bg-white px-3 py-3">
              <span>
                <span className="block text-sm font-semibold text-gray-800">{t.settings.replaceInstances}</span>
                <span className="mt-1 block text-xs text-gray-500">{t.settings.replaceInstancesHelp}</span>
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={replaceInstances}
                onChange={event => onReplaceInstancesChange(event.target.checked)}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.settings.pasteJson}</span>
            <textarea
              value={importJsonText}
              onChange={event => onImportJsonTextChange(event.target.value)}
              placeholder='{"apps":[...]}'
              className="min-h-[220px] w-full resize-y border border-gray-300 px-3 py-2 font-mono text-xs leading-5 text-gray-800 outline-none focus:border-blue-500"
            />
          </label>

          {instanceImportError && <p className="text-sm font-semibold text-red-600">{instanceImportError}</p>}
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
            disabled={isImporting || !importJsonText.trim()}
            onClick={onImport}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
          >
            {isImporting ? t.settings.importingInstances : t.settings.confirmImport}
          </button>
        </div>
      </div>
    </div>
  );
}
