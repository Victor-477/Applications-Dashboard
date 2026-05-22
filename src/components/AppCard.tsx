import { Pencil, Play, Square, Trash2, Terminal } from 'lucide-react';
import { AppState } from '../types';

interface AppCardProps {
  app: AppState;
  isSelected: boolean;
  onSelect: () => void;
  onStart: () => void;
  onStop: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function AppCard({ app, isSelected, onSelect, onStart, onStop, onEdit, onDelete }: AppCardProps) {
  const isRunning = app.status === 'running';

  return (
    <div 
      className={`relative p-4 rounded-xl border transition-all cursor-pointer group flex flex-col space-y-3 shadow-sm
        ${isSelected 
          ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-500/20' 
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
        }`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <h3 className="text-[15px] font-semibold text-gray-900 truncate max-w-[170px]" title={app.config.name}>
              {app.config.name}
            </h3>
            {app.config.port && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200" title={`Porta ${app.config.port}`}>
                :{app.config.port}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1.5 mt-1.5">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`} />
            <span className="text-xs text-gray-500 font-medium">
              {isRunning ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50"
            title="Editar"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex justify-between items-end pt-2 border-t border-gray-100/80">
        <div className="flex items-center text-xs text-gray-500 max-w-[130px]" title={app.config.command}>
           <Terminal className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-gray-400" />
           <span className="truncate font-mono text-[11px]">{app.config.command}</span>
        </div>
        <div className="flex space-x-2">
          {!isRunning ? (
            <button
              onClick={(e) => { e.stopPropagation(); onStart(); }}
              className="flex items-center space-x-1.5 bg-white hover:bg-green-50 text-gray-700 hover:text-green-700 hover:border-green-200 border border-gray-200 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm"
            >
              <Play className="w-3 h-3" />
              <span>Iniciar</span>
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onStop(); }}
              className="flex items-center space-x-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Parar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
