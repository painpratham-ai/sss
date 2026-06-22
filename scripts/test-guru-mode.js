const http = require('http');

function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, json: () => JSON.parse(data), statusCode: res.statusCode });
        } catch (e) {
          reject(new Error("Failed to parse response: " + data));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function callChat(payload) {
  console.log(`Sending request with socratic=${payload.socratic}, analogy=${payload.analogy}...`);
  try {
    const res = await request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, payload);
    const data = await res.json();
    if (!res.ok) {
      console.error('Error Response:', data);
    } else {
      console.log('\n--- RESPONSE SUCCESS ---');
      console.log('Model Used:', data.modelUsed);
      console.log('Duration:', data.durationMs, 'ms');
      console.log('Answer:\n', data.answer);
    }
  } catch (err) {
    console.error('Request failed:', err.message);
  }
}

async function main() {
  // Test 1: Socratic mode (Guru)
  await callChat({
    message: "Explain Ohm's Law and solve a question where V = 6V and I = 2A.",
    subject: "Physics",
    board: "ICSE",
    socratic: true,
  });

  console.log('\n=========================================\n');

  // Test 2: Analogy Mode (Cricket)
  await callChat({
    message: "What is electrical resistance?",
    subject: "Physics",
    board: "ICSE",
    socratic: false,
    analogy: "Cricket",
  });
}

main();
