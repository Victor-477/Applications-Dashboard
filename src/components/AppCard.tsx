import { Globe2, Play, RotateCw, Settings, Square } from 'lucide-react';
import type { AppState } from '../types';
import type { Translation } from '../i18n';

interface AppCardProps {
  app: AppState;
  hasError: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onStart: () => void;
  onStop: () => void;
  onEdit: () => void;
  t: Translation;
}

export default function AppCard({ app, hasError, isSelected, onSelect, onStart, onStop, onEdit, t }: AppCardProps) {
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
      className={`group relative flex h-[190px] min-w-0 cursor-pointer flex-col justify-between rounded-lg border bg-white px-6 py-5 transition-all ${
        isSelected
          ? 'border-blue-500 shadow-[0_0_0_1px_rgba(0,149,235,0.15)]'
          : 'border-[#cfd8df] shadow-sm hover:border-blue-300 hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      <div className="min-w-0 pr-6">
        <h3 className="truncate text-[24px] font-normal leading-tight text-gray-950" title={app.config.name}>
          {app.config.name}
        </h3>
        <div className="mt-1 flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${statusTone}`} />
          <span className="text-sm leading-none text-gray-500">{statusLabel}</span>
        </div>
      </div>

      <div>
        <div className="mb-3 h-px w-full bg-[#cfd8df]" />
        <div className="grid h-8 grid-cols-3 items-center text-[#8ca6b8]">
          {canOpenApp ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openApp();
              }}
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
              title={openTitle}
            >
              <Globe2 className="h-5 w-5" />
            </button>
          ) : (
            <span aria-hidden="true" />
          )}

          {isRunning ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onStop();
              }}
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#a9bdca] text-blue-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
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
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
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
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[#8ca6b8] transition-colors hover:bg-gray-100 hover:text-gray-700"
            title={t.edit}
          >
            <Settings className="h-6 w-6" />
          </button>
        </div>
      </div>
    </article>
  );
}
