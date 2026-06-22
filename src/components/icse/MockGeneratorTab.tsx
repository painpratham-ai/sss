'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileQuestion, Loader2, FlaskConical, Calendar, Trophy, Users,
  Check, X, Award, Sparkles, Play, ArrowRight, Clock,
  Gamepad2, BookOpen, AlertCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ToggleGroup, ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ICSE_SUBJECTS, CBSE_SUBJECTS, DIFFICULTIES, type MockPaper, type MockResponse } from './types';
import { MockPaperCard } from './MockPaperCard';

interface QuizQuestion {
  q: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

interface BotState {
  name: string;
  avatar: string;
  accuracy: number;
  minSpeed: number; // seconds
  maxSpeed: number; // seconds
  score: number;
  answeredAt: number | null; // time in seconds (15-timer)
  selectedOption: number | null;
  correct: boolean | null;
}

const BOTS_INITIAL: BotState[] = [
  { name: 'Rohan (Delhi)', avatar: '👨‍🎓', accuracy: 0.80, minSpeed: 2, maxSpeed: 5, score: 0, answeredAt: null, selectedOption: null, correct: null },
  { name: 'Priya (Mumbai)', avatar: '👩‍🎓', accuracy: 0.60, minSpeed: 4, maxSpeed: 9, score: 0, answeredAt: null, selectedOption: null, correct: null },
  { name: 'Kabir (Kolkata)', avatar: '🎓', accuracy: 0.85, minSpeed: 3, maxSpeed: 7, score: 0, answeredAt: null, selectedOption: null, correct: null },
];

export function MockGeneratorTab({ board = 'ICSE' }: { board?: string }) {
  const subjectsList = board === 'CBSE' ? CBSE_SUBJECTS : ICSE_SUBJECTS;
  const [activeTab, setActiveTab] = useState<'specimen' | 'custom' | 'pyq' | 'quiz'>('specimen');

  // Custom mock config states
  const [custMcq, setCustMcq] = useState(true);
  const [custBlank, setCustBlank] = useState(true);
  const [custVsa, setCustVsa] = useState(false);
  const [custSa, setCustSa] = useState(true);
  const [custLa, setCustLa] = useState(false);

  // Specimen / PYQ generation state
  const [subject, setSubject] = useState('');
  const [className, setClassName] = useState('10');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [format, setFormat] = useState<string>('full');
  const [pyqYear, setPyqYear] = useState<string>('2024');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ paper: MockPaper; id?: string | null } | null>(null);
  const [targetWeaknesses, setTargetWeaknesses] = useState(false);

  // Multiplayer Quiz Arena state
  const [playerName, setPlayerName] = useState('Student');
  const [quizState, setQuizState] = useState<'setup' | 'matchmaking' | 'playing' | 'gameover'>('setup');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timer, setTimer] = useState(15);
  const [userAnswer, setUserAnswer] = useState<number | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [bots, setBots] = useState<BotState[]>(BOTS_INITIAL);
  const [showExplanation, setShowExplanation] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [matchmakingProgress, setMatchmakingProgress] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botTimeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      botTimeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  const handleGenerate = async (mode: 'pyq' | 'specimen' | 'custom') => {
    if (!subject) {
      toast.error('Pick a subject first.');
      return;
    }
    if (!topic.trim()) {
      toast.error('Enter a topic.');
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      let payload: any = {};
      if (mode === 'pyq') {
        payload = { subject, className, topic, isPyq: true, year: parseInt(pyqYear, 10), board };
      } else if (mode === 'custom') {
        const questionTypes: string[] = [];
        if (custMcq) questionTypes.push('mcq');
        if (custBlank) questionTypes.push('fill_in_the_blank');
        if (custVsa) questionTypes.push('very_short');
        if (custSa) questionTypes.push('short');
        if (custLa) questionTypes.push('long');

        if (questionTypes.length === 0) {
          throw new Error('Please select at least one question type.');
        }
        payload = {
          subject,
          className,
          topic,
          format: 'custom',
          board,
          targetWeaknesses,
          questionTypes
        };
      } else {
        payload = { subject, className, topic, difficulty, format, board, targetWeaknesses };
      }

      const res = await fetch('/api/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Worksheet generation failed');
      const m = data as MockResponse;
      setResult({ paper: m.paper, id: m.id });
      toast.success(mode === 'pyq' ? `PYQ worksheet generated successfully!` : mode === 'custom' ? 'Custom mock paper ready!' : 'Mock paper ready!');
    } catch (err: any) {
      toast.error(err?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  // ── Multiplayer Quiz Clash Logic ──────────────────────────────────────────

  const startMatchmaking = async () => {
    if (!subject) {
      toast.error('Pick a subject first.');
      return;
    }
    if (!topic.trim()) {
      toast.error('Enter a topic.');
      return;
    }

    setQuizState('matchmaking');
    setMatchmakingProgress(0);
    setLoadingQuiz(true);

    // Fetch quiz questions concurrently while doing matchmaking animation
    let questionsFetched: QuizQuestion[] = [];
    const fetchPromise = fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, className, topic, board }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.quiz?.questions) {
          questionsFetched = data.quiz.questions;
        } else {
          throw new Error('No questions returned');
        }
      })
      .catch((err) => {
        console.error('Quiz fetch failed:', err);
        // Fallback placeholder questions if API fails or times out
        questionsFetched = [
          { q: `What is the SI unit of resistance related to ${topic}?`, options: ['Ampere', 'Volt', 'Ohm', 'Watt'], answerIndex: 2, explanation: 'Ohm is the SI unit of electric resistance.' },
          { q: `Which formula describes the primary relationship in ${topic}?`, options: ['P = VI', 'V = IR', 'E = mc²', 'F = ma'], answerIndex: 1, explanation: 'V = IR defines Ohm\'s law.' },
          { q: `Which device is used to measure electrical potential difference?`, options: ['Ammeter', 'Galvanometer', 'Voltmeter', 'Rheostat'], answerIndex: 2, explanation: 'Voltmeter is connected in parallel to measure voltage.' },
          { q: `How does resistance change as the length of a wire increases?`, options: ['Increases', 'Decreases', 'Remains same', 'Becomes zero'], answerIndex: 0, explanation: 'Resistance is directly proportional to wire length.' },
          { q: `What is the reciprocal of electrical resistance called?`, options: ['Conductance', 'Resistivity', 'Conductivity', 'Inductance'], answerIndex: 0, explanation: 'Conductance is defined as 1 / Resistance.' },
        ];
      });

    // Matchmaking Progress interval (3 seconds)
    const interval = setInterval(() => {
      setMatchmakingProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 4;
      });
    }, 120);

    await Promise.all([fetchPromise, new Promise((r) => setTimeout(r, 3000))]);
    clearInterval(interval);
    setLoadingQuiz(false);

    if (questionsFetched.length === 0) {
      toast.error('Failed to load quiz. Please try again.');
      setQuizState('setup');
      return;
    }

    setQuizQuestions(questionsFetched);
    setBots(BOTS_INITIAL.map(b => ({ ...b, score: 0 })));
    setPlayerScore(0);
    setCurrentQIndex(0);
    startRound(questionsFetched, 0);
  };

  const startRound = (questions: QuizQuestion[], index: number) => {
    setUserAnswer(null);
    setShowExplanation(false);
    setTimer(15);
    botTimeoutRefs.current.forEach(clearTimeout);
    botTimeoutRefs.current = [];

    // Reset bot states for this round
    setBots((prev) =>
      prev.map((b) => ({
        ...b,
        answeredAt: null,
        selectedOption: null,
        correct: null,
      }))
    );

    const question = questions[index];

    // Trigger bots' simulated decisions and timings
    BOTS_INITIAL.forEach((_, botIdx) => {
      const decisionDelay = Math.random() * (bots[botIdx].maxSpeed - bots[botIdx].minSpeed) + bots[botIdx].minSpeed;
      const isCorrect = Math.random() < bots[botIdx].accuracy;
      
      let botChoice = question.answerIndex;
      if (!isCorrect) {
        // Pick a random incorrect option
        const wrongOptions = [0, 1, 2, 3].filter(idx => idx !== question.answerIndex);
        botChoice = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
      }

      const timeout = setTimeout(() => {
        setBots((prev) =>
          prev.map((b, idx) => {
            if (idx === botIdx) {
              const pts = isCorrect ? Math.round(100 + ((15 - decisionDelay) / 15) * 50) : 0;
              return {
                ...b,
                answeredAt: Math.round(decisionDelay),
                selectedOption: botChoice,
                correct: isCorrect,
                score: b.score + pts,
              };
            }
            return b;
          })
        );
      }, decisionDelay * 1000);

      botTimeoutRefs.current.push(timeout);
    });

    // Start timer countdown
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          revealAnswers(questions, index, null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const selectOption = (optIdx: number) => {
    if (userAnswer !== null || showExplanation) return;
    setUserAnswer(optIdx);
    revealAnswers(quizQuestions, currentQIndex, optIdx);
  };

  const revealAnswers = (questions: QuizQuestion[], index: number, userAns: number | null) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowExplanation(true);

    const question = questions[index];
    const userCorrect = userAns === question.answerIndex;

    // Calculate player score with speed bonus
    if (userCorrect) {
      const speedBonus = Math.round((timer / 15) * 50);
      const pointsEarned = 100 + speedBonus;
      setPlayerScore((s) => s + pointsEarned);
      toast.success(`Correct! +${pointsEarned} Points`);
    } else if (userAns !== null) {
      toast.error('Incorrect Answer!');
    } else {
      toast.info('Time Up!');
    }

    // Force all bots who haven't answered to answer immediately (or time up)
    botTimeoutRefs.current.forEach(clearTimeout);
    setBots((prev) =>
      prev.map((b) => {
        if (b.selectedOption === null) {
          const isCorrect = Math.random() < b.accuracy;
          let botChoice = question.answerIndex;
          if (!isCorrect) {
            const wrongOptions = [0, 1, 2, 3].filter(idx => idx !== question.answerIndex);
            botChoice = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
          }
          const pts = isCorrect ? 100 : 0;
          return {
            ...b,
            selectedOption: botChoice,
            correct: isCorrect,
            answeredAt: 15,
            score: b.score + pts,
          };
        }
        return b;
      })
    );
  };

  const handleNextQuestion = () => {
    if (currentQIndex < 4) {
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      setQuizState('playing');
      startRound(quizQuestions, nextIdx);
    } else {
      setQuizState('gameover');
    }
  };

  const exitQuiz = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    botTimeoutRefs.current.forEach(clearTimeout);
    setQuizState('setup');
    setResult(null);
  };

  // Get current sorted leaderboard
  const leaderboard = [
    { name: `${playerName} (You)`, avatar: '🙋‍♂️', score: playerScore, isUser: true },
    ...bots.map(b => ({ name: b.name, avatar: b.avatar, score: b.score, isUser: false }))
  ].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4">
      {/* Sub-Tab Navigation Bar */}
      <div className="flex border-b border-black/5 dark:border-white/5 pb-2 gap-4 flex-wrap">
        <button
          onClick={() => { setActiveTab('specimen'); setResult(null); }}
          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'specimen' ? 'bg-brand/10 text-brand' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Specimen Mocks
        </button>
        <button
          onClick={() => { setActiveTab('custom'); setResult(null); }}
          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'custom' ? 'bg-brand/10 text-brand' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Custom Mocks
        </button>
        <button
          onClick={() => { setActiveTab('pyq'); setResult(null); }}
          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'pyq' ? 'bg-brand/10 text-brand' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          PYQ Hub (Past Papers)
        </button>
        <button
          onClick={() => { setActiveTab('quiz'); exitQuiz(); }}
          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'quiz' ? 'bg-brand/10 text-brand' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Gamepad2 className="size-4" /> Quiz Clash (Multiplayer)
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab !== 'quiz' ? (
          <motion.div
            key="workspace-specimen-pyq"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 lg:grid-cols-[1fr_1.4fr]"
          >
            {/* Form Column */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {activeTab === 'specimen' ? (
                    <>
                      <FlaskConical className="size-5 text-brand" />
                      Specimen Mock Paper
                    </>
                  ) : activeTab === 'custom' ? (
                    <>
                      <Sparkles className="size-5 text-brand" />
                      Interactive Customizer
                    </>
                  ) : (
                    <>
                      <Calendar className="size-5 text-brand" />
                      PYQ Worksheet Hub
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {activeTab === 'specimen'
                    ? 'Generate highly customized mock exam sheets with selected question patterns.'
                    : activeTab === 'custom'
                    ? 'Select custom question types (MCQs, blanks, written) and build your mock exam.'
                    : 'Practice board questions from previous years (2020-2025) sorted by topic.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="mg-subject">Subject *</Label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger id="mg-subject" className="w-full">
                        <SelectValue placeholder="Choose subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjectsList.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mg-class">Class</Label>
                    <Select value={className} onValueChange={setClassName}>
                      <SelectTrigger id="mg-class" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {board === 'ICSE' ? (
                          ['8', '9', '10', '11', '12'].map((c) => (
                            <SelectItem key={c} value={c}>Class {c}</SelectItem>
                          ))
                        ) : (
                          ['4', '5', '6', '7', '8', '9', '10'].map((c) => (
                            <SelectItem key={c} value={c}>Class {c}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mg-topic">Topic *</Label>
                  <Input
                    id="mg-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Refraction of Light"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-1 pb-1">
                  <input
                    type="checkbox"
                    id="target-weaknesses"
                    checked={targetWeaknesses}
                    onChange={(e) => setTargetWeaknesses(e.target.checked)}
                    className="size-4 rounded border-gray-300 text-brand focus:ring-brand accent-brand cursor-pointer"
                  />
                  <Label htmlFor="target-weaknesses" className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-brand animate-pulse" /> Target My Weaknesses (from Second Brain)
                  </Label>
                </div>

                {activeTab === 'specimen' ? (
                  <>
                     <div className="space-y-1.5">
                      <Label>Question Format</Label>
                      <ToggleGroup
                        type="single"
                        value={format}
                        onValueChange={(v) => v && setFormat(v)}
                        variant="outline"
                        className="justify-start gap-1 flex-wrap"
                      >
                        <ToggleGroupItem value="full">Full Paper</ToggleGroupItem>
                        <ToggleGroupItem value="mcq">MCQ Only</ToggleGroupItem>
                        <ToggleGroupItem value="fill_in_the_blanks">Fill Blanks</ToggleGroupItem>
                        <ToggleGroupItem value="short">Short Answers</ToggleGroupItem>
                      </ToggleGroup>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Difficulty</Label>
                      <ToggleGroup
                        type="single"
                        value={difficulty}
                        onValueChange={(v) => v && setDifficulty(v)}
                        variant="outline"
                        className="justify-start"
                      >
                        {DIFFICULTIES.map((d) => (
                          <ToggleGroupItem key={d} value={d} className="capitalize">
                            {d}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                      <p className="text-[11px] text-muted-foreground">
                        <span className="capitalize">{difficulty}</span>:{' '}
                        {difficulty === 'easy'
                          ? 'fundamentals & definitions'
                          : difficulty === 'medium'
                          ? 'board-level mix'
                          : 'application-heavy reasoning'}
                      </p>
                    </div>
                  </>
                ) : activeTab === 'custom' ? (
                  <div className="space-y-2.5">
                    <Label>Question Types</Label>
                    <div className="grid grid-cols-1 gap-2 pt-0.5">
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer border rounded-lg p-2.5 bg-card hover:bg-muted/30 transition-all select-none">
                        <input
                          type="checkbox"
                          checked={custMcq}
                          onChange={(e) => setCustMcq(e.target.checked)}
                          className="size-4 rounded border-gray-300 text-brand focus:ring-brand tracking-wide accent-brand cursor-pointer"
                        />
                        <span>Multiple Choice Questions (MCQ)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer border rounded-lg p-2.5 bg-card hover:bg-muted/30 transition-all select-none">
                        <input
                          type="checkbox"
                          checked={custBlank}
                          onChange={(e) => setCustBlank(e.target.checked)}
                          className="size-4 rounded border-gray-300 text-brand focus:ring-brand tracking-wide accent-brand cursor-pointer"
                        />
                        <span>Fill in the Blanks</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer border rounded-lg p-2.5 bg-card hover:bg-muted/30 transition-all select-none">
                        <input
                          type="checkbox"
                          checked={custVsa}
                          onChange={(e) => setCustVsa(e.target.checked)}
                          className="size-4 rounded border-gray-300 text-brand focus:ring-brand tracking-wide accent-brand cursor-pointer"
                        />
                        <span>Very Short Answer (2 Marks)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer border rounded-lg p-2.5 bg-card hover:bg-muted/30 transition-all select-none">
                        <input
                          type="checkbox"
                          checked={custSa}
                          onChange={(e) => setCustSa(e.target.checked)}
                          className="size-4 rounded border-gray-300 text-brand focus:ring-brand tracking-wide accent-brand cursor-pointer"
                        />
                        <span>Short Answer (3 Marks)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer border rounded-lg p-2.5 bg-card hover:bg-muted/30 transition-all select-none">
                        <input
                          type="checkbox"
                          checked={custLa}
                          onChange={(e) => setCustLa(e.target.checked)}
                          className="size-4 rounded border-gray-300 text-brand focus:ring-brand tracking-wide accent-brand cursor-pointer"
                        />
                        <span>Long Answer (5 Marks)</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="pyq-year">Select Board Exam Year</Label>
                    <Select value={pyqYear} onValueChange={setPyqYear}>
                      <SelectTrigger id="pyq-year" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['2025', '2024', '2023', '2022', '2021', '2020'].map((y) => (
                          <SelectItem key={y} value={y}>
                            {board} Board Exam {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  onClick={() => handleGenerate(activeTab)}
                  disabled={generating}
                  className="w-full gap-2 bg-brand hover:bg-brand/90 text-brand-foreground"
                >
                  {generating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Drafting Questions…
                    </>
                  ) : (
                    <>
                      <FileQuestion className="size-4" />{' '}
                      {activeTab === 'specimen' ? 'Generate Mock Paper' : activeTab === 'custom' ? 'Generate Custom Exam' : 'Generate PYQ Sheet'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Display Column */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Generated Worksheet</CardTitle>
                <CardDescription>
                  Review and solve the generated specimen questions. Use PDF download to print.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  {generating ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center gap-3 py-20 text-center"
                    >
                      <Loader2 className="size-8 animate-spin text-brand" />
                      <p className="text-sm font-medium">Forging worksheet...</p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Combining board syllabus criteria, RAG context, and requested format patterns.
                      </p>
                    </motion.div>
                  ) : result ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <MockPaperCard paper={result.paper} id={result.id} board={board} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center gap-2 py-20 text-center"
                    >
                      <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                        {activeTab === 'specimen' ? (
                          <FlaskConical className="size-6 text-muted-foreground" />
                        ) : (
                          <BookOpen className="size-6 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm font-medium">Ready to Generate</p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Provide a subject and topic in the generator form to start practicing.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          // ── Multiplayer Quiz Clash Component ─────────────────────────────────────
          <motion.div
            key="quiz-clash-arena"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-4xl mx-auto"
          >
            {quizState === 'setup' && (
              <Card className="max-w-md mx-auto">
                <CardHeader className="text-center">
                  <div className="size-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center mx-auto mb-2">
                    <Gamepad2 className="size-6" />
                  </div>
                  <CardTitle className="text-xl">Quiz Clash Arena</CardTitle>
                  <CardDescription>
                    Compete in a fast-paced MCQ board quiz against 3 other students in real time.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="player-name">Your Student Name</Label>
                    <Input
                      id="player-name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="e.g. Aarav"
                    />
                  </div>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="mg-subject">Subject</Label>
                      <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger id="mg-subject" className="w-full">
                          <SelectValue placeholder="Choose subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjectsList.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mg-topic">Topic</Label>
                      <Input
                        id="mg-topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. Ohm's Law"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={startMatchmaking}
                    className="w-full gap-2 bg-brand text-brand-foreground hover:bg-brand/90 mt-2 font-semibold"
                  >
                    <Play className="size-4" /> Match & Start Game
                  </Button>
                </CardContent>
              </Card>
            )}

            {quizState === 'matchmaking' && (
              <Card className="max-w-md mx-auto py-12 text-center">
                <CardContent className="space-y-6 flex flex-col items-center">
                  <div className="relative">
                    <div className="size-24 rounded-full border-4 border-dashed border-brand animate-spin flex items-center justify-center"></div>
                    <Users className="size-8 text-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Finding Opponents...</h3>
                    <p className="text-xs text-muted-foreground mt-1">Connecting to {board} multiplayer servers...</p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 max-w-[200px]">
                    <div
                      className="bg-brand h-1.5 rounded-full transition-all duration-150"
                      style={{ width: `${matchmakingProgress}%` }}
                    ></div>
                  </div>
                  <div className="space-y-1">
                    {matchmakingProgress > 15 && <p className="text-xs font-medium text-emerald-600 flex items-center gap-1"><Check className="size-3.5" /> Rohan (Delhi) connected</p>}
                    {matchmakingProgress > 45 && <p className="text-xs font-medium text-emerald-600 flex items-center gap-1"><Check className="size-3.5" /> Priya (Mumbai) connected</p>}
                    {matchmakingProgress > 75 && <p className="text-xs font-medium text-emerald-600 flex items-center gap-1"><Check className="size-3.5" /> Kabir (Kolkata) connected</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {quizState === 'playing' && (
              <div className="grid gap-4 md:grid-cols-[1fr_240px]">
                {/* Active Question Panel */}
                <Card className="flex flex-col">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs font-semibold uppercase">
                        Question {currentQIndex + 1} of 5
                      </Badge>
                      <div className="flex items-center gap-1.5 text-brand font-semibold text-sm">
                        <Clock className="size-4 animate-pulse" />
                        <span className="tabular-nums">{timer}s Left</span>
                      </div>
                    </div>
                    <CardTitle className="text-base mt-2.5 font-bold text-foreground">
                      {quizQuestions[currentQIndex]?.q}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-6">
                    <div className="grid gap-2.5">
                      {quizQuestions[currentQIndex]?.options.map((opt, oIdx) => {
                        const correctIdx = quizQuestions[currentQIndex].answerIndex;
                        const isSelected = userAnswer === oIdx;
                        const isCorrect = oIdx === correctIdx;

                        let btnStyle = 'border-border bg-card hover:border-brand/40 text-foreground';
                        if (showExplanation) {
                          if (isCorrect) {
                            btnStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
                          } else if (isSelected) {
                            btnStyle = 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300';
                          } else {
                            btnStyle = 'border-border bg-card opacity-50 text-foreground';
                          }
                        } else if (isSelected) {
                          btnStyle = 'border-brand bg-brand-soft/20 text-brand';
                        }

                        return (
                          <button
                            key={oIdx}
                            onClick={() => selectOption(oIdx)}
                            disabled={showExplanation}
                            className={`w-full flex items-center justify-between rounded-xl border p-3.5 text-left text-sm font-medium transition-all ${btnStyle}`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold text-muted-foreground uppercase">
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span>{opt}</span>
                            </span>
                            {showExplanation && (
                              <span className="flex items-center gap-1 shrink-0">
                                {isCorrect && <Check className="size-4 text-emerald-600" />}
                                {!isCorrect && isSelected && <X className="size-4 text-rose-600" />}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {showExplanation && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-indigo-100 bg-indigo-50/15 p-4 text-xs space-y-1.5"
                      >
                        <p className="font-bold text-indigo-700 flex items-center gap-1">
                          <Sparkles className="size-3.5 text-amber-500" /> AI Explains:
                        </p>
                        <p className="text-foreground leading-relaxed">
                          {quizQuestions[currentQIndex]?.explanation}
                        </p>
                      </motion.div>
                    )}

                    <div className="flex justify-between items-center pt-2">
                      <Button variant="ghost" onClick={exitQuiz} size="sm" className="text-xs">
                        Leave Arena
                      </Button>
                      {showExplanation && (
                        <Button
                          onClick={handleNextQuestion}
                          className="bg-brand text-brand-foreground hover:bg-brand/90 gap-1.5 text-xs font-bold"
                        >
                          {currentQIndex < 4 ? 'Next Round' : 'Finish Quiz'}
                          <ArrowRight className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Scoreboard Sidebar */}
                <Card className="bg-muted/20 border flex flex-col justify-between">
                  <div>
                    <CardHeader className="py-3.5 border-b text-center">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 justify-center">
                        <Trophy className="size-3.5 text-amber-500" /> Leaderboard
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <ul className="space-y-2">
                        {leaderboard.map((item, idx) => (
                          <li
                            key={idx}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                              item.isUser
                                ? 'bg-brand/10 border-brand/20 font-bold text-brand'
                                : 'bg-card border-border'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-base">{item.avatar}</span>
                              <span className="truncate">{item.name}</span>
                            </div>
                            <span className="tabular-nums font-semibold">{item.score}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </div>

                  {/* Opponent Status Panel */}
                  <div className="p-3 border-t bg-muted/40">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 text-center">Round Activity</h4>
                    <ul className="space-y-1.5 text-[11px]">
                      {bots.map((bot, idx) => (
                        <li key={idx} className="flex justify-between items-center text-muted-foreground">
                          <span>{bot.name.split(' ')[0]}</span>
                          <span>
                            {bot.selectedOption !== null ? (
                              <span className="text-emerald-600 font-semibold flex items-center gap-0.5"><Check className="size-3" /> Answered</span>
                            ) : (
                              <span className="animate-pulse">thinking...</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </div>
            )}

            {quizState === 'gameover' && (
              <Card className="max-w-md mx-auto text-center py-10">
                <CardContent className="space-y-6">
                  <div className="size-16 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto animate-bounce">
                    <Trophy className="size-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">QUIZ OVER!</h2>
                    <p className="text-xs text-muted-foreground mt-1">Multiplayer Clash Podium Standings</p>
                  </div>

                  {/* Podium */}
                  <div className="flex justify-center items-end gap-3 pt-6 pb-2">
                    {/* 2nd Place */}
                    <div className="flex flex-col items-center">
                      <span className="text-2xl">👩‍🎓</span>
                      <span className="text-xs font-semibold truncate max-w-[80px]">{leaderboard[1]?.name.split(' ')[0]}</span>
                      <div className="w-16 bg-slate-200 dark:bg-slate-800 h-16 rounded-t-lg flex flex-col justify-center items-center mt-1 border border-slate-300">
                        <span className="font-extrabold text-slate-500">2nd</span>
                        <span className="text-[10px] tabular-nums font-medium">{leaderboard[1]?.score}</span>
                      </div>
                    </div>

                    {/* 1st Place */}
                    <div className="flex flex-col items-center">
                      <span className="text-3xl">👑</span>
                      <span className="text-xs font-black text-brand truncate max-w-[90px]">{leaderboard[0]?.name.split(' ')[0]}</span>
                      <div className="w-20 bg-amber-100 dark:bg-amber-950/30 h-24 rounded-t-lg flex flex-col justify-center items-center mt-1 border border-amber-300 shadow-md">
                        <span className="font-black text-amber-600 text-lg">1st</span>
                        <span className="text-xs tabular-nums font-bold text-amber-700 dark:text-amber-300">{leaderboard[0]?.score}</span>
                      </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="flex flex-col items-center">
                      <span className="text-2xl">👨‍🎓</span>
                      <span className="text-xs font-semibold truncate max-w-[80px]">{leaderboard[2]?.name.split(' ')[0]}</span>
                      <div className="w-16 bg-orange-100 dark:bg-orange-950/20 h-12 rounded-t-lg flex flex-col justify-center items-center mt-1 border border-orange-200">
                        <span className="font-extrabold text-orange-600">3rd</span>
                        <span className="text-[10px] tabular-nums font-medium">{leaderboard[2]?.score}</span>
                      </div>
                    </div>
                  </div>

                  {leaderboard[0]?.isUser ? (
                    <p className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 justify-center">
                      <Sparkles className="size-4 animate-spin text-amber-500" /> Congratulations! You won the Quiz Clash!
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Great effort! You finished in <span className="font-bold text-foreground">{leaderboard.findIndex(l => l.isUser) + 1}th place</span>.
                    </p>
                  )}

                  <div className="flex gap-3 justify-center pt-2">
                    <Button variant="outline" onClick={exitQuiz}>
                      Exit Arena
                    </Button>
                    <Button
                      onClick={startMatchmaking}
                      className="bg-brand text-brand-foreground hover:bg-brand/90 font-bold"
                    >
                      Play Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
