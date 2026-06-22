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

async function test() {
  console.log('Initializing client for Mistral...');
  const client = new OpenAI({
    apiKey: process.env.MISTRAL_API_KEY,
    baseURL: 'https://api.mistral.ai/v1'
  });

  const baseText = "Refraction of light occurs when light passes from one transparent medium to another. It changes its speed and direction. Snells law states that the ratio of the sine of the angle of incidence to the sine of the angle of refraction is constant. ";
  const largeText = baseText.repeat(80); // around 12000 chars

  console.log('Sending large request (approx 3000 tokens) to Mistral Large...');
  const start = Date.now();
  try {
    const completion = await client.chat.completions.create({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: 'You are the Writer Agent. Write a detailed physics section based on reference text.' },
        { role: 'user', content: `Reference text: ${largeText}\n\nWrite a 500 word article explaining refraction of light.` }
      ],
      max_tokens: 1000
    });
    console.log(`Success in ${Date.now() - start}ms!`);
    console.log(`Response length: ${completion.choices[0].message.content.length}`);
    console.log(`Snippet: "${completion.choices[0].message.content.slice(0, 150).replace(/\n/g, ' ')}..."`);
  } catch (e) {
    console.error(`Failed in ${Date.now() - start}ms:`, e.message);
  }
}

test();
