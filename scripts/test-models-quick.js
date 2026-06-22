const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) return;
    const key = trimmed.substring(0, firstEquals).trim();
    const val = trimmed.substring(firstEquals + 1).trim();
    process.env[key] = val;
  });
}

async function testModel(name, clientConfig, modelName) {
  try {
    const client = new OpenAI(clientConfig);
    const start = Date.now();
    const res = await client.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: 'Say "OK"' }],
      max_tokens: 10
    });
    console.log(`[SUCCESS] ${name} in ${Date.now() - start}ms: "${res.choices[0].message.content.trim()}"`);
    return true;
  } catch (err) {
    console.log(`[FAILED] ${name}: ${err.message}`);
    return false;
  }
}

async function run() {
  console.log('Testing models...');
  await testModel('SiliconFlow (DeepSeek V3)', { apiKey: process.env.SILICONFLOW_API_KEY, baseURL: 'https://api.siliconflow.com/v1' }, 'deepseek-ai/DeepSeek-V3');
  await testModel('Ofox (GLM-4.7-Flash)', { apiKey: process.env.OFOX_API_KEY, baseURL: 'https://api.ofox.ai/v1' }, 'z-ai/glm-4.7-flash:free');
  await testModel('Pollinations (Text)', { apiKey: process.env.POLLINATIONS_API_KEY, baseURL: 'https://text.pollinations.ai/v1' }, 'openai');
  await testModel('Mistral (Large)', { apiKey: process.env.MISTRAL_API_KEY, baseURL: 'https://api.mistral.ai/v1' }, 'mistral-large-latest');
}

run();
