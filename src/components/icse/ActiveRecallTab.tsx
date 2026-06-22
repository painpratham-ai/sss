'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Sparkles, BookOpen, AlertTriangle, CheckCircle, RotateCcw,
  Loader2, ArrowRight, HelpCircle, Award, Lightbulb, Clock, Check, Plus, Trash2, Calendar, PenTool
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ICSE_SUBJECTS, CBSE_SUBJECTS } from './types';

interface Flashcard {
  question: string;
  answer: string;
}

interface BlurtReport {
  score: number;
  misconceptions: string[];
  missingPoints: string[];
  remedyTip: string;
}

export function ActiveRecallTab({ board = 'ICSE' }: { board?: string }) {
  const subjectsList = board === 'CBSE' ? CBSE_SUBJECTS : ICSE_SUBJECTS;
  
  // Workspace selection: 'flashcards' | 'blurting'
  const [activeWorkspace, setActiveWorkspace] = useState<'flashcards' | 'blurting'>('flashcards');

  // Input states
  const [subject, setSubject] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  
  // ─── FLASHCARDS STATES ───
  const [generatingCards, setGeneratingCards] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [deckCompleted, setDeckCompleted] = useState(false);
  const [forgotCount, setForgotCount] = useState(0);
  const [passedCount, setPassedCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);

  // ─── BLURTING/FEYNMAN STATES ───
  const [blurtText, setBlurtText] = useState('');
  const [analyzingBlurt, setAnalyzingBlurt] = useState(false);
  const [blurtReport, setBlurtReport] = useState<BlurtReport | null>(null);
  const [schedulingRevision, setSchedulingRevision] = useState(false);

  // ─── FLASHCARD GENERATION ───
  const handleGenerateCards = async () => {
    if (!subject) {
      toast.error('Please pick a subject first.');
      return;
    }
    if (!topic.trim()) {
      toast.error('Please enter a topic.');
      return;
    }

    setGeneratingCards(true);
    setFlashcards([]);
    setDeckCompleted(false);
    setCurrentCardIdx(0);
    setIsFlipped(false);
    setForgotCount(0);
    setPassedCount(0);
    setMasteredCount(0);

    try {
      const res = await fetch('/api/recall/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, topic, board })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate flashcards.');
      
      setFlashcards(data.flashcards);
      toast.success(`Successfully generated ${data.flashcards.length} smart study flashcards!`);
    } catch (err: any) {
      toast.error(err.message || 'Generation failed.');
    } finally {
      setGeneratingCards(false);
    }
  };

  const handleCardGrade = (grade: 'forgot' | 'passed' | 'mastered') => {
    if (grade === 'forgot') setForgotCount(prev => prev + 1);
    if (grade === 'passed') setPassedCount(prev => prev + 1);
    if (grade === 'mastered') setMasteredCount(prev => prev + 1);

    setIsFlipped(false);
    
    // Wait briefly for flip transition to finish resetting before sliding card
    setTimeout(() => {
      if (currentCardIdx < flashcards.length - 1) {
        setCurrentCardIdx(prev => prev + 1);
      } else {
        setDeckCompleted(true);
      }
    }, 200);
  };

  const handleResetDeck = () => {
    setCurrentCardIdx(0);
    setIsFlipped(false);
    setDeckCompleted(false);
    setForgotCount(0);
    setPassedCount(0);
    setMasteredCount(0);
    toast.info('Deck progress reset.');
  };

  // ─── BLURTING EVALUATION ───
  const handleAnalyzeBlurt = async () => {
    if (!subject) {
      toast.error('Please pick a subject first.');
      return;
    }
    if (!topic.trim()) {
      toast.error('Please enter a topic.');
      return;
    }
    if (blurtText.trim().length < 15) {
      toast.error('Please write a slightly longer explanation (at least 15 characters) to analyze.');
      return;
    }

    setAnalyzingBlurt(true);
    setBlurtReport(null);

    try {
      const res = await fetch('/api/recall/blurt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, topic, board, blurtText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze text.');
      
      setBlurtReport(data.report);
      toast.success('Recall analysis completed!');

      // Log blurting study event to Second Brain
      fetch('/api/study-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'mock_test',
          subject,
          topic: `${topic} free recall`,
          metadata: {
            score: data.report.score,
            maxMarks: 100,
            feedback: data.report.remedyTip
          }
        })
      }).catch(err => console.error('Failed to log blurt study event:', err));
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed.');
    } finally {
      setAnalyzingBlurt(false);
    }
  };

  const handleScheduleRevision = async () => {
    if (!subject || !topic) return;
    setSchedulingRevision(true);
    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remediationTopics: [
            {
              subject,
              topic: `${topic} (Revision slot: focused on patch points)`,
            }
          ]
        })
      });
      if (!res.ok) throw new Error('Failed to update planner');
      toast.success('Successfully added a 30-minute revision slot to your Timetable Planner!');
    } catch (err: any) {
      toast.error('Failed to schedule revision. Please try again.');
    } finally {
      setSchedulingRevision(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Title Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-brand/10 rounded-2xl text-brand border border-brand/20">
          <Brain className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Active Recall Studio</h2>
          <p className="text-sm text-muted-foreground">Master the board syllabus with 3D smart flashcards and Feynman free-recall analysis.</p>
        </div>
      </div>

      {/* Mode Sub-Tab Toggles */}
      <div className="flex bg-muted/30 border p-1 rounded-xl w-fit gap-1 text-xs font-bold shadow-xs">
        <button
          onClick={() => { setActiveWorkspace('flashcards'); }}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
            activeWorkspace === 'flashcards' ? 'bg-brand text-brand-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="size-4" />
          AI Smart Flashcards
        </button>
        <button
          onClick={() => { setActiveWorkspace('blurting'); }}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
            activeWorkspace === 'blurting' ? 'bg-brand text-brand-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Lightbulb className="size-4" />
          Blurting & Feynman Studio
        </button>
      </div>

      {/* Main Study Desk Split layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        
        {/* Left Column Config Panel */}
        <Card className="glass-panel border shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="size-4.5 text-brand" />
              Recall Configuration
            </CardTitle>
            <CardDescription>
              Specify a curriculum area to load flashcards or grade your explanation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-1.5">
              <Label htmlFor="recall-subject">Select Subject *</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger id="recall-subject" className="w-full h-10 rounded-xl">
                  <SelectValue placeholder="Choose subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjectsList.map((sub) => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="recall-topic">Study Topic *</Label>
              <Input
                id="recall-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Photosynthesis Light Reactions"
                className="h-10 rounded-xl"
              />
            </div>

            <Separator className="my-2" />

            {activeWorkspace === 'flashcards' ? (
              <Button
                onClick={handleGenerateCards}
                disabled={generatingCards}
                className="w-full h-11 rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 flex items-center gap-2"
              >
                {generatingCards ? (
                  <>
                    <Loader2 className="size-4.5 animate-spin" />
                    Structuring Flashcards...
                  </>
                ) : (
                  <>
                    <Brain className="size-4.5" />
                    Generate Flashcards
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground leading-normal italic">
                  * Blurting tests your active memory recall. Once configured, write everything you can remember about the topic on the right side and click Analyze.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column Workspace Display */}
        <Card className="min-h-[480px] flex flex-col justify-between shadow-md">
          <AnimatePresence mode="wait">
            
            {/* ─── WORKSPACE 1: FLASHCARDS ─── */}
            {activeWorkspace === 'flashcards' && (
              <motion.div
                key="flashcards-desk"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col justify-between p-6"
              >
                {generatingCards ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-20 gap-3">
                    <Loader2 className="size-10 animate-spin text-brand" />
                    <p className="font-semibold text-foreground text-sm">Structuring your recall deck...</p>
                    <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                      Auto-generating study questions and board-compliant marking criteria answers from active syllabus extracts.
                    </p>
                  </div>
                ) : flashcards.length > 0 ? (
                  !deckCompleted ? (
                    <div className="flex-grow flex flex-col justify-between gap-6">
                      
                      {/* Deck progress header */}
                      <div className="flex items-center justify-between border-b pb-3 text-xs">
                        <span className="font-bold text-muted-foreground">
                          CARD {currentCardIdx + 1} OF {flashcards.length}
                        </span>
                        <div className="w-1/3 bg-muted rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-brand h-full rounded-full transition-all duration-300"
                            style={{ width: `${((currentCardIdx) / flashcards.length) * 100}%` }}
                          />
                        </div>
                        <Badge variant="outline" className="tabular-nums font-semibold scale-90 border-brand/20 bg-brand-soft/20 text-brand">
                          Forgot: {forgotCount} · Mastered: {masteredCount}
                        </Badge>
                      </div>

                      {/* 3D Flipping Card Container */}
                      <div 
                        onClick={() => setIsFlipped(!isFlipped)}
                        className="relative w-full select-none"
                        style={{ perspective: '1000px', height: '240px' }}
                      >
                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            textAlign: 'center',
                            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                            transformStyle: 'preserve-3d',
                            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            cursor: 'pointer',
                          }}
                        >
                          {/* FRONT FACE (Question) */}
                          <div
                            className="absolute inset-0 rounded-2xl border bg-gradient-to-br from-card to-muted/20 flex flex-col justify-between p-6 shadow-sm border-brand/10"
                            style={{ backfaceVisibility: 'hidden' }}
                          >
                            <span className="text-[10px] uppercase font-bold text-brand tracking-wider flex items-center gap-1">
                              <HelpCircle className="size-3.5" />
                              Active Recall Cue
                            </span>
                            <p className="text-base font-bold text-center text-foreground leading-relaxed px-4">
                              {flashcards[currentCardIdx].question}
                            </p>
                            <span className="text-[9px] uppercase font-bold text-muted-foreground animate-pulse">
                              Click card to reveal answer
                            </span>
                          </div>

                          {/* BACK FACE (Answer) */}
                          <div
                            className="absolute inset-0 rounded-2xl border bg-gradient-to-br from-indigo-950/5 via-card to-brand-soft/5 flex flex-col justify-between p-6 shadow-md border-indigo-500/20"
                            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                          >
                            <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider flex items-center gap-1">
                              <Award className="size-3.5" />
                              Syllabus Marking Schema
                            </span>
                            <div className="flex-1 flex items-center justify-center overflow-y-auto my-2 pr-1">
                              <p className="text-xs font-semibold text-center text-foreground leading-relaxed">
                                {flashcards[currentCardIdx].answer}
                              </p>
                            </div>
                            <span className="text-[9px] uppercase font-bold text-indigo-500">
                              Did you recall correctly? Rate below.
                            </span>
                          </div>

                        </div>
                      </div>

                      {/* Grading Options */}
                      <div className="grid grid-cols-3 gap-2 border-t pt-4">
                        <Button
                          variant="outline"
                          onClick={() => handleCardGrade('forgot')}
                          className="h-10 rounded-xl border-rose-500/30 hover:bg-rose-50 hover:text-rose-700 text-rose-600 font-bold text-xs"
                        >
                          Forgot 🔴
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleCardGrade('passed')}
                          className="h-10 rounded-xl border-amber-500/30 hover:bg-amber-50 hover:text-amber-700 text-amber-600 font-bold text-xs"
                        >
                          Pass 🟡
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleCardGrade('mastered')}
                          className="h-10 rounded-xl border-emerald-500/30 hover:bg-emerald-50 hover:text-emerald-700 text-emerald-600 font-bold text-xs"
                        >
                          Mastered 🟢
                        </Button>
                      </div>

                    </div>
                  ) : (
                    /* Deck Complete Summary Screen */
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-5">
                      <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                        <Award className="size-9" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-foreground">Recall Session Complete!</h3>
                        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                          Great job finishing the deck! Regular recall sessions strengthen long-term memory retrieval.
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4 w-full max-w-xs bg-muted/40 p-4 border rounded-2xl">
                        <div className="text-center">
                          <span className="block text-lg font-extrabold text-emerald-600">{masteredCount}</span>
                          <span className="text-[9px] uppercase font-bold text-muted-foreground">Mastered</span>
                        </div>
                        <div className="text-center border-x">
                          <span className="block text-lg font-extrabold text-amber-600">{passedCount}</span>
                          <span className="text-[9px] uppercase font-bold text-muted-foreground">Passed</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-lg font-extrabold text-rose-600">{forgotCount}</span>
                          <span className="text-[9px] uppercase font-bold text-muted-foreground">Forgot</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" onClick={handleResetDeck} className="rounded-xl h-10 text-xs">
                          <RotateCcw className="size-3.5 mr-1" />
                          Study Deck Again
                        </Button>
                        <Button onClick={() => { setFlashcards([]); }} className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-xl h-10 text-xs">
                          Create New Deck
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  /* Initial Empty State */
                  <div className="flex-grow flex flex-col items-center justify-center text-center py-20 gap-3">
                    <div className="size-12 rounded-full bg-brand-soft text-brand flex items-center justify-center">
                      <BookOpen className="size-6" />
                    </div>
                    <p className="font-semibold text-foreground text-sm">Study Deck Workspace</p>
                    <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                      Select your subject and enter a specific topic on the config panel to generate customized flashcards.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── WORKSPACE 2: BLURTING / FEYNMAN ─── */}
            {activeWorkspace === 'blurting' && (
              <motion.div
                key="blurting-desk"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col justify-between p-6"
              >
                {!blurtReport ? (
                  <div className="flex-grow flex flex-col justify-between gap-4">
                    
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                        <PenTool className="size-4.5 text-brand" />
                        Feynman Study Canvas
                      </h3>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Type down everything you recall about the topic. Explain it as if teaching a classmate. AI will grade your explanation.
                      </p>
                    </div>

                    <Textarea
                      value={blurtText}
                      onChange={(e) => setBlurtText(e.target.value)}
                      placeholder="Type details, processes, constants, formulas, or key terms related to this topic here..."
                      className="min-h-[220px] text-xs md:text-sm rounded-2xl border-muted/80 bg-background/50 leading-relaxed"
                      disabled={analyzingBlurt}
                    />

                    <Button
                      onClick={handleAnalyzeBlurt}
                      disabled={analyzingBlurt || blurtText.trim().length < 15}
                      className="w-full h-11 rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 flex items-center justify-center gap-2"
                    >
                      {analyzingBlurt ? (
                        <>
                          <Loader2 className="size-4.5 animate-spin" />
                          Critiquing recall canvas...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4.5 text-brand-foreground" />
                          Analyze Free Recall
                        </>
                      )}
                    </Button>

                  </div>
                ) : (
                  /* Blurting Results Report Screen */
                  <div className="flex-grow flex flex-col justify-between gap-6">
                    
                    {/* Scorecard Header */}
                    <div className="flex items-center justify-between border-b pb-4">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">Recall Report Analysis</h4>
                        <p className="text-[10px] text-muted-foreground font-mono">Topic: {topic}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`h-8 font-extrabold text-sm ${
                          blurtReport.score >= 80 
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                            : blurtReport.score >= 50 
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                            : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        }`}>
                          Score: {blurtReport.score}%
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => { setBlurtReport(null); setBlurtText(''); }} className="size-8 p-0 rounded-lg">
                          <Trash2 className="size-4 text-muted-foreground hover:text-rose-500" />
                        </Button>
                      </div>
                    </div>

                    {/* Breakdown details */}
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                      
                      {/* Misconceptions */}
                      {blurtReport.misconceptions.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="size-3.5" />
                            Misconceptions Identified
                          </span>
                          <div className="space-y-1">
                            {blurtReport.misconceptions.map((item, idx) => (
                              <div key={idx} className="text-xs p-2.5 bg-rose-500/5 text-rose-800 dark:text-rose-300 border border-rose-500/10 rounded-xl leading-normal">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing Points checklist */}
                      {blurtReport.missingPoints.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                            <HelpCircle className="size-3.5" />
                            Syllabus Points Forgotten
                          </span>
                          <div className="grid grid-cols-1 gap-1">
                            {blurtReport.missingPoints.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground leading-normal">
                                <span className="text-amber-500 shrink-0 font-bold">•</span>
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Remedy tip box */}
                      <div className="p-3.5 bg-brand-soft/20 border border-brand/10 rounded-2xl space-y-1.5">
                        <span className="text-[10px] font-bold text-brand uppercase tracking-wider flex items-center gap-1">
                          <Lightbulb className="size-3.5 text-brand" />
                          Remedial Tip
                        </span>
                        <p className="text-xs text-foreground leading-relaxed font-medium italic">
                          "{blurtReport.remedyTip}"
                        </p>
                      </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-2 justify-end border-t pt-4">
                      {blurtReport.score < 80 && (
                        <Button
                          variant="outline"
                          onClick={handleScheduleRevision}
                          disabled={schedulingRevision}
                          className="h-10 rounded-xl border-brand/20 text-brand hover:bg-brand/5 text-xs flex items-center gap-1.5"
                        >
                          {schedulingRevision ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Calendar className="size-3.5" />
                          )}
                          Schedule Timetable Revision
                        </Button>
                      )}
                      <Button
                        onClick={() => { setBlurtReport(null); }}
                        className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-xl h-10 text-xs font-semibold"
                      >
                        Try Recall Again
                      </Button>
                    </div>

                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </Card>

      </div>

    </div>
  );
}
