import { useEffect, useState } from 'react';
import { Code, Play, Plus, Save, Trash2 } from 'lucide-react';
import type { Script, ScriptLanguage } from '../types';
import type { Translation } from '../i18n';

interface ScriptsViewProps {
  t: Translation;
}

interface RunResult {
  ok: boolean;
  elapsedMs: number;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

const LANGUAGES: ScriptLanguage[] = ['python', 'javascript', 'rust'];

const LANG_LABEL: Record<ScriptLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  rust: 'Rust',
};

const DEFAULT_TEMPLATE: Record<ScriptLanguage, string> = {
  python: 'print("Hello from Python!")\n',
  javascript: 'console.log("Hello from JavaScript!");\n',
  rust: 'fn main() {\n    println!("Hello from Rust!");\n}\n',
};

export default function ScriptsView({ t }: ScriptsViewProps) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Script | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RunResult | null>(null);

  const selected = scripts.find(s => s.id === selectedId);

  const load = async () => {
    try {
      const res = await fetch('/api/scripts');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'load failed');
      setScripts(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
        setDraft(data[0]);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selected) setDraft(selected);
    setResult(null);
    setError('');
  }, [selectedId]);

  const createScript = async () => {
    const language: ScriptLanguage = 'python';
    const res = await fetch('/api/scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: t.scripts.defaultName, language, source: DEFAULT_TEMPLATE[language] }),
    });
    const created = await res.json();
    if (!res.ok) {
      setError(created?.error || t.scripts.saveFailed);
      return;
    }
    setScripts(prev => [...prev, created]);
    setSelectedId(created.id);
    setDraft(created);
  };

  const saveScript = async () => {
    if (!draft) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/scripts/${draft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: draft.name, language: draft.language, source: draft.source }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated?.error || 'save failed');
      setScripts(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    } catch {
      setError(t.scripts.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const deleteScript = async () => {
    if (!draft) return;
    const res = await fetch(`/api/scripts/${draft.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(t.scripts.deleteFailed);
      return;
    }
    const remaining = scripts.filter(s => s.id !== draft.id);
    setScripts(remaining);
    setSelectedId(remaining[0]?.id || null);
    setDraft(remaining[0] || null);
    setResult(null);
  };

  const runScript = async () => {
    if (!draft) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      // Persist any pending edits before running so the run reflects what the user sees.
      await saveScript();
      const res = await fetch(`/api/scripts/${draft.id}/run`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'run failed');
      setResult(data as RunResult);
    } catch {
      setError(t.scripts.runFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t.scripts.title}</h2>
          <p className="mt-1 text-sm text-gray-500">{t.scripts.subtitle}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-blue-600 shadow-sm ring-1 ring-gray-200">
          <Code className="h-5 w-5" />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(220px,0.35fr)_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <button
            type="button"
            onClick={createScript}
            className="mb-3 flex items-center justify-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {t.scripts.newScript}
          </button>
          <ul className="min-h-0 flex-1 space-y-1 overflow-auto pr-1">
            {scripts.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs text-gray-500">{t.scripts.emptyList}</li>
            ) : (
              scripts.map(script => (
                <li key={script.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(script.id)}
                    className={`w-full rounded border px-3 py-2 text-left text-sm transition-colors ${
                      script.id === selectedId
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="truncate font-semibold">{script.name}</div>
                    <div className="mt-0.5 text-xs uppercase tracking-wide text-gray-500">{LANG_LABEL[script.language]}</div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden bg-white p-4 shadow-sm ring-1 ring-gray-200">
          {draft ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <input
                  value={draft.name}
                  onChange={event => setDraft({ ...draft, name: event.target.value })}
                  placeholder={t.scripts.namePlaceholder}
                  className="flex-1 border border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                />
                <select
                  value={draft.language}
                  onChange={event => setDraft({ ...draft, language: event.target.value as ScriptLanguage })}
                  className="border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{LANG_LABEL[lang]}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={saveScript}
                  disabled={busy}
                  className="flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {t.scripts.save}
                </button>
                <button
                  type="button"
                  onClick={runScript}
                  disabled={busy}
                  className="flex items-center gap-1 rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {busy ? t.scripts.running : t.scripts.run}
                </button>
                <button
                  type="button"
                  onClick={deleteScript}
                  className="flex h-9 w-9 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title={t.scripts.delete}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={draft.source}
                onChange={event => setDraft({ ...draft, source: event.target.value })}
                spellCheck={false}
                className="min-h-[220px] flex-1 resize-none border border-gray-300 bg-gray-950 p-3 font-mono text-xs leading-relaxed text-gray-100 outline-none focus:border-blue-500"
              />
              {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
              {result && (
                <div className="mt-3 border border-gray-200">
                  <div className={`flex items-center justify-between border-b border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-wide ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
                    <span>{result.ok ? t.scripts.runOk : t.scripts.runFailedLabel}</span>
                    <span className="text-gray-500">{result.elapsedMs} ms · exit {result.exitCode ?? '-'}</span>
                  </div>
                  {result.stdout && (
                    <details className="border-b border-gray-200" open>
                      <summary className="cursor-pointer bg-gray-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-500">stdout</summary>
                      <pre className="max-h-40 overflow-auto bg-white px-3 py-2 font-mono text-xs text-gray-800 whitespace-pre-wrap">{result.stdout}</pre>
                    </details>
                  )}
                  {result.stderr && (
                    <details open>
                      <summary className="cursor-pointer bg-gray-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-600">stderr</summary>
                      <pre className="max-h-40 overflow-auto bg-white px-3 py-2 font-mono text-xs text-red-800 whitespace-pre-wrap">{result.stderr}</pre>
                    </details>
                  )}
                </div>
              )}
              <p className="mt-3 border-l-2 border-blue-500 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
                {t.scripts.runtimeNote}
              </p>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-gray-500">
              {t.scripts.selectPrompt}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
