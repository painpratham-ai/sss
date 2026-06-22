const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listXAIModels() {
  if (!process.env.XAI_API_KEY) {
    console.log('XAI_API_KEY not configured.');
    return;
  }

  const client = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1'
  });

  try {
    const list = await client.models.list();
    console.log('xAI models:');
    console.log(JSON.stringify(list.data.map(m => m.id), null, 2));
  } catch (err) {
    console.error('Error listing xAI models:', err.message);
  }
}

listXAIModels();
