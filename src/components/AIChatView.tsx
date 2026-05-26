import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Trash2, User } from 'lucide-react';
import { ChatMessage, ProgramSettings } from '../types';
import { Translation } from '../i18n';

interface AIChatViewProps {
  t: Translation;
}

export default function AIChatView({ t }: AIChatViewProps) {
  const [settings, setSettings] = useState<ProgramSettings | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || isSending) return;

    const nextMessages = [...messages, { role: 'user' as const, content }];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);
    setError('');

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.slice(-8) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.ai.error);
      setMessages([...nextMessages, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError((err as Error).message || t.ai.error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t.ai.title}</h2>
          <p className="mt-1 text-sm text-gray-500">{t.ai.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMessages([]);
            setError('');
          }}
          className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <Trash2 className="h-4 w-4" />
          {t.ai.clear}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-white shadow-sm ring-1 ring-gray-200">
        {!settings?.aiApiKeySet && (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-800">
            {t.ai.notConfigured}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
              <Bot className="mb-3 h-12 w-12" />
              <p className="text-sm font-medium">{t.ai.inputPlaceholder}</p>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-600">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div className={`max-w-[78%] whitespace-pre-wrap rounded px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {message.content}
                  </div>
                  {message.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-600">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {isSending && <div className="text-sm font-medium text-gray-500">{t.ai.thinking}</div>}
              {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form onSubmit={sendMessage} className="border-t border-gray-200 p-4">
          <div className="mx-auto flex max-w-3xl gap-3">
            <input
              value={input}
              onChange={event => setInput(event.target.value)}
              disabled={!settings?.aiApiKeySet || isSending}
              placeholder={t.ai.inputPlaceholder}
              className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={!settings?.aiApiKeySet || isSending || !input.trim()}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
            >
              <Send className="h-4 w-4" />
              {t.ai.send}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
