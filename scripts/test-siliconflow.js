const OpenAI = require('openai');
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

async function test() {
  console.log('Testing SiliconFlow with key:', process.env.SILICONFLOW_API_KEY ? 'Present' : 'Missing');
  const client = new OpenAI({
    apiKey: process.env.SILICONFLOW_API_KEY,
    baseURL: 'https://api.siliconflow.com/v1'
  });

  try {
    const res = await client.chat.completions.create({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [{ role: 'user', content: 'Say "OK"' }],
      max_tokens: 10
    });
    console.log('SiliconFlow Success:', res.choices[0].message.content);
  } catch (err) {
    console.error('SiliconFlow Failed:', err.message);
  }
}

test();
