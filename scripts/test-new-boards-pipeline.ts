import fs from 'fs';
import path from 'path';
import { runPipeline } from '../src/lib/agents';
import { retrieve } from '../src/lib/knowledge';

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

async function testPipeline(opts: {
  board: string;
  subject: string;
  className: string;
  topic: string;
  sourceText: string;
  sourceName: string;
}) {
  console.log(`\n========================================`);
  console.log(`TESTING PIPELINE FOR: ${opts.board} | ${opts.subject} | Class ${opts.className} | ${opts.topic}`);
  console.log(`========================================`);

  // First verify RAG results for this query directly to see what context the agents will receive
  console.log('Retrieving RAG grounding chunks directly:');
  const ragQuery = `${opts.board} ${opts.subject} ${opts.topic} class ${opts.className} concepts theory`;
  const chunks = await retrieve(ragQuery, {
    board: opts.board,
    subject: opts.subject,
    topK: 3
  });
  
  if (chunks.length === 0) {
    console.log('  ⚠️ No chunks retrieved from knowledge base!');
  } else {
    chunks.forEach((c, idx) => {
      console.log(`  [${idx + 1}] [Score: ${c.score.toFixed(2)}] [Ch: ${c.chapter}] ${c.title}`);
      console.log(`      Snippet: ${c.content.substring(0, 120).replace(/\n/g, ' ')}...`);
    });
  }

  console.log('\nRunning orchestrator pipeline...');
  const start = Date.now();
  try {
    const result = await runPipeline({
      sourceText: opts.sourceText,
      sourceName: opts.sourceName,
      userTopic: opts.topic,
      userSubject: opts.subject,
      userClass: opts.className,
      board: opts.board,
      skipImages: true
    });
    
    console.log(`\n=== SUCCESS in ${((Date.now() - start)/1000).toFixed(1)}s ===`);
    console.log('Result topic:', result.topic);
    console.log('Result subject:', result.subject);
    console.log('Result class:', result.className);
    console.log('Result outline sections:', result.outline.sections?.map((s: any) => s.name).join(', '));
    console.log('Final output length:', result.finalOutput.length);
    console.log('Logs:');
    result.logs.forEach((log) => {
      console.log(`  - [${log.agent}]: status=${log.status}, duration=${log.durationMs}ms, cached=${log.cached}`);
      if (log.error) console.log(`    Error: ${log.error}`);
    });
  } catch (e: any) {
    console.error(`\n=== FAILED in ${((Date.now() - start)/1000).toFixed(1)}s ===`);
    console.error(e.stack || e.message);
  }
}

async function main() {
  console.log('=== STARTING NEW BOARDS BACKEND AGENT TESTS ===');

  // Test Case 1: CBSE Class 9 Mathematics Geometry Foundations
  await testPipeline({
    board: 'CBSE',
    subject: 'Mathematics',
    className: '9',
    topic: 'Geometry Foundations',
    sourceText: 'Geometry covers the properties and relations of points, lines, surfaces, and solids. Basic concepts include Euclid postulates, points, lines, parallel lines, angles, linear pairs, and triangles.',
    sourceName: 'geometry_notes.txt'
  });

  // Test Case 2: ISC Class 12 Accounts Partnership Fundamentals
  await testPipeline({
    board: 'ISC',
    subject: 'Accounts',
    className: '12',
    topic: 'Partnership Deed',
    sourceText: 'A Partnership Deed is a written agreement among partners of a firm. It defines roles, profit sharing ratios, interest on capital, interest on drawings, and salary details to avoid future disputes.',
    sourceName: 'partnership_notes.txt'
  });

  console.log('\n=== ALL TESTS FINISHED ===');
}

main().catch(console.error);
