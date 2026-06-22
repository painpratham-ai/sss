// POST /api/ingest — run smart dedup ingestion on /upload folder
// Body: { dryRun?: boolean, file?: string }
// Returns: { summary, report }

import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun === true;
    const specificFile = body.file || null;

    const hasBun = (() => {
      try {
        execSync('bun --version', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    })();
    const args = hasBun 
      ? ['bun', 'run', 'scripts/smart-ingest.ts']
      : ['npx', 'tsx', 'scripts/smart-ingest.ts'];
    if (dryRun) args.push('--dry-run');
    if (specificFile) { args.push('--file'); args.push(specificFile); }

    const output = execSync(args.join(' '), {
      cwd: process.cwd(),
      timeout: 240000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      shell: process.platform === 'win32' ? 'powershell.exe' : undefined
    });

    // Extract JSON from __JSON__ marker
    const jsonMatch = output.match(/__JSON__(\{[\s\S]*\})\s*$/);
    const result = jsonMatch ? JSON.parse(jsonMatch[1]) : {
      dryRun,
      rawOutput: output.slice(-2000)
    };

    return NextResponse.json({
      ok: true,
      summary: {
        filesScanned: result.filesScanned,
        chunksParsed: result.chunksParsed,
        chunksSkipped: result.chunksSkipped,
        chunksIngested: result.chunksIngested,
        userChunksBefore: result.userChunksBefore,
        userChunksAfter: result.userChunksAfter,
        totalChunks: result.totalChunks
      },
      report: result.report || []
    });
  } catch (err: any) {
    console.error('Ingest error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
