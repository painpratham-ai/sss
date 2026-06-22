const fs = require('fs');
const path = require('path');

// Manually parse .env file
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line: string) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) return;
    const key = trimmed.substring(0, firstEquals).trim();
    const val = trimmed.substring(firstEquals + 1).trim();
    process.env[key] = val;
  });
}

const { callModel } = require('../src/lib/models');

async function testGLM() {
  console.log('--- Testing GLM (Z.ai) model ---');
  try {
    const result = await callModel({
      preferredModel: 'glm',
      question: 'Say "Hello from GLM" and nothing else.',
      messages: [{ role: 'user', content: 'Say "Hello from GLM" and nothing else.' }],
      maxTokens: 50
    });
    console.log('[Success] duration:', result.durationMs, 'ms');
    console.log('[Output]:', result.content.trim());
    if (result.reasoning) {
      console.log('[Reasoning]:', result.reasoning.trim());
    }
  } catch (err: any) {
    console.error('[Failed] GLM failed:', err.message);
  }
}

testGLM();
