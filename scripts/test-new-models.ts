const fs = require('fs');
const path = require('path');

// Manually parse .env file first
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

// Now import the model router
const { callModel } = require('../src/lib/models');

async function testModel(modelId: string, question: string) {
  console.log(`\n--- Testing Model: ${modelId} ---`);
  try {
    const result = await callModel({
      preferredModel: modelId,
      question: question,
      messages: [
        { role: 'user', content: question }
      ],
      temperature: 0.7,
      maxTokens: 100
    });
    console.log(`[Success] duration: ${result.durationMs}ms`);
    console.log(`[Output]: "${result.content.trim()}"`);
  } catch (err: any) {
    console.error(`[Failed] ${modelId} failed: ${err.message}`);
  }
}

async function runTests() {
  console.log('=== VERIFYING INTEGRATED AI PROVIDERS ===');
  
  await testModel('pollinations_text', 'Say "Hello from Pollinations AI" and nothing else.');
  await testModel('minimax_opencode', 'Say "Hello from OpenCode Zen" and nothing else.');
  await testModel('glm_ofox', 'Say "Hello from OfoxAI" and nothing else.');
  await testModel('siliconflow', 'Say "Hello from SiliconFlow" and nothing else.');
  await testModel('gemini_3_5_flash', 'Say "Hello from Gemini 3.5 Flash" and nothing else.');
  await testModel('gemini', 'Say "Hello from Gemini 1.5 Flash (redirected)" and nothing else.');
  
  console.log('\n=== VERIFICATION RUN COMPLETE ===');
}

runTests();
export {};
