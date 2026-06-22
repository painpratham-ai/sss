const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testOfoxModel(modelName) {
  console.log(`\n--- Testing OfoxAI model: ${modelName} ---`);
  const client = new OpenAI({
    apiKey: process.env.OFOX_API_KEY,
    baseURL: 'https://api.ofox.ai/v1'
  });

  try {
    const res = await client.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: 'Say "Hello" and nothing else.' }],
      max_tokens: 10
    });
    console.log('[Success] Response:', res.choices[0].message.content.trim());
  } catch (err) {
    console.error('[Failed] Error:', err.message);
  }
}

async function run() {
  await testOfoxModel('z-ai/glm-4.7-flash:free');
  await testOfoxModel('z-ai/glm-4.7-flashx');
  await testOfoxModel('openai/gpt-4o-mini');
  await testOfoxModel('google/gemini-2.5-flash');
}

run();
