import { Globe2, Play, RotateCw, Settings, Square } from 'lucide-react';
import type { AppState } from '../types';
import type { Translation } from '../i18n';

interface AppListItemProps {
  app: AppState;
  hasError: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onStart: () => void;
  onStop: () => void;
  onEdit: () => void;
  t: Translation;
}

/**
 * Compact single-row representation of an instance, used when the dashboard
 * layout is set to "list" (the card equivalent is AppCard).
 */
export default function AppListItem({ app, hasError, isSelected, onSelect, onStart, onStop, onEdit, t }: AppListItemProps) {
  const isRunning = app.status === 'running';
  const statusTone = isRunning ? 'bg-[#62b43d]' : hasError ? 'bg-[#d60000]' : 'bg-gray-400';
  const statusLabel = isRunning ? 'running' : hasError ? 'failed' : 'stopped';
  const displayPort = app.activePort || app.config.port;
  const customLink = app.config.webLink?.trim();
  const openTarget = customLink || (displayPort ? `http://127.0.0.1:${displayPort}` : '');
  const canOpenApp = Boolean(openTarget);
  const openTitle = customLink ? `${t.openLink} ${customLink}` : `${t.portTitle} ${displayPort}`;

  const openApp = () => {
    if (!openTarget) return;
    window.open(openTarget, '_blank', 'noopener,noreferrer');
  };

  return (
    <article
      className={`grid min-h-[78px] w-full min-w-0 cursor-pointer grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)_minmax(0,1fr)_auto] items-center gap-4 rounded-lg border bg-white px-5 py-4 shadow-sm transition-all ${
        isSelected
          ? 'border-blue-500 shadow-[0_0_0_1px_rgba(0,149,235,0.15)]'
          : 'border-[#cfd8df] hover:border-blue-300 hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      <div className="min-w-0">
        <h3 className="truncate text-lg font-semibold text-gray-950" title={app.config.name}>{app.config.name}</h3>
        <p className="mt-1 truncate font-mono text-xs text-gray-500">
          {app.config.command} {app.config.args}
        </p>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusTone}`} />
        <span className="truncate text-sm text-gray-500">{statusLabel}</span>
      </div>

      <div className="min-w-0 truncate text-sm text-gray-500">
        {customLink ? customLink : displayPort ? `${t.portTitle} ${displayPort}` : app.config.cwd || '-'}
      </div>

      <div className="flex items-center justify-end gap-2">
        {canOpenApp && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openApp();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
            title={openTitle}
          >
            <Globe2 className="h-5 w-5" />
          </button>
        )}

        {isRunning ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onStop();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#a9bdca] text-blue-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            title={t.stop}
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onStart();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            title={t.start}
          >
            {hasError ? <RotateCw className="h-5 w-5" /> : <Play className="h-4 w-4 fill-current" />}
          </button>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#8ca6b8] transition-colors hover:bg-gray-100 hover:text-gray-700"
          title={t.edit}
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </article>
  );
}
