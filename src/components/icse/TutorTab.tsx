'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, Trash2, Sparkles, BookOpen, Lightbulb, ChevronDown,
  Circle, Loader2, Zap, RotateCcw, BookMarked, AlertCircle, Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from '@/components/ui/tooltip';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface ChatSource {
  title: string;
  subject: string;
  chapter?: string;
  category?: string;
}

type ChatBackend = 'builtin' | 'openclaw';

interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  sources?: ChatSource[];
  cached?: boolean;
  durationMs?: number;
  backend?: ChatBackend;
  webSearched?: boolean;
  model?: string;
  modelUsed?: string;
  fallbackUsed?: boolean;
  attemptedModels?: string[];
}

interface ChatApiResponse {
  sessionId: string;
  answer: string;
  reasoning?: string;
  sources: ChatSource[];
  cached: boolean;
  durationMs: number;
  backend: ChatBackend;
  webSearched?: boolean;
  model?: string;
  modelUsed?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  attemptedModels?: string[];
}

interface ChatStatusResponse {
  backend: ChatBackend;
  openclawConfigured: boolean;
  openclawReachable: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS: readonly string[] = [
  "Explain Ohm's Law with a numerical example",
  'What is the difference between arithmetic mean and median?',
  'Derive the lens formula for a convex lens',
  'Why does ice float on water? Explain with molecular structure.',
  'Balance the equation: Fe + H2O → Fe3O4 + H2',
  'Explain the working of the human heart',
  'What were the main causes of the 1857 revolt?',
  'How do you solve a quadratic equation by factorization?',
  'Explain the mole concept with formulas',
  'Describe the process of photosynthesis with the chemical equation',
];

const SUBJECT_OPTIONS: readonly string[] = [
  'Physics', 'Chemistry', 'Biology', 'Mathematics',
  'History', 'Geography', 'English', 'Computer', 'Economics',
];

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDuration(ms?: number): string | null {
  if (ms == null) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ────────────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────────────

export function TutorTab({ board = 'ICSE' }: { board?: string }) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [subject, setSubject] = useState<string>('auto');
  const [preferredModel, setPreferredModel] = useState<string>('auto');
  const [modelsData, setModelsData] = useState<{ models: any[]; available: string[] } | null>(null);
  const [forceReasoning, setForceReasoning] = useState(false);
  const [forceWebSearch, setForceWebSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Backend status (fetched on mount)
  const [status, setStatus] = useState<ChatStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // ── Fetch backend status on mount ──────────────────────────────────────
  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/chat/status');
      if (!res.ok) throw new Error('status fetch failed');
      const data = (await res.json()) as ChatStatusResponse;
      setStatus(data);
    } catch {
      // Silent fallback — defaults to a benign "unknown" state shown as built-in.
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // ── Fetch available models on mount ────────────────────────────────────
  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then(data => setModelsData(data))
      .catch(() => setModelsData(null));
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // ── Auto-scroll to the latest message ──────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  useEffect(() => {
    if (messages.length > 0 || loading || error) {
      scrollToBottom();
    }
  }, [messages, loading, error, scrollToBottom]);

  // ── API helper ──────────────────────────────────────────────────────────
  const callChatApi = useCallback(
    async (text: string, currentSessionId: string | null): Promise<ChatApiResponse> => {
      const payload: Record<string, unknown> = {
        message: text,
        forceReasoning,
        forceWebSearch,
        preferredModel,
        board,
      };
      if (currentSessionId) payload.sessionId = currentSessionId;
      if (subject && subject !== 'auto') payload.subject = subject;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Tutor request failed');
      }
      return data as ChatApiResponse;
    },
    [forceReasoning, forceWebSearch, subject, preferredModel, board],
  );

  // ── Append an assistant message from a ChatApiResponse ──────────────────
  const appendAssistant = useCallback((chatData: ChatApiResponse) => {
    setMessages((prev) => [
      ...prev,
      {
        id: uniqueId('a'),
        role: 'assistant',
        content: chatData.answer,
        reasoning: chatData.reasoning,
        sources: chatData.sources,
        cached: chatData.cached,
        durationMs: chatData.durationMs,
        backend: chatData.backend,
        webSearched: chatData.webSearched,
        model: chatData.model,
        modelUsed: chatData.modelUsed,
        fallbackUsed: chatData.fallbackUsed,
        attemptedModels: chatData.attemptedModels,
      },
    ]);
  }, []);

  // ── Send ────────────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (messageOverride?: string) => {
      const text = (messageOverride ?? input).trim();
      if (!text || loading) return;

      setError(null);
      setInput('');
      // Reset textarea height (works even with field-sizing-content)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      // Re-focus the input for fast follow-up typing
      requestAnimationFrame(() => textareaRef.current?.focus());

      const userMsg: TutorMessage = {
        id: uniqueId('u'),
        role: 'user',
        content: text,
      };
      const currentSession = sessionId;
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const chatData = await callChatApi(text, currentSession);
        setSessionId(chatData.sessionId);
        appendAssistant(chatData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, sessionId, callChatApi, appendAssistant],
  );

  // ── Retry last failed message ───────────────────────────────────────────
  const handleRetry = useCallback(async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) {
      setError(null);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const chatData = await callChatApi(lastUser.content, sessionId);
      setSessionId(chatData.sessionId);
      appendAssistant(chatData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [messages, sessionId, callChatApi, appendAssistant]);

  // ── Keyboard handler ────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // ── Clear chat ──────────────────────────────────────────────────────────
  const handleClearChat = async () => {
    if (sessionId) {
      try {
        await fetch(`/api/chat?sessionId=${encodeURIComponent(sessionId)}`, {
          method: 'DELETE',
        });
      } catch {
        // Silent — UI resets regardless of API outcome
      }
    }
    setMessages([]);
    setSessionId(null);
    setInput('');
    setError(null);
    toast.success('Chat cleared');
  };

  const showEmptyState = messages.length === 0 && !loading && !error;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto w-full max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground shadow-sm"
                  aria-hidden
                >
                  <Brain className="size-5" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-lg">ICSE AI Tutor</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-1.5">
                    <Sparkles className="size-3 text-brand" aria-hidden />
                    <span>
                      Reasoning-powered · RAG-grounded on 130+ ICSE knowledge chunks
                    </span>
                  </CardDescription>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <BackendStatusBadge status={status} loading={statusLoading} />
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger
                    id="tutor-subject"
                    className="h-9 w-[140px]"
                    aria-label="Subject filter"
                  >
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    {SUBJECT_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => void handleClearChat()}
                      aria-label="Clear chat"
                      disabled={messages.length === 0 && !sessionId && !loading}
                      className="h-9 w-9"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear conversation</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* ── Messages area ─────────────────────────────────────────────── */}
            <ScrollArea
              className="h-[480px] max-h-[480px] min-h-[280px] w-full rounded-lg border bg-muted/20"
              aria-label="Chat messages"
            >
              <div
                ref={scrollViewportRef}
                role="log"
                aria-live="polite"
                aria-label="Chat messages"
                className="p-4"
              >
                {showEmptyState ? (
                  <EmptyState
                    onPick={(q) => {
                      void handleSend(q);
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence initial={false}>
                      {messages.map((m) => (
                        <MessageBubble key={m.id} message={m} />
                      ))}
                    </AnimatePresence>

                    {loading && <LoadingIndicator />}

                    <AnimatePresence>
                      {error && (
                        <ErrorAlert
                          message={error}
                          onRetry={() => void handleRetry()}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <div ref={messagesEndRef} className="scroll-mt-2" />
              </div>
            </ScrollArea>

            {/* ── Input row ────────────────────────────────────────────────── */}
            <div className="space-y-2.5">
              <div className="flex items-end gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your ICSE question — Enter to send, Shift+Enter for a new line"
                  className="max-h-[200px] min-h-[44px] resize-none"
                  aria-label="Message input"
                  rows={1}
                />
                <Button
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || loading}
                  aria-label="Send message"
                  className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                <span className="text-xs font-medium text-muted-foreground">Model:</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Select value={preferredModel} onValueChange={setPreferredModel}>
                      <SelectTrigger
                        id="tutor-model"
                        className="h-8 min-w-[200px] max-w-full flex-1"
                        aria-label="AI model selector"
                      >
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Auto (always first) */}
                        <SelectItem value="auto">
                          <div className="flex flex-col">
                            <span className="font-medium">⚡ Auto (Smart Pick)</span>
                            <span className="text-[10px] text-muted-foreground">System picks best model per question</span>
                          </div>
                        </SelectItem>

                        {/* FREE tier models */}
                        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                          🆓 Free tier
                        </div>
                        {(modelsData?.models || [])
                          .filter(m => m.id !== 'auto' && m.id !== 'glm' && m.free_tier)
                          .map((m) => (
                            <SelectItem
                              key={m.id}
                              value={m.id}
                              disabled={!m.available}
                              className={!m.available ? 'opacity-50' : ''}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {m.name} <span className="text-[10px] text-emerald-600">🆓</span>
                                  {!m.available && <span className="ml-1 text-[10px] text-muted-foreground">(add key)</span>}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{m.provider} · {m.description.slice(0, 45)}</span>
                              </div>
                            </SelectItem>
                          ))}

                        {/* GLM (always free) */}
                        <SelectItem value="glm">
                          <div className="flex flex-col">
                            <span className="font-medium">GLM-4.6 <span className="text-[10px] text-emerald-600">🆓</span></span>
                            <span className="text-[10px] text-muted-foreground">Z.ai · always available, default fallback</span>
                          </div>
                        </SelectItem>

                        {/* PRO models (paid) */}
                        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          💎 Pro (paid API key required)
                        </div>
                        {(modelsData?.models || [])
                          .filter(m => m.id !== 'auto' && m.id !== 'glm' && !m.free_tier)
                          .map((m) => (
                            <SelectItem
                              key={m.id}
                              value={m.id}
                              disabled={!m.available}
                              className={!m.available ? 'opacity-50' : ''}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {m.name}
                                  {!m.available && <span className="ml-1 text-[10px] text-muted-foreground">(add key)</span>}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {m.provider} · ${m.cost_per_1k_tokens}/1K tokens
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs" side="top">
                    {(() => {
                      const m = modelsData?.models?.find((x: any) => x.id === preferredModel);
                      return m ? (
                        <div className="space-y-1">
                          <p className="font-medium">{m.name} ({m.provider})</p>
                          <p className="text-xs">{m.description}</p>
                          <p className="text-xs"><strong>Best for:</strong> {m.best_for.join(', ')}</p>
                          <p className="text-xs"><strong>Why better:</strong> {m.why_better}</p>
                          <p className="text-xs"><strong>Cost:</strong> ${m.cost_per_1k_tokens}/1K tokens · <strong>Latency:</strong> ~{m.avg_latency_ms}ms{m.free_tier ? ' · 🆓 Free tier' : ''}</p>
                          {!m.available && m.signup_url && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              <strong>Get free key:</strong> {m.signup_url}
                            </p>
                          )}
                        </div>
                      ) : 'Select a model';
                    })()}
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="force-reasoning"
                      checked={forceReasoning}
                      onCheckedChange={setForceReasoning}
                      aria-label="Force chain-of-thought reasoning"
                    />
                    <Label
                      htmlFor="force-reasoning"
                      className="cursor-pointer select-none text-xs text-muted-foreground"
                    >
                      Force reasoning
                    </Label>
                    <span className="hidden text-[11px] text-muted-foreground/80 sm:inline">
                      · always show 🧠 chain-of-thought
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="force-web-search"
                      checked={forceWebSearch}
                      onCheckedChange={setForceWebSearch}
                      aria-label="Force web search"
                    />
                    <Label
                      htmlFor="force-web-search"
                      className="cursor-pointer select-none text-xs text-muted-foreground"
                    >
                      Web search
                    </Label>
                    <span className="hidden text-[11px] text-muted-foreground/80 sm:inline">
                      · 🔍 search internet for fresh info
                    </span>
                  </div>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {sessionId ? `session ${sessionId.slice(0, 8)}…` : 'new session'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Backend status badge — green if OpenClaw connected, amber if built-in
// ────────────────────────────────────────────────────────────────────────────

function BackendStatusBadge({
  status,
  loading,
}: {
  status: ChatStatusResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Skeleton
        className="h-9 w-[150px] rounded-md"
        aria-label="Detecting AI backend"
      />
    );
  }

  const isOpenClaw = status?.backend === 'openclaw' && status.openclawReachable;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="status"
          className={
            'inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium ' +
            (isOpenClaw
              ? 'border-brand/40 bg-brand-soft/50 text-brand'
              : 'border-amber-strong/40 bg-amber-soft/60 text-amber-strong')
          }
        >
          <Circle
            className={'size-2 fill-current ' + (isOpenClaw ? 'text-brand' : 'text-amber-strong')}
            aria-hidden
          />
          <span className="hidden sm:inline">
            {isOpenClaw ? 'OpenClaw connected' : 'Built-in AI'}
          </span>
          <span className="sm:hidden">{isOpenClaw ? 'OpenClaw' : 'Built-in'}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {isOpenClaw ? (
          <p>OpenClaw reasoning backend is connected and reachable.</p>
        ) : (
          <p>
            Built-in AI (GLM-4.6 reasoning). Set <code>OPENCLAW_URL</code> and{' '}
            <code>OPENCLAW_TOKEN</code> in <code>.env</code> to switch to OpenClaw.
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Empty state — 10 suggested question chips
// ────────────────────────────────────────────────────────────────────────────

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col items-center justify-center gap-5 py-8 text-center"
    >
      <div className="space-y-2">
        <div
          className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-brand"
          aria-hidden
        >
          <Brain className="size-6" />
        </div>
        <p className="text-base font-semibold">Ask me anything about ICSE Class 10</p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Every answer is grounded in the local knowledge base of specimen papers,
          textbook extracts and exemplars. Try one of these to get started:
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
        {SUGGESTED_QUESTIONS.map((q, i) => (
          <motion.button
            key={q}
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03 }}
            onClick={() => onPick(q)}
            aria-label={`Ask: ${q}`}
            className="group flex items-start gap-2 rounded-lg border bg-card p-3 text-left text-sm shadow-sm transition-all hover:border-brand/40 hover:bg-brand-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
          >
            <Lightbulb
              className="mt-0.5 size-4 shrink-0 text-brand transition-transform group-hover:scale-110"
              aria-hidden
            />
            <span className="text-foreground">{q}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Loading indicator — pulsing Brain + "Thinking..."
// ────────────────────────────────────────────────────────────────────────────

function LoadingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-3"
      aria-live="polite"
      aria-label="Tutor is thinking"
    >
      <div
        className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"
        aria-hidden
      >
        <motion.div
          animate={{ scale: [1, 0.85, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Brain className="size-3.5" />
        </motion.div>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2.5 shadow-sm">
        <span className="text-xs font-medium text-muted-foreground">Thinking</span>
        <span className="sr-only">Tutor is thinking</span>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-brand"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.18,
              ease: 'easeInOut',
            }}
            aria-hidden
          />
        ))}
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Error alert — uses shadcn Alert
// ────────────────────────────────────────────────────────────────────────────

function ErrorAlert({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      role="alert"
    >
      <Alert variant="destructive" className="items-start">
        <AlertCircle className="size-4 shrink-0" aria-hidden />
        <AlertTitle>The tutor hit a snag</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{message}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <RotateCcw className="size-3.5" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Message bubble
// ────────────────────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: TutorMessage }) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-brand-foreground shadow-sm">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </p>
        </div>
      </motion.div>
    );
  }

  return <AssistantMessageCard message={message} />;
}

// ────────────────────────────────────────────────────────────────────────────
// Assistant message card — markdown + reasoning + sources + footer
// ────────────────────────────────────────────────────────────────────────────

function AssistantMessageCard({ message }: { message: TutorMessage }) {
  const [showReasoning, setShowReasoning] = useState(false);
  const sources = message.sources ?? [];
  const durationLabel = formatDuration(message.durationMs);
  const hasReasoning = Boolean(message.reasoning && message.reasoning.trim());
  const isOpenClaw = message.backend === 'openclaw';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3"
    >
      <div
        className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"
        aria-hidden
      >
        <Brain className="size-3.5" />
      </div>

      <div className="max-w-[88%] flex-1 rounded-2xl rounded-tl-md border bg-card px-4 py-3 shadow-sm">
        {/* Answer (markdown) */}
        <article className="prose-icse max-w-none text-sm">
          <ReactMarkdown>{message.content || '_(no answer returned)_'}</ReactMarkdown>
        </article>

        {/* Reasoning disclosure */}
        {hasReasoning && (
          <div className="mt-3 border-t pt-2">
            <button
              type="button"
              onClick={() => setShowReasoning((v) => !v)}
              aria-expanded={showReasoning}
              aria-controls={`reasoning-${message.id}`}
              className="flex items-center gap-1.5 text-xs font-medium text-brand transition-colors hover:text-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 rounded"
            >
              <span aria-hidden>🧠</span>
              {showReasoning ? 'Hide reasoning' : 'Show reasoning'}
              <ChevronDown
                className={`size-3.5 transition-transform ${showReasoning ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            <AnimatePresence initial={false}>
              {showReasoning && (
                <motion.div
                  id={`reasoning-${message.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 rounded-md border border-brand/20 bg-brand-soft/30 p-3">
                    <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-brand">
                      <Sparkles className="size-3" aria-hidden />
                      Chain of thought
                    </p>
                    <p className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted-foreground">
                      {message.reasoning}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Sources chips */}
        {sources.length > 0 && (
          <div className="mt-3 border-t pt-2">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <BookOpen className="size-3" aria-hidden />
              Sources ({sources.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((src, i) => (
                <SourceChip key={`${src.title}-${i}`} source={src} />
              ))}
            </div>
          </div>
        )}

        {/* Footer: cached + duration + backend + web search + model */}
        {(message.cached || durationLabel || message.backend || message.webSearched || message.modelUsed) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
            {message.cached && (
              <span className="inline-flex items-center gap-1 text-brand">
                <Zap className="size-3" aria-hidden />
                <span>cached</span>
              </span>
            )}
            {durationLabel && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Sparkles className="size-3 text-brand" aria-hidden />
                {durationLabel}
              </span>
            )}
            {message.webSearched && (
              <>
                {(message.cached || durationLabel) && (
                  <span aria-hidden className="text-muted-foreground/40">·</span>
                )}
                <span className="inline-flex items-center gap-1 font-medium text-sky-600 dark:text-sky-400">
                  <Globe className="size-3" aria-hidden />
                  <span>web search</span>
                </span>
              </>
            )}
            {message.modelUsed && (
              <>
                {(message.cached || durationLabel || message.webSearched) && (
                  <span aria-hidden className="text-muted-foreground/40">·</span>
                )}
                <span className="inline-flex items-center gap-1 font-medium text-violet-600 dark:text-violet-400">
                  <Brain className="size-3" aria-hidden />
                  <span>{message.modelUsed}</span>
                  {message.fallbackUsed && (
                    <span className="text-amber-600 dark:text-amber-400" title={`Fallback from ${message.attemptedModels?.[0] || 'primary'}`}>
                      ⚠ fallback
                    </span>
                  )}
                </span>
              </>
            )}
            {message.backend && (
              <>
                {(message.cached || durationLabel || message.webSearched || message.modelUsed) && (
                  <span aria-hidden className="text-muted-foreground/40">·</span>
                )}
                <span
                  className={
                    'inline-flex items-center gap-1 font-medium ' +
                    (isOpenClaw ? 'text-brand' : 'text-amber-strong')
                  }
                >
                  <Circle
                    className={'size-1.5 fill-current ' + (isOpenClaw ? 'text-brand' : 'text-amber-strong')}
                    aria-hidden
                  />
                  {isOpenClaw ? 'OpenClaw' : 'builtin'}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Source chip with tooltip showing full title
// ────────────────────────────────────────────────────────────────────────────

function SourceChip({ source }: { source: ChatSource }) {
  const label = [source.subject, source.category]
    .filter(Boolean)
    .join(' · ');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft/40 px-2 py-0.5 text-[11px] font-medium text-brand transition-colors hover:bg-brand-soft/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <BookMarked className="size-3" aria-hidden />
          <span className="max-w-[180px] truncate">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-medium">{source.title}</p>
        {(source.chapter || source.subject) && (
          <p className="mt-0.5 text-[11px] text-primary-foreground/80">
            {source.subject}
            {source.chapter ? ` · ${source.chapter}` : ''}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
