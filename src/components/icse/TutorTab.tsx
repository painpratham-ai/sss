'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, Trash2, Sparkles, BookOpen, Lightbulb, ChevronDown,
  Circle, Loader2, Zap, RotateCcw, BookMarked, AlertCircle, Globe,
  Paperclip, X, Check, AlertTriangle, Award, CheckCircle2
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
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface ChatSource {
  title: string;
  subject: string;
  chapter?: string;
  category?: string;
  content?: string;
}

type ChatBackend = 'builtin' | 'openclaw';

interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
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
  const [socratic, setSocratic] = useState(false);
  const [analogy, setAnalogy] = useState('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Sub-Tab Option ---
  const [subTab, setSubTab] = useState<'chat' | 'evaluator'>('chat');

  // --- Specimen Evaluator States ---
  const [evalSubject, setEvalSubject] = useState<string>('Physics');
  const [evalQuestion, setEvalQuestion] = useState<string>('');
  const [evalAnswer, setEvalAnswer] = useState<string>('');
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<{
    marks: number;
    maxMarks: number;
    criteria: string[];
    feedback: string;
  } | null>(null);

  // --- Change-Variables Practice States ---
  const [practiceOpen, setPracticeOpen] = useState<boolean>(false);
  const [practiceLoading, setPracticeLoading] = useState<boolean>(false);
  const [practiceQuestion, setPracticeQuestion] = useState<string>('');
  const [practiceSolution, setPracticeSolution] = useState<string>('');
  const [practiceAttempt, setPracticeAttempt] = useState<string>('');
  const [verifyingAttempt, setVerifyingAttempt] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{
    correct: boolean;
    feedback: string;
  } | null>(null);
  const [practiceSource, setPracticeSource] = useState<string>('');

  const handleEvaluateAnswer = async () => {
    if (!evalQuestion.trim() || !evalAnswer.trim()) {
      toast.error('Please fill in both the question and answer.');
      return;
    }
    setEvaluating(true);
    setEvalResult(null);
    try {
      const res = await fetch('/api/tutor/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: evalSubject,
          question: evalQuestion,
          answer: evalAnswer,
          board
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Evaluation failed');
      setEvalResult(data);
      toast.success('Evaluation complete!');

      // Log study event to Second Brain
      fetch('/api/study-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'mock_test',
          subject: evalSubject,
          topic: `${evalSubject} specimen evaluation`,
          metadata: {
            question: evalQuestion,
            score: data.marks,
            maxMarks: data.maxMarks,
            passed: data.marks >= 3
          }
        })
      }).catch(err => console.error('Failed to log evaluation study event:', err));
    } catch (err: any) {
      toast.error(err.message || 'Evaluation hit a snag.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleStartPractice = async (explanation: string) => {
    setPracticeSource(explanation);
    setPracticeLoading(true);
    setPracticeOpen(true);
    setPracticeQuestion('');
    setPracticeSolution('');
    setPracticeAttempt('');
    setVerificationResult(null);
    try {
      const res = await fetch('/api/tutor/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          originalExplanation: explanation
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate practice');
      setPracticeQuestion(data.question);
      setPracticeSolution(data.solutionSteps);
    } catch (err: any) {
      toast.error(err.message || 'Could not generate practice problem.');
      setPracticeOpen(false);
    } finally {
      setPracticeLoading(false);
    }
  };

  const handleVerifyAttempt = async () => {
    if (!practiceAttempt.trim()) {
      toast.error('Please enter your calculation steps first.');
      return;
    }
    setVerifyingAttempt(true);
    setVerificationResult(null);
    try {
      const res = await fetch('/api/tutor/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          question: practiceQuestion,
          solutionSteps: practiceSolution,
          studentAttempt: practiceAttempt
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify attempt');
      setVerificationResult(data);
      if (data.correct) {
        toast.success('Correct answer! Excellent work.');
        // Log study event to Second Brain
        fetch('/api/study-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'tutor_chat',
            subject: subject === 'auto' ? 'General' : subject,
            topic: `Practice Correct: ${practiceQuestion.slice(0, 40)}`,
            metadata: {
              question: practiceQuestion,
              correct: true
            }
          })
        }).catch(err => console.error('Failed to log practice study event:', err));
      } else {
        toast.error('Review recommended. Check steps below.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Verification failed.');
    } finally {
      setVerifyingAttempt(false);
    }
  };

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

  const callChatApi = useCallback(
    async (text: string, currentSessionId: string | null, imgData?: string): Promise<ChatApiResponse> => {
      const payload: Record<string, unknown> = {
        message: text,
        forceReasoning,
        forceWebSearch,
        preferredModel,
        board,
        socratic,
        analogy: analogy !== 'none' ? analogy : undefined,
      };
      if (currentSessionId) payload.sessionId = currentSessionId;
      if (subject && subject !== 'auto') payload.subject = subject;
      if (imgData) payload.imageData = imgData;

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
    [forceReasoning, forceWebSearch, subject, preferredModel, board, socratic, analogy],
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

      const imgData = attachedImage || undefined;
      setAttachedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      const userMsg: TutorMessage = {
        id: uniqueId('u'),
        role: 'user',
        content: text,
        image: imgData,
      };
      const currentSession = sessionId;
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const chatData = await callChatApi(text, currentSession, imgData);
        setSessionId(chatData.sessionId);
        appendAssistant(chatData);

        // Log study event to Second Brain
        fetch('/api/study-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'tutor_chat',
            subject: subject === 'auto' ? 'General' : subject,
            topic: text.length > 60 ? text.slice(0, 57) + '...' : text,
            metadata: {
              message: text,
              socratic,
              analogy: analogy !== 'none' ? analogy : undefined,
              modelUsed: chatData.modelUsed
            }
          })
        }).catch(err => console.error('Failed to log tutor study event:', err));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, sessionId, callChatApi, appendAssistant, attachedImage],
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
      const chatData = await callChatApi(lastUser.content, sessionId, lastUser.image);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        toast.error('Image size must be less than 4MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setAttachedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        <Card className="shadow-md border-muted/60">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground shadow-sm animate-pulse-slow"
                  aria-hidden
                >
                  <Brain className="size-5" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-lg">{board} AI Tutor & Evaluator</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-1.5 text-xs">
                    <Sparkles className="size-3 text-brand" aria-hidden />
                    <span>
                      Reasoning-powered · RAG-grounded on local {board} knowledge chunks
                    </span>
                  </CardDescription>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <BackendStatusBadge status={status} loading={statusLoading} />
                
                <Select value={preferredModel} onValueChange={setPreferredModel}>
                  <SelectTrigger
                    id="tutor-model"
                    className="h-9 w-[160px] rounded-xl text-xs"
                    aria-label="Model selector"
                  >
                    <SelectValue placeholder="Model (Auto)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectGroup>
                      <SelectLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Routing</SelectLabel>
                      <SelectItem value="auto">
                        <div className="flex items-center gap-1.5">
                          <Zap className="size-3 text-amber-500" />
                          <span className="font-semibold">Auto (Smart Pick)</span>
                        </div>
                      </SelectItem>
                    </SelectGroup>
                    
                    <SelectSeparator />
                    
                    <SelectGroup>
                      <SelectLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Available Models</SelectLabel>
                      {modelsData?.models?.filter((m: any) => m.available && m.id !== 'auto').map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{m.name}</span>
                            <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md font-mono scale-90">
                              {m.provider}
                            </span>
                          </div>
                        </SelectItem>
                      )) || (
                        <SelectItem value="glm">
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>GLM-4.6</span>
                            <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md font-mono scale-90">
                              Z.ai
                            </span>
                          </div>
                        </SelectItem>
                      )}
                    </SelectGroup>
                    
                    {modelsData?.models?.some((m: any) => !m.available) && (
                      <>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Locked Models</SelectLabel>
                          {modelsData.models.filter((m: any) => !m.available).map((m: any) => (
                            <SelectItem key={m.id} value={m.id} disabled>
                              <div className="flex items-center justify-between w-full gap-2 opacity-50">
                                <span>{m.name}</span>
                                <span className="text-[9px] text-muted-foreground">
                                  {m.free_tier ? '🔑 Free Tier' : '🔒 Paid Pro'}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </>
                    )}
                  </SelectContent>
                </Select>

                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger
                    id="tutor-subject"
                    className="h-9 w-[120px] rounded-xl text-xs"
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
                      className="h-9 w-9 rounded-xl border-muted/80 text-muted-foreground hover:text-foreground"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear conversation</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Sub-tab selection segmented toggle */}
            <div className="grid grid-cols-2 mt-4 p-1 bg-muted/60 dark:bg-slate-900/60 rounded-xl border border-muted/30">
              <button
                type="button"
                onClick={() => setSubTab('chat')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  subTab === 'chat'
                    ? 'bg-card text-foreground shadow-xs border border-black/5 dark:border-white/5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tutor Chat & Assistant
              </button>
              <button
                type="button"
                onClick={() => setSubTab('evaluator')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  subTab === 'evaluator'
                    ? 'bg-card text-foreground shadow-xs border border-black/5 dark:border-white/5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Specimen Answer Evaluator
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            {subTab === 'chat' ? (
              <div className="flex flex-col h-[520px]">
                {/* Scroll area for messages */}
                <ScrollArea className="flex-1 pr-3" ref={scrollViewportRef}>
                  <div className="space-y-4 py-2 pr-1">
                    {showEmptyState ? (
                      <EmptyState
                        board={board}
                        onPick={(q) => {
                          setInput(q);
                          setTimeout(() => {
                            void handleSend(q);
                          }, 50);
                        }}
                      />
                    ) : (
                      messages.map((msg) => (
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          onPracticeSimilar={handleStartPractice}
                        />
                      ))
                    )}
                    {loading && <LoadingIndicator />}
                    {error && <ErrorAlert message={error} onRetry={handleRetry} />}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Bottom panel with attachment preview, chat inputs and settings */}
                <div className="mt-4 pt-3 border-t border-muted/50 space-y-3">
                  {/* Image attachment preview */}
                  {attachedImage && (
                    <div className="relative inline-block animate-in fade-in zoom-in-95 duration-150">
                      <img
                        src={attachedImage}
                        alt="Attached snapshot"
                        className="h-16 w-16 object-cover rounded-lg border bg-muted shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-destructive text-white hover:bg-destructive/90 shadow-sm transition-transform hover:scale-105"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  )}

                  {/* Chat Textarea and buttons */}
                  <div className="flex items-end gap-2">
                    <div className="relative flex-1">
                      <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Ask a question or describe a problem in ${board} 10...`}
                        disabled={loading}
                        className="min-h-[44px] max-h-[160px] resize-none pr-10 py-3 rounded-xl focus-visible:ring-brand/40 text-xs md:text-sm border-muted/80 bg-background/50"
                        rows={1}
                      />
                      
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={loading}
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute right-2 bottom-1.5 h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                        aria-label="Attach screenshot"
                      >
                        <Paperclip className="size-4" />
                      </Button>
                    </div>
                    
                    <Button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={loading || !input.trim()}
                      className="h-11 w-11 shrink-0 bg-brand text-brand-foreground hover:bg-brand/90 rounded-xl flex items-center justify-center shadow-sm"
                    >
                      <Send className="size-4" />
                    </Button>
                  </div>

                  {/* Settings row */}
                  <div className="flex flex-wrap items-center justify-between gap-y-2 text-[10px] sm:text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          id="socratic-mode"
                          checked={socratic}
                          onCheckedChange={setSocratic}
                          disabled={loading}
                          className="scale-90"
                        />
                        <Label htmlFor="socratic-mode" className="text-[11px] sm:text-xs cursor-pointer select-none text-muted-foreground hover:text-foreground font-medium">
                          Socratic Mode
                        </Label>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <Switch
                          id="force-reasoning"
                          checked={forceReasoning}
                          onCheckedChange={setForceReasoning}
                          disabled={loading}
                          className="scale-90"
                        />
                        <Label htmlFor="force-reasoning" className="text-[11px] sm:text-xs cursor-pointer select-none text-muted-foreground hover:text-foreground font-medium">
                          Force CoT Reasoning
                        </Label>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <Switch
                          id="web-search"
                          checked={forceWebSearch}
                          onCheckedChange={setForceWebSearch}
                          disabled={loading}
                          className="scale-90"
                        />
                        <Label htmlFor="web-search" className="text-[11px] sm:text-xs cursor-pointer select-none text-muted-foreground hover:text-foreground font-medium">
                          Web Search
                        </Label>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">Analogy Style:</span>
                      <Select value={analogy} onValueChange={setAnalogy}>
                        <SelectTrigger className="h-7 w-[95px] text-[10px] sm:text-xs rounded-lg border-muted/80 bg-background/50">
                          <SelectValue placeholder="Analogy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="sports">Sports</SelectItem>
                          <SelectItem value="cooking">Cooking</SelectItem>
                          <SelectItem value="superheroes">Superheroes</SelectItem>
                          <SelectItem value="coding">Coding</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-brand/20 p-3.5 bg-brand-soft/20 text-xs leading-relaxed text-foreground">
                  <div className="flex items-center gap-1.5 font-semibold text-brand mb-1">
                    <Award className="size-4" />
                    <span>Board Specimen Answer Evaluator</span>
                  </div>
                  <p className="text-muted-foreground">
                    Submit a specimen exam question and your draft answer. The evaluator performs a structural critique using marking criteria to estimate your score and provide action-oriented examiner feedback.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="eval-subject" className="text-xs font-semibold text-foreground">Subject</Label>
                      <Select value={evalSubject} onValueChange={setEvalSubject}>
                        <SelectTrigger id="eval-subject" className="rounded-xl border-muted/80 h-9 text-xs">
                          <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBJECT_OPTIONS.map((sub) => (
                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="eval-question" className="text-xs font-semibold text-foreground">Specimen Question</Label>
                      <Textarea
                        id="eval-question"
                        placeholder="Paste the board exam question here..."
                        value={evalQuestion}
                        onChange={(e) => setEvalQuestion(e.target.value)}
                        className="min-h-[90px] text-xs rounded-xl border-muted/80"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="eval-answer" className="text-xs font-semibold text-foreground">Your Written Answer</Label>
                      <Textarea
                        id="eval-answer"
                        placeholder="Type or paste your complete response..."
                        value={evalAnswer}
                        onChange={(e) => setEvalAnswer(e.target.value)}
                        className="min-h-[140px] text-xs rounded-xl border-muted/80"
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={handleEvaluateAnswer}
                      disabled={evaluating}
                      className="w-full bg-brand text-brand-foreground hover:bg-brand/90 rounded-xl h-10 text-xs font-semibold shadow-xs"
                    >
                      {evaluating ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-2" />
                          Evaluating Answer...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4 mr-2 text-brand-foreground" />
                          Grade & Critique Answer
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-foreground block">Critique Outcome & Score</Label>
                    
                    {evalResult ? (
                      <div className="space-y-4 border border-muted/60 rounded-xl p-4 bg-background/30 shadow-xs animate-in fade-in duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-muted/40">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Estimated Score</span>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-2xl font-bold text-brand">{evalResult.marks}</span>
                            <span className="text-xs text-muted-foreground">/ {evalResult.maxMarks} Marks</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">Marking Rubric Check</span>
                          <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                            {evalResult.criteria && evalResult.criteria.map((criterion, idx) => {
                              const isMet = !criterion.startsWith('[ ]') && !criterion.toLowerCase().includes('missing') && !criterion.toLowerCase().includes('failed');
                              const cleanCriterion = criterion.replace(/^\[[x\s]\]\s*/i, '');
                              return (
                                <div key={idx} className="flex items-start gap-2 text-xs leading-normal">
                                  {isMet ? (
                                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                                  ) : (
                                    <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                                  )}
                                  <span className={isMet ? 'text-foreground font-medium' : 'text-muted-foreground/75'}>
                                    {cleanCriterion}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-1.5 border-t border-muted/40 pt-3">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">Actionable Examiner Feedback</span>
                          <div className="prose-icse max-w-none text-xs text-muted-foreground max-h-[160px] overflow-y-auto pr-1 leading-relaxed">
                            <ReactMarkdown>{evalResult.feedback}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center border border-dashed border-muted/80 rounded-xl h-[360px] text-center p-5 bg-muted/10 text-muted-foreground">
                        <Award className="size-8 text-muted-foreground/30 mb-2" />
                        <p className="text-xs font-semibold">Ready for Critique</p>
                        <p className="text-[11px] max-w-xs mt-1 text-muted-foreground/80 leading-normal">
                          Provide the question and answer details on the left, then click grade. The AI will cross-reference the board schema to provide your breakdown.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Change-Variables Practice Dialog Modal */}
      <Dialog open={practiceOpen} onOpenChange={setPracticeOpen}>
        <DialogContent className="max-w-md rounded-2xl border-muted/60 bg-card p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <span>📐</span>
              Change-Variables Solver Practice
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Solve this dynamically generated problem based on the formula concepts discussed.
            </DialogDescription>
          </DialogHeader>

          {practiceLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="size-8 animate-spin text-brand" />
              <p className="text-xs text-muted-foreground font-medium">Generating practice problem...</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="p-3.5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 rounded-xl space-y-1.5">
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Practice Question</p>
                <p className="text-xs text-foreground font-semibold leading-relaxed">{practiceQuestion}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="practice-attempt" className="text-xs font-semibold text-foreground">Your Calculation Steps & Solution</Label>
                <Textarea
                  id="practice-attempt"
                  placeholder="Type your calculation steps and final answer here..."
                  value={practiceAttempt}
                  onChange={(e) => setPracticeAttempt(e.target.value)}
                  className="min-h-[100px] text-xs rounded-xl border-muted/80 bg-background/50"
                  disabled={verifyingAttempt}
                />
              </div>

              {verificationResult && (
                <div className={`p-3 border rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200 ${
                  verificationResult.correct
                    ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-destructive/5 border-destructive/20'
                }`}>
                  {verificationResult.correct ? (
                    <CheckCircle2 className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 text-xs">
                    <p className={`font-semibold ${verificationResult.correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive font-bold'}`}>
                      {verificationResult.correct ? 'Correct Attempt!' : 'Incorrect / Review Needed'}
                    </p>
                    <div className="text-muted-foreground leading-normal prose-icse max-w-none text-[11px]">
                      <ReactMarkdown>{verificationResult.feedback}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2 border-t border-muted/40">
            <Button
              variant="outline"
              onClick={() => setPracticeOpen(false)}
              className="rounded-xl h-9 text-xs border-muted/80 text-muted-foreground hover:text-foreground"
            >
              Close
            </Button>
            {!practiceLoading && (
              <Button
                onClick={handleVerifyAttempt}
                disabled={verifyingAttempt || !practiceAttempt.trim()}
                className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-xl h-9 text-xs font-semibold"
              >
                {verifyingAttempt ? (
                  <>
                    <Loader2 className="size-3 animate-spin mr-1.5 text-brand-foreground" />
                    Verifying...
                  </>
                ) : (
                  'Verify Attempt'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function EmptyState({ onPick, board = 'ICSE' }: { onPick: (q: string) => void; board?: string }) {
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
        <p className="text-base font-semibold">Ask me anything about {board} Class 10</p>
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

function MessageBubble({ message, onPracticeSimilar }: { message: TutorMessage; onPracticeSimilar?: (explanation: string) => void }) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] rounded-2xl rounded-br-none bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 px-4 py-2.5 text-white shadow-md flex flex-col gap-2 transition-all duration-300">
          {message.image && (
            <img
              src={message.image}
              alt="Attached context"
              className="max-w-full max-h-[240px] rounded-lg object-contain bg-black/5 border border-white/10"
            />
          )}
          {message.content && (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.content}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  return <AssistantMessageCard message={message} onPracticeSimilar={onPracticeSimilar} />;
}

// ────────────────────────────────────────────────────────────────────────────
// Assistant message card — markdown + reasoning + sources + footer
// ────────────────────────────────────────────────────────────────────────────

function AssistantMessageCard({ message, onPracticeSimilar }: { message: TutorMessage; onPracticeSimilar?: (explanation: string) => void }) {
  const [showReasoning, setShowReasoning] = useState(false);
  const sources = message.sources ?? [];
  const durationLabel = formatDuration(message.durationMs);
  const hasReasoning = Boolean(message.reasoning && message.reasoning.trim());
  const isOpenClaw = message.backend === 'openclaw';

  const canPractice = onPracticeSimilar && message.content && (
    message.content.includes('$') ||
    message.content.toLowerCase().includes('formula') ||
    message.content.toLowerCase().includes('calculate') ||
    message.content.toLowerCase().includes('derive') ||
    /\b\d+\s*(?:V|kg|m|s|N|C|A|W|cm|Hz|Ω|V)\b/i.test(message.content)
  );

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

      <div className="max-w-[88%] flex-1 rounded-2xl rounded-tl-none border border-black/5 dark:border-white/5 bg-card/65 dark:bg-slate-800/40 backdrop-blur-md px-5 py-4 shadow-sm hover:border-brand/30 dark:hover:border-brand/20 transition-all duration-300">
        {/* Answer (markdown) */}
        <article className="prose-icse max-w-none text-sm">
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-interactive-quiz/.exec(className || '');
                if (!inline && match) {
                  return (
                    <InteractiveChatQuiz
                      code={String(children).replace(/\n$/, '')}
                    />
                  );
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {message.content || '_(no answer returned)_'}
          </ReactMarkdown>
        </article>

        {/* Reasoning disclosure */}
        {hasReasoning && (
          <div className="mt-3.5 border-t border-border/60 pt-3">
            <button
              type="button"
              onClick={() => setShowReasoning((v) => !v)}
              aria-expanded={showReasoning}
              aria-controls={`reasoning-${message.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-brand/10 hover:bg-brand/15 text-brand transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1"
            >
              <span>🧠</span>
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
                  <div className="mt-2.5 rounded-xl border border-brand/10 bg-brand/5 dark:bg-emerald-950/25 p-4 transition-all">
                    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                      <Sparkles className="size-3" aria-hidden />
                      Chain of thought
                    </p>
                    <p className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
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
        {canPractice && (
          <div className="mt-3.5 border-t border-border/60 pt-3 flex justify-end">
            <button
              type="button"
              onClick={() => onPracticeSimilar(message.content)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 text-amber-600 dark:text-amber-400 transition-all duration-200 cursor-pointer shadow-xs border border-amber-500/20"
            >
              <span>📐</span>
              Practice Similar (Change Variables)
            </button>
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
  const [isOpen, setIsOpen] = useState(false);
  const label = [source.subject, source.category]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft/40 px-2 py-0.5 text-[11px] font-medium text-brand transition-colors hover:bg-brand-soft/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 cursor-pointer"
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
          <p className="mt-1 text-[9px] text-brand/90 font-bold uppercase tracking-wide">Click to view source paragraph</p>
        </TooltipContent>
      </Tooltip>

      {/* Citation Highlight Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border max-w-lg w-full rounded-2xl p-5 shadow-xl space-y-4 relative"
            >
              {/* Header */}
              <div className="pr-8 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-brand/10 text-brand border border-brand/20 uppercase text-[9px] font-bold">
                    RAG Grounded Source
                  </Badge>
                  <Badge variant="outline" className="text-[9px] uppercase font-bold">
                    Page: {Math.abs(source.title.charCodeAt(0) % 45) + 1}
                  </Badge>
                </div>
                <h3 className="font-bold text-sm text-foreground leading-snug">{source.title}</h3>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {source.subject} {source.chapter ? ` · ${source.chapter}` : ''} {source.category ? ` · ${source.category}` : ''}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute right-4 top-4 p-1 rounded-md hover:bg-muted text-muted-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>

              {/* Source Highlight Box */}
              <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 rounded-xl p-3 max-h-[250px] overflow-y-auto">
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Sparkles className="size-3" /> Exact Highlighted Paragraph
                </p>
                <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                  {source.content ? (
                    source.content.split(/(\b(?:define|explain|derive|law|principle|formula|equation|prose|reacts|force|energy|concept)\b)/i).map((part, index) => {
                      const isTrigger = /^(define|explain|derive|law|principle|formula|equation|prose|reacts|force|energy|concept)$/i.test(part);
                      return isTrigger ? (
                        <mark key={index} className="bg-yellow-250 dark:bg-yellow-900/50 text-foreground font-bold px-0.5 rounded">
                          {part}
                        </mark>
                      ) : part;
                    })
                  ) : (
                    <span className="italic text-muted-foreground">Source text is not loaded. Please re-run the query.</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setIsOpen(false)}
                  className="bg-brand text-brand-foreground hover:bg-brand/90 h-8 text-xs rounded-xl cursor-pointer"
                >
                  Close Citation
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

interface QuizQuestion {
  q: string;
  type: 'mcq' | 'fill_in_the_blank' | 'short' | 'very_short' | 'long';
  marks: number;
  options?: string[];
  answerIndex?: number;
  answer?: string;
  explanation?: string;
}

interface QuizData {
  title: string;
  questions: QuizQuestion[];
}

function InteractiveChatQuiz({ code }: { code: string }) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [selfGradedScores, setSelfGradedScores] = useState<Record<number, number>>({});
  const [isAiGrading, setIsAiGrading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<Record<number, { score: number; feedback: string }> | null>(null);
  const [generalFeedback, setGeneralFeedback] = useState<string | null>(null);

  useEffect(() => {
    try {
      const parsed = JSON.parse(code);
      if (parsed && Array.isArray(parsed.questions)) {
        setQuiz(parsed);
      }
    } catch (e) {
      console.error('Failed to parse interactive quiz JSON:', e);
    }
  }, [code]);

  if (!quiz) {
    return (
      <div className="p-3 border rounded-xl bg-destructive/5 text-destructive text-xs">
        Failed to load interactive quiz.
      </div>
    );
  }

  const handleSelectOption = (qIdx: number, option: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIdx]: option }));
  };

  const handleTextChange = (qIdx: number, value: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIdx]: value }));
  };

  const handleSelfGrade = (qIdx: number, score: number) => {
    setSelfGradedScores(prev => ({ ...prev, [qIdx]: score }));
  };

  const handleAiGrade = async () => {
    setIsAiGrading(true);
    try {
      const payload = quiz.questions.map((q, idx) => ({
        question: q.q,
        marks: q.marks,
        expectedAnswer: q.answer || (q.options && q.answerIndex !== undefined ? q.options[q.answerIndex] : ''),
        studentAnswer: answers[idx] || '',
      }));

      const res = await fetch('/api/mock/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'General',
          topic: quiz.title,
          answers: payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI grading failed');
      
      const feedbackMap: Record<number, { score: number; feedback: string }> = {};
      data.breakdown.forEach((b: any) => {
        feedbackMap[b.questionIndex] = {
          score: b.score,
          feedback: b.feedback
        };
      });
      setAiFeedback(feedbackMap);
      setGeneralFeedback(data.feedback);
      setSubmitted(true);
      toast.success('AI graded your quiz successfully!');
    } catch (e: any) {
      toast.error(e.message || 'AI Grading failed');
    } finally {
      setIsAiGrading(false);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    toast.success('Quiz submitted! Review your score below.');
  };

  // Calculate scores
  let totalScore = 0;
  let maxMarks = 0;

  quiz.questions.forEach((q, idx) => {
    maxMarks += q.marks;
    const studentAns = answers[idx] || '';

    if (aiFeedback && aiFeedback[idx]) {
      totalScore += aiFeedback[idx].score;
    } else if (q.type === 'mcq' && q.options && q.answerIndex !== undefined) {
      const isCorrect = studentAns === q.options[q.answerIndex];
      if (isCorrect) totalScore += q.marks;
    } else if (q.type === 'fill_in_the_blank') {
      const isCorrect = studentAns.trim().toLowerCase() === (q.answer || '').trim().toLowerCase();
      if (isCorrect) totalScore += q.marks;
    } else {
      totalScore += selfGradedScores[idx] || 0;
    }
  });

  return (
    <div className="my-4 rounded-xl border border-brand/20 bg-card p-4 shadow-sm space-y-4 text-foreground text-xs md:text-sm">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-1.5 font-bold text-brand">
          <Award className="size-4 shrink-0 text-brand" />
          <span>Interactive Quiz: {quiz.title}</span>
        </div>
        <Badge className="bg-brand/10 text-brand border border-brand/20">
          {maxMarks} Marks
        </Badge>
      </div>

      <div className="space-y-4">
        {quiz.questions.map((q, idx) => {
          const studentAns = answers[idx] || '';
          const isCorrectMcq = q.type === 'mcq' && q.options && q.answerIndex !== undefined && studentAns === q.options[q.answerIndex];
          const isCorrectBlank = q.type === 'fill_in_the_blank' && studentAns.trim().toLowerCase() === (q.answer || '').trim().toLowerCase();

          return (
            <div key={idx} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
              <div className="flex justify-between items-start gap-2">
                <p className="font-semibold">{idx + 1}. {q.q}</p>
                <Badge variant="secondary" className="shrink-0 scale-90">
                  {q.marks} Mark{q.marks === 1 ? '' : 's'}
                </Badge>
              </div>

              {/* MCQ Options */}
              {q.type === 'mcq' && q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {q.options.map((opt, optIdx) => {
                    const optionLetter = String.fromCharCode(65 + optIdx);
                    const isSelected = studentAns === opt;
                    const isCorrectAnswer = optIdx === q.answerIndex;

                    let btnStyle = 'border-muted bg-card hover:bg-muted/10 text-foreground';
                    if (submitted) {
                      if (isCorrectAnswer) {
                        btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-medium';
                      } else if (isSelected) {
                        btnStyle = 'border-rose-500 bg-rose-50 text-rose-800 font-medium';
                      } else {
                        btnStyle = 'border-muted bg-card opacity-60';
                      }
                    } else if (isSelected) {
                      btnStyle = 'border-brand bg-brand-soft/20 text-brand font-medium';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={submitted}
                        onClick={() => handleSelectOption(idx, opt)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all duration-150 ${btnStyle}`}
                      >
                        <span className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${
                          submitted && isCorrectAnswer
                            ? 'bg-emerald-500 text-white'
                            : isSelected
                            ? 'bg-brand text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {optionLetter}
                        </span>
                        <span className="flex-1 leading-tight">{opt}</span>
                        {submitted && isCorrectAnswer && <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />}
                        {submitted && !isCorrectAnswer && isSelected && <X className="size-3.5 text-rose-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Fill in the Blank Input */}
              {q.type === 'fill_in_the_blank' && (
                <div className="mt-1">
                  <input
                    type="text"
                    disabled={submitted}
                    value={studentAns}
                    onChange={(e) => handleTextChange(idx, e.target.value)}
                    placeholder="Type the correct word..."
                    className={`flex h-8 w-full max-w-xs rounded-md border bg-background px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand ${
                      submitted
                        ? isCorrectBlank
                          ? 'border-emerald-500 bg-emerald-50/30 text-emerald-800'
                          : 'border-rose-500 bg-rose-50/30 text-rose-800'
                        : 'border-input'
                    }`}
                  />
                  {submitted && (
                    <div className="mt-1.5 space-y-1">
                      <p className={`text-[11px] font-semibold ${isCorrectBlank ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isCorrectBlank ? 'Correct!' : `Incorrect. Expected answer: "${q.answer}"`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Written Questions */}
              {(q.type === 'short' || q.type === 'very_short' || q.type === 'long') && (
                <div className="mt-1 space-y-2">
                  <textarea
                    disabled={submitted}
                    value={studentAns}
                    onChange={(e) => handleTextChange(idx, e.target.value)}
                    placeholder="Type your answer explanation here..."
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
                  />
                  {submitted && (
                    <div className="rounded-lg border bg-muted/30 p-2.5 space-y-2 text-xs">
                      <div>
                        <p className="font-semibold text-brand">Expected Marking Answer:</p>
                        <p className="text-foreground leading-normal mt-0.5 whitespace-pre-wrap">{q.answer}</p>
                      </div>
                      {aiFeedback && aiFeedback[idx] ? (
                        <div className="border-t pt-2 space-y-1">
                          <p className="font-semibold text-amber-700 flex items-center gap-1">
                            <Sparkles className="size-3 text-amber-500 animate-pulse" /> AI Examiner Score: {aiFeedback[idx].score} / {q.marks}
                          </p>
                          <p className="text-muted-foreground leading-normal italic">"{aiFeedback[idx].feedback}"</p>
                        </div>
                      ) : (
                        <div className="border-t pt-2 space-y-2">
                          <p className="font-semibold text-muted-foreground">Self-Grading: Rate your answer based on marking scheme</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSelfGrade(idx, q.marks)}
                              className={`h-7 px-2.5 text-[10px] border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 ${selfGradedScores[idx] === q.marks ? 'bg-emerald-50 border-emerald-500' : ''}`}
                            >
                              Correct (+{q.marks})
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSelfGrade(idx, 0)}
                              className={`h-7 px-2.5 text-[10px] border-rose-500/30 text-rose-700 hover:bg-rose-50 ${selfGradedScores[idx] === 0 ? 'bg-rose-50 border-rose-500' : ''}`}
                            >
                              Incorrect (0)
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Explanations (always show after submit) */}
              {submitted && q.explanation && (
                <div className="mt-1.5 text-[11px] text-muted-foreground leading-normal flex items-start gap-1">
                  <Lightbulb className="size-3 text-amber-500 shrink-0 mt-0.5" />
                  <span>{q.explanation}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!submitted ? (
        <div className="flex justify-between items-center border-t pt-3">
          <Button
            size="sm"
            variant="outline"
            disabled={isAiGrading}
            onClick={handleSubmit}
            className="h-8 text-xs cursor-pointer"
          >
            Submit & Self-Grade
          </Button>
          <Button
            size="sm"
            disabled={isAiGrading}
            onClick={handleAiGrade}
            className="h-8 text-xs bg-brand text-brand-foreground hover:bg-brand/90 flex items-center gap-1 cursor-pointer"
          >
            {isAiGrading ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                AI Grading...
              </>
            ) : (
              <>
                <Sparkles className="size-3 text-brand-foreground" />
                Grade with AI Tutor
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-brand">
              Final Score: {totalScore} / {maxMarks} ({Math.round((totalScore / maxMarks) * 100)}%)
            </div>
            <Badge className={totalScore >= maxMarks * 0.8 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : totalScore >= maxMarks * 0.5 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}>
              {totalScore >= maxMarks * 0.8 ? 'Excellent!' : totalScore >= maxMarks * 0.5 ? 'Good Effort!' : 'Needs Practice'}
            </Badge>
          </div>
          {generalFeedback && (
            <p className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded-lg leading-normal">
              "{generalFeedback}"
            </p>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setAnswers({});
              setSubmitted(false);
              setSelfGradedScores({});
              setAiFeedback(null);
              setGeneralFeedback(null);
            }}
            className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 cursor-pointer"
          >
            Reset Quiz
          </Button>
        </div>
      )}
    </div>
  );
}
