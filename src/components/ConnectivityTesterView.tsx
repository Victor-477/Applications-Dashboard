import { useState } from 'react';
import { CheckCircle2, Radar, Send, XCircle } from 'lucide-react';
import type { Translation } from '../i18n';

interface ConnectivityTesterViewProps {
  t: Translation;
}

type ConnectivityProtocol = 'tcp' | 'http' | 'https' | 'ping';

interface ConnectivityResult {
  ok: boolean;
  message: string;
  elapsedMs: number;
  protocol: ConnectivityProtocol;
  host: string;
  port: number | null;
}

interface HistoryEntry extends ConnectivityResult {
  id: string;
  timestamp: string;
}

const PROTOCOLS: ConnectivityProtocol[] = ['tcp', 'http', 'https', 'ping'];

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Math.random());
}

export default function ConnectivityTesterView({ t }: ConnectivityTesterViewProps) {
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('80');
  const [protocol, setProtocol] = useState<ConnectivityProtocol>('tcp');
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<ConnectivityResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const requiresPort = protocol !== 'ping';

  const runTest = async () => {
    setIsTesting(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/connectivity-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.trim(),
          port: requiresPort ? Number(port) : undefined,
          protocol,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || t.connectivity.testFailed);
        return;
      }
      const payload = data as ConnectivityResult;
      setResult(payload);
      setHistory(prev => [
        { ...payload, id: newId(), timestamp: new Date().toISOString() },
        ...prev,
      ].slice(0, 8));
    } catch {
      setError(t.connectivity.testFailed);
    } finally {
      setIsTesting(false);
    }
  };

  const StatusIcon = result?.ok ? CheckCircle2 : XCircle;
  const statusTone = result?.ok ? 'text-green-600' : 'text-red-600';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t.connectivity.title}</h2>
          <p className="mt-1 text-sm text-gray-500">{t.connectivity.subtitle}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-blue-600 shadow-sm ring-1 ring-gray-200">
          <Radar className="h-5 w-5" />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
        <section className="flex min-h-0 flex-col overflow-auto bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.connectivity.host}</span>
              <input
                value={host}
                onChange={event => setHost(event.target.value)}
                placeholder={t.connectivity.hostPlaceholder}
                className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.connectivity.port}</span>
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={event => setPort(event.target.value)}
                  disabled={!requiresPort}
                  placeholder="80"
                  className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{t.connectivity.protocol}</span>
                <select
                  value={protocol}
                  onChange={event => setProtocol(event.target.value as ConnectivityProtocol)}
                  className="w-full border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  {PROTOCOLS.map(p => (
                    <option key={p} value={p}>{p.toUpperCase()}</option>
                  ))}
                </select>
              </label>
            </div>

            <p className="border-l-2 border-blue-500 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
              {t.connectivity.protocolHelp}
            </p>

            <button
              type="button"
              onClick={runTest}
              disabled={isTesting || !host.trim() || (requiresPort && !port.trim())}
              className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Send className="h-4 w-4" />
              {isTesting ? t.connectivity.testing : t.connectivity.runTest}
            </button>

            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          </div>

          {result && (
            <div className="mt-5 border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-5 w-5 ${statusTone}`} />
                <span className={`text-sm font-bold ${statusTone}`}>
                  {result.ok ? t.connectivity.reachable : t.connectivity.unreachable}
                </span>
                <span className="ml-auto text-xs font-semibold text-gray-500">{result.elapsedMs} ms</span>
              </div>
              <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                <div>
                  <dt className="font-bold uppercase tracking-wide text-gray-500">{t.connectivity.protocol}</dt>
                  <dd className="mt-0.5 font-mono text-gray-800">{result.protocol.toUpperCase()}</dd>
                </div>
                <div>
                  <dt className="font-bold uppercase tracking-wide text-gray-500">{t.connectivity.host}</dt>
                  <dd className="mt-0.5 font-mono text-gray-800">{result.host}</dd>
                </div>
                <div>
                  <dt className="font-bold uppercase tracking-wide text-gray-500">{t.connectivity.port}</dt>
                  <dd className="mt-0.5 font-mono text-gray-800">{result.port ?? '-'}</dd>
                </div>
              </dl>
              <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap border border-gray-200 bg-white p-3 font-mono text-xs text-gray-700">
                {result.message}
              </pre>
            </div>
          )}
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">{t.connectivity.history}</h3>
          {history.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-center text-xs text-gray-500">
              {t.connectivity.emptyHistory}
            </div>
          ) : (
            <ul className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
              {history.map(entry => (
                <li key={entry.id} className={`border px-3 py-2 text-xs ${entry.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-bold ${entry.ok ? 'text-green-700' : 'text-red-700'}`}>
                      {entry.ok ? '✓' : '✕'} {entry.protocol.toUpperCase()} {entry.host}{entry.port ? `:${entry.port}` : ''}
                    </span>
                    <span className="text-gray-500">{entry.elapsedMs} ms</span>
                  </div>
                  <p className="mt-1 truncate text-gray-600" title={entry.message}>{entry.message}</p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
