'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpenCheck, Layers, Database, Plus, Loader2, Info, Sparkles, Users, FolderSearch, Zap,
  BookOpen, RefreshCw, Award, Activity, CheckCircle, HelpCircle, Flame, Check, X, RotateCcw,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ICSE_SUBJECTS, KB_CATEGORIES, type KnowledgeStats,
} from './types';

// ─── Flashcard Interface ──────────────────────────────────────────────────
interface Flashcard {
  id: string;
  question: string;
  answer: string;
  subject: string;
}

// ─── Preset ICSE Board Flashcards ─────────────────────────────────────────
const PRESET_FLASHCARDS: Flashcard[] = [
  // Physics
  {
    id: 'phy-1',
    subject: 'Physics',
    question: "State Ohm's Law and write its mathematical formula.",
    answer: "At constant temperature, the current (I) flowing through a metallic conductor is directly proportional to the potential difference (V) across its ends. Formula: V = IR, where R is the electrical resistance."
  },
  {
    id: 'phy-2',
    subject: 'Physics',
    question: "State the principle of Calorimetry.",
    answer: "When two bodies at different temperatures are mixed, heat energy lost by the hot body is equal to the heat energy gained by the cold body, provided no heat is lost to the surroundings. Heat Lost = Heat Gained."
  },
  {
    id: 'phy-3',
    subject: 'Physics',
    question: "What is Total Internal Reflection (TIR) and its two conditions?",
    answer: "When a ray of light traveling in a denser medium is incident on the interface of a rarer medium at an angle of incidence greater than the critical angle, it is totally reflected back into the denser medium. Conditions: 1) Light must travel from denser to rarer medium. 2) Angle of incidence must be greater than critical angle."
  },
  {
    id: 'phy-4',
    subject: 'Physics',
    question: "Define Specific Heat Capacity and state its SI unit.",
    answer: "The amount of heat energy required to raise the temperature of a unit mass (1 kg) of a substance by 1°C (or 1 K). SI Unit: J kg⁻¹ K⁻¹ (or J kg⁻¹ °C⁻¹)."
  },

  // Chemistry
  {
    id: 'chem-1',
    subject: 'Chemistry',
    question: "State Faraday's First Law of Electrolysis.",
    answer: "The mass (m) of any substance liberated or deposited at an electrode during electrolysis is directly proportional to the quantity of electricity (Q) passed through the electrolyte. Formula: m = Z · I · t, where Z is the electrochemical equivalent."
  },
  {
    id: 'chem-2',
    subject: 'Chemistry',
    question: "What is methyl orange's color change in acidic and alkaline solutions?",
    answer: "Methyl orange indicator is orange in neutral solution, turns pink/red in acidic solutions, and turns yellow in alkaline/basic solutions."
  },
  {
    id: 'chem-3',
    subject: 'Chemistry',
    question: "Define isomerism with an example.",
    answer: "Compounds having the same molecular formula but different structural formulas (arrangements of atoms) leading to different physical and chemical properties. Example: n-butane and isobutane (both C₄H₁₀)."
  },
  {
    id: 'chem-4',
    subject: 'Chemistry',
    question: "Name the chief ore of aluminium and write its chemical formula.",
    answer: "Bauxite. Chemical formula: Al₂O₃ · 2H₂O (Dihydrate of aluminium oxide)."
  },

  // Biology
  {
    id: 'bio-1',
    subject: 'Biology',
    question: "What is the photolysis of water? Where does it occur?",
    answer: "The splitting of water molecules into hydrogen ions (H⁺), oxygen gas (O₂), and electrons using light energy during the light-dependent phase of photosynthesis. It occurs in the grana of chloroplasts."
  },
  {
    id: 'bio-2',
    subject: 'Biology',
    question: "Explain turgidity and its significance in plants.",
    answer: "The state of cell rigidity when it has absorbed maximum water by endosmosis, pressing the protoplasm against the cell wall. Significance: provides mechanical support to non-woody stems, keeps leaves spread out, and helps in opening/closing stomata."
  },
  {
    id: 'bio-3',
    subject: 'Biology',
    question: "Name the three layers of meninges protecting the brain from outer to inner.",
    answer: "1) Dura mater (tough outer layer), 2) Arachnoid membrane (web-like middle layer), 3) Pia mater (thin, highly vascular inner layer)."
  },
  {
    id: 'bio-4',
    subject: 'Biology',
    question: "What is transpiration and how does it benefit plants?",
    answer: "The loss of water in the form of water vapor from the aerial parts (leaves, stems) of the plant. Benefits: creates a transpiration pull for water absorption, exerts a cooling effect, and helps distribute minerals."
  },

  // Mathematics
  {
    id: 'math-1',
    subject: 'Mathematics',
    question: "State the formula for the nth term (an) and sum of n terms (Sn) of an AP.",
    answer: "nth term: an = a + (n - 1)d. Sum of n terms: Sn = (n / 2) * [2a + (n - 1)d] or Sn = (n / 2) * (a + l), where a = first term, d = common difference, l = last term."
  },
  {
    id: 'math-2',
    subject: 'Mathematics',
    question: "State the conditions for roots of a quadratic equation based on Discriminant (D).",
    answer: "For ax² + bx + c = 0, D = b² - 4ac.\n1) D > 0: Roots are real and unequal.\n2) D = 0: Roots are real and equal.\n3) D < 0: Roots are imaginary/no real roots."
  },
  {
    id: 'math-3',
    subject: 'Mathematics',
    question: "What is the Section Formula for internal division?",
    answer: "The coordinates of point P(x, y) dividing the line joining A(x₁, y₁) and B(x₂, y₂) internally in the ratio m₁:m₂ are:\nx = (m₁x₂ + m₂x₁) / (m₁ + m₂)\ny = (m₁y₂ + m₂y₁) / (m₁ + m₂)"
  },
  {
    id: 'math-4',
    subject: 'Mathematics',
    question: "What is the formula for the total surface area of a solid hemisphere?",
    answer: "TSA = 3πr², where r is the radius of the hemisphere (consisting of the curved surface area 2πr² and flat circular base πr²)."
  }
];

interface KnowledgeBaseTabProps {
  refreshKey?: number;
  board?: string;
}

export function KnowledgeBaseTab({ refreshKey = 0, board = 'ICSE' }: KnowledgeBaseTabProps) {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestReport, setIngestReport] = useState<any>(null);

  // Form state
  const [subject, setSubject] = useState('');
  const [className, setClassName] = useState('10');
  const [category, setCategory] = useState('');
  const [chapter, setChapter] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  // ─── Magic Flashcards State ──────────────────────────────────────────────
  const [flashcardSubject, setFlashcardSubject] = useState<string>('Physics');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [cardHistory, setCardHistory] = useState<Record<string, 'forgot' | 'barely' | 'easy'>>({});
  const [dragX, setDragX] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/knowledge/stats');
      const data = (await res.json()) as KnowledgeStats;
      setStats(data);
    } catch {
      toast.error('Could not load knowledge base stats');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, refreshKey]);

  // Load flashcards for selected subject
  useEffect(() => {
    const filtered = PRESET_FLASHCARDS.filter(c => c.subject === flashcardSubject);
    setFlashcards(filtered);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  }, [flashcardSubject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !category || !title || !content.trim()) {
      toast.error('Subject, category, title and content are required.');
      return;
    }
    if (content.trim().length < 30) {
      toast.error('Content should be at least 30 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/knowledge/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject, className, category, chapter: chapter || 'General',
          title, content, tags, board,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not add chunk');
      toast.success('Knowledge chunk added. KB index refreshed.');
      // Reset form
      setTitle('');
      setContent('');
      setTags('');
      setChapter('');
      // Refresh stats
      loadStats();
    } catch (err: any) {
      toast.error(err?.message || 'Could not add chunk');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSmartIngest = async (dryRun: boolean = false) => {
    setIngesting(true);
    setIngestReport(null);
    toast.info(dryRun ? 'Scanning uploads folder (dry run)...' : 'Scanning & ingesting uploads...');
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Ingest failed');
      setIngestReport(data);
      const s = data.summary;
      toast.success(
        dryRun
          ? `Scan complete: ${s.chunksIngested} new, ${s.chunksSkipped} duplicates would be skipped`
          : `Ingested ${s.chunksIngested} new chunks (skipped ${s.chunksSkipped} duplicates)`,
        { duration: 6000 }
      );
      if (!dryRun) loadStats();
    } catch (err: any) {
      toast.error(err?.message || 'Ingest failed');
    } finally {
      setIngesting(false);
    }
  };

  // ─── AI Flashcard Generator ──────────────────────────────────────────────
  const handleGenerateAIFlashcards = async () => {
    setGeneratingCards(true);
    toast.info(`Extracting flashcards from RAG chunks for ${flashcardSubject}...`);
    try {
      const prompt = `Generate exactly 4 comprehensive board-exam study flashcards for Class 10 ${flashcardSubject} based on syllabus. Respond ONLY with a valid JSON array of objects, each containing exactly two fields: "question" and "answer". Do not include any code blocks, markdown tags (like \`\`\`json), or other commentary.
Example output format:
[
  {"question": "What is Lenz's Law?", "answer": "Lenz's law states that the direction of the induced current is such that it opposes the change that produces it."}
]`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          subject: flashcardSubject,
          forceReasoning: false,
          preferredModel: 'auto'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed');

      // Strip markdown code fences if present
      let rawText = data.answer || '';
      rawText = rawText.replace(/```json/i, '').replace(/```/g, '').trim();

      const newCards = JSON.parse(rawText) as { question: string; answer: string }[];
      if (!Array.isArray(newCards) || newCards.length === 0) {
        throw new Error('Invalid JSON format returned by AI');
      }

      const formatted: Flashcard[] = newCards.map((c, i) => ({
        id: `ai-card-${Date.now()}-${i}`,
        subject: flashcardSubject,
        question: c.question,
        answer: c.answer
      }));

      setFlashcards(formatted);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setCardHistory({});
      toast.success(`Successfully forged ${formatted.length} AI flashcards!`);
    } catch (err: any) {
      console.error(err);
      toast.error('AI flashcard generation failed. Using default board cards.');
      const filtered = PRESET_FLASHCARDS.filter(c => c.subject === flashcardSubject);
      setFlashcards(filtered);
    } finally {
      setGeneratingCards(false);
    }
  };

  // ─── Sparkles particles ──────────────────────────────────────────────────
  const triggerSparkles = () => {
    const newSparkles = Array.from({ length: 20 }).map((_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 180 - 90,
      y: Math.random() * 120 - 60,
      color: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#fbbf24', '#f59e0b'][Math.floor(Math.random() * 6)],
    }));
    setSparkles(newSparkles);
    setTimeout(() => setSparkles([]), 1000);
  };

  const handleSwipe = (direction: 'easy' | 'forgot') => {
    setSwipeDirection(direction === 'easy' ? 'right' : 'left');
    if (direction === 'easy') {
      triggerSparkles();
    }
    recordRecall(direction);
  };

  // ─── Spaced Repetition Calculations ─────────────────────────────────────
  const recordRecall = (level: 'forgot' | 'barely' | 'easy') => {
    const activeCard = flashcards[currentCardIndex];
    if (!activeCard) return;

    setCardHistory(prev => ({
      ...prev,
      [activeCard.id]: level
    }));

    // Log flashcard recall study event
    fetch('/api/study-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'flashcard_recall',
        subject: activeCard.subject,
        topic: activeCard.question.length > 60 ? activeCard.question.slice(0, 57) + '...' : activeCard.question,
        metadata: {
          cardId: activeCard.id,
          recallLevel: level
        }
      })
    }).catch(err => console.error('Failed to log flashcard study event:', err));

    // Auto-advance to next card after a small delay
    setTimeout(() => {
      setIsFlipped(false);
      setSwipeDirection(null);
      setDragX(0);
      if (currentCardIndex < flashcards.length - 1) {
        setCurrentCardIndex(idx => idx + 1);
      } else {
        toast.success('You have completed this revision deck!');
      }
    }, 250);
  };

  const getRetentionScore = () => {
    const entries = Object.entries(cardHistory);
    if (entries.length === 0) return 0;

    let totalPoints = 0;
    entries.forEach(([_, level]) => {
      if (level === 'easy') totalPoints += 100;
      if (level === 'barely') totalPoints += 50;
    });

    return Math.round(totalPoints / entries.length);
  };

  const score = getRetentionScore();
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (s: number) => {
    if (s < 40) return 'hsl(0, 84%, 48%)'; // red
    if (s < 70) return 'hsl(38, 92%, 50%)'; // orange/amber
    return 'hsl(142, 70%, 42%)'; // emerald
  };

  const totalCacheHits = stats
    ? stats.cache.llmCacheHits + stats.cache.imageCacheHits
    : 0;

  return (
    <div className="w-full space-y-6">
      <Tabs defaultValue="index" className="w-full">
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList className="bg-muted/40 p-1 rounded-lg border">
            <TabsTrigger value="index" className="flex items-center gap-1.5 px-4 py-1.5 text-xs data-[state=active]:bg-brand data-[state=active]:text-brand-foreground">
              <Database className="size-3.5" />
              Knowledge Index
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="flex items-center gap-1.5 px-4 py-1.5 text-xs data-[state=active]:bg-brand data-[state=active]:text-brand-foreground">
              <Layers className="size-3.5" />
              Magic Flashcards
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 px-2.5 py-1 rounded-full border border-black/5">
            <Flame className="size-3.5 text-amber-500 fill-amber-500" />
            <span>Spaced Repetition Enabled</span>
          </div>
        </div>

        {/* ─── Knowledge Index & Stats Sub-Tab ───────────────────────────── */}
        <TabsContent value="index" className="mt-4 outline-none">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="size-5 text-brand" />
                  Knowledge Base Stats
                </CardTitle>
                <CardDescription>
                  Local RAG index — used by Outline, Writer & Mock agents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingStats ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Loading…
                  </div>
                ) : stats ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Stat
                        icon={<BookOpenCheck className="size-4 text-brand" />}
                        label="Total chunks"
                        value={stats.knowledgeBase.totalChunks}
                      />
                      <Stat
                        icon={<Users className="size-4 text-brand" />}
                        label="User-contributed"
                        value={stats.userContributedChunks}
                      />
                      <Stat
                        icon={<Layers className="size-4 text-brand" />}
                        label="Subjects"
                        value={stats.knowledgeBase.subjects.length}
                      />
                      <Stat
                        icon={<Sparkles className="size-4 text-brand" />}
                        label="Cache hits"
                        value={totalCacheHits}
                      />
                    </div>
                    <Separator />
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        Subjects covered
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {stats.knowledgeBase.subjects.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        Categories
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {stats.knowledgeBase.categories.map((c) => (
                          <Badge key={c} variant="outline" className="text-xs">
                            {c.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FolderSearch className="size-4 text-brand" />
                        <p className="text-xs font-medium">Smart Ingest from /upload folder</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Drop JSON/TXT/MD/DOCX/CSV files in <code className="rounded bg-muted px-1">/home/z/my-project/upload/</code> then click below. Auto-deduplicates against existing KB — only new chunks are ingested.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSmartIngest(true)}
                          disabled={ingesting}
                        >
                          {ingesting ? <Loader2 className="size-3.5 animate-spin" /> : <FolderSearch className="size-3.5" />}
                          Scan (dry run)
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSmartIngest(false)}
                          disabled={ingesting}
                        >
                          {ingesting ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                          Ingest new chunks
                        </Button>
                      </div>
                      {ingestReport && (
                        <div className="rounded-md border bg-muted/40 p-2.5 text-xs">
                          <div className="font-medium mb-1">Last run summary</div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                            <span>Files scanned: <strong className="text-foreground">{ingestReport.summary.filesScanned}</strong></span>
                            <span>Chunks parsed: <strong className="text-foreground">{ingestReport.summary.chunksParsed}</strong></span>
                            <span>Skipped (dups): <strong className="text-foreground">{ingestReport.summary.chunksSkipped}</strong></span>
                            <span>New ingested: <strong className="text-brand">{ingestReport.summary.chunksIngested}</strong></span>
                            <span>Total KB: <strong className="text-foreground">{ingestReport.summary.totalChunks}</strong></span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Stats unavailable.</p>
                )}
              </CardContent>
            </Card>

            {/* Add form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="size-5 text-brand" />
                  Add Knowledge Chunk
                </CardTitle>
                <CardDescription>
                  Feed ICSE specimen papers, textbook summaries, past papers, project exemplars.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="kb-subject">Subject *</Label>
                      <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger id="kb-subject" className="w-full">
                          <SelectValue placeholder="Choose subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {ICSE_SUBJECTS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="kb-class">Class</Label>
                      <Select value={className} onValueChange={setClassName}>
                        <SelectTrigger id="kb-class" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {board === 'ICSE' ? (
                            Array.from({ length: 10 }, (_, i) => String(i + 1)).map((c) => (
                              <SelectItem key={c} value={c}>Class {c}</SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="9">Class 9</SelectItem>
                              <SelectItem value="10">Class 10</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="kb-category">Category *</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger id="kb-category" className="w-full">
                          <SelectValue placeholder="Choose category" />
                        </SelectTrigger>
                        <SelectContent>
                          {KB_CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="kb-chapter">Chapter</Label>
                      <Input
                        id="kb-chapter"
                        value={chapter}
                        onChange={(e) => setChapter(e.target.value)}
                        placeholder="e.g. Light — Reflection"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="kb-title">Title *</Label>
                    <Input
                      id="kb-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Lens Formulas"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="kb-content">Content *</Label>
                    <Textarea
                      id="kb-content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Paste the full text..."
                      className="min-h-32 font-mono text-xs"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full gap-2 bg-brand hover:bg-brand/90 text-brand-foreground"
                  >
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Add to knowledge base
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Magic Flashcards & Memorization Board Sub-Tab ──────────────── */}
        <TabsContent value="flashcards" className="mt-4 outline-none">
          <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
            
            {/* Retention score panel */}
            <Card className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="size-4 text-brand" />
                  Recall Retention
                </CardTitle>
                <CardDescription>
                  Tracks active recall retention level.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center py-6 text-center space-y-4">
                
                {/* Circular HSL gauge */}
                <div className="relative size-28 flex items-center justify-center">
                  <svg className="size-full -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r={radius}
                      className="stroke-muted"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <motion.circle
                      cx="56"
                      cy="56"
                      r={radius}
                      stroke={getScoreColor(score)}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tracking-tight">{score}%</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Retention</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {score >= 80 ? 'Excellent recall!' : score >= 50 ? 'Steady Progress' : 'Need more practice'}
                  </p>
                  <p className="text-xs text-muted-foreground px-2">
                    Review your deck regularly to move items into long-term memory.
                  </p>
                </div>

                <div className="w-full grid grid-cols-3 gap-2 border-t pt-4 text-xs">
                  <div>
                    <span className="block font-bold text-emerald-600">
                      {Object.values(cardHistory).filter(h => h === 'easy').length}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Easy</span>
                  </div>
                  <div>
                    <span className="block font-bold text-amber-500">
                      {Object.values(cardHistory).filter(h => h === 'barely').length}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Barely</span>
                  </div>
                  <div>
                    <span className="block font-bold text-red-500">
                      {Object.values(cardHistory).filter(h => h === 'forgot').length}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Forgot</span>
                  </div>
                </div>
              </CardContent>
              <CardContent className="pt-0 pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1.5"
                  onClick={() => {
                    setCardHistory({});
                    setCurrentCardIndex(0);
                    setIsFlipped(false);
                    toast.info('Recall history reset');
                  }}
                >
                  <RotateCcw className="size-3.5" />
                  Reset Study Progress
                </Button>
              </CardContent>
            </Card>

            {/* Active Card Workspace */}
            <div className="space-y-4">
              
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border rounded-xl p-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Deck Subject:</span>
                  <Select value={flashcardSubject} onValueChange={setFlashcardSubject}>
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue placeholder="Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Physics">Physics ⚡</SelectItem>
                      <SelectItem value="Chemistry">Chemistry 🧪</SelectItem>
                      <SelectItem value="Biology">Biology 🌿</SelectItem>
                      <SelectItem value="Mathematics">Mathematics 📐</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    disabled={generatingCards}
                    onClick={() => {
                      const filtered = PRESET_FLASHCARDS.filter(c => c.subject === flashcardSubject);
                      setFlashcards(filtered);
                      setCurrentCardIndex(0);
                      setIsFlipped(false);
                      setCardHistory({});
                      toast.success('Reverted to official preset cards');
                    }}
                  >
                    Preset Cards
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"
                    onClick={handleGenerateAIFlashcards}
                    disabled={generatingCards}
                  >
                    {generatingCards ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Cards Deck */}
              {flashcards.length > 0 ? (
                <div className="space-y-5">
                  
                  {/* Progress Header */}
                  <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
                    <span>Card {currentCardIndex < flashcards.length ? currentCardIndex + 1 : flashcards.length} of {flashcards.length}</span>
                    <Badge variant="secondary">{flashcardSubject}</Badge>
                  </div>

                  {/* Flippable card view container */}
                  <div className="relative h-[280px] w-full max-w-sm mx-auto flex items-center justify-center">
                    
                    {/* Sparkles Burst Canvas/Container */}
                    <div className="absolute pointer-events-none inset-0 z-50 flex items-center justify-center">
                      {sparkles.map((sp) => (
                        <motion.div
                          key={sp.id}
                          initial={{ scale: 0.1, x: 0, y: 0, opacity: 1 }}
                          animate={{
                            scale: [0.5, 1.2, 0],
                            x: sp.x * 2,
                            y: sp.y * 2,
                            opacity: [1, 1, 0]
                          }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                          className="absolute size-3 rounded-full"
                          style={{ backgroundColor: sp.color, boxShadow: `0 0 6px ${sp.color}` }}
                        />
                      ))}
                    </div>

                    {/* CARD 2 (Back Card) */}
                    {currentCardIndex + 1 < flashcards.length && (
                      <div
                        className="absolute w-full h-64 rounded-2xl border border-black/5 dark:border-white/5 bg-card/65 shadow-md flex flex-col items-center justify-center p-6 text-center select-none pointer-events-none"
                        style={{
                          transform: 'scale(0.94) translateY(14px) rotate(2deg)',
                          zIndex: 10,
                          opacity: 0.55
                        }}
                      >
                        <div className="mb-4 inline-flex size-10 items-center justify-center rounded-full bg-brand/5 text-brand/50">
                          <HelpCircle className="size-5" />
                        </div>
                        <p className="text-base font-semibold text-foreground/40 tracking-tight leading-snug">
                          {flashcards[currentCardIndex + 1]?.question}
                        </p>
                      </div>
                    )}

                    {/* CARD 1 (Top Card) */}
                    {currentCardIndex < flashcards.length ? (
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.65}
                        onDrag={(e, info) => {
                          setDragX(info.offset.x);
                        }}
                        onDragEnd={(e, info) => {
                          if (info.offset.x > 140) {
                            handleSwipe('easy');
                          } else if (info.offset.x < -140) {
                            handleSwipe('forgot');
                          } else {
                            setDragX(0);
                          }
                        }}
                        onTap={(e, info) => {
                          if (Math.abs(dragX) < 10) {
                            setIsFlipped(!isFlipped);
                          }
                        }}
                        initial={{ scale: 0.85, y: 30, opacity: 0 }}
                        animate={{
                          scale: 1,
                          y: 0,
                          x: swipeDirection === 'right' ? 380 : swipeDirection === 'left' ? -380 : 0,
                          rotate: swipeDirection === 'right' ? 12 : swipeDirection === 'left' ? -12 : dragX / 18,
                          opacity: swipeDirection ? 0 : 1,
                        }}
                        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                        className="absolute w-full h-64 cursor-grab active:cursor-grabbing select-none bg-card rounded-2xl shadow-xl border border-black/5 dark:border-white/5 overflow-hidden"
                        style={{
                          zIndex: 20,
                          perspective: 1000,
                        }}
                      >
                        <motion.div
                          animate={{ rotateY: isFlipped ? 180 : 0 }}
                          transition={{ duration: 0.4, ease: 'easeInOut' }}
                          style={{ transformStyle: 'preserve-3d' }}
                          className="relative size-full flex items-center justify-center"
                        >
                          {/* FRONT Side */}
                          <div
                            className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-gradient-to-br from-brand-soft/20 to-card rounded-2xl"
                            style={{ backfaceVisibility: 'hidden' }}
                          >
                            {/* Drag Indicator Overlays */}
                            {dragX > 25 && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: Math.min(1, (dragX - 25) / 50), scale: 1 }}
                                className="absolute top-5 left-5 border-4 border-emerald-500 text-emerald-500 rounded-lg px-3 py-1 font-black rotate-[-12deg] text-lg uppercase tracking-wider bg-card/90"
                              >
                                EASY
                              </motion.div>
                            )}
                            {dragX < -25 && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: Math.min(1, (-dragX - 25) / 50), scale: 1 }}
                                className="absolute top-5 right-5 border-4 border-rose-500 text-rose-500 rounded-lg px-3 py-1 font-black rotate-[12deg] text-lg uppercase tracking-wider bg-card/90"
                              >
                                FORGOT
                              </motion.div>
                            )}

                            <div className="mb-4 inline-flex size-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                              <HelpCircle className="size-5" />
                            </div>
                            <p className="text-base font-semibold text-foreground tracking-tight leading-snug px-3">
                              {flashcards[currentCardIndex]?.question}
                            </p>
                            <span className="absolute bottom-4 text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                              Swipe Left: Forgot • Right: Easy • Tap to Flip
                            </span>
                          </div>

                          {/* BACK Side */}
                          <div
                            className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl"
                            style={{
                              backfaceVisibility: 'hidden',
                              transform: 'rotateY(180deg)'
                            }}
                          >
                            {/* Drag Indicator Overlays on Back too */}
                            {dragX > 25 && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: Math.min(1, (dragX - 25) / 50), scale: 1 }}
                                className="absolute top-5 left-5 border-4 border-emerald-500 text-emerald-500 rounded-lg px-3 py-1 font-black rotate-[-12deg] text-lg uppercase tracking-wider bg-card/95"
                              >
                                EASY
                              </motion.div>
                            )}
                            {dragX < -25 && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: Math.min(1, (-dragX - 25) / 50), scale: 1 }}
                                className="absolute top-5 right-5 border-4 border-rose-500 text-rose-500 rounded-lg px-3 py-1 font-black rotate-[12deg] text-lg uppercase tracking-wider bg-card/95"
                              >
                                FORGOT
                              </motion.div>
                            )}

                            <div className="mb-3 inline-flex size-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                              <BookOpen className="size-4.5" />
                            </div>
                            <p className="text-xs text-slate-100 font-medium leading-relaxed max-w-md break-words px-3">
                              {flashcards[currentCardIndex]?.answer}
                            </p>
                            <span className="absolute bottom-4 text-[9px] uppercase font-bold text-emerald-400 tracking-wider">
                              Swipe Left: Forgot • Right: Easy • Tap to Flip
                            </span>
                          </div>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute w-full h-64 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500/10 via-brand-soft/5 to-card rounded-2xl shadow-lg border border-black/5 text-center p-6"
                      >
                        <Award className="size-12 text-indigo-500 mb-3 animate-bounce" />
                        <h4 className="font-bold text-sm text-foreground">Deck Completed!</h4>
                        <p className="text-xs text-muted-foreground max-w-xs mt-1">
                          You've reviewed all flashcards in this subject. Your retention score is currently {score}%.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentCardIndex(0);
                            setIsFlipped(false);
                            setCardHistory({});
                            toast.info('Restarted study session');
                          }}
                          className="mt-4 text-xs gap-1"
                        >
                          <RotateCcw className="size-3.5" />
                          Review Deck Again
                        </Button>
                      </motion.div>
                    )}
                  </div>

                  {/* Feedback Buttons */}
                  {currentCardIndex < flashcards.length && (
                    <AnimatePresence mode="wait">
                      {isFlipped && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex items-center justify-center gap-3 animate-fade-in"
                        >
                          <Button
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSwipe('forgot');
                            }}
                            className="flex-1 gap-1.5"
                          >
                            <X className="size-4" />
                            Forgot
                          </Button>
                          <Button
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              recordRecall('barely');
                            }}
                            className="flex-1 gap-1.5 border-amber-500/30 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                          >
                            <AlertCircle className="size-4" />
                            Barely Recalled
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSwipe('easy');
                            }}
                            className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            <Check className="size-4" />
                            Easy Recall
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}

                  {currentCardIndex < flashcards.length && !isFlipped && (
                    <p className="text-center text-xs text-muted-foreground animate-pulse">
                      🧐 Swipe card (Left: Forgot, Right: Easy) or Tap to Flip
                    </p>
                  )}

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center border border-dashed rounded-2xl h-64 text-center p-6 bg-muted/10">
                  <Layers className="size-10 text-muted-foreground/60 mb-2 animate-bounce" />
                  <p className="font-semibold text-sm">No flashcards loaded</p>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    Select a subject or click Generate with AI to retrieve your revision materials.
                  </p>
                </div>
              )}

            </div>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border bg-muted/30 p-3"
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </motion.div>
  );
}
