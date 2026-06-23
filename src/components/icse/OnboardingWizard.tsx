'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  GraduationCap, Sparkles, BookOpenCheck, BrainCircuit, Wand2,
  ChevronRight, ChevronLeft, Check, HelpCircle, Lightbulb,
  FlaskConical, BookOpen, Gamepad2, Rocket, Trophy, Code,
  Music, Film, Compass, Cpu, Coins, Loader2, ArrowRight,
  Target, AlertCircle, Award, Compass as BuddyIcon, ShieldAlert,
  Flame, BookOpenCheck as SpecimenIcon, User, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  board: string;
  className: string;
}

interface OnboardingWizardProps {
  initialUser: AuthUser | null;
  onComplete: (user: AuthUser) => void;
}

// ─── Vibration helper ──────────────────────────────────────────────────────────
function vibrate(pattern: number | number[] = 30) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {}
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const ONBOARD_LEARNING_STYLES = [
  { id: 'Socratic', name: 'Socratic Method', description: 'Guided questioning that helps you discover answers yourself.', icon: HelpCircle, color: 'from-indigo-500 to-violet-600', glow: 'rgba(99, 102, 241, 0.5)' },
  { id: 'Analogy', name: 'Analogy-based', description: 'Relates concepts to gaming, sports, or music.', icon: Lightbulb, color: 'from-pink-500 to-rose-600', glow: 'rgba(244, 63, 94, 0.5)' },
  { id: 'Practical', name: 'Practical Focus', description: 'Emphasizes experiments, labs, and real-world tools.', icon: FlaskConical, color: 'from-emerald-500 to-teal-600', glow: 'rgba(16, 185, 129, 0.5)' },
  { id: 'Visual', name: 'Visual Schema', description: 'Structured layouts, flowcharts, and mental diagrams.', icon: Wand2, color: 'from-sky-500 to-cyan-600', glow: 'rgba(14, 165, 233, 0.5)' },
  { id: 'Direct', name: 'Direct & Concise', description: 'Crisp notes, clear formulas, direct answers.', icon: BookOpen, color: 'from-amber-500 to-orange-600', glow: 'rgba(245, 158, 11, 0.5)' }
];

const ONBOARD_INTERESTS = [
  { id: 'gaming', label: 'Gaming & eSports', icon: Gamepad2 },
  { id: 'space', label: 'Space & Astronomy', icon: Rocket },
  { id: 'sports', label: 'Sports & Cricket', icon: Trophy },
  { id: 'coding', label: 'Coding & Tech', icon: Code },
  { id: 'music', label: 'Music & Arts', icon: Music },
  { id: 'movies', label: 'Movies & Anime', icon: Film },
  { id: 'history', label: 'History & Stories', icon: Compass },
  { id: 'robotics', label: 'Robotics & AI', icon: Cpu },
  { id: 'finance', label: 'Finance & Money', icon: Coins }
];

const SUBJECTS_BY_BOARD: Record<string, string[]> = {
  ICSE: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Applications', 'English Literature', 'History & Civics', 'Geography'],
  CBSE: ['Science', 'Mathematics', 'Social Science', 'English']
};

const TARGET_GOALS = [
  { id: '95%+', label: 'Score 95%+', desc: 'Focus on high-yield exam rubrics.', icon: Award, color: 'from-yellow-500 to-amber-600', glow: 'rgba(234, 179, 8, 0.5)' },
  { id: 'mastery', label: 'Master Fundamentals', desc: 'Deep scientific understanding.', icon: BrainCircuit, color: 'from-indigo-500 to-violet-600', glow: 'rgba(99, 102, 241, 0.5)' },
  { id: 'problems', label: 'Solve Hard Problems', desc: 'Numericals & analytical reasoning.', icon: Target, color: 'from-pink-500 to-rose-600', glow: 'rgba(244, 63, 94, 0.5)' },
  { id: 'consistency', label: 'Stay Consistent', desc: 'Step-by-step revision routine.', icon: Flame, color: 'from-emerald-500 to-teal-600', glow: 'rgba(16, 185, 129, 0.5)' }
];

const STUDY_CHALLENGES = [
  { id: 'formulas', label: 'Formulas & Terms', desc: 'Active recall struggles.', icon: AlertCircle, color: 'from-amber-500 to-orange-600', glow: 'rgba(245, 158, 11, 0.5)' },
  { id: 'derivations', label: 'Theories & Derivations', desc: 'Conceptual detail gaps.', icon: BookOpen, color: 'from-sky-500 to-cyan-600', glow: 'rgba(14, 165, 233, 0.5)' },
  { id: 'mock-tests', label: 'Mock Test Timing', desc: 'Time pressure issues.', icon: SpecimenIcon, color: 'from-emerald-500 to-teal-600', glow: 'rgba(16, 185, 129, 0.5)' },
  { id: 'scheduling', label: 'Time Management', desc: 'Planning & consistency.', icon: Coins, color: 'from-violet-500 to-purple-600', glow: 'rgba(139, 92, 246, 0.5)' }
];

const TUTOR_PERSONAS = [
  { id: 'Encouraging Teacher', label: 'Encouraging Teacher', desc: 'Warm, patient, motivational.', avatar: '🌟', color: 'from-yellow-500 to-amber-600', glow: 'rgba(234, 179, 8, 0.5)' },
  { id: 'Strict Inspector', label: 'Strict Exam Inspector', desc: 'Rigorous, exam-focused.', avatar: '📋', color: 'from-red-500 to-rose-600', glow: 'rgba(239, 68, 68, 0.5)' },
  { id: 'Research Scientist', label: 'Research Scientist', desc: 'In-depth, theory-driven.', avatar: '🧬', color: 'from-emerald-500 to-teal-600', glow: 'rgba(16, 185, 129, 0.5)' },
  { id: 'Peer Buddy', label: 'Peer Study Buddy', desc: 'Casual, uses study hacks.', avatar: '💬', color: 'from-sky-500 to-cyan-600', glow: 'rgba(14, 165, 233, 0.5)' }
];

// ─── Card transition variants ──────────────────────────────────────────────────
const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 400 : -400,
    opacity: 0,
    scale: 0.85,
    rotateY: direction > 0 ? 25 : -25,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    rotateY: 0,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -400 : 400,
    opacity: 0,
    scale: 0.85,
    rotateY: direction > 0 ? -25 : 25,
  }),
};

const cardTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

// Total question cards (welcome + 8 questions + calibration = 10 steps)
const TOTAL_QUESTIONS = 8;

export function OnboardingWizard({ initialUser, onComplete }: OnboardingWizardProps) {
  // step 0 = welcome/auth, steps 1-8 = questions, step 9 = calibration
  const [step, setStep] = useState<number>(initialUser ? 1 : 0);
  const [direction, setDirection] = useState(1);
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [submitting, setSubmitting] = useState(false);

  // Form selections
  const [name, setName] = useState(initialUser?.name || '');
  const [board, setBoard] = useState<'ICSE' | 'CBSE'>(initialUser?.board as any || 'ICSE');
  const [className, setClassName] = useState(initialUser?.className || '10');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [targetGoal, setTargetGoal] = useState('');
  const [studyChallenge, setStudyChallenge] = useState('');
  const [tutorPersona, setTutorPersona] = useState('');
  const [learningStyle, setLearningStyle] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  // Calibration
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  // Background particles
  const [particles, setParticles] = useState<any[]>([]);

  const toggleSubject = (sub: string) => {
    vibrate(25);
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const toggleInterest = (id: string) => {
    vibrate(20);
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const goNext = () => {
    vibrate(40);
    setDirection(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    vibrate(20);
    setDirection(-1);
    setStep((s) => s - 1);
  };

  useEffect(() => {
    const count = 10;
    const shapes = Array.from({ length: count }, (_, i) => ({
      id: i,
      size: Math.random() * 250 + 100,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 25 + 20,
      delay: Math.random() * -20,
      color: i % 4 === 0 ? 'bg-indigo-500/8' : i % 4 === 1 ? 'bg-teal-500/8' : i % 4 === 2 ? 'bg-fuchsia-500/8' : 'bg-amber-500/6'
    }));
    setParticles(shapes);
  }, []);

  // Load Google Client for step 0
  useEffect(() => {
    if (step !== 0) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    script.onload = () => {
      if (typeof window !== 'undefined' && (window as any).google) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '316632173309-bs8qv8g1gk1fhnh8k84rg6kafsub2mrc.apps.googleusercontent.com',
            callback: handleGoogleLoginCallback,
          });
          (window as any).google.accounts.id.renderButton(
            document.getElementById('google-signin-btn-onboard'),
            { theme: 'outline', size: 'large', width: 280 }
          );
        } catch (e) {
          console.error('Failed to init google sign-in:', e);
        }
      }
    };
    return () => { try { document.body.removeChild(script); } catch {} };
  }, [step]);

  const handleGoogleLoginCallback = async (response: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error || 'Google Sign-in failed'); return; }
      setUser(data.user);
      setName(data.user.name || '');
      setBoard(data.user.board || 'ICSE');
      setClassName(data.user.className || '10');
      vibrate([30, 50, 30]);
      toast.success(`Welcome ${data.user.name || data.user.email}!`);
      setDirection(1);
      setStep(1);
    } catch { toast.error('Network error during Google Sign-in'); }
    finally { setSubmitting(false); }
  };

  useEffect(() => {
    if (board === 'CBSE' && !['4', '5', '6', '7', '8', '9', '10'].includes(className)) setClassName('10');
    else if (board === 'ICSE' && !['8', '9', '10', '11', '12'].includes(className)) setClassName('10');
    const defaults = SUBJECTS_BY_BOARD[board] || [];
    setSelectedSubjects(defaults.slice(0, 3));
  }, [board]);

  const startCalibration = () => {
    vibrate([50, 80, 50]);
    setDirection(1);
    setStep(9);
    setCalibrationProgress(0);
    const interval = setInterval(() => {
      setCalibrationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          void completeOnboarding();
          return 100;
        }
        return prev + 2;
      });
    }, 55);
  };

  const completeOnboarding = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          board,
          className,
          learningStyle: learningStyle || 'Analogy',
          interests,
          strengths: selectedSubjects,
          weaknesses: (SUBJECTS_BY_BOARD[board] || []).filter(s => !selectedSubjects.includes(s)),
          targetScore: targetGoal || '95%+',
          painPoint: studyChallenge || 'formulas',
          tutorPersona: tutorPersona || 'Encouraging Teacher'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      vibrate([30, 100, 30, 100, 50]);
      onComplete(data.user);
      toast.success('Your AI Partner is calibrated! 🚀');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save settings.');
      setStep(8);
    }
  };

  // Question step labels for progress
  const questionLabels = [
    'Welcome', 'Your Name', 'Board', 'Class', 'Subjects',
    'Goal', 'Challenge', 'AI Persona', 'Learning Style & Interests',
    'Calibrating'
  ];

  const canProceed = (s: number): boolean => {
    switch (s) {
      case 1: return name.trim().length > 0;
      case 2: return !!board;
      case 3: return !!className;
      case 4: return selectedSubjects.length > 0;
      case 5: return !!targetGoal;
      case 6: return !!studyChallenge;
      case 7: return !!tutorPersona;
      case 8: return !!learningStyle;
      default: return true;
    }
  };

  const progress = step === 0 ? 0 : step >= 9 ? 100 : Math.round((step / TOTAL_QUESTIONS) * 100);

  // ─── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 overflow-hidden" style={{ perspective: '1200px' }}>
      
      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((sh) => (
          <motion.div
            key={sh.id}
            className={`absolute rounded-full blur-[100px] ${sh.color}`}
            style={{ width: sh.size, height: sh.size, left: `${sh.x}%`, top: `${sh.y}%` }}
            animate={{ x: [0, 50, -50, 0], y: [0, -50, 50, 0], scale: [1, 1.2, 0.85, 1] }}
            transition={{ duration: sh.duration, delay: sh.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* Progress bar — top */}
      {step > 0 && step < 9 && (
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="h-1 bg-slate-800/60">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400 shadow-[0_0_12px_rgba(99,102,241,0.6)]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          {/* Step dots */}
          <div className="flex justify-center gap-2 py-3">
            {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
              <motion.div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i + 1 === step
                    ? 'w-8 h-2 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                    : i + 1 < step
                    ? 'w-2 h-2 bg-indigo-400/70'
                    : 'w-2 h-2 bg-slate-700'
                }`}
                layout
              />
            ))}
          </div>
        </div>
      )}

      {/* Step label */}
      {step > 0 && step < 9 && (
        <div className="absolute top-12 left-0 right-0 z-20 flex justify-center">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
            {step} / {TOTAL_QUESTIONS} — {questionLabels[step]}
          </span>
        </div>
      )}

      {/* Main card container */}
      <div className="relative w-full max-w-lg z-10 px-4" style={{ transformStyle: 'preserve-3d' }}>
        <AnimatePresence mode="wait" custom={direction}>

          {/* ─── STEP 0: Welcome & Auth ─────────────────────────── */}
          {step === 0 && (
            <motion.div
              key="welcome"
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={cardTransition}
              className="bg-slate-900/70 border border-slate-800/80 rounded-3xl backdrop-blur-2xl p-8 md:p-10 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <motion.div
                  className="relative size-24 flex items-center justify-center bg-indigo-500/10 rounded-full border border-indigo-500/30"
                  animate={{ boxShadow: ['0 0 20px rgba(99,102,241,0.2)', '0 0 40px rgba(99,102,241,0.4)', '0 0 20px rgba(99,102,241,0.2)'] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <GraduationCap className="size-12 text-indigo-400 relative z-10" />
                </motion.div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 via-purple-300 to-teal-300 bg-clip-text text-transparent">
                    Forge Your Board Success
                  </h1>
                  <p className="text-sm text-slate-400 max-w-sm mx-auto">
                    8 quick questions to calibrate your personalized AI study partner.
                  </p>
                </div>

                <div className="grid gap-3 w-full max-w-sm text-left bg-slate-900/40 border border-slate-800/60 p-4 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <Sparkles className="size-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300"><strong>AI Agent Workbooks</strong>: 8,000+ word, 15+ section academic projects.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <BookOpenCheck className="size-4 text-teal-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300"><strong>Interactive Partner</strong>: Chat tutor calibrated to your style.</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 pt-2 w-full max-w-xs">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">SIGN IN TO BEGIN</span>
                  <div id="google-signin-btn-onboard" className="min-h-[40px] flex justify-center shadow-lg rounded-xl overflow-hidden"></div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 1: Name ─────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="name"
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={cardTransition}
              className="bg-slate-900/70 border border-slate-800/80 rounded-3xl backdrop-blur-2xl p-8 md:p-10 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <motion.div
                  className="size-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                >
                  <User className="size-8 text-white" />
                </motion.div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold text-white">What's your name?</h2>
                  <p className="text-xs text-slate-400">Your AI partner will use this to personalize chats.</p>
                </div>
                <Input
                  value={name}
                  onChange={(e) => { setName(e.target.value); vibrate(10); }}
                  placeholder="e.g. Aarav Sharma"
                  autoFocus
                  className="bg-slate-800/60 border-slate-700 text-center text-lg h-14 rounded-2xl focus:border-indigo-500 text-white placeholder:text-slate-600 max-w-xs"
                />
                <Button
                  onClick={goNext}
                  disabled={!canProceed(1)}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl px-8 h-12 text-sm font-bold gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.03] transition-transform"
                >
                  Continue <ChevronRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 2: Board ────────────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="board"
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={cardTransition}
              className="bg-slate-900/70 border border-slate-800/80 rounded-3xl backdrop-blur-2xl p-8 md:p-10 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <motion.div
                  className="size-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                >
                  <GraduationCap className="size-8 text-white" />
                </motion.div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold text-white">Which board?</h2>
                  <p className="text-xs text-slate-400">We'll align your syllabus and question patterns accordingly.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                  {(['ICSE', 'CBSE'] as const).map((b) => {
                    const active = board === b;
                    return (
                      <motion.button
                        key={b}
                        onClick={() => { setBoard(b); vibrate(35); }}
                        whileTap={{ scale: 0.93 }}
                        className={`relative h-24 rounded-2xl border-2 text-lg font-extrabold flex flex-col items-center justify-center gap-1 transition-all duration-200 overflow-hidden ${
                          active
                            ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300 shadow-[0_0_25px_rgba(99,102,241,0.25)]'
                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/40 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        {active && (
                          <motion.div
                            layoutId="board-glow"
                            className="absolute inset-0 bg-indigo-500/10 rounded-2xl"
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          />
                        )}
                        <span className="relative z-10">{b}</span>
                        <span className="relative z-10 text-[10px] font-medium opacity-60">Board</span>
                        {active && <Check className="absolute top-2 right-2 size-4 text-indigo-400" />}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={goBack} className="rounded-2xl px-4 h-11 text-xs text-slate-400 hover:text-white">
                    <ChevronLeft className="size-4" /> Back
                  </Button>
                  <Button onClick={goNext} disabled={!canProceed(2)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl px-8 h-11 text-sm font-bold gap-2 shadow-lg disabled:opacity-40 hover:scale-[1.03] transition-transform">
                    Continue <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 3: Class ────────────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="class"
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={cardTransition}
              className="bg-slate-900/70 border border-slate-800/80 rounded-3xl backdrop-blur-2xl p-8 md:p-10 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <motion.div
                  className="size-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                >
                  <BookOpen className="size-8 text-white" />
                </motion.div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold text-white">What class are you in?</h2>
                  <p className="text-xs text-slate-400">This determines your syllabus scope and difficulty level.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                  {(board === 'CBSE' ? ['4','5','6','7','8','9','10'] : ['8','9','10','11','12']).map((c) => {
                    const active = className === c;
                    return (
                      <motion.button
                        key={c}
                        onClick={() => { setClassName(c); vibrate(30); }}
                        whileTap={{ scale: 0.88 }}
                        className={`relative size-14 rounded-2xl border-2 text-sm font-extrabold flex items-center justify-center transition-all duration-200 ${
                          active
                            ? 'border-amber-500 bg-amber-500/15 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/40 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        {c}
                        {active && <motion.div layoutId="class-ring" className="absolute inset-0 border-2 border-amber-400 rounded-2xl" transition={{ type: 'spring', stiffness: 400, damping: 25 }} />}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={goBack} className="rounded-2xl px-4 h-11 text-xs text-slate-400 hover:text-white">
                    <ChevronLeft className="size-4" /> Back
                  </Button>
                  <Button onClick={goNext} disabled={!canProceed(3)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl px-8 h-11 text-sm font-bold gap-2 shadow-lg disabled:opacity-40 hover:scale-[1.03] transition-transform">
                    Continue <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 4: Subjects ─────────────────────────────── */}
          {step === 4 && (
            <motion.div
              key="subjects"
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={cardTransition}
              className="bg-slate-900/70 border border-slate-800/80 rounded-3xl backdrop-blur-2xl p-8 md:p-10 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-5">
                <motion.div
                  className="size-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                >
                  <BookOpenCheck className="size-8 text-white" />
                </motion.div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold text-white">Pick your subjects</h2>
                  <p className="text-xs text-slate-400">Select one or more subjects you want to focus on.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                  {(SUBJECTS_BY_BOARD[board] || []).map((sub) => {
                    const isSelected = selectedSubjects.includes(sub);
                    return (
                      <motion.button
                        key={sub}
                        onClick={() => toggleSubject(sub)}
                        whileTap={{ scale: 0.92 }}
                        className={`h-11 px-3 text-xs font-bold rounded-xl border-2 flex items-center justify-between transition-all duration-200 ${
                          isSelected
                            ? 'border-pink-500 bg-pink-500/15 text-pink-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/40 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <span>{sub}</span>
                        {isSelected && <Check className="size-4 text-pink-400 stroke-[3]" />}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="flex gap-3 pt-1">
                  <Button variant="ghost" onClick={goBack} className="rounded-2xl px-4 h-11 text-xs text-slate-400 hover:text-white">
                    <ChevronLeft className="size-4" /> Back
                  </Button>
                  <Button onClick={goNext} disabled={!canProceed(4)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl px-8 h-11 text-sm font-bold gap-2 shadow-lg disabled:opacity-40 hover:scale-[1.03] transition-transform">
                    Continue <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 5: Target Goal ──────────────────────────── */}
          {step === 5 && (
            <motion.div
              key="goal"
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={cardTransition}
              className="bg-slate-900/70 border border-slate-800/80 rounded-3xl backdrop-blur-2xl p-8 md:p-10 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-5">
                <motion.div
                  className="size-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                >
                  <Target className="size-8 text-white" />
                </motion.div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold text-white">What's your goal?</h2>
                  <p className="text-xs text-slate-400">This shapes how your AI prioritizes content.</p>
                </div>
                <div className="grid grid-cols-1 gap-2.5 w-full max-w-sm">
                  {TARGET_GOALS.map((goal, idx) => {
                    const active = targetGoal === goal.id;
                    return (
                      <motion.button
                        key={goal.id}
                        onClick={() => { setTargetGoal(goal.id); vibrate(35); }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className={`relative p-4 rounded-2xl border-2 flex items-center gap-4 text-left transition-all duration-200 ${
                          active
                            ? 'border-amber-500/70 bg-amber-500/10 shadow-[0_0_25px_rgba(234,179,8,0.2)]'
                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className={`size-10 rounded-xl bg-gradient-to-br ${goal.color} flex items-center justify-center shrink-0 shadow-md`}>
                          <goal.icon className="size-5 text-white" />
                        </div>
                        <div>
                          <h4 className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-300'}`}>{goal.label}</h4>
                          <p className="text-[10px] text-slate-500">{goal.desc}</p>
                        </div>
                        {active && <Check className="size-5 text-amber-400 ml-auto shrink-0" />}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="flex gap-3 pt-1">
                  <Button variant="ghost" onClick={goBack} className="rounded-2xl px-4 h-11 text-xs text-slate-400 hover:text-white">
                    <ChevronLeft className="size-4" /> Back
                  </Button>
                  <Button onClick={goNext} disabled={!canProceed(5)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl px-8 h-11 text-sm font-bold gap-2 shadow-lg disabled:opacity-40 hover:scale-[1.03] transition-transform">
                    Continue <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 6: Study Challenge ──────────────────────── */}
          {step === 6 && (
            <motion.div
              key="challenge"
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={cardTransition}
              className="bg-slate-900/70 border border-slate-800/80 rounded-3xl backdrop-blur-2xl p-8 md:p-10 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-5">
                <motion.div
                  className="size-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                >
                  <AlertCircle className="size-8 text-white" />
                </motion.div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold text-white">Biggest challenge?</h2>
                  <p className="text-xs text-slate-400">Your AI will focus extra on overcoming this.</p>
                </div>
                <div className="grid grid-cols-1 gap-2.5 w-full max-w-sm">
                  {STUDY_CHALLENGES.map((ch, idx) => {
                    const active = studyChallenge === ch.id;
                    return (
                      <motion.button
                        key={ch.id}
                        onClick={() => { setStudyChallenge(ch.id); vibrate(35); }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className={`relative p-4 rounded-2xl border-2 flex items-center gap-4 text-left transition-all duration-200 ${
                          active
                            ? 'border-rose-500/70 bg-rose-500/10 shadow-[0_0_25px_rgba(244,63,94,0.2)]'
                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className={`size-10 rounded-xl bg-gradient-to-br ${ch.color} flex items-center justify-center shrink-0 shadow-md`}>
                          <ch.icon className="size-5 text-white" />
                        </div>
                        <div>
                          <h4 className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-300'}`}>{ch.label}</h4>
                          <p className="text-[10px] text-slate-500">{ch.desc}</p>
                        </div>
                        {active && <Check className="size-5 text-rose-400 ml-auto shrink-0" />}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="flex gap-3 pt-1">
                  <Button variant="ghost" onClick={goBack} className="rounded-2xl px-4 h-11 text-xs text-slate-400 hover:text-white">
                    <ChevronLeft className="size-4" /> Back
                  </Button>
                  <Button onClick={goNext} disabled={!canProceed(6)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl px-8 h-11 text-sm font-bold gap-2 shadow-lg disabled:opacity-40 hover:scale-[1.03] transition-transform">
                    Continue <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 7: AI Persona ───────────────────────────── */}
          {step === 7 && (
            <motion.div
              key="persona"
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={cardTransition}
              className="bg-slate-900/70 border border-slate-800/80 rounded-3xl backdrop-blur-2xl p-8 md:p-10 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-5">
                <motion.div
                  className="size-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                >
                  <BrainCircuit className="size-8 text-white" />
                </motion.div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold text-white">Pick your AI persona</h2>
                  <p className="text-xs text-slate-400">Choose how your AI partner communicates.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                  {TUTOR_PERSONAS.map((p, idx) => {
                    const active = tutorPersona === p.id;
                    return (
                      <motion.button
                        key={p.id}
                        onClick={() => { setTutorPersona(p.id); vibrate(35); }}
                        whileTap={{ scale: 0.92 }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`relative p-4 rounded-2xl border-2 flex flex-col items-center justify-center text-center h-28 transition-all duration-200 overflow-hidden ${
                          active
                            ? 'border-violet-500/70 bg-violet-500/10 shadow-[0_0_25px_rgba(139,92,246,0.25)]'
                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/50'
                        }`}
                      >
                        <span className="text-3xl mb-1.5">{p.avatar}</span>
                        <h4 className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-300'}`}>{p.label}</h4>
                        <p className="text-[9px] text-slate-500 mt-0.5">{p.desc}</p>
                        {active && <Check className="absolute top-2 right-2 size-4 text-violet-400" />}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="flex gap-3 pt-1">
                  <Button variant="ghost" onClick={goBack} className="rounded-2xl px-4 h-11 text-xs text-slate-400 hover:text-white">
                    <ChevronLeft className="size-4" /> Back
                  </Button>
                  <Button onClick={goNext} disabled={!canProceed(7)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl px-8 h-11 text-sm font-bold gap-2 shadow-lg disabled:opacity-40 hover:scale-[1.03] transition-transform">
                    Continue <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 8: Learning Style & Interests ───────────── */}
          {step === 8 && (
            <motion.div
              key="style"
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={cardTransition}
              className="bg-slate-900/70 border border-slate-800/80 rounded-3xl backdrop-blur-2xl p-8 md:p-10 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-5">
                <motion.div
                  className="size-16 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-lg"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                >
                  <Wand2 className="size-8 text-white" />
                </motion.div>
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold text-white">How do you learn best?</h2>
                  <p className="text-xs text-slate-400">Pick a style + your hobbies for better analogies.</p>
                </div>

                {/* Learning styles */}
                <div className="grid grid-cols-1 gap-1.5 w-full max-w-sm max-h-[180px] overflow-y-auto pr-1">
                  {ONBOARD_LEARNING_STYLES.map((style, idx) => {
                    const active = learningStyle === style.id;
                    return (
                      <motion.button
                        key={style.id}
                        onClick={() => { setLearningStyle(style.id); vibrate(30); }}
                        whileTap={{ scale: 0.96 }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        className={`p-3 rounded-xl border-2 flex items-center gap-3 text-left transition-all duration-200 ${
                          active
                            ? 'border-sky-500/70 bg-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.2)]'
                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                        }`}
                      >
                        <div className={`size-8 rounded-lg bg-gradient-to-br ${style.color} flex items-center justify-center shrink-0`}>
                          <style.icon className="size-4 text-white" />
                        </div>
                        <div>
                          <h4 className={`text-[11px] font-bold ${active ? 'text-white' : 'text-slate-300'}`}>{style.name}</h4>
                          <p className="text-[9px] text-slate-500 line-clamp-1">{style.description}</p>
                        </div>
                        {active && <Check className="size-4 text-sky-400 ml-auto shrink-0" />}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Interests */}
                <div className="w-full max-w-sm">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Hobbies (for better analogies)</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {ONBOARD_INTERESTS.map((int) => {
                      const isSelected = interests.includes(int.id);
                      return (
                        <motion.button
                          key={int.id}
                          onClick={() => toggleInterest(int.id)}
                          whileTap={{ scale: 0.9 }}
                          className={`h-8 px-2.5 text-[10px] font-bold rounded-full border flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'border-sky-500 bg-sky-500/15 text-sky-300'
                              : 'border-slate-700 bg-slate-800/30 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          <int.icon className="size-3" />
                          {int.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="ghost" onClick={goBack} className="rounded-2xl px-4 h-11 text-xs text-slate-400 hover:text-white">
                    <ChevronLeft className="size-4" /> Back
                  </Button>
                  <Button
                    onClick={startCalibration}
                    disabled={!canProceed(8)}
                    className="bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-500 hover:from-indigo-500 hover:via-purple-500 hover:to-teal-400 text-white rounded-2xl px-8 h-11 text-sm font-bold gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-40 hover:scale-[1.03] transition-transform"
                  >
                    <Zap className="size-4" /> Calibrate & Launch
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 9: Calibration ──────────────────────────── */}
          {step === 9 && (
            <motion.div
              key="calibration"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="bg-slate-900/70 border border-slate-800/80 rounded-3xl backdrop-blur-2xl p-10 md:p-14 shadow-2xl"
            >
              <div className="flex flex-col items-center justify-center space-y-7 text-center">
                <div className="relative size-28 flex items-center justify-center bg-indigo-500/10 rounded-full border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                  <motion.div
                    className="absolute inset-2 rounded-full border-2 border-teal-400 border-b-transparent opacity-60"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                  <BrainCircuit className="size-12 text-indigo-400 relative z-10" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-white tracking-wide">Syncing Your AI Brain</h3>
                  <p className="text-xs text-slate-400 font-mono h-5">
                    {calibrationProgress < 20 && 'Resolving board spec files...'}
                    {calibrationProgress >= 20 && calibrationProgress < 40 && `Seeding target: ${targetGoal}...`}
                    {calibrationProgress >= 40 && calibrationProgress < 60 && `Tuning challenge buffers...`}
                    {calibrationProgress >= 60 && calibrationProgress < 80 && `Calibrating ${tutorPersona} tone...`}
                    {calibrationProgress >= 80 && calibrationProgress < 95 && `Mapping ${learningStyle} method...`}
                    {calibrationProgress >= 95 && '✓ Synchronization complete!'}
                  </p>
                </div>

                <div className="w-full max-w-xs bg-slate-800 rounded-full h-2.5 overflow-hidden shadow-inner">
                  <motion.div
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400 h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                    animate={{ width: `${calibrationProgress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>

                <span className="text-sm font-extrabold text-indigo-400 font-mono bg-indigo-950/40 px-4 py-1.5 rounded-full border border-indigo-900/40">
                  {calibrationProgress}%
                </span>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
