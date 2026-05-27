import { ExternalLink, Github, Info } from 'lucide-react';
import { Translation } from '../i18n';

interface AboutViewProps {
  t: Translation;
}

const PROFILE_URL = 'https://github.com/Victor-477';
const REPOSITORY_URL = 'https://github.com/Victor-477/Applications-Dashboard';

export default function AboutView({ t }: AboutViewProps) {
  const openExternal = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t.about.title}</h2>
          <p className="mt-1 text-sm text-gray-500">{t.about.subtitle}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-blue-600 shadow-sm ring-1 ring-gray-200">
          <Info className="h-5 w-5" />
        </div>
      </div>

      <section className="min-h-0 flex-1 overflow-auto bg-white shadow-sm ring-1 ring-gray-200">
        <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-between gap-8 px-8 py-8">
          <div className="space-y-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-600">Applications Dashboard</p>
              <h3 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">{t.about.heading}</h3>
            </div>

            <div className="space-y-4 text-base leading-7 text-gray-700">
              <p>{t.about.paragraphOne}</p>
              <p>{t.about.paragraphTwo}</p>
              <p>{t.about.paragraphThree}</p>
            </div>

            <div className="grid gap-4 border-y border-gray-200 py-5 sm:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t.about.localControl}</p>
                <p className="mt-2 text-sm text-gray-700">{t.about.localControlDescription}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t.about.instanceManagement}</p>
                <p className="mt-2 text-sm text-gray-700">{t.about.instanceManagementDescription}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t.about.patchHistory}</p>
                <p className="mt-2 text-sm text-gray-700">{t.about.patchHistoryDescription}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => openExternal(PROFILE_URL)}
              className="flex items-center gap-2 rounded-md bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
            >
              <Github className="h-4 w-4" />
              {t.about.visitProfile}
            </button>
            <button
              type="button"
              onClick={() => openExternal(REPOSITORY_URL)}
              className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              <ExternalLink className="h-4 w-4" />
              {t.about.visitRepository}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
