'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Sparkles, FlaskConical, BookOpenCheck, FolderOpen, Wand2, BrainCircuit } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { StatChips } from '@/components/icse/StatChips';
import { UploadStep } from '@/components/icse/UploadStep';
import { AgentPipeline } from '@/components/icse/AgentPipeline';
import { OutputViewer } from '@/components/icse/OutputViewer';
import { PastProjectsTab } from '@/components/icse/PastProjectsTab';
import { KnowledgeBaseTab } from '@/components/icse/KnowledgeBaseTab';
import { MockGeneratorTab } from '@/components/icse/MockGeneratorTab';
import { TutorTab } from '@/components/icse/TutorTab';
import { AuthBar } from '@/components/icse/AuthBar';
import type { PipelineResponse, UploadResponse } from '@/components/icse/types';

export default function Home() {
  // Board state (lifted up — drives all AI behavior)
  const [board, setBoard] = useState<string>('ICSE');

  // Step 1 upload state
  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [subject, setSubject] = useState('');
  const [className, setClassName] = useState('');
  const [topic, setTopic] = useState('');

  // Step 2 pipeline state
  const [pipelineResult, setPipelineResult] = useState<PipelineResponse | null>(null);

  // Refresh triggers for tabs
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0);
  const [kbRefreshKey, setKbRefreshKey] = useState(0);

  const handleUpload = useCallback((res: UploadResponse) => {
    setUpload(res);
    // Reset previous pipeline result when a new file is uploaded
    setPipelineResult(null);
  }, []);

  const handlePipelineComplete = useCallback((result: PipelineResponse) => {
    setPipelineResult(result);
    // Bump past projects list so the new entry shows up
    setProjectsRefreshKey((k) => k + 1);
    setKbRefreshKey((k) => k + 1);
    // Scroll the user's attention to the output viewer
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        const el = document.getElementById('output-viewer');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  const handleOpenPastProject = useCallback((result: PipelineResponse) => {
    setPipelineResult(result);
    // Reflect uploaded source if any (we don't have sourceText mirror; just leave as-is)
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        const el = document.getElementById('output-viewer');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        {/* ────────── Header / Hero ────────── */}
        <header className="relative overflow-hidden border-b bg-gradient-to-b from-brand-soft/60 via-background to-background">
          {/* Decorative glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
            style={{ background: 'var(--brand)' }}
          />
          <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-xl bg-brand text-brand-foreground shadow-sm">
                    <GraduationCap className="size-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                      {board} Project Forge
                    </h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                      AI-forged {board} projects with diagrams + mock papers — trained on {board} board data
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AuthBar onBoardChange={setBoard} />
                </div>
              </div>

              <StatChips variant="hero" />
            </motion.div>
          </div>
        </header>

        {/* ────────── Main content ────────── */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <Tabs defaultValue="workflow" className="w-full">
            <TabsList
              className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg bg-muted/60 p-1 sm:grid-cols-5"
              aria-label="Primary navigation"
            >
              <TabsTrigger value="workflow" className="gap-1.5 py-2">
                <Wand2 className="size-4" />
                Workflow
              </TabsTrigger>
              <TabsTrigger value="tutor" className="gap-1.5 py-2">
                <BrainCircuit className="size-4" />
                AI Tutor
              </TabsTrigger>
              <TabsTrigger value="projects" className="gap-1.5 py-2">
                <FolderOpen className="size-4" />
                Past Projects
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="gap-1.5 py-2">
                <BookOpenCheck className="size-4" />
                Knowledge Base
              </TabsTrigger>
              <TabsTrigger value="mock" className="gap-1.5 py-2">
                <FlaskConical className="size-4" />
                Mock Generator
              </TabsTrigger>
            </TabsList>

            {/* Workflow tab */}
            <TabsContent value="workflow" className="mt-6 outline-none">
              <div className="space-y-4">
                <UploadStep
                  upload={upload}
                  onUpload={handleUpload}
                  subject={subject}
                  onSubject={setSubject}
                  className={className}
                  onClass={setClassName}
                  topic={topic}
                  onTopic={setTopic}
                />
                <AgentPipeline
                  upload={upload}
                  subject={subject}
                  className={className}
                  topic={topic}
                  onComplete={handlePipelineComplete}
                  onProjectCountIncrement={() => setProjectsRefreshKey((k) => k + 1)}
                />
                <div id="output-viewer" className="scroll-mt-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={pipelineResult?.projectId || 'empty'}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <OutputViewer result={pipelineResult} />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </TabsContent>

            {/* AI Tutor tab */}
            <TabsContent value="tutor" className="mt-6 outline-none">
              <TutorTab board={board} />
            </TabsContent>

            {/* Past Projects tab */}
            <TabsContent value="projects" className="mt-6 outline-none">
              <PastProjectsTab
                refreshKey={projectsRefreshKey}
                onOpen={handleOpenPastProject}
              />
            </TabsContent>

            {/* Knowledge Base tab */}
            <TabsContent value="knowledge" className="mt-6 outline-none">
              <KnowledgeBaseTab refreshKey={kbRefreshKey} />
            </TabsContent>

            {/* Mock Generator tab */}
            <TabsContent value="mock" className="mt-6 outline-none">
              <MockGeneratorTab />
            </TabsContent>
          </Tabs>
        </main>

        {/* ────────── Footer (sticky to bottom via flex) ────────── */}
        <footer className="mt-auto border-t bg-muted/30">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Built for ICSE students • RAG + Multi-Agent AI •{' '}
              <span className="text-muted-foreground/80">Not affiliated with CISCE</span>
            </p>
            <StatChips variant="footer" />
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
