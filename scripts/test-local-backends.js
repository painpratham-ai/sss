// scripts/test-local-backends.js
const http = require('http');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING BACKEND VERIFICATION ===\n');

  // 1. Test /api/models
  console.log('1. Testing /api/models...');
  try {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/models',
      method: 'GET'
    });
    console.log(`   Status: ${res.status}`);
    if (res.status === 200) {
      console.log(`   Available Models count: ${res.body.available ? res.body.available.length : 0}`);
    } else {
      console.log(`   Error:`, res.body);
    }
  } catch (e) {
    console.log(`   Request failed:`, e.message);
  }

  // 2. Test /api/knowledge/stats
  console.log('\n2. Testing /api/knowledge/stats...');
  try {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/knowledge/stats',
      method: 'GET'
    });
    console.log(`   Status: ${res.status}`);
    if (res.status === 200) {
      console.log(`   Total Chunks: ${res.body.knowledgeBase ? res.body.knowledgeBase.totalChunks : 0}`);
    } else {
      console.log(`   Error:`, res.body);
    }
  } catch (e) {
    console.log(`   Request failed:`, e.message);
  }

  // 3. Test /api/chat (Tutor)
  console.log('\n3. Testing /api/chat (Tutor)...');
  try {
    const postData = {
      message: 'What is Ohm\'s Law?',
      subject: 'Physics',
      preferredModel: 'auto'
    };
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, postData);
    console.log(`   Status: ${res.status}`);
    if (res.status === 200) {
      console.log(`   Answer snippet: "${res.body.answer.slice(0, 100)}..."`);
      console.log(`   Model Used: ${res.body.modelUsed}`);
      console.log(`   Fallback Used: ${res.body.fallbackUsed}`);
    } else {
      console.log(`   Error:`, res.body);
    }
  } catch (e) {
    console.log(`   Request failed:`, e.message);
  }

  // 4. Test /api/mock (Standalone Mock Generator)
  console.log('\n4. Testing /api/mock...');
  try {
    const postData = {
      subject: 'Chemistry',
      className: '10',
      topic: 'Chemical Bonding',
      difficulty: 'medium'
    };
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/mock',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, postData);
    console.log(`   Status: ${res.status}`);
    if (res.status === 200) {
      console.log(`   Mock Paper Title: "${res.body.paper ? res.body.paper.topic : 'None'}"`);
      console.log(`   Total Marks: ${res.body.paper ? res.body.paper.totalMarks : 0}`);
    } else {
      console.log(`   Error:`, res.body);
    }
  } catch (e) {
    console.log(`   Request failed:`, e.message);
  }

  // 5. Test /api/pipeline (The 6 Forging Agents)
  console.log('\n5. Testing /api/pipeline (All 6 Forging Agents)...');
  try {
    const postData = {
      sourceText: 'Refraction of light occurs when light passes from one transparent medium to another. It changes its speed and direction. Snells law states that the ratio of the sine of the angle of incidence to the sine of the angle of refraction is constant.',
      sourceName: 'refraction_notes.txt',
      userTopic: 'Refraction of Light',
      userSubject: 'Physics',
      userClass: '10',
      skipImages: true // skip images for faster api test run
    };
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/pipeline',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, postData);
    console.log(`   Status: ${res.status}`);
    if (res.status === 200) {
      console.log(`   Project Topic: "${res.body.topic}"`);
      console.log(`   Final Output Characters: ${res.body.finalOutput ? res.body.finalOutput.length : 0}`);
      console.log(`   Agent Runs Logs:`);
      res.body.logs.forEach((log) => {
        console.log(`     - [${log.agent}]: status=${log.status}, duration=${log.durationMs}ms, cached=${!!log.cached}`);
      });
    } else {
      console.log(`   Error:`, res.body);
    }
  } catch (e) {
    console.log(`   Request failed:`, e.message);
  }

  console.log('\n=== VERIFICATION COMPLETE ===');
}

runTests();
