'use client';

import { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Sparkles, FlaskConical, BookOpenCheck, FolderOpen, Wand2, BrainCircuit, BookOpen, Target, HeartHandshake, Calendar, CheckSquare, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { StatChips } from '@/components/icse/StatChips';
import { UploadStep } from '@/components/icse/UploadStep';
import { AgentPipeline } from '@/components/icse/AgentPipeline';
import { OutputViewer } from '@/components/icse/OutputViewer';
import { PastProjectsTab } from '@/components/icse/PastProjectsTab';
import { KnowledgeBaseTab } from '@/components/icse/KnowledgeBaseTab';
import { MockMasteryTab } from '@/components/icse/MockMasteryTab';
import { TutorTab } from '@/components/icse/TutorTab';
import { ActiveRecallTab } from '@/components/icse/ActiveRecallTab';
import { VirtualLabTab } from '@/components/icse/VirtualLabTab';
import { SyllabusTrackerTab } from '@/components/icse/SyllabusTrackerTab';
import { AuthBar } from '@/components/icse/AuthBar';
import { PartnerTab } from '@/components/icse/PartnerTab';
import { TimetableTab } from '@/components/icse/TimetableTab';
import { TaskManagerTab } from '@/components/icse/TaskManagerTab';
import { OnboardingWizard } from '@/components/icse/OnboardingWizard';
import type { PipelineResponse, UploadResponse, ExtractedProject, ForgeQueueItem } from '@/components/icse/types';
import { toast } from 'sonner';

export default function Home() {
  // Board state (lifted up — drives all AI behavior)
  const [board, setBoard] = useState<string>('ICSE');

  // Session and profile state
  const [user, setUser] = useState<any | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [profileNeedsOnboarding, setProfileNeedsOnboarding] = useState(false);

  // Fetch session on mount
  useEffect(() => {
    let active = true;
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!res.ok) {
          if (active) setLoadingUser(false);
          return;
        }
        const data = await res.json();
        if (!active) return;
        if (data?.user) {
          setUser(data.user);
          setBoard(data.user.board || 'ICSE');
          
          // Check if they need onboarding (interests or strengths/subjects are empty)
          try {
            const pRes = await fetch('/api/profile');
            const pData = await pRes.json();
            if (pData?.profile) {
              const interests = JSON.parse(pData.profile.interests || '[]');
              const strengths = JSON.parse(pData.profile.strengths || '[]');
              if (interests.length === 0 && strengths.length === 0) {
                setProfileNeedsOnboarding(true);
              }
            } else {
              setProfileNeedsOnboarding(true);
            }
          } catch (e) {
            setProfileNeedsOnboarding(true);
          }
        }
      } catch (err) {
        console.error('Failed to load initial session:', err);
      } finally {
        if (active) setLoadingUser(false);
      }
    };
    fetchSession();
    return () => {
      active = false;
    };
  }, []);

  const handleOnboardingComplete = useCallback((updatedUser: any) => {
    setUser(updatedUser);
    setBoard(updatedUser.board);
    setProfileNeedsOnboarding(false);
  }, []);

  // Step 1 upload state
  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [subject, setSubject] = useState('');
  const [className, setClassName] = useState('');
  const [topic, setTopic] = useState('');

  // Step 2 pipeline state
  const [pipelineResult, setPipelineResult] = useState<PipelineResponse | null>(null);

  // Multi-project queue state
  const [forgeQueue, setForgeQueue] = useState<ForgeQueueItem[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1);
  const [completedProjects, setCompletedProjects] = useState<PipelineResponse[]>([]);
  const [queueAutoStart, setQueueAutoStart] = useState<boolean>(false);

  // Refresh triggers for tabs
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0);
  const [kbRefreshKey, setKbRefreshKey] = useState(0);

  const handleUpload = useCallback((res: UploadResponse) => {
    setUpload(res);
    // Reset previous pipeline result when a new file is uploaded
    setPipelineResult(null);
    setForgeQueue([]);
    setCompletedProjects([]);
    setCurrentQueueIndex(-1);
    setQueueAutoStart(false);
  }, []);

  const handleExtractedProjects = useCallback((projects: ExtractedProject[]) => {
    const queueItems: ForgeQueueItem[] = projects.map((p) => ({
      project: p,
      status: 'pending'
    }));

    setForgeQueue(queueItems);
    setCompletedProjects([]);
    setPipelineResult(null);
    setCurrentQueueIndex(0);
    setQueueAutoStart(true);
    
    // Set status of first project to forging
    setForgeQueue(prev =>
      prev.map((item, idx) =>
        idx === 0 ? { ...item, status: 'forging' } : item
      )
    );

    toast.success(`Queued ${projects.length} projects for forging!`);
  }, []);

  const handlePipelineComplete = useCallback((result: PipelineResponse) => {
    if (currentQueueIndex >= 0 && forgeQueue.length > 0) {
      // Update queue item status to completed
      setForgeQueue(prev =>
        prev.map((item, idx) =>
          idx === currentQueueIndex ? { ...item, status: 'completed', result } : item
        )
      );

      // Save result and set active viewer result
      setCompletedProjects(prev => [...prev, result]);
      setPipelineResult(result);
      setProjectsRefreshKey((k) => k + 1);
      setKbRefreshKey((k) => k + 1);

      // Move to next queue item
      const nextIndex = currentQueueIndex + 1;
      if (nextIndex < forgeQueue.length) {
        setForgeQueue(prev =>
          prev.map((item, idx) =>
            idx === nextIndex ? { ...item, status: 'forging' } : item
          )
        );
        setCurrentQueueIndex(nextIndex);
      } else {
        setCurrentQueueIndex(-1);
        setQueueAutoStart(false);
        toast.success("Successfully forged all projects in the queue!");
        
        if (typeof window !== 'undefined') {
          requestAnimationFrame(() => {
            const el = document.getElementById('output-viewer');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
      }
    } else {
      // Single project flow
      setPipelineResult(result);
      setCompletedProjects([result]);
      setProjectsRefreshKey((k) => k + 1);
      setKbRefreshKey((k) => k + 1);
      
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          const el = document.getElementById('output-viewer');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    }
  }, [currentQueueIndex, forgeQueue]);

  const handleQueueItemError = useCallback((index: number, error: string) => {
    if (index >= 0 && forgeQueue.length > 0) {
      setForgeQueue(prev =>
        prev.map((item, idx) =>
          idx === index ? { ...item, status: 'failed', error } : item
        )
      );

      toast.error(`Project "${forgeQueue[index]?.project.title || 'Untitled'}" failed to forge: ${error}`);

      const nextIndex = index + 1;
      if (nextIndex < forgeQueue.length) {
        setForgeQueue(prev =>
          prev.map((item, idx) =>
            idx === nextIndex ? { ...item, status: 'forging' } : item
          )
        );
        setCurrentQueueIndex(nextIndex);
      } else {
        setCurrentQueueIndex(-1);
        setQueueAutoStart(false);
        toast.info("Queue processing finished (with some errors).");
      }
    }
  }, [forgeQueue]);

  const handleOpenPastProject = useCallback((result: PipelineResponse) => {
    setPipelineResult(result);
    setCompletedProjects([result]);
    
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        const el = document.getElementById('output-viewer');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  if (loadingUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">
        <div className="relative size-16 flex items-center justify-center bg-indigo-500/10 rounded-full border border-indigo-500/20">
          <Loader2 className="size-8 text-indigo-400 animate-spin" />
        </div>
        <span className="mt-4 text-xs font-semibold text-slate-400 tracking-wider animate-pulse font-mono">
          INITIALIZING SECURE SESSION...
        </span>
      </div>
    );
  }

  if (!user || profileNeedsOnboarding) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-950 text-white">
        {/* Sticky Header Nav during onboarding */}
        <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-slate-950/60 backdrop-blur-lg">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <GraduationCap className="size-5" />
              </div>
              <span className="font-bold tracking-tight text-gradient text-lg">
                Project Forge
              </span>
            </div>
            <AuthBar 
              user={user} 
              setUser={setUser} 
              loading={loadingUser} 
              setLoading={setLoadingUser} 
              onBoardChange={setBoard} 
            />
          </div>
        </nav>
        <OnboardingWizard initialUser={user} onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        {/* Sticky Header Nav */}
        <nav className="sticky top-0 z-50 w-full border-b border-black/5 dark:border-white/5 bg-background/60 backdrop-blur-lg">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-lg bg-brand text-brand-foreground shadow-sm">
                <GraduationCap className="size-5" />
              </div>
              <span className="font-bold tracking-tight text-gradient text-lg">
                {board} Project Forge
              </span>
            </div>
            <AuthBar 
              user={user} 
              setUser={setUser} 
              loading={loadingUser} 
              setLoading={setLoadingUser} 
              onBoardChange={setBoard} 
            />
          </div>
        </nav>

        {/* Hero Banner */}
        <header className="relative overflow-hidden py-12 md:py-16 bg-background border-b border-black/5 dark:border-white/5">
          {/* Centered glowing radial mesh */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] hero-glow blur-[40px] pointer-events-none select-none" />
          
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-brand/10 border border-brand/20 text-brand">
                <Sparkles className="size-3.5" />
                <span>Powered by Advanced RAG & Multi-Agent Intelligence</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
                Forge School-Ready <span className="text-brand">{board} Projects</span>
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl">
                Upload your notes or textbook chapters. Our specialized AI agents structure, write, illustrate, and verify high-scoring projects tailored for your board exams.
              </p>
              <StatChips variant="hero" className="justify-center mt-2" />
            </motion.div>
          </div>
        </header>

        {/* ────────── Main content ────────── */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 md:py-8 sm:px-6">
          <Tabs defaultValue="workflow" className="w-full">
            <TabsList
              className="flex overflow-x-auto h-auto w-full gap-1.5 rounded-xl border border-black/5 dark:border-white/5 bg-muted/40 p-1.5 md:grid md:grid-cols-11 glass-panel shadow-sm scrollbar-none snap-x snap-mandatory"
              aria-label="Primary navigation"
            >
              <TabsTrigger value="workflow" className="shrink-0 snap-start gap-1.5 py-2.5 rounded-lg data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all cursor-pointer text-xs">
                <Wand2 className="size-3.5" />
                Workflow
              </TabsTrigger>
              <TabsTrigger value="tutor" className="shrink-0 snap-start gap-1.5 py-2.5 rounded-lg data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all cursor-pointer text-xs">
                <BrainCircuit className="size-3.5" />
                AI Tutor
              </TabsTrigger>
              <TabsTrigger value="partner" className="shrink-0 snap-start gap-1.5 py-2.5 rounded-lg data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all cursor-pointer text-xs">
                <HeartHandshake className="size-3.5" />
                Partner
              </TabsTrigger>
              <TabsTrigger value="projects" className="shrink-0 snap-start gap-1.5 py-2.5 rounded-lg data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all cursor-pointer text-xs">
                <FolderOpen className="size-3.5" />
                Past Projects
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="shrink-0 snap-start gap-1.5 py-2.5 rounded-lg data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all cursor-pointer text-xs">
                <BookOpen className="size-3.5" />
                KB Index
              </TabsTrigger>
              <TabsTrigger value="syllabus" className="shrink-0 snap-start gap-1.5 py-2.5 rounded-lg data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all cursor-pointer text-xs">
                <BookOpenCheck className="size-3.5" />
                Syllabus
              </TabsTrigger>
              <TabsTrigger value="timetable" className="shrink-0 snap-start gap-1.5 py-2.5 rounded-lg data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all cursor-pointer text-xs">
                <Calendar className="size-3.5" />
                Planner
              </TabsTrigger>
              <TabsTrigger value="tasks" className="shrink-0 snap-start gap-1.5 py-2.5 rounded-lg data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all cursor-pointer text-xs">
                <CheckSquare className="size-3.5" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="lab" className="shrink-0 snap-start gap-1.5 py-2.5 rounded-lg data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all cursor-pointer text-xs">
                <FlaskConical className="size-3.5" />
                Virtual Lab
              </TabsTrigger>
              <TabsTrigger value="mock" className="shrink-0 snap-start gap-1.5 py-2.5 rounded-lg data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all cursor-pointer text-xs">
                <Target className="size-3.5" />
                Mocks
              </TabsTrigger>
              <TabsTrigger value="recall" className="shrink-0 snap-start gap-1.5 py-2.5 rounded-lg data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm transition-all cursor-pointer text-xs">
                <BrainCircuit className="size-3.5" />
                Recall
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
                  board={board}
                  onExtractedProjects={handleExtractedProjects}
                />
                <AgentPipeline
                  upload={upload}
                  subject={subject}
                  className={className}
                  topic={topic}
                  board={board}
                  onComplete={handlePipelineComplete}
                  onProjectCountIncrement={() => setProjectsRefreshKey((k) => k + 1)}
                  queue={forgeQueue}
                  currentQueueIndex={currentQueueIndex}
                  autoStart={queueAutoStart}
                  onQueueItemError={handleQueueItemError}
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
                      <OutputViewer
                        result={pipelineResult}
                        allResults={completedProjects}
                        onSelectResult={setPipelineResult}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </TabsContent>

            {/* AI Tutor tab */}
            <TabsContent value="tutor" className="mt-6 outline-none">
              <TutorTab board={board} />
            </TabsContent>

            {/* Brain Partner tab */}
            <TabsContent value="partner" className="mt-6 outline-none">
              <PartnerTab board={board} />
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
              <KnowledgeBaseTab refreshKey={kbRefreshKey} board={board} />
            </TabsContent>

            {/* Syllabus Tracker tab */}
            <TabsContent value="syllabus" className="mt-6 outline-none">
              <SyllabusTrackerTab board={board} />
            </TabsContent>

            {/* Virtual Lab tab */}
            <TabsContent value="lab" className="mt-6 outline-none">
              <VirtualLabTab />
            </TabsContent>

            {/* Mock Mastery tab */}
            <TabsContent value="mock" className="mt-6 outline-none">
              <MockMasteryTab />
            </TabsContent>

            {/* Active Recall tab */}
            <TabsContent value="recall" className="mt-6 outline-none">
              <ActiveRecallTab board={board} />
            </TabsContent>

            {/* Timetable/Planner tab */}
            <TabsContent value="timetable" className="mt-6 outline-none">
              <TimetableTab />
            </TabsContent>

            {/* Task Manager tab */}
            <TabsContent value="tasks" className="mt-6 outline-none">
              <TaskManagerTab />
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
