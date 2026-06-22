const fs = require('fs');
const path = require('path');

const apiKey = 'sk_ZB4nMV0LWZVAFna0IOJM86BpWni2NBcw';

async function testPollinationsGET() {
  const prompt = 'Clean ICSE-style biology diagram showing plant cell structure, labeled, educational science illustration, pencil-sketch style';
  const width = 1024;
  const height = 1024;
  
  const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=${width}&height=${height}&model=flux&nologo=true&private=true&enhance=false`;
  
  console.log('Fetching from URL:', url);
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!res.ok) {
      console.log(`GET Failed: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log('Error text:', text.slice(0, 300));
      return;
    }
    
    const buffer = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(__dirname, '../public/generated/test_pollinations_get.png');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, buffer);
    console.log('GET Success. Image saved to:', outPath);
  } catch (err) {
    console.error('GET Error:', err.message);
  }
}

async function testPollinationsOpenAI() {
  const { OpenAI } = require('openai');
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://gen.pollinations.ai/v1'
  });
  
  try {
    const response = await client.images.generate({
      prompt: 'Clean ICSE-style chemistry apparatus diagram, labeled, suitable for a school project, clear lines',
      model: 'flux',
      size: '1024x1024',
      response_format: 'b64_json'
    });
    
    const b64 = response.data[0].b64_json;
    if (b64) {
      const buffer = Buffer.from(b64, 'base64');
      const outPath = path.join(__dirname, '../public/generated/test_pollinations_openai.png');
      fs.writeFileSync(outPath, buffer);
      console.log('OpenAI Success. Image saved to:', outPath);
    } else {
      console.log('OpenAI Success but no b64_json found. Response data:', response.data);
    }
  } catch (err) {
    console.error('OpenAI Error:', err.message);
  }
}

async function run() {
  await testPollinationsGET();
  await testPollinationsOpenAI();
}

run();
