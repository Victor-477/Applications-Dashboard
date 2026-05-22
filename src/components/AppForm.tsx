import { useState } from 'react';
import { X } from 'lucide-react';
import { AppConfig } from '../types';
import { Translation } from '../i18n';

interface AppFormProps {
  onClose: () => void;
  onSubmit: (config: Partial<AppConfig>) => void;
  initialConfig?: AppConfig | null;
  t: Translation;
}

export default function AppForm({ onClose, onSubmit, initialConfig, t }: AppFormProps) {
  const [formData, setFormData] = useState({
    name: initialConfig?.name || '',
    command: initialConfig?.command || '',
    args: initialConfig?.args || '',
    port: initialConfig?.port || '',
    cwd: initialConfig?.cwd || '',
    dependsOn: initialConfig?.dependsOn?.join(', ') || '',
    shell: initialConfig?.shell !== false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name.trim(),
      command: formData.command.trim(),
      args: formData.args.trim(),
      port: formData.port.trim(),
      cwd: formData.cwd.trim(),
      dependsOn: formData.dependsOn
        .split(',')
        .map(item => item.trim())
        .filter(Boolean),
      shell: formData.shell
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden transform transition-all">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-800">{initialConfig ? t.form.editTitle : t.form.addTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-white p-1.5 rounded-md transition-colors shadow-sm border border-transparent hover:border-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.form.appName}</label>
            <input
              required
              type="text"
              className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
              placeholder={t.form.appNamePlaceholder}
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.form.command}</label>
            <input
              required
              type="text"
              className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono transition-shadow"
              placeholder={t.form.commandPlaceholder}
              value={formData.command}
              onChange={e => setFormData({ ...formData, command: e.target.value })}
            />
            <p className="text-[11px] text-gray-500 mt-1.5">{t.form.commandHelp}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.form.args}</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono transition-shadow"
              placeholder={t.form.argsPlaceholder}
              value={formData.args}
              onChange={e => setFormData({ ...formData, args: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.form.port}</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                placeholder={t.form.portPlaceholder}
                value={formData.port}
                onChange={e => setFormData({ ...formData, port: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.form.directory}</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                placeholder={t.form.directoryPlaceholder}
                value={formData.cwd}
                onChange={e => setFormData({ ...formData, cwd: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.form.dependencies}</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono transition-shadow"
              placeholder={t.form.dependenciesPlaceholder}
              value={formData.dependsOn}
              onChange={e => setFormData({ ...formData, dependsOn: e.target.value })}
            />
          </div>

          <label className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50/50">
            <span className="text-sm font-medium text-gray-700">{t.form.shell}</span>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={formData.shell}
              onChange={e => setFormData({ ...formData, shell: e.target.checked })}
            />
          </label>

          <div className="pt-4 flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
            >
              {t.form.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shadow-sm transition-colors"
            >
              {initialConfig ? t.form.save : t.form.add}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
