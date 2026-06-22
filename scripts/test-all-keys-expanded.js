const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const os = require('os');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Global Fetch Interceptor for Z.ai Proxy
if (typeof globalThis !== 'undefined') {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = function (url, options) {
    const urlStr = typeof url === 'string' ? url : (url && url.toString ? url.toString() : '');
    if (urlStr.includes('autoglm-api.autoglm.ai/autoclaw-proxy/proxy/autoclaw')) {
      if (options && options.headers) {
        const headers = {};
        if (typeof options.headers.forEach === 'function') {
          options.headers.forEach((value, key) => {
            headers[key] = value;
          });
        } else {
          Object.assign(headers, options.headers);
        }

        const xToken = headers['X-Token'] || headers['x-token'];
        if (xToken) {
          headers['X-Authorization'] = `Bearer ${xToken}`;
          delete headers['X-Token'];
          delete headers['x-token'];
        }

        headers['X-Request-Model'] = 'zai_auto';
        headers['X-Tm'] = 'win';
        headers['X-Version'] = '1.3.0';
        headers['X-Product'] = 'autoclaw';
        headers['X-Channel'] = 'zai';
        headers['X-Lang'] = 'en';
        headers['x_trace_id'] = 'autoclaw-desktop';

        options.headers = headers;
      }
      if (options && options.body) {
        try {
          const bodyObj = JSON.parse(options.body);
          if (bodyObj.stream === false) {
            bodyObj.stream = true;
            options.body = JSON.stringify(bodyObj);
          }
        } catch (e) {}
      }
    }
    return originalFetch.call(this, url, options);
  };
}

// Z.ai client patching
try {
  const ZAI = require('z-ai-web-dev-sdk').default;
  const originalCreate = ZAI.prototype.createChatCompletion;
  ZAI.prototype.createChatCompletion = async function(body) {
    const stream = await originalCreate.call(this, {
      ...body,
      stream: true
    });
    
    let content = '';
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            if (trimmed === 'data: [DONE]') continue;
            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta;
              if (delta && delta.content) {
                content += delta.content;
              }
            } catch (e) {}
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    return {
      choices: [{
        message: {
          content: content
        }
      }]
    };
  };
} catch (e) {}

function extractTokens() {
  const homeDir = os.homedir();
  const openClawDir = path.join(homeDir, '.openclaw-autoclaw');
  const tokens = [];

  try {
    const filePath = path.join(openClawDir, 'request-headers.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (data.headers && data.headers['X-Authorization']) {
        const t = data.headers['X-Authorization'].replace(/^Bearer\s+/i, '').trim();
        if (t) tokens.push(t);
      }
    }
  } catch (e) {}

  try {
    const filePath = path.join(openClawDir, 'openclaw.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const provider = data?.models?.providers?.zai;
      if (provider?.models) {
        for (const m of provider.models) {
          if (m.headers && m.headers['X-Authorization']) {
            const t = m.headers['X-Authorization'].replace(/^Bearer\s+/i, '').trim();
            if (t) tokens.push(t);
          }
        }
      }
    }
  } catch (e) {}

  try {
    const filePath = path.join(openClawDir, 'openclaw.json.known-good');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const provider = data?.models?.providers?.zai;
      if (provider?.models) {
        for (const m of provider.models) {
          if (m.headers && m.headers['X-Authorization']) {
            const t = m.headers['X-Authorization'].replace(/^Bearer\s+/i, '').trim();
            if (t) tokens.push(t);
          }
        }
      }
    }
  } catch (e) {}

  return Array.from(new Set(tokens));
}

async function verifyToken(token) {
  const url = 'https://autoglm-api.autoglm.ai/autoclaw-proxy/proxy/autoclaw/chat/completions';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer autoclaw-internal-proxy',
    'X-Authorization': `Bearer ${token}`,
    'X-Request-Model': 'zai_auto',
    'X-Tm': 'win',
    'X-Version': '1.3.0',
    'X-Product': 'autoclaw',
    'X-Channel': 'zai',
    'X-Lang': 'en',
    'x_trace_id': 'autoclaw-desktop'
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'auto',
        messages: [{ role: 'user', content: 'Say "OK"' }],
        stream: true
      })
    });
    if (res.status === 200) {
      const reader = res.body?.getReader();
      if (reader) {
        await reader.read();
        await reader.cancel();
      }
      return true;
    }
  } catch (e) {}
  return false;
}

async function ensureZaiConfig() {
  const zConfigPath = path.join(process.cwd(), '.z-ai-config');
  
  let currentToken = '';
  try {
    if (fs.existsSync(zConfigPath)) {
      const config = JSON.parse(fs.readFileSync(zConfigPath, 'utf8'));
      if (config.token) currentToken = config.token;
    }
  } catch (e) {}

  if (currentToken && await verifyToken(currentToken)) {
    return;
  }

  const candidateTokens = extractTokens();
  for (const token of candidateTokens) {
    if (token !== currentToken && await verifyToken(token)) {
      const newConfig = {
        baseUrl: 'https://autoglm-api.autoglm.ai/autoclaw-proxy/proxy/autoclaw',
        apiKey: 'autoclaw-internal-proxy',
        token: token
      };
      fs.writeFileSync(zConfigPath, JSON.stringify(newConfig, null, 2), 'utf8');
      console.log('Successfully updated .z-ai-config with a working token.');
      return;
    }
  }
}

async function testModel(name, clientConfig, modelName, messages = [{ role: 'user', content: 'Say "Valid Key" and nothing else.' }]) {
  console.log(`\n--- Testing ${name} ---`);
  const client = new OpenAI({
    ...clientConfig,
    timeout: 10000 // 10 seconds timeout
  });

  const start = Date.now();
  try {
    const res = await client.chat.completions.create({
      model: modelName,
      messages: messages,
      max_tokens: 15
    });
    console.log(`[SUCCESS] in ${Date.now() - start}ms`);
    console.log(`Response: "${res.choices[0].message.content.trim()}"`);
    return { name, status: 'WORKING', response: res.choices[0].message.content.trim(), latency: Date.now() - start };
  } catch (err) {
    console.log(`[FAILED] in ${Date.now() - start}ms. Error: ${err.message}`);
    return { name, status: 'FAILED', error: err.message, latency: Date.now() - start };
  }
}

async function run() {
  console.log('=== STARTING ALL API KEY VALIDATION ===');
  await ensureZaiConfig();
  const results = [];

  // 1. Z.ai (GLM-4.6)
  try {
    const ZAI = require('z-ai-web-dev-sdk').default;
    const zai = await ZAI.create();
    const start = Date.now();
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'user', content: 'Say "Valid Key" and nothing else.' }],
      thinking: { type: 'disabled' }
    });
    console.log(`\n--- Testing Z.ai (GLM) ---`);
    console.log(`[SUCCESS] in ${Date.now() - start}ms`);
    console.log(`Response: "${completion.choices[0].message.content.trim()}"`);
    results.push({ name: 'Z.ai (GLM)', status: 'WORKING', response: completion.choices[0].message.content.trim(), latency: Date.now() - start });
  } catch (err) {
    console.log(`\n--- Testing Z.ai (GLM) ---`);
    console.log(`[FAILED]. Error: ${err.message}`);
    results.push({ name: 'Z.ai (GLM)', status: 'FAILED', error: err.message });
  }

  // 2. OpenAI
  if (process.env.OPENAI_API_KEY) {
    results.push(await testModel('OpenAI (gpt-4o)', { apiKey: process.env.OPENAI_API_KEY }, 'gpt-4o'));
  } else {
    console.log('\n--- OpenAI: NOT CONFIGURED ---');
    results.push({ name: 'OpenAI (gpt-4o)', status: 'NOT CONFIGURED' });
  }

  // 3. DeepSeek Direct
  if (process.env.DEEPSEEK_API_KEY) {
    results.push(await testModel('DeepSeek Direct (deepseek-chat)', { apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com/v1' }, 'deepseek-chat'));
  } else {
    console.log('\n--- DeepSeek Direct: NOT CONFIGURED ---');
    results.push({ name: 'DeepSeek Direct', status: 'NOT CONFIGURED' });
  }

  // 4. xAI Grok-2 / Grok-beta
  if (process.env.XAI_API_KEY) {
    results.push(await testModel('xAI (grok-2)', { apiKey: process.env.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' }, 'grok-2'));
    results.push(await testModel('xAI (grok-beta)', { apiKey: process.env.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' }, 'grok-beta'));
  } else {
    console.log('\n--- xAI Grok: NOT CONFIGURED ---');
    results.push({ name: 'xAI (grok-2)', status: 'NOT CONFIGURED' });
    results.push({ name: 'xAI (grok-beta)', status: 'NOT CONFIGURED' });
  }

  // 5. Gemini 1.5 Flash (via OpenAI compat)
  if (process.env.GEMINI_API_KEY) {
    results.push(await testModel('Gemini 1.5 Flash', { apiKey: process.env.GEMINI_API_KEY, baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/' }, 'gemini-1.5-flash'));
  } else {
    console.log('\n--- Gemini 1.5 Flash: NOT CONFIGURED ---');
    results.push({ name: 'Gemini 1.5 Flash', status: 'NOT CONFIGURED' });
  }

  // 6. Mistral Large
  if (process.env.MISTRAL_API_KEY) {
    results.push(await testModel('Mistral Large', { apiKey: process.env.MISTRAL_API_KEY, baseURL: 'https://api.mistral.ai/v1' }, 'mistral-large-latest'));
  } else {
    console.log('\n--- Mistral: NOT CONFIGURED ---');
    results.push({ name: 'Mistral Large', status: 'NOT CONFIGURED' });
  }

  // 7. GitHub Token - DeepSeek R1
  if (process.env.GITHUB_TOKEN) {
    results.push(await testModel('GitHub Models (DeepSeek-R1)', { apiKey: process.env.GITHUB_TOKEN, baseURL: 'https://models.github.ai/inference' }, 'DeepSeek-R1'));
  } else {
    console.log('\n--- GitHub Models (DeepSeek-R1): NOT CONFIGURED ---');
    results.push({ name: 'GitHub Models (DeepSeek-R1)', status: 'NOT CONFIGURED' });
  }

  // 8. GitHub Token - DeepSeek V3
  if (process.env.GITHUB_TOKEN) {
    results.push(await testModel('GitHub Models (DeepSeek-V3)', { apiKey: process.env.GITHUB_TOKEN, baseURL: 'https://models.github.ai/inference' }, 'DeepSeek-V3-0324'));
  } else {
    console.log('\n--- GitHub Models (DeepSeek-V3): NOT CONFIGURED ---');
    results.push({ name: 'GitHub Models (DeepSeek-V3)', status: 'NOT CONFIGURED' });
  }

  // 9. Pollinations Text
  if (process.env.POLLINATIONS_API_KEY) {
    results.push(await testModel('Pollinations Text', { apiKey: process.env.POLLINATIONS_API_KEY, baseURL: 'https://text.pollinations.ai/v1' }, 'openai'));
  } else {
    console.log('\n--- Pollinations Text: NOT CONFIGURED ---');
    results.push({ name: 'Pollinations Text', status: 'NOT CONFIGURED' });
  }

  // 10. OpenCode Zen (MiniMax M2.5)
  if (process.env.OPENCODE_ZEN_API_KEY) {
    results.push(await testModel('OpenCode Zen (minimax-m2.5)', { apiKey: process.env.OPENCODE_ZEN_API_KEY, baseURL: 'https://opencode.ai/zen/v1' }, 'minimax-m2.5'));
  } else {
    console.log('\n--- OpenCode Zen: NOT CONFIGURED ---');
    results.push({ name: 'OpenCode Zen (minimax-m2.5)', status: 'NOT CONFIGURED' });
  }

  // 11. OFOX (GLM-4.7-Flash)
  if (process.env.OFOX_API_KEY) {
    results.push(await testModel('OFOX (z-ai/glm-4.7-flash:free)', { apiKey: process.env.OFOX_API_KEY, baseURL: 'https://api.ofox.ai/v1' }, 'z-ai/glm-4.7-flash:free'));
  } else {
    console.log('\n--- OFOX: NOT CONFIGURED ---');
    results.push({ name: 'OFOX (z-ai/glm-4.7-flash:free)', status: 'NOT CONFIGURED' });
  }

  // 12. SiliconFlow (DeepSeek V3)
  if (process.env.SILICONFLOW_API_KEY) {
    results.push(await testModel('SiliconFlow (deepseek-ai/DeepSeek-V3)', { apiKey: process.env.SILICONFLOW_API_KEY, baseURL: 'https://api.siliconflow.com/v1' }, 'deepseek-ai/DeepSeek-V3'));
  } else {
    console.log('\n--- SiliconFlow: NOT CONFIGURED ---');
    results.push({ name: 'SiliconFlow (deepseek-ai/DeepSeek-V3)', status: 'NOT CONFIGURED' });
  }

  console.log('\n=== SUMMARY OF RESULTS ===');
  console.table(results);
}

run();
