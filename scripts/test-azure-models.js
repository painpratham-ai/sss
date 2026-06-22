const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testAzureModels() {
  const token = process.env.GITHUB_TOKEN;
  const client = new OpenAI({
    apiKey: token,
    baseURL: 'https://models.inference.ai.azure.com'
  });

  const models = [
    'DeepSeek-V3-0324',
    'deepseek-v3',
    'DeepSeek-R1',
    'gpt-4o',
    'meta-llama-3.1-70b-instruct'
  ];

  for (const model of models) {
    try {
      const res = await client.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      });
      console.log(`Model ${model}: VALID. Response:`, res.choices[0].message.content.replace(/\n/g, ' '));
    } catch (err) {
      console.log(`Model ${model}: INVALID. Error:`, err.message);
    }
  }
}

testAzureModels();
