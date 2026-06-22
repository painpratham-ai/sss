const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Manually parse .env file
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

async function testModel(name, provider, clientConfig, modelName) {
  console.log(`\n--- Testing ${name} (${provider}) ---`);
  const client = new OpenAI({
    ...clientConfig
  });

  console.log(`Calling model '${modelName}'...`);
  const start = Date.now();
  try {
    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 20
    });
    console.log(`Success in ${Date.now() - start}ms!`);
    console.log(`Response: "${completion.choices[0].message.content.trim()}"`);
    return true;
  } catch (e) {
    console.error(`Failed in ${Date.now() - start}ms:`, e.message);
    return false;
  }
}

async function main() {
  if (process.env.DEEPSEEK_API_KEY) {
    await testModel(
      'DeepSeek V3 (Official)',
      'DeepSeek API',
      { apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com/v1' },
      'deepseek-chat'
    );
  } else {
    console.log('No DEEPSEEK_API_KEY found in .env');
  }

  if (process.env.MISTRAL_API_KEY) {
    await testModel(
      'Mistral Large',
      'Mistral API',
      { apiKey: process.env.MISTRAL_API_KEY, baseURL: 'https://api.mistral.ai/v1' },
      'mistral-large-latest'
    );
  } else {
    console.log('No MISTRAL_API_KEY found in .env');
  }
}

main();
