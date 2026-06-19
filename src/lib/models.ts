// Multi-Model AI Router — 10 providers with auto-fallback
//
// Providers (all OpenAI-compatible except z-ai):
//   1. GLM-4.6 (Z.ai) — default, always available, cheapest
//   2. OpenAI GPT-4o — best math/code (region-restricted)
//   3. DeepSeek V3 — best reasoning, cheapest CoT
//   4. Grok-2 (xAI) — real-time web access
//   5. OpenRouter — ONE key = 200+ models (GPT, Claude, Gemini, Llama, Mistral, etc.)
//   6. Groq — FREE, ultra-fast Llama 3.3 (500+ tokens/sec)
//   7. Google Gemini — FREE tier, multimodal
//   8. Anthropic Claude — best writing quality (via OpenAI-compat proxy)
//   9. Perplexity — native web search (sonar-large)
//  10. Mistral — European, code-focused, free tier
//
// Auto-fallback order: [primary, glm, deepseek, groq, openrouter, openai, grok, gemini, claude, perplexity, mistral]

import ZAI from 'z-ai-web-dev-sdk';
import OpenAI from 'openai';

// ─── Model definitions ─────────────────────────────────────

export type ModelId = 'auto' | 'glm' | 'openai' | 'deepseek' | 'grok' |
  'openrouter' | 'groq' | 'gemini' | 'gemini_pro' | 'gemini_2_flash' |
  'gemini_2_pro' | 'gemini_2_5_flash' | 'gemini_2_5_pro' | 'claude' |
  'perplexity' | 'mistral' | 'github';

export interface ModelInfo {
  id: ModelId;
  name: string;
  provider: string;
  description: string;
  capabilities: string[];
  best_for: string[];
  cost_per_1k_tokens: number;
  avg_latency_ms: number;
  reasoning: boolean;
  web_search_native: boolean;
  available: boolean;
  why_better: string;
  free_tier?: boolean;
  signup_url?: string;
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
    why_better: 'Routes math→DeepSeek, code→GPT-4o/Groq, web→Grok/Perplexity, writing→Claude, default→GLM'
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
    available: true,
    why_better: 'Best price/performance for ICSE tutoring. Native Indian-English understanding. Built-in thinking mode. Always available.',
    free_tier: true
  },
  openai: {
    id: 'openai',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Strongest general-purpose model, best at math & code',
    capabilities: ['Reasoning', 'Math', 'Code', 'Multimodal', 'Long context'],
    best_for: ['Complex numerical problems', 'Quadratic equations', 'Java programming', 'Geometry proofs'],
    cost_per_1k_tokens: 0.005,
    avg_latency_ms: 3500,
    reasoning: true,
    web_search_native: false,
    available: !!process.env.OPENAI_API_KEY,
    why_better: 'Highest accuracy on math derivations and code. Best for Computer Applications Java problems.',
    signup_url: 'https://platform.openai.com/api-keys'
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek V3 (via GitHub)',
    provider: 'GitHub Models',
    description: 'Best-in-class reasoning, accessed FREE via GitHub Models API',
    capabilities: ['Reasoning', 'Math', 'Code', 'Long chain-of-thought'],
    best_for: ['Multi-step physics numericals', 'Calorimetry problems', 'Trigonometry proofs', 'Complex derivations'],
    cost_per_1k_tokens: 0,
    avg_latency_ms: 4000,
    reasoning: true,
    web_search_native: false,
    available: !!(process.env.GITHUB_TOKEN || process.env.DEEPSEEK_API_KEY),
    why_better: 'Deep chain-of-thought reasoning. FREE via GitHub Models (no balance needed). Best for multi-step numerical problems.',
    free_tier: true,
    signup_url: 'https://github.com/settings/tokens'
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
    why_better: 'Only model with native real-time web access (besides Perplexity). Best for "latest", "today", "current" questions.',
    signup_url: 'https://console.x.ai'
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter (200+ models)',
    provider: 'OpenRouter',
    description: 'ONE key unlocks GPT-4o, Claude, Gemini, Llama, Mistral, and 200+ more',
    capabilities: ['Multi-model', 'Reasoning', 'Code', 'Web', 'Multilingual', 'Multimodal'],
    best_for: ['Ultimate diversification', 'Switch models without multiple keys', 'Access to ALL frontier models'],
    cost_per_1k_tokens: 0.003,
    avg_latency_ms: 3500,
    reasoning: true,
    web_search_native: true,
    available: !!process.env.OPENROUTER_API_KEY,
    why_better: 'Single API key gives access to every major model (GPT-4o, Claude 3.5, Gemini, Llama 3, Mistral, etc.). Pay-per-use. Best for diversification.',
    signup_url: 'https://openrouter.ai/keys'
  },
  groq: {
    id: 'groq',
    name: 'Llama 3.3 70B (Groq)',
    provider: 'Groq',
    description: 'FREE tier, ultra-fast inference (500+ tokens/sec)',
    capabilities: ['Fastest inference', 'Reasoning', 'Code', 'Multilingual'],
    best_for: ['Quick answers', 'Real-time chat feel', 'Budget (free tier)', 'Llama 3 quality'],
    cost_per_1k_tokens: 0.0002,
    avg_latency_ms: 800,
    reasoning: true,
    web_search_native: false,
    available: !!process.env.GROQ_API_KEY,
    why_better: 'FASTEST inference on the planet (500+ tokens/sec). FREE tier (30 RPM, 14,400/day). Llama 3.3 70B quality. Best for snappy real-time chat.',
    free_tier: true,
    signup_url: 'https://console.groq.com/keys'
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini 1.5 Flash',
    provider: 'Google',
    description: 'FREE tier, multimodal (images), 1M token context',
    capabilities: ['Multimodal', 'Long context (1M)', 'Reasoning', 'Multilingual'],
    best_for: ['Image-based questions', 'Long documents', 'Diagrams', 'Free tier usage'],
    cost_per_1k_tokens: 0.0004,
    avg_latency_ms: 2000,
    reasoning: true,
    web_search_native: false,
    available: !!process.env.GEMINI_API_KEY,
    why_better: 'Only model with 1M token context (whole textbook in one prompt). Multimodal — can read diagrams/images. FREE tier (15 RPM, 1500/day).',
    free_tier: true,
    signup_url: 'https://aistudio.google.com/app/apikey'
  },
  gemini_pro: {
    id: 'gemini_pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    description: 'Pro tier, superior reasoning, multimodal, 2M context',
    capabilities: ['Reasoning', 'Complex Math', 'Code', 'Multimodal', '2M Context'],
    best_for: ['Complex academic questions', 'High-accuracy code generation', 'Advanced science numericals'],
    cost_per_1k_tokens: 0.00125,
    avg_latency_ms: 3500,
    reasoning: true,
    web_search_native: false,
    available: !!process.env.GEMINI_API_KEY,
    why_better: 'Pro quality with 2M token context window. Superior reasoning and complex instruction following.',
    free_tier: false
  },
  gemini_2_flash: {
    id: 'gemini_2_flash',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    description: 'Next-gen Flash model, ultra-fast response, multimodal',
    capabilities: ['Ultra-fast', 'Multimodal', 'Reasoning', 'Long Context'],
    best_for: ['Quick chat', 'Exemplar explanations', 'Snappy RAG queries'],
    cost_per_1k_tokens: 0.00015,
    avg_latency_ms: 1200,
    reasoning: true,
    web_search_native: false,
    available: !!process.env.GEMINI_API_KEY,
    why_better: 'Next-generation Gemini 2.0 speed and accuracy. Snappier response with enhanced reasoning.',
    free_tier: true
  },
  gemini_2_pro: {
    id: 'gemini_2_pro',
    name: 'Gemini 2.0 Pro',
    provider: 'Google',
    description: 'Next-gen Pro model, highest reasoning quality, complex coding',
    capabilities: ['Deep reasoning', 'Complex coding', 'Math', 'Multimodal'],
    best_for: ['Very complex computer programming', 'Advanced mathematics', 'Research analysis'],
    cost_per_1k_tokens: 0.0015,
    avg_latency_ms: 4000,
    reasoning: true,
    web_search_native: false,
    available: !!process.env.GEMINI_API_KEY,
    why_better: 'Our strongest Google Gemini model. Industry-leading reasoning and multi-turn coding performance.',
    free_tier: false
  },
  gemini_2_5_flash: {
    id: 'gemini_2_5_flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    description: 'Latest 2.5 Flash model, enhanced reasoning, high speed',
    capabilities: ['High speed', 'Advanced reasoning', 'Multimodal'],
    best_for: ['General tutoring', 'Fast explanations', 'Interactive code debugging'],
    cost_per_1k_tokens: 0.0001,
    avg_latency_ms: 1100,
    reasoning: true,
    web_search_native: false,
    available: !!process.env.GEMINI_API_KEY,
    why_better: 'Latest Gemini 2.5 architecture, providing the best blend of speed, cost, and high intelligence.',
    free_tier: true
  },
  gemini_2_5_pro: {
    id: 'gemini_2_5_pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    description: 'Latest 2.5 Pro model, ultimate reasoning and code complexity',
    capabilities: ['Ultimate reasoning', 'Expert coding', 'Expert math', 'Multimodal'],
    best_for: ['Ultimate-tier academic support', 'Expert Java Applications', 'Complex logic puzzles'],
    cost_per_1k_tokens: 0.001,
    avg_latency_ms: 3800,
    reasoning: true,
    web_search_native: false,
    available: !!process.env.GEMINI_API_KEY,
    why_better: 'State-of-the-art Gemini 2.5 Pro model. Designed for the most complex coding and logical reasoning tasks.',
    free_tier: false
  },
  claude: {
    id: 'claude',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Best writing quality, excellent for essays & English Literature',
    capabilities: ['Writing', 'Analysis', 'Reasoning', 'Long context', 'Safety'],
    best_for: ['English essays', 'History long-answers', 'Literature analysis', 'Merchant of Venice'],
    cost_per_1k_tokens: 0.003,
    avg_latency_ms: 3000,
    reasoning: true,
    web_search_native: false,
    available: !!process.env.ANTHROPIC_API_KEY,
    why_better: 'Best writing quality of any model. Excellent at English Literature analysis, essay structure, and nuanced reasoning. Best for ICSE English & History.',
    signup_url: 'https://console.anthropic.com/settings/keys'
  },
  perplexity: {
    id: 'perplexity',
    name: 'Sonar Large (Perplexity)',
    provider: 'Perplexity',
    description: 'Native web search with citations, always current',
    capabilities: ['Web search', 'Citations', 'Current events', 'Reasoning'],
    best_for: ['Research questions', 'Cited answers', 'Current events', 'Latest syllabus updates'],
    cost_per_1k_tokens: 0.002,
    avg_latency_ms: 4000,
    reasoning: true,
    web_search_native: true,
    available: !!process.env.PERPLEXITY_API_KEY,
    why_better: 'Every answer comes with web citations. Best for research-style questions where you need to verify sources. Always current.',
    signup_url: 'https://www.perplexity.ai/settings/api'
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral Large',
    provider: 'Mistral (EU)',
    description: 'European AI, strong code generation, free tier',
    capabilities: ['Code', 'Reasoning', 'Multilingual', 'European'],
    best_for: ['Java code (Computer Apps)', 'European languages', 'GDPR-compliant', 'Function calling'],
    cost_per_1k_tokens: 0.002,
    avg_latency_ms: 2500,
    reasoning: true,
    web_search_native: false,
    available: !!process.env.MISTRAL_API_KEY,
    why_better: 'Best open-weight model for code generation. European (GDPR compliant). Free tier available. Strong at Java/Python.',
    free_tier: true,
    signup_url: 'https://console.mistral.ai/api-keys'
  }
};

// ─── Provider clients (lazy init) ──────────────────────────

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

// Cache OpenAI-compatible clients by provider
const clientCache = new Map<string, OpenAI>();

function getClient(provider: string): OpenAI {
  if (clientCache.has(provider)) return clientCache.get(provider)!;

  let client: OpenAI;
  switch (provider) {
    case 'openai':
      client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      break;
    case 'deepseek':
      // Prefer GitHub Models (free) if GITHUB_TOKEN set, else direct DeepSeek API
      if (process.env.GITHUB_TOKEN) {
        client = new OpenAI({
          apiKey: process.env.GITHUB_TOKEN,
          baseURL: 'https://models.github.ai/inference'
        });
      } else {
        client = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com/v1' });
      }
      break;
    case 'grok':
      client = new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' });
      break;
    case 'openrouter':
      client = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://icse-project-forge.local',
          'X-Title': 'ICSE Project Forge'
        }
      });
      break;
    case 'groq':
      client = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
      break;
    case 'gemini':
    case 'gemini_pro':
    case 'gemini_2_flash':
    case 'gemini_2_pro':
    case 'gemini_2_5_flash':
    case 'gemini_2_5_pro':
      client = new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
      });
      break;
    case 'claude':
      // Anthropic now has OpenAI-compatible endpoint
      client = new OpenAI({
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: 'https://api.anthropic.com/v1/openai/'
      });
      break;
    case 'perplexity':
      client = new OpenAI({ apiKey: process.env.PERPLEXITY_API_KEY, baseURL: 'https://api.perplexity.ai' });
      break;
    case 'mistral':
      client = new OpenAI({ apiKey: process.env.MISTRAL_API_KEY, baseURL: 'https://api.mistral.ai/v1' });
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  clientCache.set(provider, client);
  return client;
}

// Model name mapping per provider
const MODEL_NAMES: Record<string, string> = {
  openai: 'gpt-4o',
  deepseek: process.env.GITHUB_TOKEN ? 'deepseek/deepseek-v3-0324' : 'deepseek-reasoner',
  grok: 'grok-2',
  openrouter: 'anthropic/claude-3.5-sonnet', // default model via OpenRouter
  groq: 'llama-3.3-70b-versatile',
  gemini: 'gemini-1.5-flash',
  gemini_pro: 'gemini-1.5-pro',
  gemini_2_flash: 'gemini-2.0-flash',
  gemini_2_pro: 'gemini-2.0-pro-exp',
  gemini_2_5_flash: 'gemini-2.5-flash',
  gemini_2_5_pro: 'gemini-2.5-pro',
  claude: 'claude-3-5-sonnet-20241022',
  perplexity: 'llama-3.1-sonar-large-128k-online',
  mistral: 'mistral-large-latest'
};

// ─── Auto-model selection ──────────────────────────────────

export function pickAutoModel(question: string, opts: { webNeeded?: boolean; needsReasoning?: boolean } = {}): ModelId {
  const q = question.toLowerCase();

  // 1. If web search is needed → Grok (real-time) or Perplexity (cited)
  if (opts.webNeeded) {
    if (MODELS.grok.available) return 'grok';
    if (MODELS.perplexity.available) return 'perplexity';
    if (MODELS.openrouter.available) return 'openrouter';
  }

  // 2. Math/numerical → DeepSeek (best reasoning, cheapest) or Groq (fastest)
  const mathTriggers = ['calculate', 'solve', 'find the value', 'derive', 'prove', 'equation', 'quadratic',
    'trigonometry', 'geometry', 'matrix', 'determinant', 'probability', 'statistics',
    'calorimetry', 'ohm', 'numerical', 'integration', 'differentiation'];
  if (mathTriggers.some(t => q.includes(t))) {
    if (MODELS.deepseek.available) return 'deepseek';
    if (MODELS.groq.available) return 'groq'; // fast fallback
  }

  // 3. Java/code (Computer Applications) → GPT-4o or Mistral (best at code)
  const codeTriggers = ['java', 'code', 'program', 'algorithm', 'function', 'class', 'constructor',
    'array', 'scanner', 'string method', 'bluej', 'compile'];
  if (codeTriggers.some(t => q.includes(t))) {
    if (MODELS.openai.available) return 'openai';
    if (MODELS.mistral.available) return 'mistral';
    if (MODELS.openrouter.available) return 'openrouter';
  }

  // 4. English Literature / essays / writing → Claude (best writing)
  const writingTriggers = ['essay', 'write a', 'letter', 'notice', 'report', 'summary',
    'merchant of venice', 'shakespeare', 'poem', 'poetry', 'describe', 'narrative'];
  if (writingTriggers.some(t => q.includes(t))) {
    if (MODELS.claude.available) return 'claude';
    if (MODELS.openrouter.available) return 'openrouter';
  }

  // 5. Complex multi-step reasoning → GPT-4o or DeepSeek
  if (opts.needsReasoning) {
    if (MODELS.gemini_2_5_pro.available) return 'gemini_2_5_pro';
    if (MODELS.openai.available) return 'openai';
    if (MODELS.deepseek.available) return 'deepseek';
    if (MODELS.groq.available) return 'groq';
  }

  // 6. Default → Gemini 2.5 Flash if available, else GLM (cheapest, ICSE-tuned)
  return MODELS.gemini_2_5_flash.available ? 'gemini_2_5_flash' : 'glm';
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
  thinking?: boolean;
  maxTokens?: number;
}

async function callSpecificModel(model: ModelId, opts: ModelCallOptions): Promise<ModelCallResult> {
  const startedAt = Date.now();

  if (model === 'glm') {
    const zai = await getZai();
    const completion: any = await zai.chat.completions.create({
      messages: opts.messages.map(m => ({
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
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch) {
      if (!reasoning) reasoning = thinkMatch[1].trim();
      content = content.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    }
    return { content, reasoning, model, durationMs: Date.now() - startedAt };
  }

  // OpenAI-compatible providers
  const client = getClient(model);
  let modelName = MODEL_NAMES[model];

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: modelName,
      messages: opts.messages.map(m => ({
        role: m.role === 'assistant' ? 'system' : m.role,
        content: m.content
      })) as any,
      temperature: opts.temperature ?? 0.5,
      max_tokens: opts.maxTokens ?? 2000
    });
  } catch (err: any) {
    // Retry with alternative model names for known fallbacks
    if (model === 'grok' && err.message?.includes('Model not found')) {
      modelName = 'grok-beta';
      completion = await client.chat.completions.create({
        model: modelName,
        messages: opts.messages.map(m => ({
          role: m.role === 'assistant' ? 'system' : m.role,
          content: m.content
        })) as any,
        temperature: opts.temperature ?? 0.5,
        max_tokens: opts.maxTokens ?? 2000
      });
    } else if (model === 'claude' && err.status === 404) {
      // Anthropic OpenAI-compat endpoint may not exist — fallback to OpenRouter proxy
      throw new Error(`Claude direct endpoint failed (${err.message}). Set OPENROUTER_API_KEY to access Claude via OpenRouter.`);
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
  preferredModel?: ModelId;
  question: string;
  webNeeded?: boolean;
  needsReasoning?: boolean;
}

export interface RouterResult extends ModelCallResult {
  attemptedModels: ModelId[];
  fallbackUsed: boolean;
  fallbackReason?: string;
}

// Fallback priority: cheapest + most reliable first
const FALLBACK_ORDER: ModelId[] = [
  'glm',              // always available, cheapest
  'gemini_2_5_flash', // latest free tier flash
  'gemini_2_flash',   // 2.0 free tier flash
  'gemini',           // 1.5 free tier flash
  'groq',             // free tier, ultra-fast
  'deepseek',         // cheap, best reasoning
  'openrouter',       // multi-model
  'openai',           // expensive but powerful
  'grok',             // web access
  'gemini_2_5_pro',
  'gemini_2_pro',
  'gemini_pro',
  'claude',           // best writing
  'perplexity',       // cited web search
  'mistral'           // code
];

export async function callModel(opts: RouterOptions): Promise<RouterResult> {
  const preferred = opts.preferredModel || 'auto';
  const attempted: ModelId[] = [];

  let primary: ModelId;
  if (preferred === 'auto') {
    primary = pickAutoModel(opts.question, {
      webNeeded: opts.webNeeded,
      needsReasoning: opts.needsReasoning
    });
  } else {
    primary = preferred;
  }

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
      continue;
    }
  }

  throw new Error(`All models failed. Attempted: ${attempted.join(', ')}. Last error: ${lastError}`);
}

// ─── Status endpoint helper ────────────────────────────────

export function getModelsStatus(): { models: ModelInfo[]; available: ModelId[]; totalAvailable: number } {
  const available = (Object.keys(MODELS) as ModelId[]).filter(m => MODELS[m].available);
  return {
    models: (Object.keys(MODELS) as ModelId[]).map(m => ({
      ...MODELS[m],
      available: MODELS[m].available
    })),
    available,
    totalAvailable: available.length
  };
}
