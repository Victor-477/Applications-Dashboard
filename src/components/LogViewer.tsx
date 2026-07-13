import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Layers, MoreHorizontal, RefreshCw, RotateCw, TerminalSquare, X } from 'lucide-react';
import { Translation } from '../i18n';
import { AppState, LogLine } from '../types';

interface LogViewerProps {
  app?: AppState;
  logs: LogLine[];
  onClose: () => void;
  t: Translation;
}

export default function LogViewer({ app, logs, onClose, t }: LogViewerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [actionError, setActionError] = useState('');

  const visibleLines = useMemo(() => {
    return logs.flatMap((log) => {
      const date = new Date(log.timestamp);
      const timeString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
      const lines = log.message.replace(/\n$/, '').split(/\r?\n/);

      return lines.map((line, index) => ({
        id: `${log.id}-${index}`,
        type: log.type,
        content: index === 0 ? `${timeString}  ${line}` : line
      }));
    });
  }, [logs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [visibleLines]);

  // Close the menu on any click outside of it.
  useEffect(() => {
    if (!isMenuOpen) return;
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMenuOpen]);

  if (!app) return null;

  const detach = () => {
    setIsMenuOpen(false);
    const url = new URL(window.location.origin);
    url.searchParams.set('floating', app.config.id);
    window.open(url.toString(), `floating-${app.config.id}`, 'popup,width=880,height=520,noopener');
  };

  const openInSystemTerminal = async () => {
    setIsMenuOpen(false);
    setActionError('');
    try {
      const res = await fetch(`/api/apps/${app.config.id}/open-terminal`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data?.error || t.logMenu.openTerminalError);
      }
    } catch {
      setActionError(t.logMenu.openTerminalError);
    }
  };

  const restart = async () => {
    setIsMenuOpen(false);
    setActionError('');
    try {
      if (app.status === 'running') {
        await fetch(`/api/apps/${app.config.id}/stop`, { method: 'POST' });
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      const res = await fetch(`/api/apps/${app.config.id}/start`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data?.error || t.logMenu.restartError);
      }
    } catch {
      setActionError(t.logMenu.restartError);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#1d1d1d] shadow-xl ring-1 ring-black/10">
      <div className="flex h-10 shrink-0 items-center justify-between bg-black px-4 text-white">
        <div className="min-w-0 text-xs font-semibold text-gray-300">
          <span className="truncate">{app.config.name}</span>
          {app.status === 'running' && (
            <span className="ml-3 inline-flex items-center text-[11px] font-medium text-blue-300">
              <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" />
              {t.running}
            </span>
          )}
        </div>

        <div ref={menuRef} className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMenuOpen(prev => !prev)}
            className={`flex h-7 w-7 items-center justify-center rounded text-white transition-colors hover:bg-white/10 ${isMenuOpen ? 'bg-white/10' : ''}`}
            title={t.logMenu.menuTitle}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-white transition-colors hover:bg-white/10"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-9 z-10 w-56 overflow-hidden rounded border border-gray-700 bg-[#1d1d1d] py-1 text-sm text-gray-100 shadow-xl" role="menu">
              <button
                type="button"
                onClick={detach}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/10"
                role="menuitem"
              >
                <ExternalLink className="h-4 w-4 text-blue-300" />
                {t.logMenu.detach}
              </button>
              <button
                type="button"
                onClick={openInSystemTerminal}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/10"
                role="menuitem"
              >
                <TerminalSquare className="h-4 w-4 text-blue-300" />
                {t.logMenu.openInSystemTerminal}
              </button>
              <button
                type="button"
                onClick={restart}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/10"
                role="menuitem"
              >
                <RotateCw className="h-4 w-4 text-blue-300" />
                {t.logMenu.restart}
              </button>
            </div>
          )}
        </div>
      </div>

      {actionError && (
        <div className="border-b border-red-900/40 bg-red-950/40 px-4 py-2 text-xs font-semibold text-red-300">
          {actionError}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto px-6 py-4 font-mono text-[14px] leading-[1.55]">
        {visibleLines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-500">
            <Layers className="h-10 w-10 opacity-25" />
            <p className="text-sm italic">{t.waitingLogs}</p>
          </div>
        ) : (
          <div className="min-w-max">
            {visibleLines.map((line, index) => {
              let colorClass = 'text-gray-100';
              if (line.type === 'error') colorClass = 'text-[#ff8a8a]';
              if (line.type === 'system') colorClass = 'text-[#89c4ff]';

              return (
                <div key={line.id} className="grid grid-cols-[44px_minmax(620px,1fr)] hover:bg-white/[0.04]">
                  <span className="select-none pr-5 text-right text-[#8e9399]">{index + 1}</span>
                  <span className={`whitespace-pre-wrap break-words border-l border-[#303030] pl-3 ${colorClass}`}>
                    {line.content}
                  </span>
                </div>
              );
            })}
            <div ref={bottomRef} className="h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
