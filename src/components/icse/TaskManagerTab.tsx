'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon, Mic, MicOff, Clock, Plus, Trash2, CheckCircle2,
  AlertCircle, Sparkles, Loader2, ListTodo, PlusCircle, Check, ArrowRight,
  ChevronLeft, ChevronRight, HelpCircle, CalendarDays, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Task {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  completed: boolean;
  delayedFrom?: string | null;
  delayReason?: string | null;
}

interface TimetableSlot {
  id: string;
  subject: string;
  topic: string;
  dayOfWeek: string;
  timeStart: string;
  timeEnd: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TaskManagerTab() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [monthTasksMap, setMonthTasksMap] = useState<Record<string, Task[]>>({});

  // Prompt / AI State
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Manual Creation State
  const [manualTitle, setManualTitle] = useState('');
  const [addingManual, setAddingManual] = useState(false);

  // Rescheduling / Delay Modal State
  const [delayingTask, setDelayingTask] = useState<Task | null>(null);
  const [delayDate, setDelayDate] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [submittingDelay, setSubmittingDelay] = useState(false);

  // Timetable integration
  const [importingPlanner, setImportingPlanner] = useState(false);

  // Confetti
  const [confetti, setConfetti] = useState<{ id: number; x: number; y: number; color: string; angle: number; velocity: number }[]>([]);

  // ─── Initialize Speech Recognition ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-IN'; // Indian-English optimized

        rec.onstart = () => {
          setIsListening(true);
        };
        rec.onresult = (e: any) => {
          const transcript = e.results[0][0].transcript;
          setPrompt(prev => (prev.trim() + ' ' + transcript).trim());
          toast.success('Voice transcribed successfully!');
        };
        rec.onerror = (e: any) => {
          console.error('Speech recognition error:', e);
          if (e.error === 'not-allowed') {
            toast.error('Microphone permission blocked. Please enable it in browser.');
          } else {
            toast.error('Voice transcription failed.');
          }
        };
        rec.onend = () => {
          setIsListening(false);
        };
        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleListen = () => {
    if (!recognitionRef.current) {
      toast.error('Voice recognition not supported in this browser. Try Chrome/Edge or type your request.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        toast.info('Listening... describe your tasks for the day!');
      } catch (err) {
        console.error(err);
      }
    }
  };

  // ─── Load tasks for selected date ──────────────────────────────────────────
  const fetchTasks = useCallback(async (dateStr: string) => {
    setLoadingTasks(true);
    try {
      const res = await fetch(`/api/tasks?date=${dateStr}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tasks');
      setTasks(data.tasks || []);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load tasks.');
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  // ─── Load tasks summary for calendar dots ──────────────────────────────────
  const fetchMonthTasksSummary = useCallback(async (date: Date) => {
    try {
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11
      const firstDate = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      // To simplify, we query for the whole month day-by-day.
      // In practice, we query each day in the month or create a batch route.
      // Since we already have GET /api/tasks?date=... we can fetch all days in the month asynchronously,
      // or simply query the days of the current calendar view.
      // Let's perform a simple map fetch of the current days to show dots.
      const daysCount = new Date(year, month + 1, 0).getDate();
      const newMap: Record<string, Task[]> = {};
      
      const fetchPromises: Promise<any>[] = [];
      for (let day = 1; day <= daysCount; day++) {
        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        fetchPromises.push(
          fetch(`/api/tasks?date=${dStr}`)
            .then(res => res.json())
            .then(data => {
              if (data.tasks && data.tasks.length > 0) {
                newMap[dStr] = data.tasks;
              }
            })
            .catch(() => {})
        );
      }
      await Promise.all(fetchPromises);
      setMonthTasksMap(newMap);
    } catch (e) {
      console.error('Failed to load month tasks summary:', e);
    }
  }, []);

  useEffect(() => {
    void fetchTasks(selectedDate);
  }, [selectedDate, fetchTasks]);

  useEffect(() => {
    void fetchMonthTasksSummary(currentDate);
  }, [currentDate, fetchMonthTasksSummary]);

  // ─── Create manual task ────────────────────────────────────────────────────
  const addManualTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) {
      toast.error('Please enter a task title.');
      return;
    }
    setAddingManual(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          title: manualTitle.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create task');

      toast.success('Task added successfully!');
      setManualTitle('');
      void fetchTasks(selectedDate);
      void fetchMonthTasksSummary(currentDate);
    } catch (e: any) {
      toast.error(e.message || 'Failed to add task.');
    } finally {
      setAddingManual(false);
    }
  };

  // ─── AI Task Generator ─────────────────────────────────────────────────────
  const generateAITasks = async () => {
    if (!prompt.trim()) {
      toast.error('Please type or dictate your tasks.');
      return;
    }
    setGenerating(true);
    toast.info('AI is generating checklist items...');
    try {
      const res = await fetch('/api/tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          date: selectedDate
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate tasks');

      toast.success(data.message || 'Checklist items generated!');
      setPrompt('');
      void fetchTasks(selectedDate);
      void fetchMonthTasksSummary(currentDate);
    } catch (e: any) {
      toast.error(e.message || 'AI task generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Toggle Task Completion ───────────────────────────────────────────────
  const toggleComplete = async (task: Task, e: React.MouseEvent) => {
    const nextCompleted = !task.completed;
    if (nextCompleted) {
      triggerConfetti(e);
    }
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: task.id,
          completed: nextCompleted
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update task');

      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: nextCompleted } : t));
      toast.success(nextCompleted ? 'Task marked complete! Second brain updated.' : 'Task marked active.');
      void fetchMonthTasksSummary(currentDate);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update task.');
    }
  };

  // ─── Reschedule / Delay Task ───────────────────────────────────────────────
  const openDelayModal = (task: Task) => {
    setDelayingTask(task);
    setDelayReason('');
    
    // Set default target date to tomorrow
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setDelayDate(nextDay.toISOString().split('T')[0]);
  };

  const handleDelayTask = async () => {
    if (!delayingTask) return;
    if (!delayDate) {
      toast.error('Please select a target date.');
      return;
    }
    if (delayDate === selectedDate) {
      toast.error('Please select a different date to delay the task.');
      return;
    }

    setSubmittingDelay(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: delayingTask.id,
          date: delayDate,
          delayedFrom: selectedDate,
          delayReason: delayReason.trim() || 'Delayed schedule'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reschedule task');

      toast.warning('Task rescheduled! Delayed reason logged in Second Brain.');
      setDelayingTask(null);
      void fetchTasks(selectedDate);
      void fetchMonthTasksSummary(currentDate);
    } catch (e: any) {
      toast.error(e.message || 'Failed to reschedule task.');
    } finally {
      setSubmittingDelay(false);
    }
  };

  // ─── Delete Task ───────────────────────────────────────────────────────────
  const deleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete task');

      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('Task deleted.');
      void fetchMonthTasksSummary(currentDate);
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete task.');
    }
  };

  // ─── Timetable Planner Integration ─────────────────────────────────────────
  const importFromPlanner = async () => {
    setImportingPlanner(true);
    try {
      // Get the day of the week for the selected date
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const targetDay = days[new Date(selectedDate).getDay()];

      const res = await fetch('/api/timetable');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch timetable');

      const daySlots = (data.slots || []).filter((s: TimetableSlot) => s.dayOfWeek === targetDay);
      if (daySlots.length === 0) {
        toast.info(`No study slots scheduled in the Planner for ${targetDay}s.`);
        return;
      }

      // Add each study slot as a task
      let importedCount = 0;
      for (const slot of daySlots) {
        // Check if there is already a task with this description to avoid duplicates
        const taskTitle = `[Planner] Study ${slot.subject}: ${slot.topic} (${slot.timeStart} - ${slot.timeEnd})`;
        const exists = tasks.some(t => t.title.toLowerCase() === taskTitle.toLowerCase());
        
        if (!exists) {
          await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: selectedDate,
              title: taskTitle
            })
          });
          importedCount++;
        }
      }

      if (importedCount > 0) {
        toast.success(`Successfully imported ${importedCount} study slots from your Weekly Planner!`);
        void fetchTasks(selectedDate);
        void fetchMonthTasksSummary(currentDate);
      } else {
        toast.info('Planner study slots are already imported for this date.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to import timetable.');
    } finally {
      setImportingPlanner(false);
    }
  };

  // ─── Confetti synthesis ─────────────────────────────────────────────────────
  const triggerConfetti = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const newConfetti = Array.from({ length: 45 }).map((_, i) => ({
      id: Date.now() + i,
      x: x + window.scrollX,
      y: y + window.scrollY,
      color: ['#10b981', '#fbbf24', '#34d399', '#f59e0b', '#059669', '#d1fae5'][Math.floor(Math.random() * 6)],
      angle: Math.random() * Math.PI * 2,
      velocity: 4 + Math.random() * 7
    }));

    setConfetti(prev => [...prev, ...newConfetti]);

    setTimeout(() => {
      setConfetti(prev => prev.filter(c => !newConfetti.find(n => n.id === c.id)));
    }, 1500);
  };

  // ─── Calendar helper calculations ──────────────────────────────────────────
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonthDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div className="space-y-6 mx-auto w-full max-w-6xl relative">
      
      {/* Confetti Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
        {confetti.map((c) => (
          <motion.div
            key={c.id}
            initial={{
              x: c.x,
              y: c.y,
              scale: Math.random() * 0.4 + 0.6,
              opacity: 1,
              rotate: 0
            }}
            animate={{
              x: c.x + Math.cos(c.angle) * c.velocity * 35,
              y: c.y + Math.sin(c.angle) * c.velocity * 35 + 90, // gravity drop
              opacity: 0,
              rotate: Math.random() * 360 + 360
            }}
            transition={{ duration: 1.3, ease: 'easeOut' }}
            className="absolute size-2.5 rounded-sm"
            style={{ backgroundColor: c.color }}
          />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        
        {/* LEFT COLUMN: THE INTERACTIVE MONTH CALENDAR */}
        <Card className="border border-black/5 dark:border-white/5 shadow-md flex flex-col justify-between">
          <CardHeader className="pb-3 border-b bg-muted/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-emerald-500" />
                <CardTitle className="text-sm font-bold">Interactive Task Calendar</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50/10 font-bold uppercase">
                Time-Boxed Focus
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            
            {/* Month Navigator Header */}
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-xs font-bold text-foreground">
                {MONTH_NAMES[month]} {year}
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 rounded-md border bg-card hover:bg-muted text-muted-foreground transition-all cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1 rounded-md border bg-card hover:bg-muted text-muted-foreground transition-all cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
              {DAYS_SHORT.map(d => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {/* Previous Month Days (Padding) */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => {
                const dayNum = prevMonthDays - firstDayIndex + idx + 1;
                return (
                  <div
                    key={`prev-${idx}`}
                    className="aspect-square border border-dashed rounded-lg flex items-center justify-center text-muted-foreground/35 bg-muted/5 select-none text-[11px]"
                  >
                    {dayNum}
                  </div>
                );
              })}

              {/* Current Month Days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                
                const isSelected = selectedDate === dStr;
                const isToday = new Date().toISOString().split('T')[0] === dStr;
                const dayTasks = monthTasksMap[dStr] || [];
                const hasTasks = dayTasks.length > 0;
                
                const allCompleted = hasTasks && dayTasks.every(t => t.completed);
                const incompleteCount = dayTasks.filter(t => !t.completed).length;

                return (
                  <motion.button
                    key={`curr-${dayNum}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDate(dStr)}
                    className={`aspect-square border rounded-xl flex flex-col justify-between p-1.5 transition-all text-left relative cursor-pointer font-medium ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-350 shadow-sm'
                        : isToday
                        ? 'border-amber-500 bg-amber-500/5 text-amber-950 dark:text-amber-350'
                        : 'border-black/5 dark:border-white/5 bg-card hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="text-[11px] font-bold">{dayNum}</span>

                    {/* Bottom Indicators */}
                    {hasTasks && (
                      <div className="flex items-center gap-1 mt-auto">
                        <span className={`size-1.5 rounded-full shrink-0 ${
                          allCompleted ? 'bg-emerald-500' : 'bg-amber-400'
                        }`} />
                        <span className="text-[8px] opacity-75 font-semibold">
                          {incompleteCount > 0 ? `${incompleteCount} left` : 'done'}
                        </span>
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
            
            {/* Calendar Legend */}
            <div className="flex gap-4 mt-5 text-[9px] text-muted-foreground font-semibold px-1">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 inline-block" /> All Tasks Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-400 inline-block" /> Tasks Incomplete
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-lg border border-dashed border-black/10 dark:border-white/10 bg-muted/5 inline-block" /> Other Month
              </span>
            </div>

          </CardContent>
        </Card>

        {/* RIGHT COLUMN: TASKS CHECKLIST FOR THE SELECTED DATE */}
        <div className="space-y-6">
          
          {/* AI Voice/Text Dictation Input */}
          <Card className="border border-black/5 dark:border-white/5 shadow-md">
            <CardHeader className="pb-3 border-b bg-muted/10">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">AI Voice Task Synthesizer</CardTitle>
                  <CardDescription className="text-[10px]">Explain your study plans in raw voice to extract a checkbox checklist</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`e.g., "Today I want to read chapter 3 of Physics on lenses and solve 10 questions on AP in Maths."`}
                  className="w-full min-h-[80px] max-h-24 rounded-xl border border-black/10 dark:border-white/10 bg-card p-3 text-xs focus:outline-emerald-500 font-medium resize-none shadow-sm pr-12"
                />
                <button
                  type="button"
                  onClick={toggleListen}
                  className={`absolute right-3 bottom-3 p-2.5 rounded-full transition-all cursor-pointer shadow-sm ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-muted hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600 border'
                  }`}
                  title="Speak daily schedule"
                >
                  {isListening ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                </button>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={generateAITasks}
                  disabled={generating || !prompt.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs gap-1.5 flex-1 h-8 cursor-pointer"
                >
                  {generating ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      AI Extracting Tasks...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3" />
                      Generate AI Task Checklist
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={importFromPlanner}
                  disabled={importingPlanner}
                  className="rounded-xl text-xs border-emerald-200 text-emerald-600 hover:text-emerald-700 bg-emerald-50/20 gap-1 h-8 cursor-pointer font-bold"
                  title="Collaborate with Planner"
                >
                  {importingPlanner ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3" />
                  )}
                  Import Weekly Planner
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Checklist Area */}
          <Card className="border border-black/5 dark:border-white/5 shadow-md flex-1">
            <CardHeader className="pb-3 border-b bg-muted/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="size-4 text-emerald-500" />
                  <CardTitle className="text-sm font-bold">
                    Checklist: {selectedDate}
                  </CardTitle>
                </div>
                {tasks.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] font-bold">
                    {tasks.filter(t => t.completed).length}/{tasks.length} Done
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              
              {/* Add Custom Task Form */}
              <form onSubmit={addManualTask} className="flex gap-2 mb-4">
                <Input
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="Create checklist item manually..."
                  className="text-xs h-8 rounded-lg"
                />
                <Button
                  type="submit"
                  disabled={addingManual}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 text-xs rounded-lg shrink-0 px-3 cursor-pointer"
                >
                  {addingManual ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-4" />}
                </Button>
              </form>

              {/* Tasks List */}
              {loadingTasks ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <Loader2 className="size-5 animate-spin text-emerald-500" />
                  <p className="text-[10px] text-muted-foreground font-semibold">Fetching checklist...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-black/5 dark:border-white/5 rounded-xl">
                  <ListTodo className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-semibold">No study tasks logged for this date.</p>
                  <p className="text-[10px] text-muted-foreground/75 mt-0.5">Use AI Dictation or Planner Sync above!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-start justify-between p-3 border rounded-xl shadow-xs text-xs font-semibold leading-relaxed transition-all ${
                        task.completed
                          ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/50'
                          : 'bg-card border-black/5 dark:border-white/5 hover:border-emerald-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-3">
                        {/* Checkbox */}
                        <button
                          onClick={(e) => void toggleComplete(task, e)}
                          className={`size-4 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                            task.completed
                              ? 'bg-emerald-500 border-emerald-600 text-white'
                              : 'border-slate-300 hover:border-emerald-500 bg-card'
                          }`}
                        >
                          {task.completed && <Check className="size-2.5 stroke-[3px]" />}
                        </button>

                        <div className="min-w-0 space-y-1">
                          <p className={`text-foreground leading-snug break-words font-medium ${
                            task.completed ? 'line-through text-muted-foreground opacity-80' : ''
                          }`}>
                            {task.title}
                          </p>

                          {/* Delayed Meta Tag Info */}
                          {task.delayedFrom && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-amber-600 dark:text-amber-500 font-bold font-mono">
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200/50 py-0 px-1 text-[8px] uppercase">
                                Delayed
                              </Badge>
                              <span>rescheduled from {task.delayedFrom}</span>
                              {task.delayReason && (
                                <span className="text-muted-foreground font-normal">({task.delayReason})</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {!task.completed && (
                          <button
                            onClick={() => openDelayModal(task)}
                            className="p-1 rounded text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 transition-all cursor-pointer"
                            title="Delay Task (Reschedule)"
                          >
                            <Clock className="size-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => void deleteTask(task.id)}
                          className="p-1 rounded text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="Delete Checklist Item"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                    </motion.div>
                  ))}
                </div>
              )}

            </CardContent>
          </Card>

        </div>

      </div>

      {/* DELAY RESCHEDULER DIALOG MODAL */}
      <AnimatePresence>
        {delayingTask && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border max-w-sm w-full rounded-2xl p-5 shadow-lg space-y-4"
            >
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Clock className="size-4.5 text-amber-500" /> Reschedule Study Task
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Delaying tasks logs cognitive challenges to your Second Brain partner.
                </p>
              </div>

              <div className="space-y-3.5 text-xs font-semibold">
                <div className="p-3 bg-muted/40 border rounded-xl">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Task</p>
                  <p className="font-medium text-foreground">{delayingTask.title}</p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="delay-new-date">Reschedule To</Label>
                  <Input
                    id="delay-new-date"
                    type="date"
                    value={delayDate}
                    onChange={(e) => setDelayDate(e.target.value)}
                    className="h-8.5 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="delay-reason-input" className="flex items-center justify-between">
                    <span>Reason for Delay (Optional)</span>
                    <Badge variant="outline" className="text-[8px] py-0 px-1 border-emerald-300 text-emerald-600 uppercase font-mono">
                      Partner Brain Food
                    </Badge>
                  </Label>
                  <textarea
                    id="delay-reason-input"
                    value={delayReason}
                    onChange={(e) => setDelayReason(e.target.value)}
                    placeholder="e.g. Optics derivations are too complex, math algebra quadratic formula is confusing, or ran out of time"
                    className="w-full min-h-[70px] max-h-24 rounded-xl border border-black/10 dark:border-white/10 bg-card p-2.5 text-xs font-medium resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleDelayTask}
                  disabled={submittingDelay}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs gap-1 flex-1 h-8.5 cursor-pointer"
                >
                  {submittingDelay ? (
                    <>
                      <Loader2 className="size-3 animate-spin" /> Rescheduling...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="size-3.5" /> Delay Task
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDelayingTask(null)}
                  className="rounded-xl text-xs flex-1 h-8.5 cursor-pointer"
                >
                  Cancel
                </Button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
