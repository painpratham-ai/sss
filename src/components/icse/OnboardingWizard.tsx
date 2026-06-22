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
  Flame, BookOpenCheck as SpecimenIcon
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

// ─── 3D Hover Tilt Wrapper Component ──────────────────────────────────────────
function TiltCard({
  children,
  onClick,
  className = '',
  selected = false,
  glowColor = 'rgba(99, 102, 241, 0.4)' // default indigo glow
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
  glowColor?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    // Map bounds to -15deg to +15deg
    const rY = (mouseX / (width / 2)) * 12;
    const rX = -(mouseY / (height / 2)) * 12;
    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        perspective: 800,
        transformStyle: 'preserve-3d'
      }}
      animate={{
        scale: isHovered ? 1.03 : 1,
        boxShadow: selected
          ? `0 10px 30px -10px ${glowColor}, 0 0 0 2px ${glowColor}`
          : isHovered
          ? '0 20px 40px -15px rgba(0,0,0,0.7)'
          : '0 4px 20px -10px rgba(0,0,0,0.5)'
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`cursor-pointer overflow-hidden rounded-2xl border ${
        selected
          ? 'border-indigo-500 bg-indigo-950/20'
          : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 dark:bg-slate-950/40'
      } transition-colors duration-200 ${className}`}
    >
      <motion.div
        animate={{
          rotateX: isHovered ? rotateX : 0,
          rotateY: isHovered ? rotateY : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          transformStyle: 'preserve-3d',
          height: '100%',
          width: '100%'
        }}
      >
        <div style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }} className="h-full w-full">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Onboarding structures
const ONBOARD_LEARNING_STYLES = [
  {
    id: 'Socratic',
    name: 'Socratic Method',
    description: 'Guided questioning that helps you discover answers yourself.',
    icon: HelpCircle,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    glow: 'rgba(99, 102, 241, 0.4)'
  },
  {
    id: 'Analogy',
    name: 'Analogy-based',
    description: 'Relates science and math concepts to gaming, sports, or music.',
    icon: Lightbulb,
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    glow: 'rgba(244, 63, 94, 0.4)'
  },
  {
    id: 'Practical',
    name: 'Practical Focus',
    description: 'Emphasizes experiments, lab procedures, and real-world tools.',
    icon: FlaskConical,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    glow: 'rgba(16, 185, 129, 0.4)'
  },
  {
    id: 'Visual',
    name: 'Visual Schema',
    description: 'Uses structured layouts, flowcharts, and mental ray diagrams.',
    icon: Wand2,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    glow: 'rgba(14, 165, 233, 0.4)'
  },
  {
    id: 'Direct',
    name: 'Direct & Concise',
    description: 'Crisp notes, clear formulas, and direct textbook answers.',
    icon: BookOpen,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    glow: 'rgba(245, 158, 11, 0.4)'
  }
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
  { id: '95%+', label: 'Score 95%+ (Top Rank)', desc: 'Focus on high-yield exam board rubrics.', icon: Award, glow: 'rgba(234, 179, 8, 0.4)' },
  { id: 'mastery', label: 'Master Fundamentals', desc: 'Prioritize deep scientific understanding.', icon: BrainCircuit, glow: 'rgba(99, 102, 241, 0.4)' },
  { id: 'problems', label: 'Solve Hard Questions', desc: 'Focus on numericals and analytical reasoning.', icon: Target, glow: 'rgba(244, 63, 94, 0.4)' },
  { id: 'consistency', label: 'Consistent Improvement', desc: 'A step-by-step revision planner routine.', icon: Flame, glow: 'rgba(16, 185, 129, 0.4)' }
];

const STUDY_CHALLENGES = [
  { id: 'formulas', label: 'Remembering Formulas & Terms', desc: 'Struggle with active recall and definitions.', icon: AlertCircle, glow: 'rgba(245, 158, 11, 0.4)' },
  { id: 'derivations', label: 'Theories & Derivations', desc: 'Struggle with conceptual derivations and details.', icon: BookOpen, glow: 'rgba(14, 165, 233, 0.4)' },
  { id: 'mock-tests', label: 'Mock Test Timing', desc: 'Struggle with completing papers under time stress.', icon: SpecimenIcon, glow: 'rgba(16, 185, 129, 0.4)' },
  { id: 'scheduling', label: 'Time Management', desc: 'Struggle with study planning and consistency.', icon: Coins, glow: 'rgba(139, 92, 246, 0.4)' }
];

const TUTOR_PERSONAS = [
  { id: 'Encouraging Teacher', label: 'Encouraging Teacher', desc: 'Warm, highly patient, motivational.', avatar: '🌟', glow: 'rgba(234, 179, 8, 0.4)' },
  { id: 'Strict Inspector', label: 'Strict Exam Inspector', desc: 'Rigorous, exam-focused, cuts no corners.', avatar: '📋', glow: 'rgba(239, 68, 68, 0.4)' },
  { id: 'Research Scientist', label: 'Research Scientist', desc: 'In-depth explanations, theory-driven.', avatar: '🧬', glow: 'rgba(16, 185, 129, 0.4)' },
  { id: 'Peer Buddy', label: 'Peer Study Buddy', desc: 'Casual, uses study hacks & slang.', avatar: '💬', glow: 'rgba(14, 165, 233, 0.4)' }
];

// 3D step rotation motion settings
const stepTransition3D = {
  initial: { opacity: 0, rotateY: 75, z: -150, scale: 0.9 },
  animate: { opacity: 1, rotateY: 0, z: 0, scale: 1 },
  exit: { opacity: 0, rotateY: -75, z: -150, scale: 0.9 },
  transition: { type: 'spring' as const, stiffness: 120, damping: 18 }
};

export function OnboardingWizard({ initialUser, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<number>(initialUser ? 2 : 1);
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [submitting, setSubmitting] = useState(false);

  // Form selections
  const [name, setName] = useState(initialUser?.name || '');
  const [board, setBoard] = useState<'ICSE' | 'CBSE'>(initialUser?.board as any || 'ICSE');
  const [className, setClassName] = useState(initialUser?.className || '10');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  
  // Interactive choices
  const [targetGoal, setTargetGoal] = useState('95%+');
  const [studyChallenge, setStudyChallenge] = useState('formulas');
  const [tutorPersona, setTutorPersona] = useState('Encouraging Teacher');

  // Cognitive setup
  const [learningStyle, setLearningStyle] = useState('Analogy');
  const [interests, setInterests] = useState<string[]>([]);
  
  // Progress & verification
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [syllabusHighlights, setSyllabusHighlights] = useState<any[]>([]);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);

  // Background floating 3D particle setup
  const [particles, setParticles] = useState<any[]>([]);

  const toggleSubject = (sub: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (selectedSubjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }
    setStep(3);
  };

  useEffect(() => {
    // Generate background floating shapes
    const count = 12;
    const shapes = Array.from({ length: count }, (_, i) => ({
      id: i,
      size: Math.random() * 200 + 100,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 20,
      delay: Math.random() * -20,
      color: i % 3 === 0 ? 'bg-indigo-500/10' : i % 3 === 1 ? 'bg-teal-500/10' : 'bg-fuchsia-500/10'
    }));
    setParticles(shapes);
  }, []);

  // Load Google Client
  useEffect(() => {
    if (step !== 1) return;

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
          console.error('Failed to init google sign-in on mount:', e);
        }
      }
    };

    return () => {
      document.body.removeChild(script);
    };
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
      if (!res.ok) {
        toast.error(data?.error || 'Google Sign-in failed');
        return;
      }
      setUser(data.user);
      setName(data.user.name || '');
      setBoard(data.user.board || 'ICSE');
      setClassName(data.user.className || '10');
      setStep(2);
      toast.success(`Welcome ${data.user.name || data.user.email}!`);
    } catch {
      toast.error('Network error during Google Sign-in');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchSyllabusHighlights = useCallback(async (currentBoard: string, currentClass: string, sampleSubject: string) => {
    if (!sampleSubject) return;
    setLoadingSyllabus(true);
    try {
      const res = await fetch(`/api/syllabus?board=${currentBoard}&className=${currentClass}&subject=${sampleSubject}`);
      const data = await res.json();
      if (data.syllabusItems) {
        setSyllabusHighlights(data.syllabusItems.slice(0, 3));
      }
    } catch (e) {
      console.error('Failed to load syllabus preview:', e);
    } finally {
      setLoadingSyllabus(false);
    }
  }, []);

  useEffect(() => {
    if (step === 4 && selectedSubjects.length > 0) {
      fetchSyllabusHighlights(board, className, selectedSubjects[0]);
    }
  }, [step, board, className, selectedSubjects, fetchSyllabusHighlights]);

  useEffect(() => {
    if (board === 'CBSE' && !['4', '5', '6', '7', '8', '9', '10'].includes(className)) {
      setClassName('10');
    } else if (board === 'ICSE' && !['8', '9', '10', '11', '12'].includes(className)) {
      setClassName('10');
    }
    const defaults = SUBJECTS_BY_BOARD[board] || [];
    setSelectedSubjects(defaults.slice(0, 3));
  }, [board, className]);

  const startCalibration = () => {
    setStep(5);
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
          learningStyle,
          interests,
          strengths: selectedSubjects, 
          weaknesses: (SUBJECTS_BY_BOARD[board] || []).filter(s => !selectedSubjects.includes(s)),
          targetScore: targetGoal,
          painPoint: studyChallenge,
          tutorPersona
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile settings');
      
      onComplete(data.user);
      toast.success('Your AI Partner has been configured successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save onboarding settings.');
      setStep(4);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 overflow-y-auto px-4 py-8 perspective-[1200px]">
      
      {/* 3D floating particle background layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((sh) => (
          <motion.div
            key={sh.id}
            className={`absolute rounded-full blur-[80px] ${sh.color}`}
            style={{
              width: sh.size,
              height: sh.size,
              left: `${sh.x}%`,
              top: `${sh.y}%`
            }}
            animate={{
              x: [0, 40, -40, 0],
              y: [0, -40, 40, 0],
              scale: [1, 1.15, 0.9, 1]
            }}
            transition={{
              duration: sh.duration,
              delay: sh.delay,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>

      {/* Main Glassmorphic 3D Card Container */}
      <div className="relative w-full max-w-2xl bg-slate-900/60 dark:bg-slate-950/60 border border-slate-800/80 rounded-3xl shadow-2xl backdrop-blur-xl p-6 md:p-10 min-h-[580px] flex flex-col justify-between text-white z-10">
        
        {/* Step progress with glowing neon bar */}
        {step < 5 && (
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-extrabold text-indigo-400 tracking-wider flex items-center gap-1.5">
                <BrainCircuit className="size-4 text-indigo-400 animate-pulse" />
                COGNITIVE CALIBRATION WIZARD
              </span>
              <span className="font-mono text-slate-400 font-bold">Step {step} of 4</span>
            </div>
            <div className="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(99,102,241,0.6)]" 
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center my-auto overflow-x-hidden py-4">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Welcome & Auth */}
            {step === 1 && (
              <motion.div
                key="step1"
                {...stepTransition3D}
                className="flex flex-col items-center text-center space-y-6"
              >
                <div className="relative size-24 flex items-center justify-center bg-indigo-500/10 rounded-full border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full blur-lg opacity-30 animate-pulse" />
                  <GraduationCap className="size-12 text-indigo-400 relative z-10" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 via-purple-300 to-teal-300 bg-clip-text text-transparent drop-shadow-md">
                    Forge Your Board Success
                  </h1>
                  <p className="text-sm text-slate-400 max-w-md mx-auto">
                    Design a personalized workspace and align your AI partner with your exact board curriculum, learning habits, and goals.
                  </p>
                </div>

                <div className="grid gap-3 w-full max-w-md text-left bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <Sparkles className="size-4.5 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300">
                      <strong>AI Agent Workbooks</strong>: Co-write 8,000+ word, 15+ section syllabus-compliant academic projects.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <BookOpenCheck className="size-4.5 text-teal-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300">
                      <strong>Interactive Partner</strong>: Chat with a personalized tutor calibrated to your preferred communication style.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 pt-4 w-full max-w-xs">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">SECURE ONBOARDING VIA GOOGLE</span>
                  <div id="google-signin-btn-onboard" className="min-h-[40px] flex justify-center shadow-lg rounded-xl overflow-hidden"></div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: School Scope */}
            {step === 2 && (
              <motion.div
                key="step2"
                {...stepTransition3D}
                className="space-y-5"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-300 to-teal-300 bg-clip-text text-transparent">Academic Scope</h3>
                  <p className="text-xs text-slate-400">Establish your board constraints and subject profile.</p>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-xl mx-auto">
                  <div className="grid gap-1.5">
                    <Label htmlFor="onboard-name" className="text-xs text-slate-400 font-bold">Your Full Name</Label>
                    <Input
                      id="onboard-name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      className="bg-slate-900/60 border-slate-800 text-sm h-11 rounded-xl focus:border-indigo-500 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-400 font-bold">Board Preferences</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {['ICSE', 'CBSE'].map((b) => {
                          const active = board === b;
                          return (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setBoard(b as any)}
                              className={`h-12 text-xs font-bold rounded-xl border flex items-center justify-center transition-all ${
                                active
                                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                                  : 'border-slate-850 hover:bg-slate-900/40 text-slate-400'
                              }`}
                            >
                              {b} Board
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-400 font-bold">Class Level</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {board === 'CBSE' ? (
                          ['4', '5', '6', '7', '8', '9', '10'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setClassName(c)}
                              className={`h-10 px-3 text-xs font-bold rounded-xl border flex items-center justify-center transition-all ${
                                className === c
                                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                                  : 'border-slate-850 hover:bg-slate-900/40 text-slate-400'
                              }`}
                            >
                              Class {c}
                            </button>
                          ))
                        ) : (
                          ['8', '9', '10', '11', '12'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setClassName(c)}
                              className={`h-10 px-3 text-xs font-bold rounded-xl border flex items-center justify-center transition-all ${
                                className === c
                                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                                  : 'border-slate-850 hover:bg-slate-900/40 text-slate-400'
                              }`}
                            >
                              Class {c}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400 font-bold">Syllabus Subjects (Select 1 or more)</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(SUBJECTS_BY_BOARD[board] || []).map((sub) => {
                        const isSelected = selectedSubjects.includes(sub);
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => toggleSubject(sub)}
                            className={`h-9 px-2 text-[10px] font-bold rounded-xl border flex items-center justify-between transition-all ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.1)]'
                                : 'border-slate-850 hover:bg-slate-900/40 text-slate-400'
                            }`}
                          >
                            <span>{sub}</span>
                            {isSelected && <Check className="size-3 text-indigo-400 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <Button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 h-11 text-xs font-bold gap-1 shadow-lg hover:scale-[1.02] transition-transform"
                    >
                      Next: Goals & Persona
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 3: Interactive Persona & Goals */}
            {step === 3 && (
              <motion.div
                key="step3"
                {...stepTransition3D}
                className="space-y-5"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">Interactive Personalization</h3>
                  <p className="text-xs text-slate-400">Configure how the AI behaves during chat sessions.</p>
                </div>

                <div className="space-y-4 max-w-xl mx-auto">
                  
                  {/* Goal selection */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400 font-bold">1. Target Exam Goal</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {TARGET_GOALS.map((goal) => {
                        const active = targetGoal === goal.id;
                        return (
                          <TiltCard
                            key={goal.id}
                            selected={active}
                            glowColor={goal.glow}
                            onClick={() => setTargetGoal(goal.id)}
                            className="p-3.5 flex items-center gap-3"
                          >
                            <goal.icon className={`size-5 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                            <div className="text-left space-y-0.5">
                              <h4 className="text-[11px] font-extrabold">{goal.label}</h4>
                              <p className="text-[9px] text-slate-400 leading-tight">{goal.desc}</p>
                            </div>
                          </TiltCard>
                        );
                      })}
                    </div>
                  </div>

                  {/* Challenge Selection */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400 font-bold">2. Biggest Study Challenge</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {STUDY_CHALLENGES.map((ch) => {
                        const active = studyChallenge === ch.id;
                        return (
                          <TiltCard
                            key={ch.id}
                            selected={active}
                            glowColor={ch.glow}
                            onClick={() => setStudyChallenge(ch.id)}
                            className="p-3.5 flex items-center gap-3"
                          >
                            <ch.icon className={`size-5 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                            <div className="text-left space-y-0.5">
                              <h4 className="text-[11px] font-extrabold">{ch.label}</h4>
                              <p className="text-[9px] text-slate-400 leading-tight">{ch.desc}</p>
                            </div>
                          </TiltCard>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tutor Persona */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400 font-bold">3. Preferred AI Partner Persona</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {TUTOR_PERSONAS.map((p) => {
                        const active = tutorPersona === p.id;
                        return (
                          <TiltCard
                            key={p.id}
                            selected={active}
                            glowColor={p.glow}
                            onClick={() => setTutorPersona(p.id)}
                            className="p-2.5 flex flex-col items-center justify-center text-center h-24"
                          >
                            <span className="text-2xl mb-1">{p.avatar}</span>
                            <h4 className="text-[10px] font-extrabold leading-tight">{p.label}</h4>
                            <p className="text-[8px] text-slate-500 mt-0.5 line-clamp-1">{p.desc}</p>
                          </TiltCard>
                        );
                      })}
                    </div>
                  </div>

                </div>

                <div className="flex justify-between items-center pt-3 max-w-xl mx-auto">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(2)}
                    className="rounded-xl px-4 h-10 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    <ChevronLeft className="size-4" /> Back
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 h-10 text-xs font-bold gap-1 shadow-lg"
                  >
                    Next: Calibrate
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Cognitive Styles & Calibration */}
            {step === 4 && (
              <motion.div
                key="step4"
                {...stepTransition3D}
                className="space-y-5"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-teal-300 to-indigo-300 bg-clip-text text-transparent">Cognitive Styles & Syllabus Match</h3>
                  <p className="text-xs text-slate-400">Final calibration before entry.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  
                  {/* Cognitive details */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-400 font-bold">1. Explanation Style</Label>
                      <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {ONBOARD_LEARNING_STYLES.map((style) => {
                          const active = learningStyle === style.id;
                          return (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => setLearningStyle(style.id)}
                              className={`p-2.5 text-left border rounded-xl flex items-center gap-2.5 transition-all ${
                                active
                                  ? 'border-indigo-500 bg-indigo-500/10'
                                  : 'border-slate-850 hover:bg-slate-900/40'
                              }`}
                            >
                              <div className={`size-7 rounded-lg flex items-center justify-center shrink-0 border ${style.color}`}>
                                <style.icon className="size-3.5" />
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="text-[10px] font-bold">{style.name}</h4>
                                <p className="text-[8px] text-slate-400 line-clamp-1">{style.description}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-400 font-bold">2. Personal Hobbies (for AI analogies)</Label>
                      <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto pr-1">
                        {ONBOARD_INTERESTS.map((int) => {
                          const isSelected = interests.includes(int.id);
                          return (
                            <button
                              key={int.id}
                              type="button"
                              onClick={() => toggleInterest(int.id)}
                              className={`h-7 px-2 text-[9px] font-bold rounded-lg border flex items-center gap-1 transition-all ${
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                                  : 'border-slate-850 hover:bg-slate-900/40 text-slate-400'
                              }`}
                            >
                              <int.icon className="size-3" />
                              <span>{int.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Specimen match highlights */}
                  <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between shadow-inner">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400">
                        <BookOpenCheck className="size-4 animate-pulse" />
                        Syllabus Index Matching
                      </div>
                      <p className="text-[9px] text-slate-400 leading-relaxed">
                        Retrieved active Board specifications matching your Class {className} {selectedSubjects[0] || 'Curriculum'} configurations.
                      </p>

                      {loadingSyllabus ? (
                        <div className="flex items-center gap-2 py-4 justify-center">
                          <Loader2 className="size-4 animate-spin text-indigo-400" />
                          <span className="text-[9px] text-slate-400 font-mono">Querying SQL chunks...</span>
                        </div>
                      ) : syllabusHighlights.length > 0 ? (
                        <div className="space-y-1.5 py-1">
                          {syllabusHighlights.map((sh, index) => (
                            <div key={sh.id || index} className="text-[9px] leading-relaxed border-l-2 border-slate-700 pl-2 py-0.5 text-slate-300">
                              <span className="font-bold text-slate-200 block">{sh.topic}: {sh.subtopic}</span>
                              <span className="text-slate-400 line-clamp-1 block">{sh.guideline}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[9px] text-slate-500 py-4 text-center font-mono">
                          Standard {board} specifications verified in index.
                        </div>
                      )}
                    </div>

                    <div className="text-[8px] text-slate-500 text-center border-t border-slate-900 pt-2 font-mono">
                      Cognitive map: {learningStyle} / Persona: {tutorPersona}
                    </div>
                  </div>

                </div>

                <div className="flex justify-between items-center pt-3">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(3)}
                    className="rounded-xl px-4 h-10 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    <ChevronLeft className="size-4" /> Back
                  </Button>
                  <Button
                    onClick={startCalibration}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl px-6 h-10 text-xs font-bold gap-1 shadow-lg shadow-indigo-600/30 hover:scale-[1.02] transition-transform"
                  >
                    Calibrate & Enter Workspace
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: Calibration Animation */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 space-y-6 text-center"
              >
                {/* 3D rotating progress circle */}
                <div className="relative size-28 flex items-center justify-center bg-indigo-500/10 rounded-full border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
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
                  <h3 className="text-lg font-bold text-white tracking-wide">Syncing Second Brain Weights</h3>
                  <p className="text-xs text-slate-400 font-mono h-5 transition-all duration-300">
                    {calibrationProgress < 20 && 'Resolving board spec files...'}
                    {calibrationProgress >= 20 && calibrationProgress < 40 && `Seeding target focus: ${targetGoal}...`}
                    {calibrationProgress >= 40 && calibrationProgress < 60 && `Customizing challenge buffers for ${studyChallenge}...`}
                    {calibrationProgress >= 60 && calibrationProgress < 80 && `Calibrating ${tutorPersona} tone maps...`}
                    {calibrationProgress >= 80 && calibrationProgress < 95 && `Mapping explainers: ${learningStyle} method...`}
                    {calibrationProgress >= 95 && 'Synchronization complete!'}
                  </p>
                </div>

                <div className="w-full max-w-xs bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400 h-full rounded-full transition-all duration-100"
                    style={{ width: `${calibrationProgress}%` }}
                  />
                </div>

                <span className="text-xs font-bold text-indigo-400 font-mono bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-900/40">
                  {calibrationProgress}%
                </span>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
