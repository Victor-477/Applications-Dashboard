import { useEffect, useMemo, useRef } from 'react';
import { Layers, MoreHorizontal, RefreshCw, X } from 'lucide-react';
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

  if (!app) return null;

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

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded text-white transition-colors hover:bg-white/10"
            title={app.config.command}
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
        </div>
      </div>

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
