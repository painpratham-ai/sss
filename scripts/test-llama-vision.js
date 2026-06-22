const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testLlamaVision() {
  if (!process.env.GITHUB_TOKEN) {
    console.log('GITHUB_TOKEN not configured.');
    return;
  }

  const client = new OpenAI({
    apiKey: process.env.GITHUB_TOKEN,
    baseURL: 'https://models.github.ai/inference'
  });

  try {
    const res = await client.chat.completions.create({
      model: 'Llama-3.2-11B-Vision-Instruct',
      messages: [{ role: 'user', content: 'Say hello and describe what a convex lens is in 1 sentence.' }],
      max_tokens: 50
    });
    console.log('[Success] Response:', res.choices[0].message.content.trim());
  } catch (err) {
    console.error('[Failed] Error:', err.message);
  }
}

testLlamaVision();
