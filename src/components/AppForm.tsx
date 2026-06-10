import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { AppConfig } from '../types';
import { Translation } from '../i18n';

interface AppFormProps {
  onClose: () => void;
  onSubmit: (config: Partial<AppConfig>) => void;
  initialConfig?: AppConfig | null;
  t: Translation;
}

function splitList(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export default function AppForm({ onClose, onSubmit, initialConfig, t }: AppFormProps) {
  const isEditing = Boolean(initialConfig);
  const [isBasicOpen, setIsBasicOpen] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(Boolean(initialConfig?.advancedEnabled));
  const [formData, setFormData] = useState({
    name: initialConfig?.name || '',
    command: initialConfig?.command || '',
    args: initialConfig?.args || '',
    port: initialConfig?.port || '',
    cwd: initialConfig?.cwd || '',
    webLink: initialConfig?.webLink || '',
    dependsOn: initialConfig?.dependsOn?.join(', ') || '',
    shell: initialConfig?.shell !== false,
    advancedEnabled: initialConfig?.advancedEnabled || false,
    alternatePorts: initialConfig?.alternatePorts?.join(', ') || '',
    secondaryCwd: initialConfig?.secondaryCwd || '',
    advancedCommand: initialConfig?.advancedCommand || '',
    advancedArgs: initialConfig?.advancedArgs || '',
    advancedShell: initialConfig?.advancedShell !== false,
  });

  const advancedLocked = isEditing;
  // Advanced settings are chosen at creation and locked afterwards, so when
  // editing an instance that never enabled them, hide the section entirely.
  const shouldShowAdvancedSection = !isEditing || Boolean(initialConfig?.advancedEnabled);
  const advancedDisabled = advancedLocked || !formData.advancedEnabled;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const basicConfig: Partial<AppConfig> = {
      name: formData.name.trim(),
      command: formData.command.trim(),
      args: formData.args.trim(),
      port: formData.port.trim(),
      cwd: formData.cwd.trim(),
      webLink: formData.webLink.trim(),
      dependsOn: splitList(formData.dependsOn),
      shell: formData.shell,
    };

    if (isEditing) {
      onSubmit(basicConfig);
      return;
    }

    onSubmit({
      ...basicConfig,
      advancedEnabled: formData.advancedEnabled,
      alternatePorts: formData.advancedEnabled ? splitList(formData.alternatePorts) : [],
      secondaryCwd: formData.advancedEnabled ? formData.secondaryCwd.trim() : '',
      advancedCommand: formData.advancedEnabled ? formData.advancedCommand.trim() : '',
      advancedArgs: formData.advancedEnabled ? formData.advancedArgs.trim() : '',
      advancedShell: formData.advancedEnabled ? formData.advancedShell : true,
    });
  };

  const fieldClass = 'w-full border-0 border-b border-gray-300 bg-transparent px-0 py-2 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 disabled:text-gray-400';

  return (
    <aside className="flex h-full min-w-[420px] flex-1 flex-col overflow-hidden bg-white shadow-sm ring-1 ring-gray-200">
      <div className="flex h-[90px] shrink-0 items-center justify-between border-b border-gray-200 px-4">
        <h2 className="truncate text-2xl font-bold text-gray-900">
          {isEditing ? initialConfig?.name || t.form.editTitle : t.form.addTitle}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded text-gray-700 transition-colors hover:bg-gray-100"
          title={t.form.cancel}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <section className={`border-b border-gray-200 ${isBasicOpen ? 'border-l-4 border-l-blue-500' : ''}`}>
            <button
              type="button"
              onClick={() => setIsBasicOpen(prev => !prev)}
              className="flex w-full items-center justify-between px-5 py-6 text-left"
            >
              <span className="text-sm font-bold text-gray-900">{t.form.basic}</span>
              <ChevronDown className={`h-5 w-5 transition-transform ${isBasicOpen ? 'rotate-180' : ''}`} />
            </button>

            {isBasicOpen && (
              <div className="space-y-5 px-5 pb-7">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-gray-400">{t.form.appName}</span>
                  <input
                    required
                    type="text"
                    className={fieldClass}
                    placeholder={t.form.appNamePlaceholder}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </label>

                <div className="grid grid-cols-2 gap-5">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-gray-400">{t.form.port}</span>
                    <input
                      type="text"
                      className={fieldClass}
                      placeholder={t.form.portPlaceholder}
                      value={formData.port}
                      onChange={e => setFormData({ ...formData, port: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-gray-400">{t.form.directory}</span>
                    <input
                      type="text"
                      className={fieldClass}
                      placeholder={t.form.directoryPlaceholder}
                      value={formData.cwd}
                      onChange={e => setFormData({ ...formData, cwd: e.target.value })}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-gray-400">{t.form.command}</span>
                  <input
                    required
                    type="text"
                    className={`${fieldClass} font-mono`}
                    placeholder={t.form.commandPlaceholder}
                    value={formData.command}
                    onChange={e => setFormData({ ...formData, command: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-gray-400">{t.form.args}</span>
                  <input
                    type="text"
                    className={`${fieldClass} font-mono`}
                    placeholder={t.form.argsPlaceholder}
                    value={formData.args}
                    onChange={e => setFormData({ ...formData, args: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-gray-400">{t.form.webLink}</span>
                  <input
                    type="text"
                    className={`${fieldClass} font-mono`}
                    placeholder={t.form.webLinkPlaceholder}
                    value={formData.webLink}
                    onChange={e => setFormData({ ...formData, webLink: e.target.value })}
                  />
                  <span className="mt-1 block text-xs font-medium text-gray-400">{t.form.webLinkHelp}</span>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-gray-400">{t.form.dependencies}</span>
                  <input
                    type="text"
                    className={`${fieldClass} font-mono`}
                    placeholder={t.form.dependenciesPlaceholder}
                    value={formData.dependsOn}
                    onChange={e => setFormData({ ...formData, dependsOn: e.target.value })}
                  />
                </label>

                <label className="flex items-center justify-between border border-gray-200 px-3 py-3">
                  <span className="text-sm font-medium text-gray-700">{t.form.shell}</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={formData.shell}
                    onChange={e => setFormData({ ...formData, shell: e.target.checked })}
                  />
                </label>
              </div>
            )}
          </section>

          {shouldShowAdvancedSection && (
          <section className={`border-b border-gray-200 ${isAdvancedOpen ? 'border-l-4 border-l-blue-500' : ''}`}>
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(prev => !prev)}
              className="flex w-full items-center justify-between px-5 py-6 text-left"
            >
              <div>
                <span className="block text-sm font-medium text-gray-900">{t.form.advanced}</span>
                {advancedLocked && <span className="mt-1 block text-xs text-gray-400">{t.form.advancedLocked}</span>}
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAdvancedOpen && (
              <div className="space-y-5 px-5 pb-7">
                <label className="flex items-center justify-between border border-gray-200 px-3 py-3">
                  <span className="text-sm font-medium text-gray-700">{t.form.enableAdvanced}</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    checked={formData.advancedEnabled}
                    disabled={advancedLocked}
                    onChange={e => setFormData({ ...formData, advancedEnabled: e.target.checked })}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-gray-400">{t.form.alternatePorts}</span>
                  <input
                    type="text"
                    className={fieldClass}
                    disabled={advancedDisabled}
                    placeholder={t.form.alternatePortsPlaceholder}
                    value={formData.alternatePorts}
                    onChange={e => setFormData({ ...formData, alternatePorts: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-gray-400">{t.form.secondaryDirectory}</span>
                  <input
                    type="text"
                    className={fieldClass}
                    disabled={advancedDisabled}
                    placeholder={t.form.secondaryDirectoryPlaceholder}
                    value={formData.secondaryCwd}
                    onChange={e => setFormData({ ...formData, secondaryCwd: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-gray-400">{t.form.advancedCommand}</span>
                  <input
                    type="text"
                    className={`${fieldClass} font-mono`}
                    disabled={advancedDisabled}
                    placeholder={t.form.advancedCommandPlaceholder}
                    value={formData.advancedCommand}
                    onChange={e => setFormData({ ...formData, advancedCommand: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-gray-400">{t.form.advancedArgs}</span>
                  <input
                    type="text"
                    className={`${fieldClass} font-mono`}
                    disabled={advancedDisabled}
                    placeholder={t.form.advancedArgsPlaceholder}
                    value={formData.advancedArgs}
                    onChange={e => setFormData({ ...formData, advancedArgs: e.target.value })}
                  />
                </label>

                <label className="flex items-center justify-between border border-gray-200 px-3 py-3">
                  <span className="text-sm font-medium text-gray-700">{t.form.advancedShell}</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    checked={formData.advancedShell}
                    disabled={advancedDisabled}
                    onChange={e => setFormData({ ...formData, advancedShell: e.target.checked })}
                  />
                </label>
              </div>
            )}
          </section>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-4 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-gray-200 px-5 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-300"
          >
            {t.form.cancel}
          </button>
          <button
            type="submit"
            className="rounded bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {isEditing ? t.form.save : t.form.add}
          </button>
        </div>
      </form>
    </aside>
  );
}
