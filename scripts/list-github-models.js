const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listModels() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.log('GITHUB_TOKEN not configured.');
    return;
  }

  try {
    const res = await fetch('https://models.github.ai/catalog/models', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      console.log(`Failed to fetch models: ${res.status} ${res.statusText}`);
      const body = await res.text();
      console.log('Error body:', body);
      return;
    }

    const data = await res.json();
    console.log('Available Models in GitHub Models:');
    const modelIds = data.map(m => m.name);
    console.log(JSON.stringify(modelIds, null, 2));
  } catch (err) {
    console.error('Error fetching models:', err.message);
  }
}

listModels();
