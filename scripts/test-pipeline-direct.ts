import fs from 'fs';
import path from 'path';
import { runPipeline } from '../src/lib/agents';

// Manually parse .env file
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) return;
    const key = trimmed.substring(0, firstEquals).trim();
    const val = trimmed.substring(firstEquals + 1).trim();
    process.env[key] = val;
  });
}

async function main() {
  console.log('=== RUNNING PIPELINE DIRECTLY ===');
  
  const sourceText = 'Refraction of light occurs when light passes from one transparent medium to another. It changes its speed and direction. Snells law states that the ratio of the sine of the angle of incidence to the sine of the angle of refraction is constant.';
  
  console.log('Input text size:', sourceText.length);
  
  const start = Date.now();
  try {
    const result = await runPipeline({
      sourceText,
      sourceName: 'refraction_notes.txt',
      userTopic: 'Refraction of Light',
      userSubject: 'Physics',
      userClass: '10',
      skipImages: true
    });
    
    console.log(`\n=== PIPELINE SUCCESS in ${((Date.now() - start)/1000).toFixed(1)}s ===`);
    console.log('Result topic:', result.topic);
    console.log('Result subject:', result.subject);
    console.log('Final output length:', result.finalOutput.length);
    console.log('Logs:');
    result.logs.forEach((log) => {
      console.log(`  - [${log.agent}]: status=${log.status}, duration=${log.durationMs}ms, cached=${log.cached}`);
      if (log.error) console.log(`    Error: ${log.error}`);
    });
  } catch (e: any) {
    console.error(`\n=== PIPELINE FAILED in ${((Date.now() - start)/1000).toFixed(1)}s ===`);
    console.error(e.stack || e.message);
  }
}

main();
