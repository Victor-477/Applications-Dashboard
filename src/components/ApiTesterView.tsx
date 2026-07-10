import { useState } from 'react';
import { Plus, Send, Trash2, Zap } from 'lucide-react';
import type { Translation } from '../i18n';

interface ApiTesterViewProps {
  t: Translation;
}

interface HeaderRow {
  id: string;
  key: string;
  value: string;
}

interface ApiTesterResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  elapsedMs: number;
  networkError?: boolean;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function newRow(): HeaderRow {
  return { id: (globalThis.crypto?.randomUUID?.() ?? String(Math.random())), key: '', value: '' };
}

function formatBody(body: string, contentType?: string) {
  if (!body) return body;
  const type = (contentType || '').toLowerCase();
  if (type.includes('json')) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return body;
}

export default function ApiTesterView({ t }: ApiTesterViewProps) {
  const [url, setUrl] = useState('http://127.0.0.1:3000/api/apps');
  const [method, setMethod] = useState<(typeof METHODS)[number]>('GET');
  const [headers, setHeaders] = useState<HeaderRow[]>([newRow()]);
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<ApiTesterResponse | null>(null);
  const [error, setError] = useState('');

  const supportsBody = METHODS_WITH_BODY.has(method);

  const updateHeader = (id: string, patch: Partial<HeaderRow>) => {
    setHeaders(prev => prev.map(row => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeHeader = (id: string) => {
    setHeaders(prev => (prev.length <= 1 ? [newRow()] : prev.filter(row => row.id !== id)));
  };

  const sendRequest = async () => {
    setIsSending(true);
    setError('');
    setResponse(null);
    try {
      const headerPayload: Record<string, string> = {};
      for (const row of headers) {
        const key = row.key.trim();
        if (key) headerPayload[key] = row.value;
      }
      const res = await fetch('/api/api-tester', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          method,
          headers: headerPayload,
          body: supportsBody ? body : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t.apiTester.requestFailed);
        return;
      }
      setResponse(data as ApiTesterResponse);
    } catch {
      setError(t.apiTester.requestFailed);
    } finally {
      setIsSending(false);
    }
  };

  const statusTone = !response
    ? 'text-gray-500'
    : response.networkError
      ? 'text-red-600'
      : response.status >= 200 && response.status < 300
        ? 'text-green-600'
        : response.status >= 400
          ? 'text-red-600'
          : 'text-orange-600';

  const contentType = response?.headers?.['content-type'];
  const displayBody = response ? formatBody(response.body, contentType) : '';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t.apiTester.title}</h2>
          <p className="mt-1 text-sm text-gray-500">{t.apiTester.subtitle}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-blue-600 shadow-sm ring-1 ring-gray-200">
          <Zap className="h-5 w-5" />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]">
        <section className="flex min-h-0 flex-col overflow-hidden bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-stretch gap-2">
            <select
              value={method}
              onChange={event => setMethod(event.target.value as (typeof METHODS)[number])}
              className="border border-gray-300 bg-white px-3 text-sm font-bold text-gray-800 outline-none focus:border-blue-500"
            >
              {METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              value={url}
              onChange={event => setUrl(event.target.value)}
              placeholder={t.apiTester.urlPlaceholder}
              className="flex-1 border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={sendRequest}
              disabled={isSending || !url.trim()}
              className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Send className="h-4 w-4" />
              {isSending ? t.apiTester.sending : t.apiTester.send}
            </button>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{t.apiTester.headers}</span>
              <button
                type="button"
                onClick={() => setHeaders(prev => [...prev, newRow()])}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3 w-3" />
                {t.apiTester.addHeader}
              </button>
            </div>
            <div className="space-y-2">
              {headers.map(row => (
                <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-2">
                  <input
                    value={row.key}
                    onChange={event => updateHeader(row.id, { key: event.target.value })}
                    placeholder={t.apiTester.headerKey}
                    className="border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <input
                    value={row.value}
                    onChange={event => updateHeader(row.id, { value: event.target.value })}
                    placeholder={t.apiTester.headerValue}
                    className="border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeHeader(row.id)}
                    className="flex h-9 w-9 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title={t.apiTester.removeHeader}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {supportsBody && (
            <label className="mt-5 flex min-h-0 flex-1 flex-col">
              <span className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{t.apiTester.body}</span>
              <textarea
                value={body}
                onChange={event => setBody(event.target.value)}
                placeholder={t.apiTester.bodyPlaceholder}
                className="min-h-[140px] flex-1 resize-none border border-gray-300 px-3 py-2 font-mono text-xs outline-none focus:border-blue-500"
              />
            </label>
          )}

          {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{t.apiTester.response}</span>
            {response && (
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className={statusTone}>
                  {response.status || '-'} {response.statusText}
                </span>
                <span className="text-gray-500">{response.elapsedMs} ms</span>
              </div>
            )}
          </div>

          {response ? (
            <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-3">
              <details className="border border-gray-200 bg-gray-50">
                <summary className="cursor-pointer px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                  {t.apiTester.responseHeaders}
                </summary>
                <div className="border-t border-gray-200 bg-white px-3 py-2 font-mono text-xs text-gray-700">
                  {Object.entries(response.headers).length === 0 ? (
                    <span className="text-gray-400">-</span>
                  ) : (
                    <ul className="space-y-1">
                      {Object.entries(response.headers).map(([k, v]) => (
                        <li key={k}><span className="text-gray-500">{k}:</span> {v}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
              <div className="min-h-0 border border-gray-200 bg-gray-950 text-gray-100">
                <div className="border-b border-gray-800 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                  {t.apiTester.responseBody}
                </div>
                <pre className="min-h-0 overflow-auto px-3 py-3 font-mono text-xs leading-relaxed">
                  {displayBody || t.apiTester.emptyBody}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-gray-500">
              {t.apiTester.emptyResponse}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
