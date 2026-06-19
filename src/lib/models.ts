// Multi-Model AI Router
// Supports: GLM-4.6 (z-ai, default), OpenAI GPT-4o, DeepSeek, Grok (xAI)
// Features:
//   - Auto-fallback when rate limits/errors occur
//   - User-selectable model
//   - "Auto" mode picks best model per task type
//   - Capability descriptions for UI
//
// All providers use OpenAI-compatible API except z-ai which uses its own SDK.

import ZAI from 'z-ai-web-dev-sdk';
import OpenAI from 'openai';

// ─── Model definitions ─────────────────────────────────────

export type ModelId = 'auto' | 'glm' | 'openai' | 'deepseek' | 'grok';

export interface ModelInfo {
  id: ModelId;
  name: string;
  provider: string;
  description: string;
  capabilities: string[];
  best_for: string[];
  cost_per_1k_tokens: number; // USD estimate
  avg_latency_ms: number;
  reasoning: boolean;
  web_search_native: boolean;
  available: boolean;
  why_better: string;
}

export const MODELS: Record<ModelId, ModelInfo> = {
  auto: {
    id: 'auto',
    name: 'Auto (Smart Pick)',
    provider: 'router',
    description: 'Automatically picks the best model for each question type',
    capabilities: ['Reasoning', 'Quick recall', 'Web search', 'Math', 'Code', 'Multilingual'],
    best_for: ['Any question — system decides'],
    cost_per_1k_tokens: 0.002,
    avg_latency_ms: 3000,
    reasoning: true,
    web_search_native: false,
    available: true,
    why_better: 'Routes math → DeepSeek, current events → Grok, complex reasoning → GPT-4o, ICSE/general → GLM'
  },
  glm: {
    id: 'glm',
    name: 'GLM-4.6',
    provider: 'Z.ai',
    description: 'Strong reasoning with chain-of-thought, multilingual, cheapest',
    capabilities: ['Reasoning', 'Quick recall', 'Multilingual', 'Indian context'],
    best_for: ['ICSE syllabus questions', 'Definitions', 'Step-by-step derivations', 'Budget-friendly tutoring'],
    cost_per_1k_tokens: 0.001,
    avg_latency_ms: 2500,
    reasoning: true,
    web_search_native: false,
    available: true, // always available (z-ai-web-dev-sdk bundled)
    why_better: 'Best price/performance for ICSE tutoring. Native Indian-English understanding. Built-in thinking mode.'
  },
  openai: {
    id: 'openai',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Strongest general-purpose model, best at math & code',
    capabilities: ['Reasoning', 'Math', 'Code', 'Multimodal', 'Long context'],
    best_for: ['Complex numerical problems', 'Quadratic equations', 'Java programming (Computer Apps)', 'Geometry proofs'],
    cost_per_1k_tokens: 0.005,
    avg_latency_ms: 3500,
    reasoning: true,
    web_search_native: false,
    available: !!process.env.OPENAI_API_KEY,
    why_better: 'Highest accuracy on math derivations and code generation. Best for Computer Applications Java problems.'
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    description: 'Best-in-class reasoning, cheapest chain-of-thought, strong math',
    capabilities: ['Reasoning', 'Math', 'Code', 'Long chain-of-thought'],
    best_for: ['Multi-step physics numericals', 'Calorimetry problems', 'Trigonometry proofs', 'Complex derivations'],
    cost_per_1k_tokens: 0.0005,
    avg_latency_ms: 4000,
    reasoning: true,
    web_search_native: false,
    available: !!process.env.DEEPSEEK_API_KEY,
    why_better: 'Deep chain-of-thought reasoning at 10x cheaper than GPT-4o. Best for multi-step numerical problems.'
  },
  grok: {
    id: 'grok',
    name: 'Grok-2',
    provider: 'xAI',
    description: 'Real-time web access built-in, witty, current events',
    capabilities: ['Real-time web', 'Current events', 'Witty', 'News'],
    best_for: ['Current prices', 'Latest news', 'Cricket scores', 'Recent exam timetable updates'],
    cost_per_1k_tokens: 0.005,
    avg_latency_ms: 3000,
    reasoning: true,
    web_search_native: true,
    available: !!process.env.XAI_API_KEY,
    why_better: 'Only model with native real-time web access. Best for "latest", "today", "current" questions.'
  }
};

// ─── Provider clients (lazy init) ──────────────────────────

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

let deepseekClient: OpenAI | null = null;
function getDeepSeek(): OpenAI {
  if (!deepseekClient) {
    deepseekClient = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1'
    });
  }
  return deepseekClient;
}

let grokClient: OpenAI | null = null;
function getGrok(): OpenAI {
  if (!grokClient) {
    grokClient = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1'
    });
  }
  return grokClient;
}

// ─── Auto-model selection ──────────────────────────────────

export function pickAutoModel(question: string, opts: { webNeeded?: boolean; needsReasoning?: boolean } = {}): ModelId {
  const q = question.toLowerCase();

  // 1. If web search is needed → Grok (native real-time web)
  if (opts.webNeeded && MODELS.grok.available) return 'grok';

  // 2. Math/numerical/code → DeepSeek (best reasoning, cheapest)
  const mathTriggers = ['calculate', 'solve', 'find the value', 'derive', 'prove', 'equation', 'quadratic',
    'trigonometry', 'geometry', 'matrix', 'determinant', 'probability', 'statistics',
    'calorimetry', 'ohm', 'numerical', 'integration', 'differentiation'];
  if (mathTriggers.some(t => q.includes(t)) && MODELS.deepseek.available) return 'deepseek';

  // 3. Java/code (Computer Applications) → GPT-4o (best at code)
  const codeTriggers = ['java', 'code', 'program', 'algorithm', 'function', 'class', 'constructor',
    'array', 'scanner', 'string method', 'bluej', 'compile'];
  if (codeTriggers.some(t => q.includes(t)) && MODELS.openai.available) return 'openai';

  // 4. Complex multi-step reasoning → GPT-4o if available, else DeepSeek
  if (opts.needsReasoning) {
    if (MODELS.openai.available) return 'openai';
    if (MODELS.deepseek.available) return 'deepseek';
  }

  // 5. Default → GLM (cheapest, ICSE-tuned)
  return 'glm';
}

// ─── Unified model caller ──────────────────────────────────

export interface ModelCallResult {
  content: string;
  reasoning?: string;
  model: ModelId;
  durationMs: number;
  tokensUsed?: number;
}

export interface ModelCallOptions {
  messages: { role: string; content: string }[];
  temperature?: number;
  thinking?: boolean; // enable chain-of-thought
  maxTokens?: number;
}

// Call a specific model
async function callSpecificModel(model: ModelId, opts: ModelCallOptions): Promise<ModelCallResult> {
  const startedAt = Date.now();
  const messages = opts.messages;

  if (model === 'glm') {
    const zai = await getZai();
    const completion: any = await zai.chat.completions.create({
      messages: messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })) as any,
      thinking: { type: opts.thinking ? 'enabled' : 'disabled' }
    });
    let content = completion.choices[0]?.message?.content || '';
    let reasoning: string | undefined;
    if (completion.choices[0]?.message?.reasoning) {
      reasoning = completion.choices[0].message.reasoning;
    }
    // Extract <think> blocks
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch) {
      if (!reasoning) reasoning = thinkMatch[1].trim();
      content = content.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    }
    return { content, reasoning, model, durationMs: Date.now() - startedAt };
  }

  // OpenAI-compatible providers (OpenAI, DeepSeek, Grok)
  let client: OpenAI;
  let modelName: string;

  if (model === 'openai') {
    client = getOpenAI();
    modelName = 'gpt-4o';
  } else if (model === 'deepseek') {
    client = getDeepSeek();
    modelName = 'deepseek-reasoner'; // DeepSeek-R1 for reasoning
  } else if (model === 'grok') {
    client = getGrok();
    // Try grok-2 first, fall back to grok-beta if not found
    modelName = 'grok-2';
  } else {
    throw new Error(`Unknown model: ${model}`);
  }

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: modelName,
      messages: messages.map(m => ({
        role: m.role === 'assistant' ? 'system' : m.role,
        content: m.content
      })) as any,
      temperature: opts.temperature ?? 0.5,
      max_tokens: opts.maxTokens ?? 2000
    });
  } catch (err: any) {
    // If model not found, try alternative model names
    if (err.status === 400 && err.message?.includes('Model not found') && model === 'grok') {
      completion = await client.chat.completions.create({
        model: 'grok-beta',
        messages: messages.map(m => ({
          role: m.role === 'assistant' ? 'system' : m.role,
          content: m.content
        })) as any,
        temperature: opts.temperature ?? 0.5,
        max_tokens: opts.maxTokens ?? 2000
      });
    } else {
      throw err;
    }
  }

  let content = completion.choices[0]?.message?.content || '';
  let reasoning: string | undefined;

  // DeepSeek-R1 returns reasoning separately
  if (model === 'deepseek' && (completion.choices[0]?.message as any)?.reasoning_content) {
    reasoning = (completion.choices[0]?.message as any).reasoning_content;
  }

  return {
    content,
    reasoning,
    model,
    durationMs: Date.now() - startedAt,
    tokensUsed: completion.usage?.total_tokens
  };
}

// ─── Main router with auto-fallback ────────────────────────

export interface RouterOptions extends ModelCallOptions {
  preferredModel?: ModelId; // user's choice (default: 'auto')
  question: string; // for auto-mode selection
  webNeeded?: boolean;
  needsReasoning?: boolean;
}

export interface RouterResult extends ModelCallResult {
  attemptedModels: ModelId[];
  fallbackUsed: boolean;
  fallbackReason?: string;
}

const FALLBACK_ORDER: ModelId[] = ['glm', 'deepseek', 'openai', 'grok'];

export async function callModel(opts: RouterOptions): Promise<RouterResult> {
  const preferred = opts.preferredModel || 'auto';
  const attempted: ModelId[] = [];

  // Determine primary model
  let primary: ModelId;
  if (preferred === 'auto') {
    primary = pickAutoModel(opts.question, {
      webNeeded: opts.webNeeded,
      needsReasoning: opts.needsReasoning
    });
  } else {
    primary = preferred;
  }

  // Build attempt order: primary first, then fallbacks (excluding primary)
  const attemptOrder: ModelId[] = [primary, ...FALLBACK_ORDER.filter(m => m !== primary && MODELS[m].available)];

  let lastError: string | undefined;

  for (const model of attemptOrder) {
    if (!MODELS[model].available) continue;
    attempted.push(model);

    try {
      const result = await callSpecificModel(model, {
        messages: opts.messages,
        temperature: opts.temperature,
        thinking: opts.thinking,
        maxTokens: opts.maxTokens
      });

      return {
        ...result,
        attemptedModels: attempted,
        fallbackUsed: attempted.length > 1,
        fallbackReason: attempted.length > 1 ? lastError : undefined
      };
    } catch (err: any) {
      lastError = err.message;
      console.error(`Model ${model} failed: ${err.message}. Trying fallback...`);

      // Check if it's a rate limit error → immediately try next
      const isRateLimit = err.status === 429 || err.message?.includes('rate limit') ||
        err.message?.includes('quota') || err.message?.includes('insufficient');
      if (isRateLimit) continue;

      // For other errors, also try fallback
      continue;
    }
  }

  // All models failed
  throw new Error(`All models failed. Attempted: ${attempted.join(', ')}. Last error: ${lastError}`);
}

// ─── Status endpoint helper ────────────────────────────────

export function getModelsStatus(): { models: ModelInfo[]; available: ModelId[] } {
  const available = (Object.keys(MODELS) as ModelId[]).filter(m => MODELS[m].available);
  return {
    models: (Object.keys(MODELS) as ModelId[]).map(m => ({
      ...MODELS[m],
      available: MODELS[m].available
    })),
    available
  };
}
