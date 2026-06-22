// Shared types for the ICSE Project Forge frontend.
// These mirror the JSON shapes returned by the backend API routes.

export interface AgentLog {
  agent: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  cached?: boolean;
  output?: string;
  error?: string;
}

export interface PipelineImage {
  prompt: string;
  path: string;
  caption: string;
}

export interface OutlineSection {
  name: string;
  description?: string;
}

export interface Outline {
  title?: string;
  sections?: OutlineSection[];
}

export interface PipelineResponse {
  projectId: string;
  subject: string;
  className: string;
  topic: string;
  board?: string;
  outline: Outline;
  finalOutput: string;
  images: PipelineImage[];
  logs: AgentLog[];
}

export interface ProjectListItem {
  id: string;
  title: string;
  subject: string;
  className: string;
  topic: string;
  status: string;
  createdAt: string;
}

export interface FullProject extends ProjectListItem {
  sourceText?: string;
  sourceName?: string;
  outline?: string;
  finalOutput?: string;
  images?: string;
  agentLogs?: string;
  updatedAt?: string;
  mocks?: MockRecord[];
}

export interface MockQuestion {
  q: string;
  type?: string;
  marks: number;
  answer?: string;
  choice?: string;
  options?: string[];
  answerIndex?: number;
}

export interface MockSection {
  name: string;
  questions: MockQuestion[];
}

export interface MockPaper {
  subject?: string;
  topic?: string;
  duration?: number;
  totalMarks?: number;
  sections: MockSection[];
}

export interface MockRecord {
  id: string;
  projectId?: string | null;
  subject: string;
  className: string;
  topic: string;
  difficulty: string;
  questions: string; // JSON of MockPaper
  duration: number;
  createdAt: string;
}

export interface MockResponse {
  id: string;
  paper: MockPaper;
  log?: AgentLog;
}

export interface KnowledgeStats {
  knowledgeBase: {
    totalChunks: number;
    subjects: string[];
    categories: string[];
    lastLoadedAt: string;
  };
  userContributedChunks: number;
  cache: {
    totalEntries: number;
    llmCacheHits: number;
    imageCacheHits: number;
  };
}

export interface UploadResponse {
  id: string;
  filename: string;
  size: number;
  extractedText: string;
  textLength: number;
  preview: string;
}

// Multi-project extraction types
export interface ExtractedProject {
  index: number;
  title: string;
  subject: string;
  className: string;
  topic: string;
  extractedText: string;
  selected: boolean;
}

export interface ForgeQueueItem {
  project: ExtractedProject;
  status: 'pending' | 'forging' | 'completed' | 'failed';
  result?: PipelineResponse;
  error?: string;
}

// 7-agent pipeline definition for UI visualization
export interface AgentDef {
  name: string;
  label: string;
  description: string;
  icon: 'FileSearch' | 'ListTree' | 'PenLine' | 'Image' | 'Palette' | 'ShieldCheck' | 'FileQuestion';
}

export const PIPELINE_AGENTS: AgentDef[] = [
  { name: 'Analyzer', label: 'Analyzer', description: 'Identifies subject, class & key concepts from your upload', icon: 'FileSearch' },
  { name: 'Outline', label: 'Outline', description: 'Builds a comprehensive 15-25 section project structure', icon: 'ListTree' },
  { name: 'Writer', label: 'Writer', description: 'Drafts detailed 400-800 word sections with examples & depth', icon: 'PenLine' },
  { name: 'Depth Expander', label: 'Depth Expander', description: 'Identifies gaps and expands content with examples, case studies & data', icon: 'FileQuestion' },
  { name: 'Image Director', label: 'Image Director', description: 'Plans diagrams/figures the project needs', icon: 'Image' },
  { name: 'Image Generator', label: 'Image Generator', description: 'Generates clean labelled ICSE-style diagrams', icon: 'Palette' },
  { name: 'Originality', label: 'Originality', description: 'Section-by-section rewriting for uniqueness and human voice', icon: 'ShieldCheck' },
];

export const ICSE_SUBJECTS = [
  'Physics', 'Chemistry', 'Biology', 'Mathematics', 'History',
  'Geography', 'Civics', 'English', 'Computer', 'Economics', 'General',
] as const;

export const CBSE_SUBJECTS = [
  'Science', 'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Social Science', 'History',
  'Geography', 'Civics', 'Economics', 'English', 'Computer Science', 'General',
] as const;

export const KB_CATEGORIES = [
  { value: 'syllabus', label: 'Syllabus' },
  { value: 'specimen_pattern', label: 'Specimen Paper Pattern' },
  { value: 'past_paper', label: 'Past Paper' },
  { value: 'textbook_summary', label: 'Textbook Summary' },
  { value: 'project_exemplar', label: 'Project Exemplar' },
  { value: 'glossary', label: 'Glossary' },
  { value: 'rubric', label: 'Rubric' },
] as const;

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
