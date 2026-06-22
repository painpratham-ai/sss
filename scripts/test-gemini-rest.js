const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testGeminiREST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('Gemini API key is not configured in .env');
    return;
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Hello, respond with exactly "Valid Key" if you receive this.' }]
        }]
      })
    });
    
    const status = response.status;
    const text = await response.text();
    console.log(`HTTP Status: ${status}`);
    console.log(`Response body: ${text.slice(0, 300)}`);
  } catch (err) {
    console.error('Error during fetch:', err.message);
  }
}

testGeminiREST();
