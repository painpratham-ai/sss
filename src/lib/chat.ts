// ICSE Tutor Chatbot — RAG + reasoning (GLM-4.6 via z-ai-web-dev-sdk)
// Auto-switches to OpenClaw if OPENCLAW_URL+OPENCLAW_TOKEN env vars are set & reachable.
//
// What makes this a "reasoning" chatbot:
//   1. RAG retrieval from 133-chunk ICSE knowledge base (past papers, exemplars, glossary, exam guide)
//   2. chain-of-thought (thinking: enabled) for complex questions
//   3. conversation history maintained across turns
//   4. cites which knowledge chunks were used so students can verify
//   5. subject auto-detection for better retrieval
//
// All LLM calls cached (in-memory LRU + DB). Repeat questions = free + instant.

import ZAI from 'z-ai-web-dev-sdk';
import { retrieve, type RetrievedChunk } from './knowledge';
import { cachedLLM } from './llm-cache';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  answer: string;
  reasoning?: string;
  sources: { title: string; subject: string; chapter: string; category: string }[];
  cached: boolean;
  durationMs: number;
  backend: 'builtin' | 'openclaw' | 'demo';
}

// ─── Subject auto-detection ────────────────────────────────
function detectSubject(question: string): string | undefined {
  const q = question.toLowerCase();
  const hints: Record<string, string[]> = {
    'Physics': ['force','energy','momentum','velocity','acceleration','ohm','current','voltage','resistance','lens','mirror','refraction','reflection','prism','spectrum','magnet','electromagnet','transformer','motor','heat','temperature','calorimetry','radioactivity','nuclear','work','power','machine','lever','pulley','echo','sound wave','amplitude','frequency','wavelength'],
    'Chemistry': ['mole','acid','base','salt','ph','electrolysis','electrode','ion','oxidation','reduction','redox','catalyst','compound','mixture','element','atomic','molecular','bond','covalent','electrovalent','periodic','metallurgy','aluminium','zinc','iron','hcl','ammonia','nitric acid','sulphuric acid','organic','alkane','alkene','alkyne','alcohol','carboxylic','isomer'],
    'Biology': ['cell','tissue','photosynthesis','respiration','transpiration','heart','blood','artery','vein','capillary','kidney','nephron','neuron','brain','spinal cord','reflex','hormone','endocrine','reproduction','evolution','pollution','ecosystem','population','gene','chromosome','mitosis','meiosis','enzyme','protein','vitamin','meninges','gland'],
    'Mathematics': ['equation','solve for','factor','quadratic','matrix','determinant','arithmetic progression','geometric progression','coordinate','slope','distance formula','section formula','triangle','circle','tangent','chord','sector','cylinder','cone','sphere','hemisphere','volume','surface area','trigonometry','sine','cosine','tangent','identity','probability','statistics','mean','median','mode','quartile','gst','banking','shares','dividend','deposit'],
    'History': ['revolt','1857','nationalism','congress','muslim league','gandhi','nehru','bose','partition','independence','world war','hitler','dictator','united nations','non-aligned','cold war','lok sabha','rajya sabha','president','prime minister','supreme court','high court','constitution','civics','freedom struggle'],
    'Geography': ['topographical','contour','climate','monsoon','rainfall','soil','vegetation','irrigation','multipurpose','mineral','coal','petroleum','iron ore','bauxite','agriculture','rice','wheat','cotton','jute','sugarcane','tea','industry','transport','railway','waste management'],
    'English': ['essay','letter','notice','report','comprehension','grammar','tense','preposition','voice','direct speech','indirect speech','merchant of venice','shakespeare','poem','poetry','stanza','metaphor','simile'],
    'Computer': ['java','class','object','method','constructor','array','loop','for loop','while loop','scanner','string','encapsulation','inheritance','polymorphism','function','parameter','return','variable','datatype','int','double','boolean'],
    'Economics': ['demand','supply','elasticity','market','monopoly','competition','factor of production','land','labour','capital','money','banking','central bank','inflation','deflation','public finance','tax','gst','national income','gdp','gnp','per capita']
  };
  for (const [subject, keywords] of Object.entries(hints)) {
    if (keywords.some(k => q.includes(k))) return subject;
  }
  return undefined;
}

// ─── Reasoning detector ────────────────────────────────────
function needsReasoning(question: string): boolean {
  const q = question.toLowerCase();
  const reasoningTriggers = ['explain','derive','prove','why','how','compare','distinguish','difference between','calculate','solve','find the value','determine','analyze','reason','justify','describe the process','step by step','what happens when','what is the effect','relationship between'];
  const recallTriggers = ['define','what is','who is','when did','where is','name the','list','state','true or false','fill in'];
  if (question.length > 100) return true;
  if (reasoningTriggers.some(t => q.includes(t))) return true;
  if (recallTriggers.some(t => q.includes(t))) return false;
  return question.length > 40;
}

// ─── Backend selector ──────────────────────────────────────
function getOpenClawConfig(): { url: string; token: string } | null {
  const url = process.env.OPENCLAW_URL;
  const token = process.env.OPENCLAW_TOKEN;
  if (url && token) return { url: url.replace(/\/$/, ''), token };
  return null;
}

async function callOpenClaw(
  message: string, history: ChatMessage[], config: { url: string; token: string }
): Promise<{ answer: string; reasoning?: string }> {
  // Build context-aware prompt for OpenClaw
  const recentHistory = history.slice(-6);
  const historyStr = recentHistory.length > 0
    ? recentHistory.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n')
    : '(no prior context)';

  const wrappedMessage = `You are an ICSE Class 10 tutor grounded in the ICSE database (past papers, exemplars, glossary, exam guide).

CONVERSATION HISTORY:
${historyStr}

STUDENT'S NEW QUESTION:
${message}

Answer with step-by-step reasoning where appropriate. Cite which ICSE topic/chapter your answer relates to. Use simple Indian-English.`;

  const resp = await fetch(`${config.url}/v1/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: wrappedMessage,
      agentId: 'main',
      mode: 'run'
    }),
    signal: AbortSignal.timeout(90000)
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`OpenClaw ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = await resp.json();
  // OpenClaw response shape — try common fields
  const answer = data.reply || data.response || data.answer || data.message || data.content || (typeof data === 'string' ? data : JSON.stringify(data));
  return { answer, reasoning: data.reasoning };
}

// ─── Main chat function ────────────────────────────────────
export async function chatWithTutor(
  question: string,
  history: ChatMessage[] = [],
  opts: { forceReasoning?: boolean; subject?: string } = {}
): Promise<ChatResponse> {
  const startedAt = Date.now();

  // 1. Detect subject + retrieve relevant knowledge
  const subject = opts.subject || detectSubject(question);
  const needsThink = opts.forceReasoning ?? needsReasoning(question);

  const retrieved: RetrievedChunk[] = await retrieve(question, {
    subject, topK: 6
  });

  const contextStr = retrieved.length > 0
    ? retrieved.map((c, i) =>
        `[${i + 1}] SUBJECT: ${c.subject} | CHAPTER: ${c.chapter} | CATEGORY: ${c.category}\nTITLE: ${c.title}\n${c.content.slice(0, 1500)}`
      ).join('\n\n---\n\n')
    : '(No specific ICSE chunks matched — use general ICSE knowledge.)';

  // 2. Check OpenClaw first (if configured)
  const openclawConfig = getOpenClawConfig();
  if (openclawConfig) {
    try {
      const wrappedQ = `STUDENT QUESTION: ${question}

ICSE KNOWLEDGE CONTEXT (from database — use as ground truth):
${contextStr}

Answer with step-by-step reasoning where appropriate.`;
      const { answer, reasoning } = await callOpenClaw(wrappedQ, history, openclawConfig);
      return {
        answer, reasoning,
        sources: retrieved.slice(0, 4).map(c => ({
          title: c.title, subject: c.subject, chapter: c.chapter, category: c.category
        })),
        cached: false,
        durationMs: Date.now() - startedAt,
        backend: 'openclaw'
      };
    } catch (err: any) {
      console.error('OpenClaw failed, falling back to builtin:', err.message);
      // fall through to builtin
    }
  }

  // 3. Built-in GLM-4.6 with reasoning
  const systemPrompt = `You are the ICSE TUTOR — an expert, patient, encouraging tutor for Indian students preparing for the ICSE Class 9-10 board exams.

Your capabilities:
- Deep knowledge of ICSE syllabus across Physics, Chemistry, Biology, Mathematics, History, Geography, Civics, English, Computer Applications, and Economics
- Access to REAL past ICSE board questions (2021-2026) and high-scoring project exemplars
- Step-by-step reasoning for numerical problems, derivations, and conceptual explanations
- Exam-focused: always tie answers to mark allocation and board expectations

When answering:
1. ALWAYS ground your answer in the provided KNOWLEDGE CONTEXT. Reference which past papers or exemplars inform your answer.
2. For numerical/derivation questions: show FULL step-by-step working with units and significant figures.
3. For definitions: give the precise ICSE-board-accepted definition (1-2 sentences).
4. For "compare/distinguish": use a structured table.
5. For "explain why/how": use clear reasoning chains — "Because X, therefore Y, which means Z".
6. If a topic is not in ICSE syllabus, politely redirect: "This topic is not in the ICSE Class 10 syllabus. The related ICSE topic is..."
7. End answers with a "💡 Exam tip" line where relevant — practical advice on avoiding common mistakes or what examiners look for.
8. Use simple, clear Indian-English. Define jargon before use.

${needsThink
  ? 'This question requires REASONING. Think step by step before giving the final answer. Show your reasoning process clearly.'
  : 'This is a recall/short-answer question. Answer concisely (under 80 words) but accurately.'}

KNOWLEDGE CONTEXT (from ICSE database — use these as your source of truth):
${contextStr}`;

  const recentHistory = history.slice(-6);
  const messages: { role: string; content: string }[] = [
    { role: 'assistant', content: systemPrompt },
    ...recentHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: question }
  ];

  const temperature = needsThink ? 0.4 : 0.5;

  try {
    const { content, cached } = await cachedLLM(
      messages,
      async () => {
        const zai = await getZai();
        const completion: any = await zai.chat.completions.create({
          messages: messages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          })) as any,
          thinking: { type: needsThink ? 'enabled' : 'disabled' }
        });
        // Extract reasoning if the SDK returns it as a separate field
        const msg = completion.choices[0]?.message || {};
        let result = msg.content || '';
        // Some models return reasoning separately
        if (msg.reasoning || msg.reasoning_content || msg.thinking) {
          const reasoning = msg.reasoning || msg.reasoning_content || msg.thinking;
          result = `<<REASONING>>${reasoning}\n\n<<ANSWER>>${result}`;
        }
        return result;
      },
      { temperature }
    );

    // Extract reasoning from our marker format
    let answer = content;
    let reasoning: string | undefined;
    const reasoningMatch = answer.match(/<<REASONING>>([\s\S]*?)<<ANSWER>>/);
    if (reasoningMatch) {
      reasoning = reasoningMatch[1].trim();
      answer = answer.replace(/<<REASONING>>[\s\S]*?<<ANSWER>>/, '').trim();
    }
    // Also strip <think> blocks if present
    const thinkMatch = answer.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch) {
      if (!reasoning) reasoning = thinkMatch[1].trim();
      answer = answer.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    }

    return {
      answer,
      reasoning,
      sources: retrieved.slice(0, 4).map(c => ({
        title: c.title, subject: c.subject, chapter: c.chapter, category: c.category
      })),
      cached,
      durationMs: Date.now() - startedAt,
      backend: 'builtin'
    };
  } catch (err: any) {
    throw new Error(`Chat failed: ${err.message}`);
  }
}

// ─── Suggested questions ───────────────────────────────────
export const SUGGESTED_QUESTIONS = [
  "Explain Ohm's Law with a numerical example",
  "What is the difference between arithmetic mean and median?",
  "Derive the lens formula for a convex lens",
  "Why does ice float on water? Explain with molecular structure.",
  "Balance the equation: Fe + H2O → Fe3O4 + H2",
  "Explain the working of the human heart",
  "What were the main causes of the 1857 revolt?",
  "How do you solve a quadratic equation by factorization?",
  "Explain the mole concept with formulas",
  "Describe the process of photosynthesis with the chemical equation"
];

// ─── Session store (in-memory) ─────────────────────────────
export interface ChatSession {
  id: string;
  messages: (ChatMessage & { reasoning?: string; sources?: any[]; cached?: boolean; durationMs?: number; backend?: string })[];
  createdAt: Date;
  updatedAt: Date;
}

const sessions = new Map<string, ChatSession>();

export function createSession(): string {
  const id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  sessions.set(id, { id, messages: [], createdAt: new Date(), updatedAt: new Date() });
  return id;
}

export function getSession(id: string): ChatSession | undefined {
  return sessions.get(id);
}

export function addToSession(id: string, message: ChatMessage & { reasoning?: string; sources?: any[]; cached?: boolean; durationMs?: number; backend?: string }): void {
  const session = sessions.get(id);
  if (session) {
    session.messages.push(message);
    session.updatedAt = new Date();
  }
}

export function clearSession(id: string): void {
  sessions.set(id, { id, messages: [], createdAt: new Date(), updatedAt: new Date() });
}

// ─── Backend status (for UI badge) ─────────────────────────
export async function getBackendStatus(): Promise<{ backend: 'openclaw' | 'builtin'; openclawConfigured: boolean; openclawReachable: boolean }> {
  const config = getOpenClawConfig();
  if (!config) {
    return { backend: 'builtin', openclawConfigured: false, openclawReachable: false };
  }
  // Quick reachability check
  try {
    const resp = await fetch(`${config.url}/`, {
      signal: AbortSignal.timeout(3000)
    });
    return { backend: 'openclaw', openclawConfigured: true, openclawReachable: resp.ok || resp.status < 500 };
  } catch {
    return { backend: 'builtin', openclawConfigured: true, openclawReachable: false };
  }
}
