'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Mic, MicOff, Clock, Plus, Trash2, CheckCircle2,
  AlertCircle, Sparkles, Loader2, ListTodo, PlusCircle, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface TimetableSlot {
  id: string;
  subject: string;
  topic: string;
  dayOfWeek: string;
  timeStart: string;
  timeEnd: string;
  completed: boolean;
}

const SUBJECT_OPTIONS = [
  'Physics', 'Chemistry', 'Biology', 'Mathematics',
  'English', 'History', 'Geography', 'Computer'
];

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  Physics: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200/50 dark:border-indigo-900/40', accent: 'bg-indigo-500' },
  Chemistry: { bg: 'bg-pink-50 dark:bg-pink-950/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200/50 dark:border-pink-900/40', accent: 'bg-pink-500' },
  Biology: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200/50 dark:border-emerald-900/40', accent: 'bg-emerald-500' },
  Mathematics: { bg: 'bg-sky-50 dark:bg-sky-950/30', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200/50 dark:border-sky-900/40', accent: 'bg-sky-500' },
  English: { bg: 'bg-slate-50 dark:bg-slate-900/30', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200/50 dark:border-slate-800/40', accent: 'bg-slate-500' },
  History: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200/50 dark:border-amber-900/40', accent: 'bg-amber-500' },
  Geography: { bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200/50 dark:border-teal-900/40', accent: 'bg-teal-500' },
  Computer: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200/50 dark:border-purple-900/40', accent: 'bg-purple-500' },
};

export function TimetableTab() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag and Drop & Confetti
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<{ id: number; x: number; y: number; color: string; angle: number; velocity: number }[]>([]);

  const triggerConfetti = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const newConfetti = Array.from({ length: 40 }).map((_, i) => ({
      id: Date.now() + i,
      x: x + window.scrollX,
      y: y + window.scrollY,
      color: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'][Math.floor(Math.random() * 6)],
      angle: Math.random() * Math.PI * 2,
      velocity: 3 + Math.random() * 6
    }));

    setConfetti(prev => [...prev, ...newConfetti]);

    setTimeout(() => {
      setConfetti(prev => prev.filter(c => !newConfetti.find(n => n.id === c.id)));
    }, 1500);
  };

  // AI Generator state
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  // Manual creator state
  const [showCreator, setShowCreator] = useState(false);
  const [creatorSubject, setCreatorSubject] = useState('Physics');
  const [creatorTopic, setCreatorTopic] = useState('');
  const [creatorDay, setCreatorDay] = useState('Monday');
  const [creatorStart, setCreatorStart] = useState('09:00');
  const [creatorEnd, setCreatorEnd] = useState('10:00');
  const [submittingCreator, setSubmittingCreator] = useState(false);

  // Web Speech API
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ─── Initialize Speech Recognition ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-IN'; // Optimized for Indian English accent

        rec.onstart = () => {
          setIsListening(true);
        };
        rec.onresult = (e: any) => {
          const transcript = e.results[0][0].transcript;
          setPrompt(prev => (prev.trim() + ' ' + transcript).trim());
          toast.success('Speech transcribed successfully!');
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
      toast.error('Speech recognition not supported in this browser. Try Chrome/Edge or type your request.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        toast.info('Listening... speak your schedule goal now!');
      } catch (err) {
        console.error(err);
      }
    }
  };

  // ─── Fetch slots ──────────────────────────────────────────────────────────
  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/timetable');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch slots');
      setSlots(data.slots || []);
    } catch (e: any) {
      toast.error('Failed to load study timetable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSlots();
    const handleUpdate = () => {
      void loadSlots();
    };
    window.addEventListener('timetable-updated', handleUpdate);
    return () => {
      window.removeEventListener('timetable-updated', handleUpdate);
    };
  }, [loadSlots]);

  // ─── Toggle completion state ──────────────────────────────────────────────
  const toggleComplete = async (id: string, currentVal: boolean) => {
    try {
      const res = await fetch('/api/timetable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: !currentVal })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle status');

      // Update state locally
      setSlots(prev => prev.map(s => s.id === id ? { ...s, completed: !currentVal } : s));
      toast.success(!currentVal ? 'Study block checked off!' : 'Study block marked active.');
    } catch (e: any) {
      toast.error('Failed to update status.');
    }
  };

  // ─── Delete Slot ──────────────────────────────────────────────────────────
  const deleteSlot = async (id: string) => {
    try {
      const res = await fetch(`/api/timetable?id=${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete slot');

      setSlots(prev => prev.filter(s => s.id !== id));
      toast.success('Study slot deleted.');
    } catch (e: any) {
      toast.error('Failed to delete slot.');
    }
  };

  // ─── Drag and Drop Handler ─────────────────────────────────────────────────
  const handleDrop = async (e: React.DragEvent, targetDay: string) => {
    e.preventDefault();
    setDragOverDay(null);
    const slotId = e.dataTransfer.getData('text/plain');
    if (!slotId) return;

    const slot = slots.find(s => s.id === slotId);
    if (!slot || slot.dayOfWeek === targetDay) return;

    try {
      const res = await fetch('/api/timetable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slotId, dayOfWeek: targetDay })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update slot');

      // Update state locally
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, dayOfWeek: targetDay } : s));
      toast.success(`Rescheduled to ${targetDay}!`);
    } catch (err: any) {
      toast.error(err.message || 'Could not reschedule slot.');
    }
  };

  // ─── AI Timetable Generator ────────────────────────────────────────────────
  const handleAIGenerator = async () => {
    if (!prompt.trim() || prompt.trim().length < 3) {
      toast.error('Please enter or dictate a schedule request.');
      return;
    }

    setGenerating(true);
    toast.info('AI is structuring your study slots...');
    try {
      const res = await fetch('/api/timetable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed');

      setPrompt('');
      toast.success(data.message || 'Timetable populated!');
      void loadSlots();
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate timetable.');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Manual Custom Creator ─────────────────────────────────────────────────
  const handleManualCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorTopic.trim()) {
      toast.error('Please enter a topic description.');
      return;
    }

    setSubmittingCreator(true);
    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: creatorSubject,
          topic: creatorTopic,
          dayOfWeek: creatorDay,
          timeStart: creatorStart,
          timeEnd: creatorEnd
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add custom slot');

      toast.success('Study slot added manually!');
      setCreatorTopic('');
      setShowCreator(false);
      void loadSlots();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add custom slot.');
    } finally {
      setSubmittingCreator(false);
    }
  };

  const getSubjectColor = (sub: string) => {
    return SUBJECT_COLORS[sub] || { bg: 'bg-muted', text: 'text-foreground', border: 'border-border', accent: 'bg-muted-foreground' };
  };

  return (
    <div className="space-y-6 mx-auto w-full max-w-6xl">
      
      {/* 1. Header with AI Planner Tool */}
      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <Card className="border border-black/5 dark:border-white/5 shadow-md flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                <Sparkles className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">AI Voice & Chat Study Planner</CardTitle>
                <CardDescription className="text-[10px]">Dictate or type your planner rules to schedule study blocks automatically</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={"e.g., \"I want to study Mathematics algebra on Monday from 10:00 to 12:00, and revise Physics Ohm's law on Thursday evening at 16:00.\""}
                className="w-full min-h-[96px] max-h-32 rounded-xl border border-black/10 dark:border-white/10 bg-card p-3 text-xs focus:outline-emerald-500 font-medium resize-none shadow-sm pr-12"
              />
              <button
                type="button"
                onClick={toggleListen}
                className={`absolute right-3.5 bottom-3.5 p-2.5 rounded-full transition-all cursor-pointer shadow-sm ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-muted hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600 border'
                }`}
                title="Tap to speak"
              >
                {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleAIGenerator}
                disabled={generating || !prompt.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs gap-1.5 flex-1"
              >
                {generating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Generating Study Blocks...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    Generate AI Schedule
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreator(!showCreator)}
                className="rounded-xl text-xs border-emerald-200 text-emerald-600 hover:text-emerald-700 bg-emerald-50/20 gap-1"
              >
                <PlusCircle className="size-3.5" />
                Add Custom Slot
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. Manual Custom Slot Creator Block */}
        <AnimatePresence>
          {showCreator && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="border border-emerald-500/10 shadow-md">
                <CardHeader className="pb-3 border-b border-emerald-500/10 bg-emerald-500/5">
                  <CardTitle className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1.5">
                    <Plus className="size-4" /> Custom Slot Creator
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <form onSubmit={handleManualCreator} className="space-y-3.5 text-xs font-medium">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="slot-subject">Subject</Label>
                        <Select value={creatorSubject} onValueChange={setCreatorSubject}>
                          <SelectTrigger id="slot-subject" className="h-8 text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SUBJECT_OPTIONS.map(sub => (
                              <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="slot-day">Day of Week</Label>
                        <Select value={creatorDay} onValueChange={setCreatorDay}>
                          <SelectTrigger id="slot-day" className="h-8 text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS_OF_WEEK.map(day => (
                              <SelectItem key={day} value={day}>{day}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="slot-start">Start Time</Label>
                        <Input
                          id="slot-start"
                          type="time"
                          value={creatorStart}
                          onChange={(e) => setCreatorStart(e.target.value)}
                          className="h-8 text-[11px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="slot-end">End Time</Label>
                        <Input
                          id="slot-end"
                          type="time"
                          value={creatorEnd}
                          onChange={(e) => setCreatorEnd(e.target.value)}
                          className="h-8 text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="slot-topic">Topic Description</Label>
                      <Input
                        id="slot-topic"
                        placeholder="e.g. Lens Formulas, Titration procedure..."
                        value={creatorTopic}
                        onChange={(e) => setCreatorTopic(e.target.value)}
                        className="h-8 text-[11px]"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submittingCreator}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-8 text-xs rounded-lg mt-2"
                    >
                      {submittingCreator ? <Loader2 className="size-3.5 animate-spin" /> : 'Save Study Block'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. VISUAL WEEKLY CALENDAR SCHEDULE GRID */}
      <Card className="border border-black/5 dark:border-white/5 shadow-md overflow-hidden">
        <CardHeader className="bg-muted/10 border-b py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-emerald-500" />
              <CardTitle className="text-sm font-bold">Weekly Visual Calendar</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 uppercase font-semibold">
              Class Schedule Board
            </Badge>
          </div>
        </CardHeader>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="size-6 animate-spin text-emerald-500" />
            <p className="text-xs text-muted-foreground">Loading calendar blocks...</p>
          </div>
        ) : (
          <CardContent className="p-3 overflow-x-auto">
            {/* Calendar grid wrapper */}
            <div className="min-w-[800px] grid grid-cols-7 gap-2.5">
              {DAYS_OF_WEEK.map((day) => {
                const daySlots = slots.filter((s) => s.dayOfWeek === day);
                const isOver = dragOverDay === day;
                return (
                  <div
                    key={day}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverDay !== day) setDragOverDay(day);
                    }}
                    onDragLeave={() => {
                      setDragOverDay(null);
                    }}
                    onDrop={(e) => handleDrop(e, day)}
                    className={`flex flex-col space-y-2 border-r last:border-r-0 pr-1.5 last:pr-0 min-h-[350px] transition-all duration-200 rounded-lg p-1 ${
                      isOver ? 'bg-emerald-500/10 border-2 border-dashed border-emerald-500/30' : ''
                    }`}
                  >
                    {/* Day Title Header */}
                    <div className="text-center py-1.5 border-b bg-muted/40 rounded-md text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {day}
                    </div>

                    {/* Day Slots List */}
                    <div className="flex-1 flex flex-col gap-2 pt-1">
                      {daySlots.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-black/5 dark:border-white/5 rounded-lg p-2 text-center">
                          <span className="text-[9px] text-muted-foreground/60 font-semibold leading-relaxed">No study slots</span>
                        </div>
                      ) : (
                        daySlots.map((slot) => {
                          const colors = getSubjectColor(slot.subject);
                          return (
                            <motion.div
                              key={slot.id}
                              draggable="true"
                              onDragStart={(e: any) => {
                                e.dataTransfer.setData('text/plain', slot.id);
                              }}
                              initial={{ opacity: 0, y: 3 }}
                              animate={{ opacity: slot.completed ? 0.6 : 1, y: 0 }}
                              className={`border rounded-xl p-2.5 flex flex-col justify-between text-[10px] font-medium leading-relaxed transition-all shadow-sm relative group overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-md ${colors.bg} ${colors.border}`}
                            >
                              {/* Left Accent indicator line */}
                              <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.accent}`} />
                              
                              <div className="pl-1.5 space-y-1.5 flex-1">
                                <div className="flex justify-between items-start gap-1">
                                  <Badge className={`text-[8px] py-0 px-1 font-bold ${colors.text} bg-transparent border-0 shrink-0`}>
                                    {slot.subject}
                                  </Badge>
                                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => void deleteSlot(slot.id)}
                                      className="text-rose-500 hover:text-rose-700 p-0.5"
                                      title="Delete study slot"
                                    >
                                      <Trash2 className="size-3" />
                                    </button>
                                  </div>
                                </div>
                                <p className={`font-bold leading-tight break-words text-foreground ${slot.completed ? 'line-through text-muted-foreground' : ''}`}>
                                  {slot.topic}
                                </p>
                              </div>

                              <div className="pl-1.5 pt-2 flex items-center justify-between border-t border-black/5 mt-2 text-[9px] text-muted-foreground">
                                <span className="flex items-center gap-1 font-semibold">
                                  <Clock className="size-3 text-slate-400" />
                                  {slot.timeStart} - {slot.timeEnd}
                                </span>
                                
                                {/* Complete Checkbox */}
                                <button
                                  onClick={(e) => {
                                    if (!slot.completed) triggerConfetti(e);
                                    void toggleComplete(slot.id, slot.completed);
                                  }}
                                  className={`size-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                                    slot.completed
                                      ? 'bg-emerald-500 border-emerald-600 text-white'
                                      : 'border-slate-300 hover:border-emerald-500'
                                  }`}
                                >
                                  {slot.completed && <Check className="size-2.5 stroke-[3px]" />}
                                </button>
                              </div>

                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* 4. FLAT LIST VIEW / TODO CHECKLIST WORKSPACE */}
      <Card className="border border-black/5 dark:border-white/5 shadow-md">
        <CardHeader className="bg-muted/10 border-b py-4">
          <div className="flex items-center gap-2">
            <ListTodo className="size-4 text-emerald-500" />
            <CardTitle className="text-sm font-bold">Study Planner Task Checklist</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="py-4">
          {slots.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-6">
              No tasks scheduled. Use the voice planner above to create a schedule template!
            </p>
          ) : (
            <div className="space-y-2.5">
              {slots.map((slot) => {
                const colors = getSubjectColor(slot.subject);
                return (
                  <motion.div
                    key={slot.id}
                    className={`flex items-center justify-between p-3 border rounded-xl shadow-sm text-xs ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                      {/* Checkbox button */}
                      <button
                        onClick={(e) => {
                          if (!slot.completed) triggerConfetti(e);
                          void toggleComplete(slot.id, slot.completed);
                        }}
                        className={`size-4 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          slot.completed
                            ? 'bg-emerald-500 border-emerald-600 text-white'
                            : 'border-slate-300 hover:border-emerald-500 bg-card'
                        }`}
                      >
                        {slot.completed && <Check className="size-2.5 stroke-[3px]" />}
                      </button>

                      <div className="min-w-0 space-y-0.5">
                        <p className={`font-bold leading-snug break-words text-foreground ${slot.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {slot.topic}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="font-semibold">{slot.dayOfWeek}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 font-semibold"><Clock className="size-3" /> {slot.timeStart} - {slot.timeEnd}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 shrink-0">
                      <Badge className={`text-[8.5px] uppercase font-extrabold ${colors.text} bg-white border border-black/5 dark:bg-slate-900`}>
                        {slot.subject}
                      </Badge>
                      <button
                        onClick={() => void deleteSlot(slot.id)}
                        className="text-rose-500 hover:text-rose-600 p-1"
                        title="Delete slot"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
              y: c.y + Math.sin(c.angle) * c.velocity * 35 + 80, // gravity effect
              opacity: 0,
              rotate: Math.random() * 360 + 360
            }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute size-2 rounded-sm"
            style={{ backgroundColor: c.color }}
          />
        ))}
      </div>

    </div>
  );
}
