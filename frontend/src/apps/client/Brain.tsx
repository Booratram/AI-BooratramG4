import { useEffect, useState } from 'react';
import { apiClient, type BrainStatus, type ChatMessage } from '../../api/client';
import { useAuth } from '../../auth/auth-context';
import { Panel } from '../../components/panel';
import { brainMessages } from '../../store/demo-data';

const initialMessages: ChatMessage[] = brainMessages.map((message) => ({
  role: message.role as ChatMessage['role'],
  content: message.text,
}));

export function Brain() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('Сравни дедлайны недели и подскажи блокеры');
  const [loading, setLoading] = useState(false);
  const [brainStatus, setBrainStatus] = useState<BrainStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [lastMeta, setLastMeta] = useState<{
    model?: string;
    memoriesUsed: number;
    usedReasoner: boolean;
    embeddingMode: string;
  } | null>(null);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    apiClient
      .brainStatus(session.accessToken)
      .then((status) => {
        if (!cancelled) {
          setBrainStatus(status);
          setStatusError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStatusError(error instanceof Error ? error.message : 'Failed to load AI status');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function send() {
    if (!session || !input.trim()) return;

    const nextUserMessage: ChatMessage = { role: 'user', content: input.trim() };
    const history = [...messages, nextUserMessage];
    setMessages(history);
    setLoading(true);
    setInput('');

    try {
      const reply = await apiClient.brainChat(session.accessToken, {
        message: nextUserMessage.content,
        history: messages,
      });
      setMessages([...history, { role: 'assistant', content: reply.content }]);
      setLastMeta({
        model: reply.model,
        memoriesUsed: reply.memoriesUsed,
        usedReasoner: reply.usedReasoner,
        embeddingMode: reply.embeddingMode,
      });
    } catch (error) {
      setMessages([
        ...history,
        {
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Brain request failed',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr,0.9fr]">
      <Panel title="Chat with G4" eyebrow="Context-aware agent">
        <div className="space-y-4">
          {brainStatus ? (
            <div className="rounded-[22px] border border-ink/10 bg-white px-5 py-4 text-sm leading-7 text-ink/75">
              <div>
                DeepSeek: {brainStatus.deepseek.available ? 'connected' : 'not configured'} · chat model:{' '}
                {brainStatus.deepseek.model}
              </div>
              <div>
                Reasoner: {brainStatus.deepseek.reasonerModel} · embeddings: {brainStatus.embeddings.mode}
              </div>
            </div>
          ) : null}
          {statusError ? (
            <div className="rounded-[22px] border border-coral/25 bg-coral/10 px-5 py-4 text-sm leading-7 text-ink/75">
              {statusError}
            </div>
          ) : null}
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-3xl rounded-[22px] px-5 py-4 text-sm leading-7 ${
                message.role === 'assistant' ? 'bg-ink text-white' : 'ml-auto bg-sand text-ink'
              }`}
            >
              {message.content}
            </div>
          ))}
          <div className="mt-6 rounded-[26px] border border-ink/10 bg-white p-4">
            <div className="text-sm text-ink/45">Prompt input</div>
            <div className="mt-3 flex flex-col gap-3 md:flex-row">
              <input
                className="flex-1 rounded-2xl border border-ink/10 px-4 py-3 outline-none"
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <button
                className="rounded-2xl bg-coral px-5 py-3 font-medium text-white"
                disabled={loading}
                onClick={send}
              >
                {loading ? 'Thinking...' : 'Send'}
              </button>
            </div>
            {lastMeta ? (
              <div className="mt-3 text-xs text-ink/45">
                Model: {lastMeta.model ?? 'n/a'} · memories: {lastMeta.memoriesUsed} · reasoner:{' '}
                {lastMeta.usedReasoner ? 'on' : 'off'} · embeddings: {lastMeta.embeddingMode}
              </div>
            ) : null}
          </div>
        </div>
      </Panel>

      <Panel title="Agent contract" eyebrow="Pilot rules">
        <ul className="space-y-3 text-sm leading-7 text-ink/75">
          <li>Отвечать на русском языке и без воды.</li>
          <li>Всегда учитывать кейсы пилотного тенанта перед рекомендацией.</li>
          <li>Для аналитических запросов автоматически включать DeepSeek reasoner.</li>
          <li>Память диалогов сохранять как tenant-isolated knowledge.</li>
          <li>Если ответ приводит к действию, завершать конкретным next step.</li>
        </ul>
      </Panel>
    </div>
  );
}
