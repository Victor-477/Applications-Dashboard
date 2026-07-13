import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bell, CheckCheck, Info, Trash2, XCircle } from 'lucide-react';
import type { AlertRecord } from '../types';
import type { Translation } from '../i18n';

interface AlertCenterViewProps {
  t: Translation;
}

const SEVERITY_STYLE: Record<AlertRecord['severity'], { icon: typeof Info; tone: string; label: (t: Translation) => string }> = {
  info: { icon: Info, tone: 'text-blue-600', label: t => t.alerts.severityInfo },
  warning: { icon: AlertTriangle, tone: 'text-amber-600', label: t => t.alerts.severityWarning },
  error: { icon: XCircle, tone: 'text-red-600', label: t => t.alerts.severityError },
};

export default function AlertCenterView({ t }: AlertCenterViewProps) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      setUnread(Number(data.unread) || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const markRead = async (id: string) => {
    await fetch(`/api/alerts/${id}/read`, { method: 'POST' });
    await load();
  };

  const markAllRead = async () => {
    await fetch('/api/alerts/read-all', { method: 'POST' });
    await load();
  };

  const clearAll = async () => {
    await fetch('/api/alerts/clear', { method: 'POST' });
    await load();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t.alerts.title}</h2>
          <p className="mt-1 text-sm text-gray-500">{t.alerts.subtitle}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-blue-600 shadow-sm ring-1 ring-gray-200">
          <Bell className="h-5 w-5" />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">
          {unread > 0 ? t.alerts.unreadCount.replace('{count}', String(unread)) : t.alerts.allRead}
        </span>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unread === 0}
          className="flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          {t.alerts.markAllRead}
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={alerts.length === 0}
          className="flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t.alerts.clearAll}
        </button>
      </div>

      <section className="min-h-0 flex-1 overflow-auto bg-white shadow-sm ring-1 ring-gray-200">
        {alerts.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 py-12 text-center text-sm text-gray-500">
            {t.alerts.empty}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {alerts.map(alert => {
              const style = SEVERITY_STYLE[alert.severity];
              const Icon = style.icon;
              return (
                <li key={alert.id} className={`px-4 py-3 ${alert.read ? 'bg-white' : 'bg-blue-50/40'}`}>
                  <div className="flex items-start gap-3">
                    <Icon className={`h-4 w-4 shrink-0 ${style.tone}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className={`text-xs font-bold uppercase tracking-wide ${style.tone}`}>{style.label(t)}</span>
                        <span className="font-mono text-xs text-gray-500">{alert.source}</span>
                        <span className="ml-auto text-xs text-gray-400">{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 break-words text-sm text-gray-800">{alert.message}</p>
                    </div>
                    {!alert.read && (
                      <button
                        type="button"
                        onClick={() => markRead(alert.id)}
                        className="rounded border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        {t.alerts.markRead}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
