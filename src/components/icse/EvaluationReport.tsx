'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepFeedback {
  step: string;
  awarded: boolean;
  comment: string;
}

interface EvaluationData {
  transcription: string;
  marksAwarded: number;
  maxMarks: number;
  stepWiseFeedback: StepFeedback[];
  generalFeedback: string;
}

interface Props {
  evaluation: EvaluationData;
  onScheduleRemediation?: () => void;
}

export function EvaluationReport({ evaluation, onScheduleRemediation }: Props) {
  const percentage = Math.round((evaluation.marksAwarded / evaluation.maxMarks) * 100);
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Score Summary */}
        <Card className="flex-1 border-primary/20 bg-primary/5">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Marks Awarded</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black text-primary">{evaluation.marksAwarded}</span>
              <span className="text-2xl text-muted-foreground">/ {evaluation.maxMarks}</span>
            </div>
            <Badge variant={percentage >= 80 ? 'default' : percentage >= 50 ? 'secondary' : 'destructive'} className="mt-2 text-lg px-4 py-1">
              {percentage}%
            </Badge>
          </CardContent>
        </Card>

        {/* General Feedback */}
        <Card className="flex-[2]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Examiner's Remarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {evaluation.generalFeedback}
            </p>
            {onScheduleRemediation && percentage < 80 && (
              <Button 
                onClick={onScheduleRemediation}
                variant="outline" 
                className="mt-4 border-primary/50 hover:bg-primary/10 w-full md:w-auto"
              >
                <CalendarClock className="w-4 h-4 mr-2" />
                Schedule Revision in Timetable
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Step-wise Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step-wise Marking Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {evaluation.stepWiseFeedback.map((step, idx) => (
              <div key={idx} className="flex gap-4 p-4 rounded-lg bg-muted/50 border">
                <div className="mt-1">
                  {step.awarded ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{step.step}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{step.comment}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Transcription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-muted-foreground">AI Transcription of your answer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted/30 rounded-lg font-mono text-sm border">
            {evaluation.transcription}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
