const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listOfoxModels() {
  if (!process.env.OFOX_API_KEY) {
    console.log('OFOX_API_KEY not configured.');
    return;
  }

  const client = new OpenAI({
    apiKey: process.env.OFOX_API_KEY,
    baseURL: 'https://api.ofox.ai/v1'
  });

  try {
    const list = await client.models.list();
    console.log('OfoxAI models:');
    const modelIds = list.data.map(m => m.id);
    console.log(JSON.stringify(modelIds, null, 2));
  } catch (err) {
    console.error('Error fetching OfoxAI models:', err.message);
  }
}

listOfoxModels();
