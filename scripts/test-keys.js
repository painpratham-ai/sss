const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testOpenAI() {
  if (!process.env.OPENAI_API_KEY) return console.log('OpenAI key: NOT CONFIGURED');
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5
    });
    console.log('OpenAI key: VALID. Response:', res.choices[0].message.content);
  } catch (err) {
    console.log('OpenAI key: INVALID.', err.message);
  }
}

async function testGitHubDeepSeek() {
  if (!process.env.GITHUB_TOKEN) return console.log('GitHub Token: NOT CONFIGURED');
  const client = new OpenAI({
    apiKey: process.env.GITHUB_TOKEN,
    baseURL: 'https://models.github.ai/inference'
  });
  try {
    const res = await client.chat.completions.create({
      model: 'DeepSeek-V3',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5
    });
    console.log('GitHub DeepSeek-V3: VALID. Response:', res.choices[0].message.content);
  } catch (err) {
    console.log('GitHub DeepSeek-V3: INVALID with Model "DeepSeek-V3".', err.message);
    // Let's try DeepSeek-R1
    try {
      const res = await client.chat.completions.create({
        model: 'DeepSeek-R1',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      });
      console.log('GitHub DeepSeek-R1: VALID. Response:', res.choices[0].message.content);
    } catch (err2) {
      console.log('GitHub DeepSeek-R1: INVALID.', err2.message);
    }
  }
}

async function testDeepSeekDirect() {
  if (!process.env.DEEPSEEK_API_KEY) return console.log('DeepSeek Direct key: NOT CONFIGURED');
  try {
    const openai = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com/v1' });
    const res = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5
    });
    console.log('DeepSeek Direct key: VALID. Response:', res.choices[0].message.content);
  } catch (err) {
    console.log('DeepSeek Direct key: INVALID.', err.message);
  }
}

async function testGemini() {
  if (!process.env.GEMINI_API_KEY) return console.log('Gemini key: NOT CONFIGURED');
  try {
    const client = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
    });
    const res = await client.chat.completions.create({
      model: 'gemini-1.5-flash',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5
    });
    console.log('Gemini 1.5 Flash: VALID. Response:', res.choices[0].message.content);
  } catch (err) {
    console.log('Gemini 1.5 Flash: INVALID.', err.message);
  }
}

async function testMistral() {
  if (!process.env.MISTRAL_API_KEY) return console.log('Mistral key: NOT CONFIGURED');
  try {
    const client = new OpenAI({
      apiKey: process.env.MISTRAL_API_KEY,
      baseURL: 'https://api.mistral.ai/v1'
    });
    const res = await client.chat.completions.create({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5
    });
    console.log('Mistral Large: VALID. Response:', res.choices[0].message.content);
  } catch (err) {
    console.log('Mistral Large: INVALID.', err.message);
  }
}

async function testZai() {
  try {
    const ZAI = require('z-ai-web-dev-sdk').default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'user', content: 'test' }],
      thinking: { type: 'disabled' }
    });
    console.log('Z.ai (GLM): VALID. Response:', completion.choices[0].message.content);
  } catch (err) {
    console.log('Z.ai (GLM): INVALID.', err.message);
  }
}

async function run() {
  console.log('--- Testing API Keys ---');
  await testZai();
  await testOpenAI();
  await testGitHubDeepSeek();
  await testDeepSeekDirect();
  await testGemini();
  await testMistral();
  console.log('--- Done ---');
}

run();
