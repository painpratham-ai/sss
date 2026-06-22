'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, FileQuestion, ArrowLeft, GraduationCap, Award,
  CheckCircle2, XCircle, AlertCircle, Loader2, Sparkles, Download, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { MockPaper } from './types';

interface MockPaperCardProps {
  paper: MockPaper;
  id?: string | null;
  board?: string;
}

interface GradingResult {
  totalScore: number;
  maxMarks: number;
  feedback: string;
  breakdown: {
    questionIndex: number;
    score: number;
    feedback: string;
  }[];
}

export function MockPaperCard({ paper, id, board = 'ICSE' }: MockPaperCardProps) {
  const [showAnswers, setShowAnswers] = useState(false);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [isGrading, setIsGrading] = useState(false);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const printContainer = document.createElement('div');
      printContainer.style.position = 'fixed';
      printContainer.style.left = '-9999px';
      printContainer.style.top = '0';
      printContainer.style.width = '794px';
      printContainer.style.backgroundColor = '#ffffff';
      printContainer.style.color = '#1f2937';
      printContainer.style.fontFamily = 'Arial, sans-serif';
      printContainer.style.boxSizing = 'border-box';

      const formattedTopic = paper.topic || 'Specimen Practice Paper';
      const formattedSubject = paper.subject || 'Subject';
      const year = new Date().getFullYear();
      const boardFull = board === 'CBSE' ? 'CENTRAL BOARD OF SECONDARY EDUCATION' : 'COUNCIL FOR THE INDIAN SCHOOL CERTIFICATE EXAMINATIONS';

      let html = `
        <div style="width: 794px; min-height: 1120px; padding: 60px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; border: 10px double #4f46e5; background: #ffffff; position: relative;">
          <div>
            <div style="text-align: center; margin-bottom: 30px;">
              <p style="font-size: 15px; font-weight: bold; color: #4f46e5; tracking: 0.1em; text-transform: uppercase; margin: 0 0 5px 0;">${boardFull}</p>
              <h1 style="font-size: 22px; color: #1e1b4b; font-weight: 800; margin: 0; text-transform: uppercase;">SPECIMEN PRACTICE WORKSHEET</h1>
              <div style="width: 100px; height: 3px; background-color: #4f46e5; margin: 10px auto;"></div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 13px; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 30px; color: #374151;">
              <div>
                <p style="margin: 0 0 4px 0;"><strong>SUBJECT:</strong> ${formattedSubject}</p>
                <p style="margin: 0;"><strong>TOPIC:</strong> ${formattedTopic}</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0 0 4px 0;"><strong>TOTAL MARKS:</strong> ${totalMarks} Marks</p>
                <p style="margin: 0;"><strong>DURATION:</strong> ${paper.duration ?? 60} Minutes</p>
              </div>
            </div>

            <div style="font-size: 12px; color: #6b7280; font-style: italic; margin-bottom: 30px;">
              * Answer all questions. Internal choices are indicated where applicable. Write answers in neat student-like handwriting or type directly on the sheet.
            </div>
      `;

      paper.sections.forEach((section, si) => {
        html += `
          <div style="margin-bottom: 40px;">
            <h3 style="font-size: 14px; font-weight: 800; color: #4f46e5; border-bottom: 1px solid #4f46e5; padding-bottom: 5px; margin-top: 0; margin-bottom: 20px; text-transform: uppercase;">
              ${section.name} (${section.questions.reduce((a, q) => a + (q.marks || 0), 0)} Marks)
            </h3>
            <ol style="padding-left: 20px; margin: 0; font-size: 13px; line-height: 1.8;">
        `;

        section.questions.forEach((q, qi) => {
          html += `
            <li style="margin-bottom: 25px; color: #111827;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <div style="flex: 1;">
                  <p style="margin: 0; font-weight: 500;">${q.q}</p>
                  
                  ${
                    q.choice
                      ? `<p style="margin: 5px 0 0 0; font-size: 12px; font-style: italic; color: #6b7280;"><span style="font-weight: 600; not-italic">OR</span> ${q.choice}</p>`
                      : ''
                  }

                  ${
                    showAnswers && q.answer
                      ? `<div style="margin-top: 10px; background-color: #f5f3ff; border-left: 3px solid #8b5cf6; padding: 10px; border-radius: 4px; font-size: 12px; color: #4c1d95;">
                          <strong>Marking Scheme Answer:</strong>
                          <p style="margin: 5px 0 0 0; white-space: pre-wrap;">${q.answer}</p>
                         </div>`
                      : `<div style="margin-top: 30px; border-bottom: 1px dashed #d1d5db; height: 1px; width: 95%;"></div>`
                  }
                </div>
                <span style="font-size: 12px; color: #6b7280; font-weight: 600; white-space: nowrap; margin-left: 10px;">
                  [${q.marks} Mark${q.marks === 1 ? '' : 's'}]
                </span>
              </div>
            </li>
          `;
        });

        html += `
            </ol>
          </div>
        `;
      });

      html += `
          </div>
          <div style="font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; display: flex; justify-content: space-between; align-items: center;">
            <span>ICSE Specimen Practice sheet • ${formattedSubject}</span>
            <span>Generated: ${year}</span>
          </div>
        </div>
      `;

      printContainer.innerHTML = html;
      document.body.appendChild(printContainer);

      const canvas = await html2canvas(printContainer, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = 297;
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

      const safeName = formattedTopic
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      pdf.save(`${safeName}-icse-mock.pdf`);
      document.body.removeChild(printContainer);
      toast.success('Successfully downloaded mock paper PDF!');
    } catch (err: any) {
      console.error(err);
      toast.error(`PDF generation failed: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const totalMarks =
    paper.totalMarks ??
    paper.sections.reduce(
      (sum, s) => sum + s.questions.reduce((a, q) => a + (q.marks || 0), 0),
      0
    );

  // Flattened questions for interactive quiz list
  const flatQuestions: { q: string; marks: number; answer: string; sectionName: string; choice?: string; originalIndex: number; type?: string; options?: string[]; answerIndex?: number }[] = [];
  paper.sections.forEach((section) => {
    section.questions.forEach((q, idx) => {
      flatQuestions.push({
        q: q.q,
        marks: q.marks,
        answer: q.answer || '',
        sectionName: section.name,
        choice: q.choice,
        originalIndex: idx,
        type: q.type,
        options: q.options,
        answerIndex: q.answerIndex,
      });
    });
  });

  const handleStartPractice = () => {
    setStudentAnswers({});
    setGradingResult(null);
    setIsPracticeMode(true);
    toast.info('Interactive practice started! Write your answers below.');
  };

  const handleTextareaChange = (key: string, val: string) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSubmitPractice = async () => {
    // Check if at least one question is answered
    const hasAnswers = Object.values(studentAnswers).some((ans) => ans.trim().length > 0);
    if (!hasAnswers) {
      toast.error('Please answer at least one question before submitting.');
      return;
    }

    setIsGrading(true);
    try {
      // Map flat questions to payload
      const answersPayload = flatQuestions.map((q, idx) => ({
        question: q.q,
        marks: q.marks,
        expectedAnswer: q.answer,
        studentAnswer: studentAnswers[`q_${idx}`] || '',
      }));

      const res = await fetch('/api/mock/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: paper.subject,
          topic: paper.topic,
          answers: answersPayload,
          board,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Grading failed');
      setGradingResult(data as GradingResult);
      toast.success('Your test has been graded by AI Tutor!');

      // Log mock test study event to Second Brain
      fetch('/api/study-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'mock_test',
          subject: paper.subject,
          topic: paper.topic,
          metadata: {
            score: data.totalScore,
            maxMarks: data.maxMarks,
            feedback: data.feedback
          }
        })
      }).catch(err => console.error('Failed to log mock test study event:', err));
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit answers for grading.');
    } finally {
      setIsGrading(false);
    }
  };

  const handleExitPractice = () => {
    setIsPracticeMode(false);
    setGradingResult(null);
    setStudentAnswers({});
  };

  // ── Practice Mode Render ──────────────────────────────────────────────────
  if (isPracticeMode) {
    if (gradingResult) {
      // ── Grading Result Screen ──
      const percent = (gradingResult.totalScore / gradingResult.maxMarks) * 100;
      const scoreColor = percent >= 80 ? 'text-emerald-500 border-emerald-500 bg-emerald-50/30' : percent >= 50 ? 'text-amber-500 border-amber-500 bg-amber-50/30' : 'text-rose-500 border-rose-500 bg-rose-50/30';
      const badgeColor = percent >= 80 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : percent >= 50 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20';

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleExitPractice} className="gap-1">
              <ArrowLeft className="size-4" /> Back to mock paper
            </Button>
            <Badge variant="outline" className="capitalize">
              Graded by ICSE Grader Agent
            </Badge>
          </div>

          {/* Scorecard Header */}
          <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
            <div className={`size-28 rounded-full border-4 flex flex-col items-center justify-center shrink-0 ${scoreColor}`}>
              <span className="text-3xl font-bold tabular-nums">{gradingResult.totalScore}</span>
              <Separator className="w-10 my-0.5 bg-current" />
              <span className="text-xs font-semibold uppercase tracking-wider">{gradingResult.maxMarks} Marks</span>
            </div>
            <div className="space-y-2 text-center md:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h3 className="text-xl font-bold">AI Scorecard Report</h3>
                <Badge className={badgeColor}>
                  {percent >= 80 ? 'Excellent' : percent >= 50 ? 'Needs Practice' : 'Requires Attention'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap italic">
                "{gradingResult.feedback}"
              </p>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-brand">Question Breakdown</h4>
            <Separator />
            <div className="space-y-4">
              {flatQuestions.map((q, idx) => {
                const gradeInfo = gradingResult.breakdown.find((b) => b.questionIndex === idx);
                const score = gradeInfo?.score ?? 0;
                const feedback = gradeInfo?.feedback ?? '';
                const studentAns = studentAnswers[`q_${idx}`] || '(Not answered)';
                const isFullMarks = score === q.marks;

                return (
                  <div key={idx} className="rounded-lg border bg-muted/20 p-4 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand text-xs font-semibold">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{q.q}</p>
                          <p className="text-xs text-muted-foreground uppercase mt-0.5">{q.sectionName}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`shrink-0 tabular-nums ${isFullMarks ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5' : 'border-amber-500/30 text-amber-600 bg-amber-500/5'}`}>
                        Score: {score} / {q.marks}
                      </Badge>
                    </div>

                    <Separator className="opacity-40" />

                    {q.type === 'mcq' && q.options ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {q.options.map((opt, optIdx) => {
                          const optionLetter = String.fromCharCode(65 + optIdx);
                          const isCorrectOpt = optIdx === q.answerIndex;
                          const isSelectedOpt = studentAns === opt;
                          let optStyle = 'border-muted bg-muted/10 text-muted-foreground';
                          if (isCorrectOpt) {
                            optStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-medium';
                          } else if (isSelectedOpt) {
                            optStyle = 'border-rose-500 bg-rose-50 text-rose-800 font-medium';
                          }
                          return (
                            <div key={optIdx} className={`flex items-center gap-2 p-2.5 rounded border text-xs ${optStyle}`}>
                              <span className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${
                                isCorrectOpt ? 'bg-emerald-500 text-white' : isSelectedOpt ? 'bg-rose-500 text-white' : 'bg-muted text-muted-foreground'
                              }`}>
                                {optionLetter}
                              </span>
                              <span className="flex-1">{opt}</span>
                              {isCorrectOpt && <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />}
                              {!isCorrectOpt && isSelectedOpt && <XCircle className="size-4 text-rose-600 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2 text-xs">
                        <div className="space-y-1 bg-card rounded p-2.5 border">
                          <p className="font-semibold text-muted-foreground">Your Answer:</p>
                          <p className="whitespace-pre-wrap text-foreground italic">
                            "{studentAns}"
                          </p>
                        </div>
                        <div className="space-y-1 bg-brand-soft/10 rounded p-2.5 border border-brand/10">
                          <p className="font-semibold text-brand">Expected Answer:</p>
                          <p className="whitespace-pre-wrap text-foreground">
                            {q.answer}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="rounded-md border border-amber-200/50 bg-amber-50/10 p-3 text-xs flex items-start gap-2">
                      <Sparkles className="size-4 shrink-0 mt-0.5 text-amber-500" />
                      <div>
                        <p className="font-semibold text-amber-700">ICSE Examiner Correction:</p>
                        <p className="mt-0.5 text-foreground leading-relaxed">
                          {feedback}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleExitPractice}>
              Reset Test
            </Button>
            <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => {
              setGradingResult(null);
              setStudentAnswers({});
              toast.info('Test reset. Write new answers.');
            }}>
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    // ── Active Quiz Form ──
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleExitPractice} className="gap-1">
            <ArrowLeft className="size-4" /> Cancel practice
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="size-4 text-brand" />
            <span>Interactive Practice Board</span>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="text-sm font-semibold">
            Topic Test: {paper.subject} — {paper.topic}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Write your answers in the input boxes below. Apply standard definitions and terminology for maximum points.
          </p>
        </div>

        <div className="space-y-6">
          {flatQuestions.map((q, idx) => (
            <div key={idx} className="space-y-2.5 rounded-lg border bg-card p-4 shadow-xs">
              <div className="flex justify-between items-start gap-3">
                <div className="flex gap-2">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand text-xs font-semibold">
                    {idx + 1}
                  </span>
                  <p className="text-sm font-medium">{q.q}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 tabular-nums text-xs">
                  {q.marks} mark{q.marks === 1 ? '' : 's'}
                </Badge>
              </div>

              {q.choice && (
                <p className="text-xs italic text-muted-foreground ml-7">
                  <span className="font-semibold not-italic">OR</span> {q.choice}
                </p>
              )}

              <div className="ml-7">
                {q.type === 'mcq' && q.options ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {q.options.map((option, optIdx) => {
                      const optionLetter = String.fromCharCode(65 + optIdx);
                      const isSelected = studentAnswers[`q_${idx}`] === option;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={isGrading}
                          onClick={() => handleTextareaChange(`q_${idx}`, option)}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all duration-200 ${
                            isSelected
                              ? 'border-brand bg-brand-soft/20 text-brand font-medium ring-2 ring-brand/20'
                              : 'border-muted bg-card hover:bg-muted/30 text-foreground'
                          }`}
                        >
                          <span className={`grid size-6 place-items-center rounded-full text-xs font-semibold shrink-0 ${
                            isSelected
                              ? 'bg-brand text-brand-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {optionLetter}
                          </span>
                          <span className="flex-1">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : q.type === 'fill_in_the_blank' ? (
                  <input
                    type="text"
                    value={studentAnswers[`q_${idx}`] || ''}
                    onChange={(e) => handleTextareaChange(`q_${idx}`, e.target.value)}
                    placeholder="Type the missing word(s) here..."
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-transparent disabled:opacity-50"
                    disabled={isGrading}
                  />
                ) : (
                  <Textarea
                    value={studentAnswers[`q_${idx}`] || ''}
                    onChange={(e) => handleTextareaChange(`q_${idx}`, e.target.value)}
                    placeholder={
                      q.type === 'very_short' ? "Write a short 1-2 sentence answer..." :
                      q.type === 'short' ? "Write a detailed paragraph answer..." :
                      "Type your answer here..."
                    }
                    className="min-h-[80px] text-sm"
                    disabled={isGrading}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" onClick={handleExitPractice} disabled={isGrading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitPractice}
            disabled={isGrading}
            className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {isGrading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Grading Answers…
              </>
            ) : (
              <>
                <Award className="size-4" /> Submit for AI Grading
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── Standard Specimen View Render ─────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-muted/40 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {board} Specimen-Style Mock Paper
          </p>
          <p className="mt-0.5 text-lg font-semibold">
            {paper.subject || 'Subject'} — {paper.topic || 'Topic'}
          </p>
          {id && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              ID: <span className="font-mono">{id}</span>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          <Badge className="bg-brand/15 text-brand border-brand/30 tabular-nums">
            {totalMarks} marks
          </Badge>
          <Badge variant="secondary" className="tabular-nums">
            {paper.duration ?? 60} minutes
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Answer all questions. Internal choices are indicated where applicable.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnswers((v) => !v)}
            className="gap-1.5"
            aria-pressed={showAnswers}
          >
            {showAnswers ? (
              <>
                <EyeOff className="size-3.5" /> Hide answers
              </>
            ) : (
              <>
                <Eye className="size-3.5" /> Show answers
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="gap-1.5"
          >
            {downloadingPdf ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileText className="size-3.5" />
            )}
            Download PDF
          </Button>
          <Button
            size="sm"
            onClick={handleStartPractice}
            className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <GraduationCap className="size-3.5" /> Start Interactive Test
          </Button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-5">
        {paper.sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No questions generated. Try regenerating with a different topic.
          </p>
        ) : (
          paper.sections.map((section, si) => (
            <section key={si} aria-label={section.name}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-brand">
                  {section.name}
                </h3>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {section.questions.reduce((a, q) => a + (q.marks || 0), 0)} marks ·{' '}
                  {section.questions.length} questions
                </span>
              </div>
              <Separator className="my-2" />
              <ol className="space-y-3">
                {section.questions.map((q, qi) => (
                  <li key={qi} className="text-sm">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">
                        {qi + 1}
                      </span>
                      <div className="flex-1">
                        <p>
                          {q.q}{' '}
                          <span className="text-xs text-muted-foreground">
                            [{q.marks} mark{q.marks === 1 ? '' : 's'}
                            {q.type ? ` · ${q.type}` : ''}]
                          </span>
                        </p>
                        {q.type === 'mcq' && q.options && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 mb-2">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = showAnswers && optIdx === q.answerIndex;
                              return (
                                <div key={optIdx} className={`flex items-center gap-2 text-xs border rounded p-1.5 ${
                                  isCorrect ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 font-medium' : 'border-transparent text-muted-foreground'
                                }`}>
                                  <span className={`grid size-5 shrink-0 place-items-center rounded text-[10px] font-bold ${
                                    isCorrect ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                                  }`}>
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span>{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <AnimatePresence>
                          {showAnswers && q.answer && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-1.5 overflow-hidden"
                            >
                              <div className="rounded-md border-l-2 border-brand bg-brand-soft/40 p-2.5 text-xs">
                                <p className="font-medium text-brand">Marking scheme</p>
                                <p className="mt-1 whitespace-pre-wrap text-foreground">
                                  {q.answer}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {q.choice && (
                          <p className="mt-1 text-xs italic text-muted-foreground">
                            <span className="font-medium not-italic">OR</span> {q.choice}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))
        )}
      </div>

      {!showAnswers && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileQuestion className="size-3.5" />
          Click <span className="font-medium text-foreground">Show answers</span> or <span className="font-medium text-brand">Start Interactive Test</span> to practice.
        </p>
      )}
    </div>
  );
}
