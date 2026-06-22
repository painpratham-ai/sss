'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Camera, Upload, BookOpen, PenTool, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { EvaluationReport } from './EvaluationReport';

export function MockMasteryTab() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [paper, setPaper] = useState<any>(null);
  
  // Evaluation state
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateExam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsGenerating(true);
    setPaper(null);
    setEvaluation(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      board: formData.get('board'),
      className: formData.get('className'),
      subject: formData.get('subject'),
      marks: parseInt(formData.get('marks') as string) || 40,
    };

    try {
      const res = await fetch('/api/mock-exam/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      
      if (result.success) {
        setPaper(result.paper);
        toast({ title: 'Exam Generated', description: 'Your predictive mock exam is ready.' });
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const evaluateAnswer = async () => {
    if (!imagePreview || !activeQuestion) return;
    
    setIsEvaluating(true);
    try {
      const res = await fetch('/api/mock-exam/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          questionId: activeQuestion.id,
          questionText: activeQuestion.text,
          board: paper?.title?.split(' ')[0] || 'ICSE',
          subject: paper?.title?.split(' - ')[1]?.split(' ')[0] || 'Unknown',
        }),
      });
      
      const result = await res.json();
      if (result.success) {
        setEvaluation(result.evaluation);
        toast({ title: 'Evaluation Complete', description: 'AI has graded your handwritten answer.' });
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({ title: 'Evaluation failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsEvaluating(false);
    }
  };

  const scheduleRemediation = async () => {
    if (!evaluation || !activeQuestion) return;
    try {
      await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remediationTopics: [
            {
              subject: paper?.title?.split(' - ')[1]?.split(' ')[0] || 'Unknown',
              topic: activeQuestion.text.substring(0, 30) + '...',
            }
          ]
        }),
      });
      toast({ title: 'Scheduled!', description: 'Revision slot added to your Timetable.' });
    } catch (err) {
      toast({ title: 'Failed to schedule', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <PenTool className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mock Mastery Studio</h2>
          <p className="text-muted-foreground">Predictive exams & AI handwritten evaluation</p>
        </div>
      </div>

      {!paper ? (
        <Card className="border-primary/20 shadow-lg max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Generate a Predictive Mock Exam</CardTitle>
            <CardDescription>
              Our AI analyzes past paper topic frequencies to generate a highly probable mock exam targeting your specific board.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={generateExam} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Board</Label>
                  <Select name="board" defaultValue="ICSE">
                    <SelectTrigger><SelectValue placeholder="Select board" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ICSE">ICSE</SelectItem>
                      <SelectItem value="ISC">ISC</SelectItem>
                      <SelectItem value="CBSE">CBSE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select name="className" defaultValue="10">
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">Class 10</SelectItem>
                      <SelectItem value="12">Class 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input name="subject" placeholder="e.g. Geography" required />
                </div>
                <div className="space-y-2">
                  <Label>Marks</Label>
                  <Select name="marks" defaultValue="40">
                    <SelectTrigger><SelectValue placeholder="Select marks" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="40">40 Marks (1 Hour)</SelectItem>
                      <SelectItem value="80">80 Marks (2 Hours)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-lg" disabled={isGenerating}>
                {isGenerating ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing Past Papers...</> : 'Generate Mock Exam'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Paper View */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{paper.title}</h3>
                <p className="text-muted-foreground">{paper.totalMarks} Marks • {paper.duration}</p>
              </div>
              <Button variant="outline" onClick={() => setPaper(null)}>New Exam</Button>
            </div>
            
            {paper.sections.map((section: any, sIdx: number) => (
              <Card key={sIdx} className="border-border">
                <CardHeader className="bg-muted/30 pb-4">
                  <CardTitle className="text-lg">{section.name}</CardTitle>
                  <CardDescription>{section.instructions}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {section.questions.map((q: any, qIdx: number) => (
                    <div 
                      key={q.id} 
                      className={`p-4 rounded-lg border transition-all cursor-pointer hover:border-primary/50 hover:bg-primary/5 ${activeQuestion?.id === q.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'bg-card'}`}
                      onClick={() => { setActiveQuestion(q); setEvaluation(null); setImagePreview(null); }}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex gap-3">
                          <span className="font-bold text-muted-foreground">Q{qIdx + 1}.</span>
                          <p className="text-sm leading-relaxed">{q.text}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0">[{q.marks} Marks]</Badge>
                      </div>
                      {activeQuestion?.id === q.id && (
                        <div className="mt-4 flex items-center text-xs text-primary font-medium animate-in fade-in">
                          <ArrowRight className="w-3 h-3 mr-1" /> Selected for AI Evaluation
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Evaluation Panel */}
          <div className="sticky top-6 space-y-6">
            {!activeQuestion ? (
              <Card className="border-dashed bg-muted/20">
                <CardContent className="flex flex-col items-center justify-center h-64 text-center p-6">
                  <BookOpen className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-lg font-medium text-muted-foreground">Select a question to evaluate</p>
                  <p className="text-sm text-muted-foreground mt-2">Write your answer on paper, select the question on the left, and upload a photo for AI grading.</p>
                </CardContent>
              </Card>
            ) : !evaluation ? (
              <Card className="border-primary/20 shadow-md animate-in fade-in zoom-in-95">
                <CardHeader>
                  <CardTitle>Evaluate Answer</CardTitle>
                  <CardDescription>Upload a photo of your handwritten answer for <span className="font-semibold text-foreground">Question {activeQuestion.id.split('_').pop()}</span>.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                  
                  {!imagePreview ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <Camera className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="font-medium">Click to capture or upload photo</p>
                      <p className="text-xs text-muted-foreground mt-1">Supports clear handwritten images</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative rounded-xl overflow-hidden border">
                        <img src={imagePreview} alt="Answer" className="w-full object-contain max-h-[300px]" />
                        <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={() => fileInputRef.current?.click()}>
                          Change Image
                        </Button>
                      </div>
                      <Button 
                        className="w-full h-12 text-lg gap-2" 
                        onClick={evaluateAnswer}
                        disabled={isEvaluating}
                      >
                        {isEvaluating ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> AI is grading your paper...</>
                        ) : (
                          <><Upload className="w-5 h-5" /> Submit for Grading</>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <EvaluationReport 
                evaluation={evaluation} 
                onScheduleRemediation={scheduleRemediation} 
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
