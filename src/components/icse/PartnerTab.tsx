'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, Sparkles, RefreshCw, Award, Activity, CheckCircle,
  HelpCircle, Flame, User, MessageSquare, Lightbulb, GraduationCap,
  Target, AlertTriangle, BookOpen, Key, ChevronRight, ChevronLeft,
  Check, Gamepad2, Rocket, Trophy, Code, Music, Film, Compass,
  Cpu, Coins, FlaskConical, Wand2, X, CheckCircle2, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MockPaperCard } from './MockPaperCard';

interface StudentProfile {
  learningStyle: string;
  interests: string[];
  strengths: string[];
  weaknesses: string[];
  studyHabits: {
    consistency: number;
    testsTaken: number;
    flashcardsReviewed: number;
    simulationsCompleted: number;
  };
  memoryLog: string[];
  lastAIExtraction?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  durationMs?: number;
  sources?: any[];
}

const PRESET_TALKS = [
  "Give me a study schedule for my weak topics.",
  "Test me on one of the formulas in my Memory Vault.",
  "Can you explain a science concept using my gaming interest?",
  "Give me some general motivation, I'm feeling stressed."
];

const ONBOARD_LEARNING_STYLES = [
  {
    id: 'Socratic',
    name: 'Socratic Method',
    description: 'Guided questioning that helps you discover answers yourself.',
    icon: HelpCircle,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
  },
  {
    id: 'Analogy',
    name: 'Analogy-based',
    description: 'Relates science and math concepts to gaming, sports, or music.',
    icon: Lightbulb,
    color: 'text-pink-500 bg-pink-500/10 border-pink-500/20'
  },
  {
    id: 'Practical',
    name: 'Practical Focus',
    description: 'Emphasizes experiments, lab procedures, and real-world tools.',
    icon: FlaskConical,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  },
  {
    id: 'Visual',
    name: 'Visual Schema',
    description: 'Uses structured layouts, flowcharts, and mental ray diagrams.',
    icon: Wand2,
    color: 'text-sky-500 bg-sky-500/10 border-sky-500/20'
  },
  {
    id: 'Direct',
    name: 'Direct & Concise',
    description: 'Crisp notes, clear formulas, and direct textbook answers.',
    icon: BookOpen,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
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

const ONBOARD_SUBJECTS = [
  { id: 'Physics', label: 'Physics ⚡' },
  { id: 'Chemistry', label: 'Chemistry 🧪' },
  { id: 'Biology', label: 'Biology 🌿' },
  { id: 'Mathematics', label: 'Mathematics 📐' },
  { id: 'Computer Applications', label: 'Computer Applications 💻' },
  { id: 'English Literature', label: 'English Literature 📖' },
  { id: 'History & Civics', label: 'History & Civics 📜' },
  { id: 'Geography', label: 'Geography 🌍' }
];

const ONBOARD_RHYTHMS = [
  { id: 'Quick Review', label: 'Quick Review', time: '15-30 mins/day', desc: 'Focus on rapid flashcards and summaries.' },
  { id: 'Balanced Prep', label: 'Balanced Prep', time: '1-2 hours/day', desc: 'Syllabus check-ins, mock tests, and virtual labs.' },
  { id: 'Intense Marathon', label: 'Intense Marathon', time: '3+ hours/day', desc: 'Deep project forging and comprehensive exam practice.' }
];

function uniqueId(): string {
  return `partner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PartnerTab({ board = 'ICSE' }: { board?: string }) {
  // Profile state
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedMapNode, setSelectedMapNode] = useState<string | null>(null);
  const [activeMockPaper, setActiveMockPaper] = useState<any | null>(null);
  const [activeMockPaperId, setActiveMockPaperId] = useState<string | null>(null);

  // Onboarding Wizard states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState('Direct');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedStrengths, setSelectedStrengths] = useState<string[]>([]);
  const [selectedWeaknesses, setSelectedWeaknesses] = useState<string[]>([]);
  const [selectedGoal, setSelectedGoal] = useState('Balanced Prep');

  // Focus Space & Pomodoro Timer states
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(1500);
  const [timerMaxSeconds, setTimerMaxSeconds] = useState(1500);
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'pomodoro' | 'short' | 'long'>('pomodoro');
  const [activeSound, setActiveSound] = useState<'none' | 'rain' | 'wind' | 'binaural'>('none');
  const [audioVolume, setAudioVolume] = useState(0.5);

  // Web Audio Ref to store active synthesizers
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourcesRef = useRef<{
    source?: AudioBufferSourceNode | OscillatorNode;
    source2?: OscillatorNode;
    gainNode?: GainNode;
    modulatorGain?: GainNode;
    modulator?: OscillatorNode;
  }>({});

  const stopFocusSound = useCallback(() => {
    const refs = audioSourcesRef.current;
    
    if (refs.modulator) {
      try { refs.modulator.stop(); } catch (e) {}
      refs.modulator.disconnect();
    }
    if (refs.source) {
      try { refs.source.stop(); } catch (e) {}
      refs.source.disconnect();
    }
    if (refs.source2) {
      try { refs.source2.stop(); } catch (e) {}
      refs.source2.disconnect();
    }
    if (refs.gainNode) {
      refs.gainNode.disconnect();
    }
    if (refs.modulatorGain) {
      refs.modulatorGain.disconnect();
    }
    
    audioSourcesRef.current = {};
    setActiveSound('none');
  }, []);

  const startFocusSound = useCallback((type: 'rain' | 'wind' | 'binaural', currentVol: number) => {
    stopFocusSound();

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(currentVol * 0.15, ctx.currentTime);
      mainGain.connect(ctx.destination);
      
      audioSourcesRef.current.gainNode = mainGain;

      if (type === 'rain' || type === 'wind') {
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        
        if (type === 'rain') {
          filter.frequency.setValueAtTime(800, ctx.currentTime);
          noiseNode.connect(filter);
          filter.connect(mainGain);
        } else {
          filter.frequency.setValueAtTime(500, ctx.currentTime);
          
          const lfo = ctx.createOscillator();
          lfo.frequency.setValueAtTime(0.08, ctx.currentTime);
          lfo.type = 'sine';
          
          const lfoGain = ctx.createGain();
          lfoGain.gain.setValueAtTime(250, ctx.currentTime);
          
          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);
          
          noiseNode.connect(filter);
          filter.connect(mainGain);
          
          lfo.start();
          audioSourcesRef.current.modulator = lfo;
          audioSourcesRef.current.modulatorGain = lfoGain;
        }

        noiseNode.start();
        audioSourcesRef.current.source = noiseNode;
      } else if (type === 'binaural') {
        const osc1 = ctx.createOscillator();
        osc1.frequency.setValueAtTime(200, ctx.currentTime);
        osc1.type = 'sine';

        const osc2 = ctx.createOscillator();
        osc2.frequency.setValueAtTime(210, ctx.currentTime);
        osc2.type = 'sine';

        const merger = ctx.createChannelMerger(2);
        
        const osc1Gain = ctx.createGain();
        const osc2Gain = ctx.createGain();
        osc1Gain.gain.setValueAtTime(0.5, ctx.currentTime);
        osc2Gain.gain.setValueAtTime(0.5, ctx.currentTime);

        osc1.connect(osc1Gain);
        osc1Gain.connect(merger, 0, 0);

        osc2.connect(osc2Gain);
        osc2Gain.connect(merger, 0, 1);

        merger.connect(mainGain);

        osc1.start();
        osc2.start();

        audioSourcesRef.current.source = osc1;
        audioSourcesRef.current.source2 = osc2;
      }

      setActiveSound(type);
    } catch (err) {
      console.error('Failed to start focus synthesizer:', err);
      toast.error('Web Audio API is not supported in this browser state.');
    }
  }, [stopFocusSound]);

  const adjustFocusVolume = useCallback((vol: number) => {
    setAudioVolume(vol);
    if (audioSourcesRef.current.gainNode) {
      audioSourcesRef.current.gainNode.gain.setTargetAtTime(vol * 0.15, audioContextRef.current?.currentTime || 0, 0.1);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopFocusSound();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, [stopFocusSound]);

  // ─── Fetch profile ────────────────────────────────────────────────────────
  const loadProfile = useCallback(async (isManualSync = false) => {
    if (isManualSync) setIsSyncing(true);
    else setLoadingProfile(true);

    try {
      const endpoint = isManualSync ? '/api/profile' : '/api/profile';
      const method = isManualSync ? 'POST' : 'GET';
      
      const res = await fetch(endpoint, { method });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch profile');
      
      const rawProfile = data.profile;
      if (rawProfile) {
        const parsedInterests = JSON.parse(rawProfile.interests || '[]');
        const parsedStrengths = JSON.parse(rawProfile.strengths || '[]');
        
        setProfile({
          learningStyle: rawProfile.learningStyle || 'Direct',
          interests: parsedInterests,
          strengths: parsedStrengths,
          weaknesses: JSON.parse(rawProfile.weaknesses || '[]'),
          studyHabits: JSON.parse(rawProfile.studyHabits || '{}'),
          memoryLog: JSON.parse(rawProfile.memoryLog || '[]'),
          lastAIExtraction: rawProfile.lastAIExtraction
        });

        // Trigger onboarding automatically if profile has no interests and no strengths
        if (!isManualSync && parsedInterests.length === 0 && parsedStrengths.length === 0) {
          setShowOnboarding(true);
        }

        if (isManualSync) {
          toast.success(data.message || 'Second Brain synced successfully!');
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to sync Second Brain profile.');
    } finally {
      setLoadingProfile(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const playCompletionSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.6);
      
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 1.2);
      
      toast.success(timerMode === 'pomodoro' ? 'Focus session completed! Great work!' : 'Break ended! Time to study!');
    } catch (e) {
      console.error(e);
    }
  }, [timerMode]);

  const logFocusSession = useCallback(async () => {
    try {
      const res = await fetch('/api/study-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'focus_session',
          subject: selectedWeaknesses[0] || 'General',
          topic: `Pomodoro Focus Session`,
          metadata: {
            durationMinutes: Math.round(timerMaxSeconds / 60),
            completedAt: new Date()
          }
        })
      });
      if (res.ok) {
        toast.info('Focus session logged to Second Brain. Syncing stats...');
        void loadProfile(false);
      }
    } catch (e) {
      console.error('Failed to log focus session:', e);
    }
  }, [selectedWeaknesses, timerMaxSeconds, loadProfile]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (timerIsRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval!);
            setTimerIsRunning(false);
            playCompletionSound();
            if (timerMode === 'pomodoro') {
              void logFocusSession();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerIsRunning, timerMode, playCompletionSound, logFocusSession]);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-msg',
      role: 'assistant',
      content: "Hello! I am your AI Second Brain study companion. I've synced with your dashboard activity, mock scores, flashcards, and practical simulators. Ask me anything, request custom study tips, or let's just talk about your exams!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync wizard options when profile is loaded
  useEffect(() => {
    if (profile) {
      setSelectedStyle(profile.learningStyle || 'Direct');
      setSelectedInterests(profile.interests || []);
      setSelectedStrengths(profile.strengths || []);
      setSelectedWeaknesses(profile.weaknesses || []);
    }
  }, [profile]);

  const [calibrationProgress, setCalibrationProgress] = useState(0);

  const toggleInterest = useCallback((id: string) => {
    setSelectedInterests(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const toggleStrength = useCallback((id: string) => {
    setSelectedStrengths(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const toggleWeakness = useCallback((id: string) => {
    setSelectedWeaknesses(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const saveOnboarding = useCallback(async () => {
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          profileData: {
            learningStyle: selectedStyle,
            interests: selectedInterests,
            strengths: selectedStrengths,
            weaknesses: selectedWeaknesses
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');
      
      setProfile({
        learningStyle: data.profile.learningStyle || 'Direct',
        interests: JSON.parse(data.profile.interests || '[]'),
        strengths: JSON.parse(data.profile.strengths || '[]'),
        weaknesses: JSON.parse(data.profile.weaknesses || '[]'),
        studyHabits: JSON.parse(data.profile.studyHabits || '{}'),
        memoryLog: JSON.parse(data.profile.memoryLog || '[]'),
        lastAIExtraction: data.profile.lastAIExtraction
      });

      toast.success('Your Second Brain has been calibrated successfully!');
      setShowOnboarding(false);
      setOnboardStep(0);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to save onboarding choices.');
      setOnboardStep(5);
    }
  }, [selectedStyle, selectedInterests, selectedStrengths, selectedWeaknesses]);

  // Trigger calibration animation and save when reaching Step 6
  useEffect(() => {
    if (showOnboarding && onboardStep === 6) {
      setCalibrationProgress(0);
      const interval = setInterval(() => {
        setCalibrationProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            void saveOnboarding();
            return 100;
          }
          return prev + 2;
        });
      }, 70); // 70ms * 50 steps = 3.5s total calibration time
      return () => clearInterval(interval);
    }
  }, [showOnboarding, onboardStep, saveOnboarding]);



  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingChat]);

  // ─── Chat Send ────────────────────────────────────────────────────────────
  const handleSend = async (textOverride?: string) => {
    const text = (textOverride || input).trim();
    if (!text || loadingChat) return;

    setInput('');
    const userMsg: Message = {
      id: uniqueId(),
      role: 'user',
      content: text
    };
    setMessages(prev => [...prev, userMsg]);
    setLoadingChat(true);

    try {
      const chatHistory = messages.map(m => ({ role: m.role, content: m.content })).slice(-8); // keep context short

      const res = await fetch('/api/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: chatHistory,
          preferredModel: 'auto',
          board
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Partner chat failed');

      setMessages(prev => [
        ...prev,
        {
          id: uniqueId(),
          role: 'assistant',
          content: data.answer,
          model: data.model,
          durationMs: data.durationMs,
          sources: data.sources
        }
      ]);

      if (data.actionExecuted) {
        const action = data.actionExecuted;
        switch (action.type) {
          case 'set_schedule':
            toast.success('Study schedule updated by your partner!');
            window.dispatchEvent(new Event('timetable-updated'));
            break;
          case 'clear_schedule':
            toast.success('Timetable cleared by your partner!');
            window.dispatchEvent(new Event('timetable-updated'));
            break;
          case 'update_profile':
            toast.success('Cognitive profile updated by your partner!');
            void loadProfile(false);
            break;
          case 'update_syllabus': {
            const progressKey = `${board.toLowerCase()}_syllabus_progress`;
            const savedProgress = localStorage.getItem(progressKey);
            const currentProgress = savedProgress ? JSON.parse(savedProgress) : {};
            currentProgress[action.topicId] = action.status;
            localStorage.setItem(progressKey, JSON.stringify(currentProgress));
            toast.success(`Syllabus tracker updated by partner: marked ${action.status}!`);
            window.dispatchEvent(new Event('syllabus-updated'));
            break;
          }
          case 'generate_mock':
            toast.success(`Specimen Mock Test generated for ${action.subject}!`);
            if (action.paper) {
              setActiveMockPaper(action.paper);
              setActiveMockPaperId(action.mockId);
            }
            break;
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to send message.');
    } finally {
      setLoadingChat(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (showOnboarding) {
    const renderWizardStep = () => {
      switch (onboardStep) {
        case 0: // Welcome Screen
          return (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center text-center space-y-6 py-6"
            >
              <div className="relative size-24 flex items-center justify-center bg-indigo-500/10 rounded-full border border-indigo-500/20 shadow-inner">
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                  className="absolute inset-0 bg-indigo-500 rounded-full blur-[8px]"
                />
                <Brain className="size-12 text-indigo-500 relative z-10 animate-pulse" />
              </div>
              <div className="space-y-2.5 max-w-lg">
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  Personalize Your AI Second Brain
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
                  Let's calibrate your cognitive companion. We will adjust its teaching method, interests, and target focus areas to align perfectly with how you study best.
                </p>
              </div>
              
              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 max-w-md text-left flex items-start gap-3">
                <Sparkles className="size-5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Why complete personalization?</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    By tailoring your style and interests (e.g. gaming, cricket), the AI Tutor will translate dry science and math formulas into analogies you'll actually understand and remember.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setOnboardStep(1)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl px-8 h-12 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all font-bold gap-2 text-xs"
              >
                Let's Get Started
                <ChevronRight className="size-4" />
              </Button>
            </motion.div>
          );

        case 1: // Learning Style
          return (
            <motion.div
              key="style"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="space-y-5"
            >
              <div className="space-y-1 text-center">
                <h3 className="text-lg font-bold text-foreground">Choose Your Learning Style</h3>
                <p className="text-xs text-muted-foreground">Select how you prefer your AI study companion to explain concepts.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {ONBOARD_LEARNING_STYLES.map((style) => {
                  const IconComponent = style.icon;
                  const isSelected = selectedStyle === style.id;
                  return (
                    <motion.div
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`cursor-pointer border rounded-2xl p-4 flex gap-3 transition-all relative overflow-hidden ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-500/5 shadow-md shadow-indigo-500/5' 
                          : 'border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 bg-card/50'
                      }`}
                    >
                      <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 border ${style.color}`}>
                        <IconComponent className="size-5" />
                      </div>
                      <div className="space-y-1 pr-6 text-left">
                        <h4 className="text-xs font-bold text-foreground">{style.name}</h4>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{style.description}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3 size-5 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow">
                          <Check className="size-3 stroke-[3]" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => setOnboardStep(0)}
                  className="rounded-xl px-4 h-10 text-xs font-medium gap-1"
                >
                  <ChevronLeft className="size-4" /> Back
                </Button>
                <Button
                  onClick={() => setOnboardStep(2)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 h-10 text-xs font-bold gap-1"
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          );

        case 2: // Personal Interests
          return (
            <motion.div
              key="interests"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="space-y-5"
            >
              <div className="space-y-1 text-center">
                <h3 className="text-lg font-bold text-foreground">Select Your Interests</h3>
                <p className="text-xs text-muted-foreground">Pick 1 to 4 topics. We'll use these to customize creative learning analogies (e.g., cricket, gaming).</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ONBOARD_INTERESTS.map((interest) => {
                  const IconComponent = interest.icon;
                  const isSelected = selectedInterests.includes(interest.id);
                  return (
                    <motion.div
                      key={interest.id}
                      onClick={() => toggleInterest(interest.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`cursor-pointer border rounded-2xl p-4 flex flex-col items-center text-center gap-2 transition-all relative ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-500/5 shadow-md shadow-indigo-500/5' 
                          : 'border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 bg-card/50'
                      }`}
                    >
                      <div className={`size-10 rounded-full flex items-center justify-center shrink-0 border ${
                        isSelected ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' : 'bg-muted text-muted-foreground'
                      }`}>
                        <IconComponent className="size-4" />
                      </div>
                      <span className="text-[11px] font-bold text-foreground">{interest.label}</span>
                      {isSelected && (
                        <div className="absolute top-2 right-2 size-4 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow">
                          <Check className="size-2.5 stroke-[3]" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => setOnboardStep(1)}
                  className="rounded-xl px-4 h-10 text-xs font-medium gap-1"
                >
                  <ChevronLeft className="size-4" /> Back
                </Button>
                <Button
                  onClick={() => setOnboardStep(3)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 h-10 text-xs font-bold gap-1"
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          );

        case 3: // Confident Areas
          return (
            <motion.div
              key="strengths"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="space-y-5"
            >
              <div className="space-y-1 text-center">
                <h3 className="text-lg font-bold text-foreground">Select Your Strong Subjects</h3>
                <p className="text-xs text-muted-foreground">Which subjects do you feel comfortable with? We'll use these as baseline strengths.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ONBOARD_SUBJECTS.map((subject) => {
                  const isSelected = selectedStrengths.includes(subject.id);
                  return (
                    <motion.div
                      key={subject.id}
                      onClick={() => toggleStrength(subject.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`cursor-pointer border rounded-xl px-4 py-3 flex justify-between items-center transition-all ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-500/5 font-semibold text-indigo-700 dark:text-indigo-300' 
                          : 'border-black/5 dark:border-white/5 bg-card/50 text-foreground'
                      }`}
                    >
                      <span className="text-[11px] font-bold">{subject.label}</span>
                      <div className={`size-4 rounded border flex items-center justify-center transition-all ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-black/20 dark:border-white/20'
                      }`}>
                        {isSelected && <Check className="size-3 stroke-[3]" />}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => setOnboardStep(2)}
                  className="rounded-xl px-4 h-10 text-xs font-medium gap-1"
                >
                  <ChevronLeft className="size-4" /> Back
                </Button>
                <Button
                  onClick={() => setOnboardStep(4)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 h-10 text-xs font-bold gap-1"
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          );

        case 4: // Focus Areas
          return (
            <motion.div
              key="weaknesses"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="space-y-5"
            >
              <div className="space-y-1 text-center">
                <h3 className="text-lg font-bold text-foreground">Subjects Requiring Improvement</h3>
                <p className="text-xs text-muted-foreground">Select the areas you want to improve. Your Second Brain will offer extra practice and guidance here.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ONBOARD_SUBJECTS.map((subject) => {
                  const isSelected = selectedWeaknesses.includes(subject.id);
                  return (
                    <motion.div
                      key={subject.id}
                      onClick={() => toggleWeakness(subject.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`cursor-pointer border rounded-xl px-4 py-3 flex justify-between items-center transition-all ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-500/5 font-semibold text-indigo-700 dark:text-indigo-300' 
                          : 'border-black/5 dark:border-white/5 bg-card/50 text-foreground'
                      }`}
                    >
                      <span className="text-[11px] font-bold">{subject.label}</span>
                      <div className={`size-4 rounded border flex items-center justify-center transition-all ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-black/20 dark:border-white/20'
                      }`}>
                        {isSelected && <Check className="size-3 stroke-[3]" />}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => setOnboardStep(3)}
                  className="rounded-xl px-4 h-10 text-xs font-medium gap-1"
                >
                  <ChevronLeft className="size-4" /> Back
                </Button>
                <Button
                  onClick={() => setOnboardStep(5)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 h-10 text-xs font-bold gap-1"
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          );

        case 5: // Daily Rhythm Goal
          return (
            <motion.div
              key="rhythm"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="space-y-5"
            >
              <div className="space-y-1 text-center">
                <h3 className="text-lg font-bold text-foreground">Select Your Study Rhythm</h3>
                <p className="text-xs text-muted-foreground">Pick a target daily study frequency for exam preparation.</p>
              </div>

              <div className="space-y-3">
                {ONBOARD_RHYTHMS.map((rhythm) => {
                  const isSelected = selectedGoal === rhythm.id;
                  return (
                    <motion.div
                      key={rhythm.id}
                      onClick={() => setSelectedGoal(rhythm.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`cursor-pointer border rounded-2xl p-4 flex justify-between items-center transition-all ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-500/5 shadow-sm shadow-indigo-500/5' 
                          : 'border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 bg-card/50'
                      }`}
                    >
                      <div className="space-y-0.5 text-left">
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          {rhythm.label}
                          <Badge variant="secondary" className="text-[9px] bg-indigo-500/10 text-indigo-600 font-semibold px-2 py-0.5">
                            {rhythm.time}
                          </Badge>
                        </h4>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{rhythm.desc}</p>
                      </div>
                      <div className={`size-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-black/20 dark:border-white/20'
                      }`}>
                        {isSelected && <Check className="size-3.5 stroke-[3]" />}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => setOnboardStep(4)}
                  className="rounded-xl px-4 h-10 text-xs font-medium gap-1"
                >
                  <ChevronLeft className="size-4" /> Back
                </Button>
                <Button
                  onClick={() => setOnboardStep(6)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 h-10 text-xs font-bold gap-1"
                >
                  Finish Calibration <ChevronRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          );

        case 6: // Calibration Screen
          const currentLabel = () => {
            if (calibrationProgress < 25) return 'Initializing synaptic pathways...';
            if (calibrationProgress < 50) return `Injecting pedagogical directives for ${selectedStyle} learning...`;
            if (calibrationProgress < 75) return `Configuring interest templates for ${selectedInterests.slice(0, 3).join(', ')}...`;
            if (calibrationProgress < 90) return `Prioritizing academic focus targets for ${selectedWeaknesses.slice(0, 3).join(', ')}...`;
            return 'Calibration complete! Synchronizing Second Brain database...';
          };
          return (
            <motion.div
              key="calibrating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 space-y-6 text-center"
            >
              <div className="relative size-20 flex items-center justify-center bg-indigo-500/10 rounded-full border border-indigo-500/20">
                <Brain className="size-10 text-indigo-500 animate-pulse" />
                <div className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
              
              <div className="space-y-2 max-w-sm">
                <h3 className="text-base font-bold text-foreground">Calibrating Synaptic Weights</h3>
                <p className="text-[10px] text-muted-foreground font-mono transition-all duration-300 h-8">
                  {currentLabel()}
                </p>
              </div>

              <div className="w-full max-w-xs bg-muted rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="bg-indigo-600 h-full rounded-full"
                  style={{ width: `${calibrationProgress}%` }}
                />
              </div>

              <span className="text-xs font-bold text-indigo-500 font-mono">
                {calibrationProgress}%
              </span>
            </motion.div>
          );
      }
    };

    return (
      <div className="w-full max-w-2xl mx-auto bg-card border border-black/5 dark:border-white/5 rounded-3xl shadow-xl overflow-hidden glass-card p-6 md:p-8 space-y-6 min-h-[500px] flex flex-col justify-between">
        {/* Wizard Header & Progress */}
        {onboardStep > 0 && onboardStep < 6 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">PERSONALIZATION WIZARD</span>
              <span className="text-[10px] font-mono text-muted-foreground">Step {onboardStep} of 5</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${((onboardStep) / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {renderWizardStep()}
          </AnimatePresence>
        </div>

        {onboardStep > 0 && onboardStep < 6 && (
          <div className="text-center">
            <button 
              onClick={() => {
                setShowOnboarding(false);
                setOnboardStep(0);
              }}
              className="text-[10px] text-muted-foreground/60 hover:text-rose-500 font-medium transition-colors"
            >
              Skip and load default dashboard
            </button>
          </div>
        )}
      </div>
    );
  }

  if (isFocusMode) {
    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const changeTimerMode = (mode: 'pomodoro' | 'short' | 'long') => {
      setTimerIsRunning(false);
      setTimerMode(mode);
      let secs = 1500;
      if (mode === 'short') secs = 300;
      if (mode === 'long') secs = 900;
      setTimerSeconds(secs);
      setTimerMaxSeconds(secs);
    };

    // Calculate circular ring progress
    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    const progressOffset = circumference - (timerSeconds / timerMaxSeconds) * circumference;

    // AI Motivational text briefing generator based on preferences
    const getAiFocusBrief = () => {
      const interestsStr = selectedInterests.length > 0 ? selectedInterests.join(', ') : 'exploring science';
      if (selectedStyle === 'Analogy') {
        return `Aarav, let's start this deep focus sprint! Just like locking in for a high-intensity session in ${interestsStr}, we're blocking all notifications to master your target focus area (${selectedWeaknesses[0] || 'General'}). No distractions, pure immersion. Let's do this!`;
      } else if (selectedStyle === 'Socratic') {
        return `Ready to challenge yourself? In this block, we will tackle ${selectedWeaknesses[0] || 'General'} concepts. Ask yourself: what is the core mechanism behind today's topic? Stay focused and let the answers reveal themselves.`;
      } else if (selectedStyle === 'Practical') {
        return `Focus mode active. Treat this Pomodoro session as a controlled experiment. Track your input, maintain zero distraction noise, and analyze your understanding. Focus topics: ${selectedWeaknesses.join(', ') || 'Syllabus topics'}.`;
      } else {
        return `Enter deep study flow. Let's concentrate on structured board syllabus targets for ${selectedWeaknesses[0] || 'General'}. Work with high focus, and reward yourself with a short break afterwards.`;
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="w-full max-w-4xl mx-auto grid md:grid-cols-[1.1fr_0.9fr] gap-6"
      >
        {/* LEFT CARD: Timer & Controls */}
        <Card className="border border-black/5 dark:border-white/5 shadow-lg overflow-hidden glass-card flex flex-col items-center justify-between p-6 min-h-[580px]">
          {/* Header */}
          <div className="w-full flex items-center justify-between border-b pb-4 mb-2">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-indigo-500 animate-pulse" />
              <h3 className="text-sm font-bold text-foreground tracking-wide uppercase">Focus Sanctum</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                stopFocusSound();
                setIsFocusMode(false);
              }}
              className="text-[10px] h-8 px-3 border border-black/5 dark:border-white/5 hover:bg-muted font-bold rounded-xl"
            >
              Exit Focus Mode
            </Button>
          </div>

          {/* Mode Selector */}
          <div className="flex gap-1 bg-muted/60 p-1 rounded-full text-xs font-semibold">
            <button
              onClick={() => changeTimerMode('pomodoro')}
              className={`rounded-full px-4 py-1.5 transition-all cursor-pointer ${
                timerMode === 'pomodoro' ? 'bg-indigo-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Focus (25m)
            </button>
            <button
              onClick={() => changeTimerMode('short')}
              className={`rounded-full px-4 py-1.5 transition-all cursor-pointer ${
                timerMode === 'short' ? 'bg-indigo-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Short Break (5m)
            </button>
            <button
              onClick={() => changeTimerMode('long')}
              className={`rounded-full px-4 py-1.5 transition-all cursor-pointer ${
                timerMode === 'long' ? 'bg-indigo-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Long Break (15m)
            </button>
          </div>

          {/* Circular SVG Timer */}
          <div className="relative size-56 flex items-center justify-center my-6">
            <svg viewBox="0 0 200 200" className="size-full -rotate-90">
              <circle
                cx="100"
                cy="100"
                r={radius}
                className="stroke-muted fill-none"
                strokeWidth="10"
              />
              <motion.circle
                cx="100"
                cy="100"
                r={radius}
                className="stroke-indigo-600 fill-none"
                strokeWidth="10"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset: progressOffset }}
                transition={{ duration: 0.35, ease: "linear" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
              <span className="text-4xl font-extrabold tracking-tighter text-foreground tabular-nums select-none">
                {formatTime(timerSeconds)}
              </span>
              <Badge variant="outline" className="text-[9px] border-indigo-200 text-indigo-600 uppercase font-bold py-0 bg-indigo-50/50">
                {timerMode === 'pomodoro' ? 'Studying' : 'Resting'}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pb-2">
            <Button
              onClick={() => setTimerIsRunning(!timerIsRunning)}
              className={`w-36 h-12 rounded-2xl font-extrabold text-xs shadow-md transition-all active:scale-95 ${
                timerIsRunning 
                  ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {timerIsRunning ? 'Pause Session' : 'Start Session'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTimerIsRunning(false);
                setTimerSeconds(timerMaxSeconds);
              }}
              className="size-12 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-muted shrink-0 shadow-sm"
            >
              <RefreshCw className="size-4 text-muted-foreground" />
            </Button>
          </div>
        </Card>

        {/* RIGHT CARD: Ambience Soundscapes & AI Briefing */}
        <div className="space-y-6 flex flex-col">
          {/* Soundscapes */}
          <Card className="border border-black/5 dark:border-white/5 shadow-lg glass-card p-5 space-y-4">
            <div className="space-y-1 text-left">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Focus Ambience</h4>
              <p className="text-[10px] text-muted-foreground">Procedurally synthesize soothing acoustic soundscapes in your browser.</p>
            </div>

            <div className="grid gap-2">
              <button
                onClick={() => activeSound === 'rain' ? stopFocusSound() : startFocusSound('rain', audioVolume)}
                className={`w-full flex items-center justify-between border p-3 rounded-2xl transition-all text-xs font-medium cursor-pointer ${
                  activeSound === 'rain' 
                    ? 'border-indigo-500 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                    : 'border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 bg-card'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🌧️</span>
                  <div className="text-left">
                    <span className="font-bold block">Cosmic Rain</span>
                    <span className="text-[9px] text-muted-foreground/80 block">Synthesized falling raindrops (pink noise)</span>
                  </div>
                </div>
                {activeSound === 'rain' && <span className="size-2 rounded-full bg-indigo-500 animate-pulse" />}
              </button>

              <button
                onClick={() => activeSound === 'wind' ? stopFocusSound() : startFocusSound('wind', audioVolume)}
                className={`w-full flex items-center justify-between border p-3 rounded-2xl transition-all text-xs font-medium cursor-pointer ${
                  activeSound === 'wind' 
                    ? 'border-indigo-500 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                    : 'border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 bg-card'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🌲</span>
                  <div className="text-left">
                    <span className="font-bold block">Forest Wind & Waves</span>
                    <span className="text-[9px] text-muted-foreground/80 block">Slow swelling wave modulations</span>
                  </div>
                </div>
                {activeSound === 'wind' && <span className="size-2 rounded-full bg-indigo-500 animate-pulse" />}
              </button>

              <button
                onClick={() => activeSound === 'binaural' ? stopFocusSound() : startFocusSound('binaural', audioVolume)}
                className={`w-full flex items-center justify-between border p-3 rounded-2xl transition-all text-xs font-medium cursor-pointer ${
                  activeSound === 'binaural' 
                    ? 'border-indigo-500 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                    : 'border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 bg-card'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🧠</span>
                  <div className="text-left">
                    <span className="font-bold block">Binaural Alpha Waves</span>
                    <span className="text-[9px] text-muted-foreground/80 block">Stereo detuned waves (10Hz focus beat)</span>
                  </div>
                </div>
                {activeSound === 'binaural' && <span className="size-2 rounded-full bg-indigo-500 animate-pulse" />}
              </button>
            </div>

            {/* Volume controller */}
            {activeSound !== 'none' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2 pt-2 border-t"
              >
                <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold uppercase">
                  <span>Synthesizer Volume</span>
                  <span>{Math.round(audioVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioVolume}
                  onChange={(e) => adjustFocusVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </motion.div>
            )}
          </Card>

          {/* AI Partner Briefing */}
          <Card className="border border-black/5 dark:border-white/5 shadow-lg glass-card p-5 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b pb-2">
                <Brain className="size-4 text-indigo-500 animate-pulse" />
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">AI Second Brain Briefing</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed italic bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/10 p-3.5 rounded-2xl">
                "{getAiFocusBrief()}"
              </p>
            </div>

            <div className="flex items-center gap-3 border-t pt-3 mt-4 text-[10px] text-muted-foreground font-medium">
              <div className="flex-1 text-left space-y-0.5">
                <span className="block text-[8px] font-bold uppercase text-muted-foreground/60">Selected Learning Style</span>
                <span className="block font-bold text-indigo-600 uppercase">{selectedStyle}</span>
              </div>
              <div className="flex-1 text-left space-y-0.5">
                <span className="block text-[8px] font-bold uppercase text-muted-foreground/60">Primary Target</span>
                <span className="block font-bold text-indigo-600 uppercase">{selectedWeaknesses[0] || 'General prep'}</span>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] w-full max-w-5xl mx-auto">
      
      {/* LEFT COLUMN: Second Brain Study Companion Chat */}
      <Card className="flex flex-col border border-black/5 dark:border-white/5 shadow-md h-[720px] justify-between overflow-hidden">
        <CardHeader className="bg-muted/10 border-b py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center">
                <Brain className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Brain Partner Agent</CardTitle>
                <CardDescription className="text-[10px]">Your personal Second Brain assistant</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px] bg-indigo-500/10 text-indigo-600 border-indigo-500/20 uppercase font-semibold">
              Cognitive Companion
            </Badge>
          </div>
        </CardHeader>

        {/* Message Panel */}
        <CardContent className="flex-1 overflow-y-auto p-4 bg-muted/5 space-y-4">
          <ScrollArea className="h-full pr-2">
            <div className="space-y-4">
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex items-start gap-2.5 max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                        isUser
                          ? 'bg-brand text-brand-foreground rounded-tr-none'
                          : 'bg-card text-foreground border border-black/5 rounded-tl-none'
                      }`}
                    >
                      {!isUser && (
                        <div className="size-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                          <Brain className="size-3" />
                        </div>
                      )}
                      <div className="space-y-1">
                        <article className="prose-icse break-words font-medium">
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
                            {m.content}
                          </ReactMarkdown>
                        </article>
                        {!isUser && m.sources && m.sources.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex flex-wrap gap-1 items-center">
                            <BookOpen className="size-3 text-indigo-500 mr-1" aria-hidden />
                            <span className="text-[10px] text-muted-foreground mr-1.5">Sources:</span>
                            {m.sources.map((src: any, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-[9px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-100 font-medium">
                                {src.title}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {!isUser && m.model && (
                          <div className="text-[9px] text-muted-foreground/60 font-mono">
                            Model: {m.model} • {m.durationMs ? `${(m.durationMs / 1000).toFixed(1)}s` : ''}
                          </div>
                        )}
                      </div>
                      {isUser && (
                        <div className="size-5 rounded-full bg-brand-foreground/20 text-brand-foreground flex items-center justify-center shrink-0 mt-0.5">
                          <User className="size-3" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loadingChat && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 max-w-[80%] rounded-2xl px-4 py-3 bg-card border text-xs text-muted-foreground shadow-sm rounded-tl-none">
                    <div className="size-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 flex items-center justify-center animate-pulse shrink-0">
                      <Brain className="size-3" />
                    </div>
                    <span className="flex gap-1 items-center font-medium">
                      Partner is formulating analogies...
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce delay-150">.</span>
                      <span className="animate-bounce delay-300">.</span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </CardContent>

        {/* Input Panel */}
        <CardContent className="border-t py-4 bg-muted/10 space-y-3.5">
          {/* Preset Chips */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TALKS.map(pt => (
              <button
                key={pt}
                onClick={() => void handleSend(pt)}
                disabled={loadingChat}
                className="text-[10px] text-muted-foreground hover:text-indigo-600 bg-card hover:bg-indigo-50 border hover:border-indigo-200 rounded-full px-2.5 py-1 transition-all cursor-pointer font-medium"
              >
                {pt}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your Brain Partner general questions or get custom studies..."
              className="flex-1 min-h-[46px] max-h-24 rounded-xl border border-black/10 dark:border-white/10 bg-card p-3 text-xs focus:outline-indigo-500 font-medium resize-none shadow-sm"
              rows={1}
            />
            <Button
              onClick={() => void handleSend()}
              disabled={loadingChat || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 h-12 shadow-sm"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* RIGHT COLUMN: Brain Synaptic Profile Dashboard */}
      <Card className="flex flex-col border border-black/5 dark:border-white/5 shadow-md h-[720px] overflow-hidden">
        <CardHeader className="bg-muted/10 border-b py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-indigo-500" />
              <CardTitle className="text-sm font-bold">Personal Memory Profile</CardTitle>
            </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTimerSeconds(1500);
                setTimerMaxSeconds(1500);
                setTimerIsRunning(false);
                setIsFocusMode(true);
              }}
              className="h-8 text-[10px] gap-1 px-2 border-indigo-200 hover:border-indigo-300 text-indigo-600 hover:text-indigo-700 bg-indigo-50/50"
            >
              <Target className="size-3 text-indigo-500" />
              Focus Space
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setOnboardStep(0);
                setShowOnboarding(true);
              }}
              className="h-8 text-[10px] gap-1 px-2 border-indigo-200 hover:border-indigo-300 text-indigo-600 hover:text-indigo-700 bg-indigo-50/50"
            >
              <Sparkles className="size-3 text-indigo-500" />
              Personalize
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isSyncing}
              onClick={() => void loadProfile(true)}
              className="h-8 text-[10px] gap-1 px-2.5 border-indigo-200 hover:border-indigo-300 text-indigo-600 hover:text-indigo-700 bg-indigo-50/50"
            >
              {isSyncing ? (
                <RefreshCw className="size-3 animate-spin text-indigo-600" />
              ) : (
                <RefreshCw className="size-3 text-indigo-600" />
              )}
              Sync Brain
            </Button>
          </div>
          </div>
        </CardHeader>

        {loadingProfile ? (
          <div className="flex-1 p-6 space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Separator />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : profile ? (
          <CardContent className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Header: Pulsing Sync & learning style */}
            <div className="flex items-center gap-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4">
              {/* Pulsing Synaptic Circle */}
              <div className="relative size-14 shrink-0 flex items-center justify-center bg-indigo-500/10 rounded-full border border-indigo-500/20">
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.2, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="absolute inset-0 bg-indigo-500 rounded-full blur-[4px]"
                />
                <Brain className="size-6 text-indigo-500 relative z-10" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">Cognitive Sync Active</span>
                  <span className="size-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Last Updated: {profile.lastAIExtraction ? new Date(profile.lastAIExtraction).toLocaleTimeString() : 'Fresh'}
                </p>
                <Badge variant="outline" className="text-[9px] font-bold border-indigo-200 text-indigo-600 py-0 px-2 uppercase bg-indigo-50/50">
                  {profile.learningStyle} Learner
                </Badge>
              </div>
            </div>

            {/* Interactive Synaptic Brain Map */}
            <div className="border border-indigo-500/10 dark:border-indigo-400/20 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Brain className="size-4 text-indigo-500 animate-pulse" />
                  Synaptic Brain Mind Map
                </span>
                <span className="text-[10px] text-muted-foreground">Tap nodes to explore cognitive density</span>
              </div>

              <div className="relative border rounded-xl overflow-hidden bg-slate-950/70 p-2 h-[200px]">
                <svg viewBox="0 0 320 180" className="size-full">
                  <defs>
                    <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Synaptic Pathway Lines (Static underlay) */}
                  <path d="M 160 90 Q 110 55 65 45" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="2" fill="none" />
                  <path d="M 160 90 Q 210 55 255 45" stroke="rgba(236, 72, 153, 0.15)" strokeWidth="2" fill="none" />
                  <path d="M 160 90 Q 110 125 65 135" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="2" fill="none" />
                  <path d="M 160 90 Q 210 125 255 135" stroke="rgba(14, 165, 233, 0.15)" strokeWidth="2" fill="none" />

                  {/* Pulsing Synaptic Action Potentials (Animated overlay) */}
                  <motion.path
                    d="M 160 90 Q 110 55 65 45"
                    stroke="#6366f1"
                    strokeWidth="1.5"
                    strokeDasharray="6, 15"
                    animate={{ strokeDashoffset: [0, -40] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                    fill="none"
                  />
                  <motion.path
                    d="M 160 90 Q 210 55 255 45"
                    stroke="#ec4899"
                    strokeWidth="1.5"
                    strokeDasharray="6, 15"
                    animate={{ strokeDashoffset: [0, -40] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                    fill="none"
                  />
                  <motion.path
                    d="M 160 90 Q 110 125 65 135"
                    stroke="#10b981"
                    strokeWidth="1.5"
                    strokeDasharray="6, 15"
                    animate={{ strokeDashoffset: [0, -40] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                    fill="none"
                  />
                  <motion.path
                    d="M 160 90 Q 210 125 255 135"
                    stroke="#0ea5e9"
                    strokeWidth="1.5"
                    strokeDasharray="6, 15"
                    animate={{ strokeDashoffset: [0, -40] }}
                    transition={{ repeat: Infinity, duration: 2.0, ease: "linear" }}
                    fill="none"
                  />

                  {/* Central Node (Second Brain) */}
                  <g className="cursor-pointer" onClick={() => setSelectedMapNode(null)}>
                    <circle cx="160" cy="90" r="18" fill="#4f46e5" filter="url(#node-glow)" opacity="0.8" />
                    <circle cx="160" cy="90" r="14" fill="#312e81" stroke="#818cf8" strokeWidth="2" />
                    <text x="160" y="93" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">BRAIN</text>
                  </g>

                  {/* Node 1: Physics */}
                  <g className="cursor-pointer" onClick={() => setSelectedMapNode(selectedMapNode === 'Physics' ? null : 'Physics')}>
                    <circle
                      cx="65"
                      cy="45"
                      r={14 + Math.min(8, (profile?.studyHabits?.simulationsCompleted ?? 0) * 0.8)}
                      fill={selectedMapNode === 'Physics' ? '#818cf8' : '#312e81'}
                      stroke="#6366f1"
                      strokeWidth="2"
                      filter={selectedMapNode === 'Physics' ? 'url(#node-glow)' : ''}
                    />
                    <text x="65" y="48" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">PHY ⚡</text>
                  </g>

                  {/* Node 2: Chemistry */}
                  <g className="cursor-pointer" onClick={() => setSelectedMapNode(selectedMapNode === 'Chemistry' ? null : 'Chemistry')}>
                    <circle
                      cx="255"
                      cy="45"
                      r={14 + Math.min(8, (profile?.studyHabits?.testsTaken ?? 0) * 1.5)}
                      fill={selectedMapNode === 'Chemistry' ? '#f472b6' : '#50072b'}
                      stroke="#ec4899"
                      strokeWidth="2"
                      filter={selectedMapNode === 'Chemistry' ? 'url(#node-glow)' : ''}
                    />
                    <text x="255" y="48" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">CHE 🧪</text>
                  </g>

                  {/* Node 3: Biology */}
                  <g className="cursor-pointer" onClick={() => setSelectedMapNode(selectedMapNode === 'Biology' ? null : 'Biology')}>
                    <circle
                      cx="65"
                      cy="135"
                      r={14 + Math.min(8, (profile?.studyHabits?.flashcardsReviewed ?? 0) * 0.1)}
                      fill={selectedMapNode === 'Biology' ? '#34d399' : '#064e3b'}
                      stroke="#10b981"
                      strokeWidth="2"
                      filter={selectedMapNode === 'Biology' ? 'url(#node-glow)' : ''}
                    />
                    <text x="65" y="138" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">BIO 🌿</text>
                  </g>

                  {/* Node 4: Mathematics */}
                  <g className="cursor-pointer" onClick={() => setSelectedMapNode(selectedMapNode === 'Mathematics' ? null : 'Mathematics')}>
                    <circle
                      cx="255"
                      cy="135"
                      r={14 + Math.min(8, (profile?.studyHabits?.consistency ?? 60) * 0.08)}
                      fill={selectedMapNode === 'Mathematics' ? '#38bdf8' : '#0c4a6e'}
                      stroke="#0ea5e9"
                      strokeWidth="2"
                      filter={selectedMapNode === 'Mathematics' ? 'url(#node-glow)' : ''}
                    />
                    <text x="255" y="138" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">MAT 📐</text>
                  </g>
                </svg>

                {/* Info Overlay Panel */}
                <AnimatePresence>
                  {selectedMapNode && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-2 left-2 right-2 bg-slate-900/90 border border-slate-700/50 backdrop-blur-md rounded-lg p-2 text-[10px] text-white flex justify-between items-center"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-indigo-400 block">{selectedMapNode} Node Details</span>
                        <span>
                          {selectedMapNode === 'Physics' && `Active learning via lens Ray Tracing. Simulations: ${profile?.studyHabits?.simulationsCompleted ?? 0}`}
                          {selectedMapNode === 'Chemistry' && `Strong neutral titration curve. Checkpoints run: ${profile?.studyHabits?.testsTaken ?? 0}`}
                          {selectedMapNode === 'Biology' && `Mastered photosynthesis. Flashcards reviewed: ${profile?.studyHabits?.flashcardsReviewed ?? 0}`}
                          {selectedMapNode === 'Mathematics' && `Consistency index: ${profile?.studyHabits?.consistency ?? 60}%`}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          void handleSend(`Tell me more about my ${selectedMapNode} study status and give me recommendations!`);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[9px] px-2 py-0.5 h-6 shrink-0 ml-2"
                      >
                        Ask Brain
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Habit Stats */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="border rounded-xl p-3 bg-card shadow-sm space-y-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold uppercase">
                  <Flame className="size-3.5 text-amber-500 fill-amber-500" /> Consistency
                </span>
                <span className="text-base font-extrabold text-foreground">{profile.studyHabits?.consistency ?? 60}%</span>
              </div>
              <div className="border rounded-xl p-3 bg-card shadow-sm space-y-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold uppercase">
                  <Target className="size-3.5 text-emerald-500" /> Tests Taken
                </span>
                <span className="text-base font-extrabold text-foreground">{profile.studyHabits?.testsTaken ?? 0}</span>
              </div>
              <div className="border rounded-xl p-3 bg-card shadow-sm space-y-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold uppercase">
                  <BookOpen className="size-3.5 text-blue-500" /> Flashcards
                </span>
                <span className="text-base font-extrabold text-foreground">{profile.studyHabits?.flashcardsReviewed ?? 0}</span>
              </div>
              <div className="border rounded-xl p-3 bg-card shadow-sm space-y-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold uppercase">
                  <Activity className="size-3.5 text-indigo-500" /> Labs Run
                </span>
                <span className="text-base font-extrabold text-foreground">{profile.studyHabits?.simulationsCompleted ?? 0}</span>
              </div>
            </div>

            {/* Interests Section */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Personal Interests (Tailoring Key)</span>
              {profile.interests.length === 0 ? (
                <span className="text-[11px] text-muted-foreground italic pl-1 block">No interests parsed yet. Chat with Partner or Tutor to express what you love!</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {profile.interests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="text-[10px] bg-slate-100 text-slate-800 border-slate-200 capitalize font-semibold px-2.5 py-0.5">
                      {interest}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Strengths & Weaknesses (Dual list) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle className="size-3.5" /> Strengths
                </span>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {profile.strengths.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground italic block">No strengths logged.</span>
                  ) : (
                    profile.strengths.map((str, idx) => (
                      <div key={idx} className="text-[10px] p-2 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 border border-emerald-500/10 rounded-lg font-medium leading-relaxed">
                        {str}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="size-3.5" /> Weak Areas
                </span>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {profile.weaknesses.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground italic block">No weaknesses logged.</span>
                  ) : (
                    profile.weaknesses.map((weak, idx) => (
                      <div key={idx} className="text-[10px] p-2 bg-rose-500/5 text-rose-800 dark:text-rose-300 border border-rose-500/10 rounded-lg font-medium leading-relaxed">
                        {weak}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Memory Vault / Pinned Facts */}
            <div className="space-y-2">
              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider flex items-center gap-1">
                <Key className="size-3.5 text-indigo-500" /> Memory Vault (Key Facts)
              </span>
              <div className="border border-indigo-500/10 bg-indigo-500/5 rounded-2xl p-3.5 space-y-2 max-h-48 overflow-y-auto">
                {profile.memoryLog.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic text-center py-4">
                    Your Memory Vault is empty. Failures in flashcards or mock tests will automatically trigger factual memory logs!
                  </p>
                ) : (
                  profile.memoryLog.map((fact, idx) => (
                    <div key={idx} className="text-[10px] font-medium text-foreground leading-relaxed flex items-start gap-1.5 border-b border-black/5 last:border-0 pb-1.5 last:pb-0">
                      <span className="text-indigo-500 mt-0.5 shrink-0">•</span>
                      <span>{fact}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </CardContent>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-muted-foreground font-medium">
            Profile Sync details unavailable.
          </div>
        )}
      </Card>

      <Dialog open={!!activeMockPaper} onOpenChange={(open) => { if (!open) setActiveMockPaper(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mock Specimen Paper generated by Partner</DialogTitle>
          </DialogHeader>
          {activeMockPaper && (
            <MockPaperCard paper={activeMockPaper} id={activeMockPaperId} board={board} />
          )}
        </DialogContent>
      </Dialog>
    </div>
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
