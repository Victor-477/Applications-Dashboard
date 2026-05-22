import { useEffect, useRef } from 'react';
import { AppState, LogLine } from '../types';
import { TerminalSquare, RefreshCw, Layers } from 'lucide-react';

interface LogViewerProps {
  app?: AppState;
  logs: LogLine[];
}

export default function LogViewer({ app, logs }: LogViewerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [logs]);

  if (!app) return null;

  return (
    <div className="flex flex-col h-full bg-[#121212]">
      <div className="bg-[#1e1e1e] border-b border-black/50 px-5 py-3 flex justify-between items-center shrink-0 z-10">
        <div className="flex items-center space-x-3 text-gray-200">
          <TerminalSquare className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-sans font-medium text-sm tracking-wide">{app.config.name}</h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{app.config.command} {app.config.args}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-2 bg-black/30 px-2.5 py-1.5 rounded-md border border-gray-800/50">
             <span className="text-gray-500">PID:</span>
             <span className={app.pid ? 'text-green-400 font-medium' : 'text-gray-600'}>{app.pid || '---'}</span>
          </div>
          {app.status === 'running' && (
             <div className="flex items-center text-blue-400/90 font-sans tracking-wide">
               <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
               <span className="text-[11px]">RODANDO</span>
             </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-5 py-4 font-mono text-[13px] leading-relaxed relative">
        {logs.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 space-y-3">
             <Layers className="w-10 h-10 opacity-20" />
             <p className="italic text-gray-500">Aguardando logs de execução...</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {logs.map((log) => {
              const date = new Date(log.timestamp);
              const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
              
              let colorClass = 'text-gray-300';
              if (log.type === 'error') colorClass = 'text-[#e06c75]';
              if (log.type === 'system') colorClass = 'text-[#61afef] opacity-90 italic';

              return (
                <div key={log.id} className="flex hover:bg-[#1f1f1f] px-1 -mx-1 rounded-sm break-all whitespace-pre-wrap transition-colors">
                  <span className="text-[#5c6370] w-20 shrink-0 select-none border-r border-[#2c313a] mr-3">{timeString}</span>
                  <span className={`${colorClass} flex-1`}>{log.message.replace(/\n$/, '')}</span>
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
