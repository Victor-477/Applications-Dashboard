import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, FolderOpen, Globe, Play, Square, XCircle } from 'lucide-react';
import type { Translation } from '../i18n';

interface WebServerViewProps {
  t: Translation;
}

interface WebServerStatus {
  running: boolean;
  port: number;
  folder: string;
  url: string;
  startedAt: string;
}

const EMPTY_STATUS: WebServerStatus = { running: false, port: 0, folder: '', url: '', startedAt: '' };

export default function WebServerView({ t }: WebServerViewProps) {
  const [folder, setFolder] = useState('');
  const [port, setPort] = useState('8080');
  const [status, setStatus] = useState<WebServerStatus>(EMPTY_STATUS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [statusRes, settingsRes] = await Promise.all([
        fetch('/api/web-server/status'),
        fetch('/api/settings'),
      ]);
      const s = (await statusRes.json()) as WebServerStatus;
      const settings = await settingsRes.json();
      setStatus(s);
      // Populate the form from either the live server or the persisted settings.
      if (s.running) {
        setFolder(s.folder);
        setPort(String(s.port));
      } else {
        if (settings.webServerRootFolder) setFolder(settings.webServerRootFolder);
        if (settings.webServerPort) setPort(String(settings.webServerPort));
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (endpoint: 'start' | 'stop') => {
    setBusy(true);
    setError('');
    try {
      const body = endpoint === 'start' ? { folder: folder.trim(), port: Number(port) || 0 } : {};
      const res = await fetch(`/api/web-server/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t.webServer.actionFailed);
        return;
      }
      setStatus(data as WebServerStatus);
    } catch {
      setError(t.webServer.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  const StatusIcon = status.running ? CheckCircle2 : XCircle;
  const statusTone = status.running ? 'text-green-600' : 'text-gray-500';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t.webServer.title}</h2>
          <p className="mt-1 text-sm text-gray-500">{t.webServer.subtitle}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-blue-600 shadow-sm ring-1 ring-gray-200">
          <Globe className="h-5 w-5" />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
        <section className="flex min-h-0 flex-col overflow-auto bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.webServer.rootFolder}</span>
              <div className="flex gap-2">
                <input
                  value={folder}
                  onChange={event => setFolder(event.target.value)}
                  placeholder={t.webServer.rootFolderPlaceholder}
                  disabled={status.running}
                  className="flex-1 border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
                <span className="flex h-10 w-10 items-center justify-center border border-gray-200 text-gray-400" aria-hidden>
                  <FolderOpen className="h-4 w-4" />
                </span>
              </div>
              <span className="mt-1 block text-xs font-medium text-gray-500">{t.webServer.rootFolderHelp}</span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.webServer.port}</span>
              <input
                type="number"
                min={1}
                max={65535}
                value={port}
                onChange={event => setPort(event.target.value)}
                disabled={status.running}
                placeholder="8080"
                className="w-40 border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4">
              {status.running ? (
                <button
                  type="button"
                  onClick={() => submit('stop')}
                  disabled={busy}
                  className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <Square className="h-3 w-3 fill-current" />
                  {t.webServer.stop}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => submit('start')}
                  disabled={busy || !folder.trim()}
                  className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <Play className="h-3 w-3 fill-current" />
                  {t.webServer.start}
                </button>
              )}
              {status.running && (
                <a
                  href={status.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t.webServer.openInBrowser}
                </a>
              )}
            </div>

            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">{t.webServer.status}</h3>
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${statusTone}`} />
            <span className={`text-sm font-bold ${statusTone}`}>
              {status.running ? t.webServer.stateRunning : t.webServer.stateStopped}
            </span>
          </div>
          {status.running && (
            <dl className="mt-4 grid gap-2 text-xs">
              <div>
                <dt className="font-bold uppercase tracking-wide text-gray-500">{t.webServer.url}</dt>
                <dd className="mt-0.5 font-mono text-gray-800">{status.url}</dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wide text-gray-500">{t.webServer.port}</dt>
                <dd className="mt-0.5 font-mono text-gray-800">{status.port}</dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wide text-gray-500">{t.webServer.rootFolder}</dt>
                <dd className="mt-0.5 break-all font-mono text-gray-800">{status.folder}</dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wide text-gray-500">{t.webServer.startedAt}</dt>
                <dd className="mt-0.5 text-gray-800">{new Date(status.startedAt).toLocaleString()}</dd>
              </div>
            </dl>
          )}
          <p className="mt-6 border-l-2 border-blue-500 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
            {t.webServer.securityNote}
          </p>
        </aside>
      </div>
    </div>
  );
}
