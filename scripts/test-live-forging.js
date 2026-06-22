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

async function run() {
  const uniqSuffix = Date.now();
  console.log(`Sending live request to /api/pipeline with topic suffix ${uniqSuffix}...`);
  const postData = {
    sourceText: 'The human ear is divided into three parts: external, middle, and inner ear. Sound waves are collected by the pinna and pass through the auditory canal to the eardrum. The three ear ossicles (malleus, incus, stapes) amplify the vibration.',
    sourceName: `human_ear_${uniqSuffix}.txt`,
    userTopic: `Structure of the Human Ear ${uniqSuffix}`,
    userSubject: 'Biology',
    userClass: '10',
    skipImages: true
  };

  try {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/pipeline',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, postData);

    console.log(`Status: ${res.status}`);
    if (res.status === 200) {
      console.log(`Success! Topic: "${res.body.topic}"`);
      console.log(`Final output length: ${res.body.finalOutput ? res.body.finalOutput.length : 0}`);
      console.log('Agent run logs:');
      res.body.logs.forEach(log => {
        console.log(`  - [${log.agent}]: status=${log.status}, duration=${log.durationMs}ms, cached=${!!log.cached}`);
        if (log.error) console.log(`    Error: ${log.error}`);
      });
    } else {
      console.log('Error:', res.body);
    }
  } catch (err) {
    console.error('Request failed:', err.message);
  }
}

run();
