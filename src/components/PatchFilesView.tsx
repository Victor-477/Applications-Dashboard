import { useEffect, useState } from 'react';
import { Tag } from 'lucide-react';
import { PatchNote, PatchSummary } from '../types';
import { Language, translatePatchText, Translation } from '../i18n';

interface PatchFilesViewProps {
  t: Translation;
  language: Language;
}

type PatchPanel = 'notes' | 'summary';

export default function PatchFilesView({ t, language }: PatchFilesViewProps) {
  const [version, setVersion] = useState('0.0.0');
  const [notes, setNotes] = useState<PatchNote[]>([]);
  const [patchSummary, setPatchSummary] = useState<PatchSummary | null>(null);
  const [activePanel, setActivePanel] = useState<PatchPanel>('notes');

  useEffect(() => {
    fetch('/api/patch-notes')
      .then(res => res.json())
      .then(data => {
        setVersion(data.version || '0.0.0');
        setNotes(data.notes || []);
        setPatchSummary(data.patchSummary || null);
      });
  }, []);

  const tr = (value: string) => translatePatchText(language, value);
  const summaryVersionNotes = patchSummary?.sections
    .filter(section => /^\d+\.\d+\.\d+$/.test(section.title))
    .map(section => ({
      version: section.title,
      date: section.title === patchSummary.currentVersion ? patchSummary.date || '' : '',
      title: section.title === patchSummary.currentVersion && patchSummary.mainArea
        ? patchSummary.mainArea
        : section.title,
      changes: section.items,
    })) || [];
  const visibleNotes = notes.length > 0 ? notes : summaryVersionNotes;
  const translatedSummaryTitle = (title: string) => {
    const labels: Record<string, string> = {
      'Initial baseline': t.patches.initialBaseline,
      'Important files for commits': t.patches.importantFiles,
      'Checklist before committing': t.patches.commitChecklist,
    };
    return labels[title] || tr(title);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t.patches.title}</h2>
          <p className="mt-1 text-sm text-gray-500">{t.patches.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-bold text-gray-800 shadow-sm ring-1 ring-gray-200">
          <Tag className="h-4 w-4 text-blue-500" />
          {t.patches.currentVersion}: {version}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <section className="flex min-h-0 flex-col overflow-hidden bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
              {activePanel === 'notes' ? t.patches.versionNotes : t.patches.projectSummary}
            </h3>
            <div className="flex rounded-md border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setActivePanel('notes')}
                className={`rounded px-3 py-1.5 text-xs font-bold transition-colors ${
                  activePanel === 'notes' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {t.patches.releaseNotes}
              </button>
              <button
                type="button"
                onClick={() => setActivePanel('summary')}
                className={`rounded px-3 py-1.5 text-xs font-bold transition-colors ${
                  activePanel === 'summary' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {t.patches.projectSummary}
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto pr-1">
            {activePanel === 'notes' ? (
              visibleNotes.length > 0 ? (
                <div className="space-y-4">
                  {visibleNotes.map(note => (
                    <article key={note.version} className="border border-gray-200 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">{note.version}</h4>
                          <p className="text-sm font-medium text-gray-500">{tr(note.title)}</p>
                        </div>
                        <span className="text-xs font-bold text-gray-400">{note.date || '-'}</span>
                      </div>
                      <ul className="space-y-2 text-sm text-gray-700">
                        {note.changes.map(change => (
                          <li key={change} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                            <span>{tr(change)}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[220px] items-center justify-center text-sm text-gray-500">
                  {t.patches.noSummary}
                </div>
              )
            ) : patchSummary ? (
              <div className="border border-gray-200 bg-white p-4">
                <div className="mb-4">
                  <h4 className="text-lg font-bold text-gray-900">{tr(patchSummary.title)}</h4>
                  {patchSummary.description && <p className="mt-1 text-sm text-gray-500">{tr(patchSummary.description)}</p>}
                </div>

                <dl className="mb-4 grid gap-3 border-y border-gray-200 py-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">{t.patches.summaryVersion}</dt>
                    <dd className="mt-1 font-semibold text-gray-900">{patchSummary.currentVersion || version}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">{t.patches.summaryDate}</dt>
                    <dd className="mt-1 font-semibold text-gray-900">{patchSummary.date || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">{t.patches.summaryMainArea}</dt>
                    <dd className="mt-1 text-gray-700">{patchSummary.mainArea ? tr(patchSummary.mainArea) : '-'}</dd>
                  </div>
                </dl>

                <div className="space-y-4">
                  {patchSummary.sections.map(section => (
                    <article key={section.title}>
                      <h5 className="mb-2 text-sm font-bold text-gray-900">{translatedSummaryTitle(section.title)}</h5>
                      <ul className="space-y-1.5 text-sm text-gray-700">
                        {section.items.map(item => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                            <span>{tr(item)}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-gray-500">
                {t.patches.noSummary}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
